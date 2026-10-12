import { Hono } from 'hono'
import type { AppEnv } from '../http-types'
import type { HealthService } from '../services/health-service'
export function healthRoutes(storage = 'json-temporary', service?: HealthService) {
  return new Hono<AppEnv>().get('/', async c =>
    c.json({ data: service ? await service.get() : { status: 'ok', storage } })
  )
}
