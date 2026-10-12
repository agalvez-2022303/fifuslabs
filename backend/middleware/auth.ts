import type { MiddlewareHandler } from 'hono'
import type { UserRole } from '../../packages/shared-types/src'
import type { AuthProvider } from '../auth/auth-provider'
import { ForbiddenError, UnauthorizedError } from '../errors'
import type { AppEnv } from '../http-types'

export function identify(provider: AuthProvider): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    c.set('user', await provider.verify(c.req.raw))
    await next()
  }
}
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.get('user')) throw new UnauthorizedError()
  await next()
}
export function requireRole(role: UserRole): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const user = c.get('user')
    if (!user) throw new UnauthorizedError()
    if (user.role !== role) throw new ForbiddenError()
    await next()
  }
}
