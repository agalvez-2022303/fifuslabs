import type { AuthSession } from '../../packages/shared-types/src'
export interface IdentityResult {
  userId: string
  session: AuthSession | null
}
/** Credentials and sessions are managed by the identity provider, not PostgreSQL app tables. */
export interface IdentityGateway {
  verifyAccessToken(token: string): Promise<string | null>
  login(email: string, password: string): Promise<IdentityResult>
  register(email: string, password: string): Promise<IdentityResult>
  refresh(token: string): Promise<IdentityResult>
  logout(token: string): Promise<void>
  createUser(email: string, password: string): Promise<string>
  setDisabled(id: string, disabled: boolean): Promise<void>
  deleteUser(id: string): Promise<void>
}
