import { Hono } from 'hono'
import type { AppEnv } from '../http-types'
export function healthRoutes() {
  return new Hono<AppEnv>().get('/', c =>
    c.json({ data: { status: 'ok', storage: 'json-temporary' } })
  )
}
