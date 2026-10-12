import { Hono, type Context } from 'hono'
import { z } from 'zod'
import {
  createTemaSchema,
  itemCreateSchemas,
  itemPatchSchemas,
  listTemasSchema,
  patchStatusSchema,
  patchTemaSchema,
  putTeoriaSchema,
  reorderSchema,
  versionSchema,
  type AuthUser,
  type TemaConfig,
  type TemasQuery,
} from '../../packages/shared-types/src'
import type { AppEnv } from '../http-types'
import { requireAuth, requireRole } from '../middleware/auth'
import { itemInput, requireVersion, validate, validateParams } from '../middleware/validation'
import type { ItemKind, TemaService } from '../services/tema-service'

function user(c: Context<AppEnv>): AuthUser {
  return c.get('user')!
}
function response(c: Context<AppEnv>, tema: TemaConfig, status: 200 | 201 = 200) {
  c.header('ETag', `"${tema.version}"`)
  return c.json({ data: tema }, status)
}
export function temaRoutes(service: TemaService) {
  const routes = new Hono<AppEnv>()
  routes.use('*', validateParams)
  routes.get('/', validate(listTemasSchema, 'query'), async c =>
    c.json({ data: await service.list(c.get('input') as TemasQuery, c.get('user')) })
  )
  routes.get('/:slug', async c =>
    response(c, await service.get(c.req.param('slug'), c.get('user')))
  )
  const role = requireRole('teacher')
  routes.post('/', requireAuth, role, validate(createTemaSchema), async c => {
    const tema = await service.create(c.get('input'), user(c))
    c.header('Location', `/api/temas/${tema.slug}`)
    return response(c, tema, 201)
  })
  routes.patch('/:slug', requireAuth, role, validate(patchTemaSchema), requireVersion, async c =>
    response(c, await service.patch(c.req.param('slug'), c.get('input'), user(c), c.get('version')))
  )
  routes.delete('/:slug', requireAuth, role, requireVersion, async c => {
    const tema = await service.remove(c.req.param('slug'), user(c), c.get('version'))
    c.header('ETag', `"${tema.version}"`)
    return c.body(null, 204)
  })
  routes.patch(
    '/:slug/status',
    requireAuth,
    role,
    validate(patchStatusSchema),
    requireVersion,
    async c =>
      response(
        c,
        await service.status(c.req.param('slug'), c.get('input'), user(c), c.get('version'))
      )
  )
  routes.put(
    '/:slug/teoria',
    requireAuth,
    role,
    validate(putTeoriaSchema),
    requireVersion,
    async c =>
      response(
        c,
        await service.introduction(c.req.param('slug'), c.get('input'), user(c), c.get('version'))
      )
  )
  const paths: Record<ItemKind, string> = {
    secciones: 'teoria/secciones',
    resumen: 'teoria/resumen',
    formulas: 'formulas',
    glosario: 'glosario',
  }
  // Register literal reorder paths before /:id so "reorder" never becomes an item ID.
  for (const kind of ['secciones', 'formulas', 'glosario'] as const) {
    routes.patch(
      `/:slug/${kind}/reorder`,
      requireAuth,
      role,
      validate(reorderSchema),
      requireVersion,
      async c =>
        response(
          c,
          await service.reorder(
            c.req.param('slug')!,
            kind,
            c.get('input') as string[],
            user(c),
            c.get('version')
          )
        )
    )
  }
  for (const kind of Object.keys(paths) as ItemKind[]) {
    const base = `/:slug/${paths[kind]}`
    routes.post(
      base,
      requireAuth,
      role,
      validate(itemCreateSchemas[kind] as z.ZodType),
      requireVersion,
      async c =>
        response(
          c,
          await service.addItem(
            c.req.param('slug')!,
            kind,
            itemInput(c.get('input')),
            user(c),
            c.get('version')
          ),
          201
        )
    )
    routes.patch(
      `${base}/:id`,
      requireAuth,
      role,
      validate(itemPatchSchemas[kind] as z.ZodType),
      requireVersion,
      async c =>
        response(
          c,
          await service.patchItem(
            c.req.param('slug')!,
            kind,
            c.req.param('id')!,
            itemInput(c.get('input')),
            user(c),
            c.get('version')
          )
        )
    )
    routes.delete(`${base}/:id`, requireAuth, role, requireVersion, async c => {
      const tema = await service.removeItem(
        c.req.param('slug')!,
        kind,
        c.req.param('id')!,
        user(c),
        c.get('version')
      )
      c.header('ETag', `"${tema.version}"`)
      return c.body(null, 204)
    })
  }
  routes.get('/:slug/revisions', requireAuth, role, async c =>
    c.json({ data: await service.history(c.req.param('slug'), user(c)) })
  )
  routes.post(
    '/:slug/revisions/:id/restore',
    requireAuth,
    role,
    // A restore has no content payload; If-Match supplies its concurrency token.
    async (c, next) => {
      if (c.get('rawBody'))
        return validate(z.object({ version: versionSchema.optional() }).strict())(c, next)
      await next()
    },
    requireVersion,
    async c =>
      response(
        c,
        await service.restore(c.req.param('slug'), c.req.param('id'), user(c), c.get('version'))
      )
  )
  return routes
}
