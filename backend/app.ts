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

export interface AppDependencies {
  auth: AuthProvider
  temas: TemaService
  categories: CategoryService
  legacy: LegacyService
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
  app.route('/api/health', healthRoutes())
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
