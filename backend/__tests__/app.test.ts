import { describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { createApp } from '../app'
import { DevAuthProvider } from '../auth/dev-auth-provider'
import { CategoryService } from '../services/category-service'
import { LegacyService } from '../services/legacy-service'
import { createInput, fixture, setup } from './fixtures'
import { MAX_BODY_BYTES } from '../middleware/body-limit'
import type { TemaConfig, TemaRevision } from '../../packages/shared-types/src'

function testApp(env: NodeJS.ProcessEnv = { NODE_ENV: 'development', DEV_AUTH: 'true' }) {
  const { repository, service } = setup()
  return {
    repository,
    service,
    app: createApp({
      auth: new DevAuthProvider(env),
      temas: service,
      categories: new CategoryService(repository),
      legacy: new LegacyService(repository, repository, repository, service),
    }),
  }
}
const teacherHeaders = {
  'x-dev-user': 'teacher-test',
  'x-dev-role': 'teacher',
  'Content-Type': 'application/json',
}
const studentHeaders = { ...teacherHeaders, 'x-dev-role': 'student' }
function json(body: unknown, headers: HeadersInit = teacherHeaders): RequestInit {
  return { headers, body: JSON.stringify(body) }
}

describe('Hono HTTP API', () => {
  it('enforces 401/403 and closes DevAuth in production, preview or disabled mode', async () => {
    const { app } = testApp()
    expect(
      (
        await app.request('/api/temas', {
          method: 'POST',
          ...json(createInput(), { 'Content-Type': 'application/json' }),
        })
      ).status
    ).toBe(401)
    expect(
      (await app.request('/api/temas', { method: 'POST', ...json(createInput(), studentHeaders) }))
        .status
    ).toBe(403)
    for (const env of [
      { NODE_ENV: 'production', DEV_AUTH: 'true' },
      { NODE_ENV: 'development', DEV_AUTH: 'false' },
      { NODE_ENV: 'development', DEV_AUTH: 'true', VERCEL: '1' },
    ])
      expect(
        (await testApp(env).app.request('/api/temas', { method: 'POST', ...json(createInput()) }))
          .status
      ).toBe(401)
  })
  it('lists public themes, filters, paginates and hides drafts in all legacy endpoints', async () => {
    const { app } = testApp()
    const created = await app.request('/api/temas', { method: 'POST', ...json(createInput()) })
    expect(created.status).toBe(201)
    expect(created.headers.get('Location')).toBe('/api/temas/new-tema')
    expect((await app.request('/api/temas/new-tema')).status).toBe(404)
    expect((await app.request('/api/content/new-tema')).status).toBe(404)
    expect((await app.request('/api/simulations/new-tema')).status).toBe(404)
    expect((await (await app.request('/api/temas')).json()).data.total).toBe(1)
    expect((await app.request('/api/temas?status=draft')).status).toBe(403)
    const listed = await app.request(
      '/api/temas?categoriaId=mecanica&dificultad=basico&q=MRU&limit=1&offset=1',
      { headers: teacherHeaders }
    )
    const page = await listed.json()
    expect(page.data.total).toBe(2)
    expect(page.data.items).toHaveLength(1)
    expect(
      (await (await app.request('/api/simulations', { headers: teacherHeaders })).json()).data
    ).toHaveLength(2)
  })
  it('returns uniform 400/404/422 errors and validates versions and immutable slugs', async () => {
    const { app } = testApp()
    const malformed = await app.request('/api/temas', {
      method: 'POST',
      headers: teacherHeaders,
      body: '{',
    })
    expect(malformed.status).toBe(400)
    expect((await malformed.json()).error.code).toBe('BAD_REQUEST')
    expect((await app.request('/api/temas', { method: 'POST', ...json({}) })).status).toBe(422)
    expect((await app.request('/api/temas?limit=0')).status).toBe(422)
    expect((await app.request('/api/temas/INVALID_SLUG')).status).toBe(422)
    expect(
      (
        await app.request('/api/temas/mru/formulas/not-a-uuid', {
          method: 'PATCH',
          ...json({ expresion: 'x=1', version: 1 }),
        })
      ).status
    ).toBe(422)
    expect((await app.request('/api/not-found')).status).toBe(404)
    expect(
      (await app.request('/api/temas/mru', { method: 'PATCH', ...json({ titulo: 'new' }) })).status
    ).toBe(422)
    expect(
      (
        await app.request('/api/temas/mru', {
          method: 'PATCH',
          ...json({ slug: 'changed', version: 1 }),
        })
      ).status
    ).toBe(422)
    expect(
      (
        await app.request('/api/temas/mru', {
          method: 'PATCH',
          ...json({ titulo: 'new', version: 1 }, { ...teacherHeaders, 'If-Match': '2' }),
        })
      ).status
    ).toBe(400)
  })
  it('publishes, sanitizes text, rejects invalid LaTeX and detects stale versions', async () => {
    const { app } = testApp()
    const updated = await app.request('/api/temas/mru/teoria', {
      method: 'PUT',
      ...json({
        introduccion: '<script>evil()</script><p onload="bad()">**seguro**</p>',
        version: 1,
      }),
    })
    expect(updated.status).toBe(200)
    expect(updated.headers.get('ETag')).toBe('"2"')
    expect((await updated.json()).data.teoria.introduccion).toBe('**seguro**')
    expect(
      (
        await app.request(`/api/temas/mru/formulas/${fixture.formulas[0].id}`, {
          method: 'PATCH',
          ...json({ expresion: '\\frac{', version: 2 }),
        })
      ).status
    ).toBe(422)
    expect(
      (
        await app.request('/api/temas/mru/status', {
          method: 'PATCH',
          ...json({ status: 'draft', version: 2 }),
        })
      ).status
    ).toBe(200)
    expect((await app.request('/api/temas/mru')).status).toBe(404)
    expect(
      (
        await app.request('/api/temas/mru/status', {
          method: 'PATCH',
          ...json({ status: 'published', version: 2 }),
        })
      ).status
    ).toBe(409)
    expect(
      (
        await app.request('/api/temas/mru/status', {
          method: 'PATCH',
          ...json({ status: 'published', version: 3 }),
        })
      ).status
    ).toBe(200)
    expect((await app.request('/api/temas/mru')).status).toBe(200)
  })
  it.each(['secciones', 'resumen', 'formulas', 'glosario'] as const)(
    'routes %s CRUD and preserves IDs',
    async kind => {
      const { app } = testApp()
      const inputs = {
        secciones: { titulo: 'new', contenido: '**theory**' },
        resumen: { contenido: 'summary' },
        formulas: { nombre: 'formula', expresion: 'x=1', descripcion: 'desc', variables: [] },
        glosario: { termino: 'new', definicion: 'definition' },
      }
      const base = `/api/temas/mru/${kind === 'secciones' || kind === 'resumen' ? `teoria/${kind}` : kind}`
      const added = await app.request(base, {
        method: 'POST',
        ...json({ ...inputs[kind], version: 1 }),
      })
      expect(added.status).toBe(201)
      const tema = (await added.json()).data as TemaConfig
      const collection = kind === 'secciones' || kind === 'resumen' ? tema.teoria[kind] : tema[kind]
      const id = collection.at(-1)!.id
      const changes = {
        secciones: { titulo: 'edited' },
        resumen: { contenido: 'edited' },
        formulas: { expresion: 'x=2' },
        glosario: { definicion: 'edited' },
      }
      expect(
        (
          await app.request(`${base}/${id}`, {
            method: 'PATCH',
            ...json({ ...changes[kind], version: 2 }),
          })
        ).status
      ).toBe(200)
      expect(
        (
          await app.request(`${base}/${randomUUID()}`, {
            method: 'DELETE',
            headers: { ...teacherHeaders, 'If-Match': '3' },
          })
        ).status
      ).toBe(404)
      const removed = await app.request(`${base}/${id}`, {
        method: 'DELETE',
        headers: { ...teacherHeaders, 'If-Match': '3' },
      })
      expect(removed.status).toBe(204)
      expect(await removed.text()).toBe('')
      expect(removed.headers.get('ETag')).toBe('"4"')
    }
  )
  it.each(['secciones', 'formulas', 'glosario'] as const)(
    'routes exact %s reorders',
    async kind => {
      const { app } = testApp()
      const items = kind === 'secciones' ? fixture.teoria.secciones : fixture[kind]
      const ids = items.map(item => item.id).reverse()
      const headers = { ...teacherHeaders, 'If-Match': '1' }
      expect(
        (
          await app.request(`/api/temas/mru/${kind}/reorder`, {
            method: 'PATCH',
            ...json(ids.slice(1), headers),
          })
        ).status
      ).toBe(422)
      const result = await app.request(`/api/temas/mru/${kind}/reorder`, {
        method: 'PATCH',
        ...json(ids, headers),
      })
      expect(result.status).toBe(200)
      const tema = (await result.json()).data as TemaConfig
      expect(
        (kind === 'secciones' ? tema.teoria.secciones : tema[kind]).map(item => item.id)
      ).toEqual(ids)
    }
  )
  it('protects revisions, restores snapshots and returns 409 for duplicate creation', async () => {
    const { app } = testApp()
    await app.request('/api/temas/mru', {
      method: 'PATCH',
      ...json({ titulo: 'first', version: 1 }),
    })
    await app.request('/api/temas/mru', {
      method: 'PATCH',
      ...json({ titulo: 'second', version: 2 }),
    })
    expect((await app.request('/api/temas/mru/revisions')).status).toBe(401)
    expect(
      (await app.request('/api/temas/mru/revisions', { headers: studentHeaders })).status
    ).toBe(403)
    const revisions = (
      await (await app.request('/api/temas/mru/revisions', { headers: teacherHeaders })).json()
    ).data as TemaRevision[]
    const restored = await app.request(`/api/temas/mru/revisions/${revisions[0].id}/restore`, {
      method: 'POST',
      headers: { ...teacherHeaders, 'If-Match': '3' },
    })
    expect(restored.status).toBe(200)
    expect((await restored.json()).data.titulo).toBe('first')
    expect(
      (await app.request('/api/temas', { method: 'POST', ...json(createInput('mru')) })).status
    ).toBe(409)
  })
  it('serves legacy contracts and health without leaking internal history', async () => {
    const { app } = testApp()
    expect((await app.request('/api/health')).status).toBe(200)
    expect((await (await app.request('/api/categories')).json()).total).toBe(9)
    const content = (await (await app.request('/api/content/mru')).json()).data
    expect(typeof content.teoria).toBe('string')
    expect(content.unidades.length).toBeGreaterThan(0)
    expect((await (await app.request('/api/temas/mru')).json()).data._storage).toBeUndefined()
    expect((await app.request('/api/temas/mru')).headers.get('Cache-Control')).toBe('no-store')
  })
  it('limits streamed bodies even when Content-Length is absent', async () => {
    const { app } = testApp()
    const response = await app.request('/api/temas', {
      method: 'POST',
      headers: teacherHeaders,
      body: 'x'.repeat(MAX_BODY_BYTES + 1),
    })
    expect(response.status).toBe(413)
    expect((await response.json()).error.code).toBe('PAYLOAD_TOO_LARGE')
  })
})
