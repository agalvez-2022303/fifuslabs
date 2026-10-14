import { Hono } from 'hono'
import type { AppEnv } from '../http-types'
import type { CategoryService } from '../services/category-service'
/** @deprecated Legacy categories response contract retained for existing UI consumers. */
export function categoryRoutes(service: CategoryService) {
  return new Hono<AppEnv>().get('/', async c => {
    const data = await service.list()
    // Legacy response shape retained; categories remain a supported public endpoint.
    return c.json({ data, total: data.length })
  })
}
