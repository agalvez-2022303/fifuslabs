import { randomUUID } from 'node:crypto'
import type { AuthSession } from '../../packages/shared-types/src'
import type { IdentityGateway, IdentityResult } from '../auth/identity-gateway'
import type { SqlPool } from '../db/connection'
import { ConflictError, UnauthorizedError } from '../errors'

export class TestIdentityGateway implements IdentityGateway {
  private readonly users = new Map<string, { email: string; password: string; disabled: boolean }>()
  private readonly tokens = new Map<string, string>()
  private readonly refreshTokens = new Map<string, string>()
  constructor(private readonly database: SqlPool) {}
  private session(id: string): IdentityResult {
    const access_token = `test-access-${randomUUID()}`,
      refresh_token = `test-refresh-${randomUUID()}`
    this.tokens.set(access_token, id)
    this.refreshTokens.set(refresh_token, id)
    const session: AuthSession = {
      access_token,
      refresh_token,
      expires_in: 3600,
      token_type: 'bearer',
    }
    return { userId: id, session }
  }
  async verifyAccessToken(token: string) {
    return this.tokens.get(token) ?? null
  }
  async createUser(email: string, password: string) {
    if ([...this.users.values()].some(user => user.email === email)) throw new ConflictError()
    const id = randomUUID()
    await this.database.query('INSERT INTO auth.users(id,email) VALUES ($1,$2)', [id, email])
    this.users.set(id, { email, password, disabled: false })
    return id
  }
  async login(email: string, password: string) {
    const user = [...this.users.entries()].find(
      ([, user]) => user.email === email && user.password === password && !user.disabled
    )
    if (!user) throw new UnauthorizedError()
    return this.session(user[0])
  }
  async register(email: string, password: string) {
    return this.session(await this.createUser(email, password))
  }
  async refresh(token: string) {
    const id = this.refreshTokens.get(token)
    if (!id || this.users.get(id)?.disabled) throw new UnauthorizedError()
    this.refreshTokens.delete(token)
    return this.session(id)
  }
  async logout(token: string) {
    const id = this.tokens.get(token)
    // Like Supabase, logout revokes refresh sessions; access JWTs can remain valid until expiry.
    for (const [token, user] of this.refreshTokens)
      if (user === id) this.refreshTokens.delete(token)
  }
  async setDisabled(id: string, disabled: boolean) {
    const user = this.users.get(id)
    if (!user) throw new UnauthorizedError()
    user.disabled = disabled
  }
  async deleteUser(id: string) {
    this.users.delete(id)
    await this.database.query('DELETE FROM auth.users WHERE id=$1', [id])
  }
}
