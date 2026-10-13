import { Hono } from 'hono'
import type { AuthProvider } from './auth/auth-provider'
import { AppError } from './errors'
import type { AppEnv } from './http-types'
import { identify } from './middleware/auth'
import { bodyLimit } from './middleware/body-limit'
import { categoryRoutes } from './routes/categories'
import { healthRoutes } from './routes/health'
import { legacyRoutes } from './routes/legacy'
import { temaRoutes } from './routes/temas'
import type { CategoryService } from './services/category-service'
import type { LegacyService } from './services/legacy-service'
import type { TemaService } from './services/tema-service'
import type { AuthService } from './services/auth-service'
import type { UserService } from './services/user-service'
import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/users'
import type { HealthService } from './services/health-service'

export interface AppDependencies {
  auth: AuthProvider
  temas: TemaService
  categories: CategoryService
  legacy: LegacyService
  accounts?: { auth: AuthService; users: UserService }
  storage?: 'json-temporary' | 'postgres'
  health?: HealthService
}
export function createApp(deps: AppDependencies) {
  const app = new Hono<AppEnv>()
  app.use(
    '/api/*',
    identify(deps.auth),
    async (c, next) => {
      // Never share-cache role-dependent content or development identities.
      c.header('Cache-Control', 'no-store')
      c.header('Vary', 'Authorization, x-dev-user, x-dev-role')
      await next()
    },
    bodyLimit
  )
  app.route('/api/temas', temaRoutes(deps.temas))
  app.route('/api/categories', categoryRoutes(deps.categories))
  app.route('/api/health', healthRoutes(deps.storage, deps.health))
  if (deps.accounts) {
    app.route('/api/auth', authRoutes(deps.accounts.auth, deps.accounts.users))
    app.route('/api/users', userRoutes(deps.accounts.users))
  }
  app.route('/api', legacyRoutes(deps.legacy))
  app.notFound(c =>
    c.json({ error: { code: 'NOT_FOUND', message: 'Endpoint no encontrado' } }, 404)
  )
  app.onError((error, c) => {
    if (error instanceof AppError)
      return c.json(
        {
          error: {
            code: error.code,
            message: error.message,
            ...(error.details === undefined ? {} : { details: error.details }),
          },
        },
        error.status
      )
    console.error('Backend error:', error)
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } }, 500)
  })
  return app
}
