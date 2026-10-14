import {
  loginSchema,
  refreshSchema,
  registerSchema,
  passwordResetSchema,
  changePasswordSchema,
  type AuthUser,
} from '../../packages/shared-types/src'
import type { IdentityGateway, IdentityResult } from '../auth/identity-gateway'
import { UnauthorizedError, ValidationError } from '../errors'
import type { UserRepository } from '../repositories/user-repository'
import { sanitizeText } from './content-validation'

export class AuthService {
  constructor(
    private readonly identities: IdentityGateway,
    private readonly profiles: UserRepository
  ) {}
  private async session(result: IdentityResult) {
    const user = await this.profiles.get(result.userId)
    if (!user?.active || !result.session) throw new UnauthorizedError()
    return { session: result.session, user }
  }
  async login(input: unknown) {
    const parsed = loginSchema.safeParse(input)
    if (!parsed.success) throw new ValidationError('Credenciales inválidas')
    return this.session(await this.identities.login(parsed.data.email, parsed.data.password))
  }
  async register(input: unknown) {
    const parsed = registerSchema.safeParse(input)
    if (!parsed.success) throw new ValidationError('Registro inválido')
    const name = sanitizeText(parsed.data.name).trim()
    if (!name) throw new ValidationError('El nombre no puede quedar vacío')
    const result = await this.identities.register(parsed.data.email, parsed.data.password)
    const profile = await this.profiles.get(result.userId)
    if (profile && !profile.name && profile.version === 1)
      await this.profiles.update(profile.id, { name }, profile.version)
    // Email-confirmation responses remain generic, including Supabase's duplicate-user obfuscation.
    return result.session
      ? this.session(result)
      : { session: null, message: 'Revisa tu correo para confirmar la cuenta' }
  }
  async refresh(input: unknown) {
    const parsed = refreshSchema.safeParse(input)
    if (!parsed.success) throw new ValidationError('Refresh token inválido')
    return this.session(await this.identities.refresh(parsed.data.refreshToken))
  }
  async logout(token: string, _user: AuthUser) {
    await this.identities.logout(token)
  }
  async requestReset(input: unknown) {
    const parsed = passwordResetSchema.safeParse(input)
    if (!parsed.success) throw new ValidationError('Correo inválido')
    await this.identities.sendPasswordReset(parsed.data.email)
    return { message: 'Si existe una cuenta con ese correo, recibirás instrucciones para recuperar el acceso.' }
  }
  async changePassword(input: unknown, token: string) {
    const parsed = changePasswordSchema.safeParse(input)
    if (!parsed.success) throw new ValidationError('La contraseña debe tener entre 12 y 128 caracteres')
    await this.identities.changePassword(token, parsed.data.password)
  }
}
