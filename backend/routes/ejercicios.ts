import { Hono } from 'hono'
import {
  createEjercicioSchema,
  patchEjercicioSchema,
  type CreateEjercicioInput,
  type PatchEjercicioInput,
} from '../../packages/shared-types/src'
import type { AppEnv } from '../http-types'
import { requireAuth, requireRole } from '../middleware/auth'
import { validate, validateParams } from '../middleware/validation'
import type { EjercicioService } from '../services/ejercicio-service'

export function ejercicioRoutes(service: EjercicioService) {
  const routes = new Hono<AppEnv>()
  routes.get('/', async c => {
    const tema = c.req.query('tema') || undefined
    const dificultad = c.req.query('dificultad') || undefined
    const q = c.req.query('q') || undefined
    const user = c.get('user')
    const isTeacher = user?.role === 'teacher'
    let items = await service.list({ temaSlug: tema, dificultad, q })
    if (!isTeacher) {
      items = items.filter(item => item.estado === 'published')
    }
    return c.json({ data: items })
  })

  routes.get('/:id', validateParams, async c => {
    const id = c.req.param('id')
    const item = await service.get(id)
    const user = c.get('user')
    const isTeacher = user?.role === 'teacher'
    if (!isTeacher && item.estado !== 'published') {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Ejercicio no encontrado' } }, 404)
    }
    return c.json({ data: item })
  })

  const role = requireRole('teacher')

  routes.post('/', requireAuth, role, validate(createEjercicioSchema), async c => {
    const item = await service.create(c.get('input') as CreateEjercicioInput)
    c.header('Location', `/api/ejercicios/${item.id}`)
    return c.json({ data: item }, 201)
  })

  routes.patch('/:id', requireAuth, role, validateParams, validate(patchEjercicioSchema), async c => {
    const id = c.req.param('id')
    const item = await service.update(id, c.get('input') as PatchEjercicioInput)
    return c.json({ data: item })
  })

  routes.delete('/:id', requireAuth, role, validateParams, async c => {
    const id = c.req.param('id')
    await service.delete(id)
    return c.body(null, 204)
  })

  return routes
}

