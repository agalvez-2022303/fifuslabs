import { Hono } from 'hono'
import { changePasswordSchema, loginSchema, passwordResetSchema, refreshSchema, registerSchema } from '../../packages/shared-types/src'
import type { AppEnv } from '../http-types'
import { requireAuth } from '../middleware/auth'
import { validate } from '../middleware/validation'
import type { AuthService } from '../services/auth-service'
import type { UserService } from '../services/user-service'

export function authRoutes(service: AuthService, users: UserService) {
  const routes = new Hono<AppEnv>()
  routes.post('/register', validate(registerSchema), async c =>
    c.json({ data: await service.register(c.get('input')) }, 201)
  )
  routes.post('/login', validate(loginSchema), async c =>
    c.json({ data: await service.login(c.get('input')) })
  )
  routes.post('/refresh', validate(refreshSchema), async c =>
    c.json({ data: await service.refresh(c.get('input')) })
  )
  routes.post('/password-reset', validate(passwordResetSchema), async c => c.json({ data: await service.requestReset(c.get('input')) }))
  routes.put('/password', requireAuth, validate(changePasswordSchema), async c => {
    await service.changePassword(c.get('input'), c.req.header('authorization')!.slice(7))
    return c.body(null, 204)
  })
  routes.get('/me', requireAuth, async c => c.json({ data: await users.self(c.get('user')!) }))
  routes.post('/logout', requireAuth, async c => {
    await service.logout(c.req.header('authorization')!.slice(7), c.get('user')!)
    return c.body(null, 204)
  })
  return routes
}
