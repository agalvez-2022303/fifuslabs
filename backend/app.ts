import { Hono } from 'hono'
import type { AuthProvider } from './auth/auth-provider'
import { AppError } from './errors'
import type { AppEnv } from './http-types'
import { identify } from './middleware/auth'
import { bodyLimit } from './middleware/body-limit'
import { AUTH_RATE_LIMITS, READ_RATE_LIMITS, rateLimit } from './middleware/rate-limit'
import { categoryRoutes } from './routes/categories'
import { healthRoutes } from './routes/health'
import { legacyRoutes } from './routes/legacy'
import { temaRoutes } from './routes/temas'
import type { CategoryService } from './services/category-service'
import type { LegacyService } from './services/legacy-service'
import type { TemaService } from './services/tema-service'
import type { AuthService } from './services/auth-service'
import type { UserService } from './services/user-service'
import type { EjercicioService } from './services/ejercicio-service'
import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/users'
import { ejercicioRoutes } from './routes/ejercicios'
import type { HealthService } from './services/health-service'

export interface AppDependencies {
  auth: AuthProvider
  temas: TemaService
  categories: CategoryService
  legacy: LegacyService
  ejercicios?: EjercicioService
  accounts?: { auth: AuthService; users: UserService }
  storage?: 'json-temporary' | 'postgres'
  health?: HealthService
  /** Shared limiter options; tests inject a clock and store for determinism. */
  limiter?: { now?: () => number; store?: Map<string, { count: number; resetAt: number }> }
}
export function createApp(deps: AppDependencies) {
  const app = new Hono<AppEnv>()
  const limiter = deps.limiter ?? {}
  // Cheapest gate first: shed abusive traffic before parsing or touching the database.
  app.use('/api/*', rateLimit(READ_RATE_LIMITS, limiter))
  app.use('/api/auth/*', rateLimit(AUTH_RATE_LIMITS, limiter))
  app.use(
    '/api/*',
    identify(deps.auth),
    async (c, next) => {
      // Never share-cache role-dependent content or development identities.
      c.header('Cache-Control', 'no-store')
      c.header('Vary', 'Authorization, x-dev-user, x-dev-role')
      // Defence in depth for non-Vercel deployments; vercel.json sets the same
      // headers (plus CSP/HSTS) for the SPA and assets.
      c.header('X-Content-Type-Options', 'nosniff')
      c.header('X-Frame-Options', 'DENY')
      c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
      await next()
    },
    bodyLimit
  )
  app.route('/api/temas', temaRoutes(deps.temas))
  app.route('/api/categories', categoryRoutes(deps.categories))
  app.route('/api/health', healthRoutes(deps.storage, deps.health))
  if (deps.ejercicios) {
    app.route('/api/ejercicios', ejercicioRoutes(deps.ejercicios))
  }
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
