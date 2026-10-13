import type { AuthUser } from '../../packages/shared-types/src'
import type { AuthProvider } from './auth-provider'

/** LOCAL ONLY. Never turn development headers into production identities. */
export class DevAuthProvider implements AuthProvider {
  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}
  async verify(request: Request): Promise<AuthUser | null> {
    if (this.env.NODE_ENV === 'production' || this.env.VERCEL || this.env.DEV_AUTH !== 'true')
      return null
    const userId = request.headers.get('x-dev-user')?.trim()
    const role = request.headers.get('x-dev-role')
    if (!userId || userId.length > 200 || (role !== 'teacher' && role !== 'student')) return null
    return { userId, role }
  }
}
