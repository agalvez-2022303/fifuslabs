import type { AuthUser } from '../../packages/shared-types/src'
import type { UserRepository } from '../repositories/user-repository'
import type { AuthProvider } from './auth-provider'
import type { IdentityGateway } from './identity-gateway'

export class SupabaseAuthProvider implements AuthProvider {
  constructor(
    private readonly identities: IdentityGateway,
    private readonly profiles: UserRepository
  ) {}
  async verify(request: Request): Promise<AuthUser | null> {
    const match = /^Bearer ([^\s]+)$/i.exec(request.headers.get('authorization') ?? '')
    if (!match || match[1].length > 16384) return null
    const id = await this.identities.verifyAccessToken(match[1])
    if (!id) return null
    const profile = await this.profiles.get(id)
    // Roles are authoritative in PostgreSQL. Never trust user_metadata or request headers.
    return profile?.active ? { userId: profile.id, role: profile.role } : null
  }
}
