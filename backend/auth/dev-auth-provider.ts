import type { AuthUser } from '../../packages/shared-types/src'
import type { AuthProvider } from './auth-provider'

const LOOPBACK = /^(\[\s*::1\s*\]|::1|127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})|localhost)$/i

/**
 * Local-only provider that trusts `x-dev-user` / `x-dev-role` headers.
 *
 * It must be impossible to reach from a deployed environment, so it requires
 * BOTH an explicit opt-in flag AND a loopback Host header. Relying on
 * NODE_ENV alone was not enough: any host that forgot to set it would have
 * handed out teacher roles to whoever sent the right headers.
 */
export class DevAuthProvider implements AuthProvider {
  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  private enabled(): boolean {
    return this.env.NODE_ENV !== 'production' && !this.env.VERCEL && this.env.DEV_AUTH === 'true'
  }

  async verify(request: Request): Promise<AuthUser | null> {
    if (!this.enabled()) return null

    // `Host` is a forbidden header in fetch, so it is never readable here;
    // the URL host is authoritative and always available.
    let hostname: string
    try {
      hostname = new URL(request.url).hostname
    } catch {
      return null
    }
    if (!LOOPBACK.test(hostname)) return null

    const userId = request.headers.get('x-dev-user')?.trim()
    const role = request.headers.get('x-dev-role')
    if (!userId || userId.length > 200 || (role !== 'teacher' && role !== 'student')) return null
    return { userId, role }
  }
}
