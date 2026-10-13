import {
  createUserSchema,
  patchUserSchema,
  type AuthUser,
  type UserProfile,
  type UsersQuery,
} from '../../packages/shared-types/src'
import type { IdentityGateway } from '../auth/identity-gateway'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../errors'
import type { UserRepository } from '../repositories/user-repository'
import { sanitizeText } from './content-validation'

export class UserService {
  constructor(
    private readonly profiles: UserRepository,
    private readonly identities: IdentityGateway
  ) {}
  private teacher(user: AuthUser) {
    if (user.role !== 'teacher') throw new ForbiddenError()
  }
  async self(user: AuthUser): Promise<UserProfile> {
    const profile = await this.profiles.get(user.userId)
    if (!profile) throw new NotFoundError('Usuario no encontrado')
    return profile
  }
  async get(id: string, user: AuthUser) {
    this.teacher(user)
    const profile = await this.profiles.get(id)
    if (!profile) throw new NotFoundError('Usuario no encontrado')
    return profile
  }
  async list(query: UsersQuery, user: AuthUser) {
    this.teacher(user)
    return this.profiles.list(query)
  }
  async create(input: unknown, user: AuthUser) {
    this.teacher(user)
    const result = createUserSchema.safeParse(input)
    if (!result.success)
      throw new ValidationError(
        'Usuario inválido',
        result.error.issues.map(issue => ({ path: issue.path, message: issue.message }))
      )
    const data = result.data
    const name = sanitizeText(data.name).trim()
    if (!name) throw new ValidationError('El nombre no puede quedar vacío')
    const id = await this.identities.createUser(data.email, data.password)
    try {
      const profile = await this.profiles.get(id)
      if (!profile) throw new NotFoundError('El trigger de perfiles no está instalado')
      return await this.profiles.update(id, { name, role: data.role }, profile.version)
    } catch (error: unknown) {
      // Compensating deletion: an unsuccessful create must not leave an unintended account.
      await this.identities.deleteUser(id).catch(() => {
        console.error('No se pudo compensar la creación de un usuario')
      })
      throw error
    }
  }
  async patch(id: string, input: unknown, user: AuthUser, version: number) {
    this.teacher(user)
    const result = patchUserSchema.safeParse(input)
    if (!result.success) throw new ValidationError('Usuario inválido', result.error.issues)
    const data = result.data
    const patch: Partial<Pick<UserProfile, 'name' | 'role' | 'active'>> = {}
    if (data.name !== undefined) {
      patch.name = sanitizeText(data.name).trim()
      if (!patch.name) throw new ValidationError('El nombre no puede quedar vacío')
    }
    if (data.role !== undefined) patch.role = data.role
    if (data.active !== undefined) patch.active = data.active
    const current = await this.get(id, user)
    if (current.version !== version) throw new ConflictError('Versión de usuario desactualizada')
    // Unban first: a failed local CAS still leaves the profile inactive. Disable locally first.
    if (data.active === true) await this.identities.setDisabled(id, false)
    const profile = await this.profiles.update(id, patch, version)
    if (data.active === false) await this.identities.setDisabled(id, true)
    return profile
  }
  async remove(id: string, user: AuthUser, version: number) {
    this.teacher(user)
    const profile = await this.profiles.update(id, { active: false }, version)
    await this.identities.setDisabled(id, true)
    return profile
  }
}
