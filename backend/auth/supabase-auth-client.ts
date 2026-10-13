import { z } from 'zod'
import { authSessionSchema } from '../../packages/shared-types/src'
import {
  AppError,
  ConflictError,
  ServiceUnavailableError,
  UnauthorizedError,
  ValidationError,
} from '../errors'
import type { IdentityGateway, IdentityResult } from './identity-gateway'

/** Supabase Auth verifies JWT signatures/expiry server-side; supports asymmetric and legacy JWT keys. */
export class SupabaseAuthClient implements IdentityGateway {
  constructor(
    private readonly url: string,
    private readonly publicKey: string,
    private readonly adminKey: string,
    private readonly fetcher: typeof fetch = fetch
  ) {
    if (new URL(url).protocol !== 'https:') throw new Error('SUPABASE_URL debe usar HTTPS')
    if (!publicKey || !adminKey) throw new Error('Faltan las claves de Supabase Auth')
  }
  private async request(
    endpoint: string,
    options: {
      method?: string
      body?: unknown
      token?: string
      admin?: boolean
      invalidCredentials?: boolean
    } = {}
  ): Promise<unknown> {
    const key = options.admin ? this.adminKey : this.publicKey
    let response: Response
    try {
      response = await this.fetcher(`${this.url.replace(/\/$/, '')}/auth/v1/${endpoint}`, {
        method: options.method ?? 'GET',
        signal: AbortSignal.timeout(10000),
        headers: {
          apikey: key,
          'Content-Type': 'application/json',
          // Legacy service_role is a JWT; new sb_secret keys belong in apikey, not Bearer.
          ...(options.token
            ? { Authorization: `Bearer ${options.token}` }
            : options.admin && !key.startsWith('sb_secret_')
              ? { Authorization: `Bearer ${key}` }
              : {}),
        },
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      })
    } catch {
      throw new ServiceUnavailableError()
    }
    if (response.status === 204) return null
    const payload: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const error =
        payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
      const code =
        typeof error.error_code === 'string'
          ? error.error_code
          : typeof error.code === 'string'
            ? error.code
            : ''
      if (response.status === 429)
        throw new AppError(429, 'RATE_LIMITED', 'Demasiados intentos; inténtalo más tarde')
      if (response.status >= 500) throw new ServiceUnavailableError()
      if (code === 'email_exists' || code === 'user_already_exists' || response.status === 409)
        throw new ConflictError('El correo ya está registrado')
      if (options.invalidCredentials || response.status === 401 || response.status === 403)
        throw new UnauthorizedError()
      throw new ValidationError('Supabase Auth rechazó la solicitud', {
        code: code || 'AUTH_REQUEST_REJECTED',
      })
    }
    return payload
  }
  private result(payload: unknown): IdentityResult {
    const object = z.record(z.string(), z.unknown()).parse(payload)
    const identity = z.object({ id: z.string().uuid() }).parse(object.user ?? object)
    return {
      userId: identity.id,
      session: object.access_token ? authSessionSchema.parse(object) : null,
    }
  }
  async verifyAccessToken(token: string): Promise<string | null> {
    try {
      const result = await this.request('user', { token, invalidCredentials: true })
      return z.object({ id: z.string().uuid() }).parse(result).id
    } catch (error: unknown) {
      if (error instanceof UnauthorizedError) return null
      throw error
    }
  }
  async login(email: string, password: string) {
    return this.result(
      await this.request('token?grant_type=password', {
        method: 'POST',
        body: { email, password },
        invalidCredentials: true,
      })
    )
  }
  async register(email: string, password: string) {
    return this.result(await this.request('signup', { method: 'POST', body: { email, password } }))
  }
  async refresh(token: string) {
    return this.result(
      await this.request('token?grant_type=refresh_token', {
        method: 'POST',
        body: { refresh_token: token },
        invalidCredentials: true,
      })
    )
  }
  async logout(token: string) {
    await this.request('logout?scope=global', { method: 'POST', token })
  }
  async sendPasswordReset(email: string) {
    await this.request('recover', { method: 'POST', body: { email } })
  }
  async changePassword(token: string, password: string) {
    await this.request('user', { method: 'PUT', token, body: { password } })
  }
  async createUser(email: string, password: string): Promise<string> {
    const payload = await this.request('admin/users', {
      method: 'POST',
      admin: true,
      body: { email, password, email_confirm: true },
    })
    return this.result(payload).userId
  }
  async setDisabled(id: string, disabled: boolean) {
    await this.request(`admin/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      admin: true,
      body: { ban_duration: disabled ? '876000h' : 'none' },
    })
  }
  async deleteUser(id: string) {
    await this.request(`admin/users/${encodeURIComponent(id)}`, { method: 'DELETE', admin: true })
  }
}
