import { Hono } from 'hono'
import {
  createUserSchema,
  listUsersSchema,
  patchUserSchema,
  type UsersQuery,
} from '../../packages/shared-types/src'
import type { AppEnv } from '../http-types'
import { requireAuth, requireRole } from '../middleware/auth'
import { requireVersion, validate, validateParams } from '../middleware/validation'
import type { UserService } from '../services/user-service'

export function userRoutes(service: UserService) {
  const routes = new Hono<AppEnv>()
  routes.use('*', requireAuth, requireRole('teacher'))
  routes.get('/', validate(listUsersSchema, 'query'), async c =>
    c.json({ data: await service.list(c.get('input') as UsersQuery, c.get('user')!) })
  )
  routes.get('/:id', validateParams, async c =>
    c.json({ data: await service.get(c.req.param('id'), c.get('user')!) })
  )
  routes.post('/', validate(createUserSchema), async c => {
    const profile = await service.create(c.get('input'), c.get('user')!)
    c.header('ETag', `"${profile.version}"`)
    c.header('Location', `/api/users/${profile.id}`)
    return c.json({ data: profile }, 201)
  })
  routes.patch('/:id', validateParams, validate(patchUserSchema), requireVersion, async c => {
    const profile = await service.patch(
      c.req.param('id'),
      c.get('input'),
      c.get('user')!,
      c.get('version')
    )
    c.header('ETag', `"${profile.version}"`)
    return c.json({ data: profile })
  })
  routes.delete('/:id', validateParams, requireVersion, async c => {
    const profile = await service.remove(c.req.param('id'), c.get('user')!, c.get('version'))
    c.header('ETag', `"${profile.version}"`)
    return c.body(null, 204)
  })
  return routes
}
