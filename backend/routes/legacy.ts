import { Hono } from 'hono'
import { simulationsQuerySchema, type SimulationsQuery } from '../../packages/shared-types/src'
import type { AppEnv } from '../http-types'
import { validate, validateParams } from '../middleware/validation'
import type { LegacyService } from '../services/legacy-service'

/** @deprecated Use /api/temas for editable content. Old contracts are maintained. */
export function legacyRoutes(service: LegacyService) {
  const routes = new Hono<AppEnv>()
  routes.get('/simulations', validate(simulationsQuerySchema, 'query'), async c =>
    c.json(await service.list(c.get('input') as SimulationsQuery, c.get('user')))
  )
  routes.get('/simulations/:slug', validateParams, async c =>
    c.json({ data: await service.get(c.req.param('slug'), c.get('user')) })
  )
  routes.get('/content/:slug', validateParams, async c =>
    c.json({ data: await service.content(c.req.param('slug'), c.get('user')) })
  )
  return routes
}
