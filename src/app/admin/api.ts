import { z } from 'zod'
import {
  categoryIdSchema,
  temaSchema,
  userProfileSchema,
  type Category,
  type TemaConfig,
  type TemaRevision,
} from '@physicslab/shared-types'
import { clearSession, loginResultSchema, readSession, saveSession } from './session'

export const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message)
  }
}
let refreshFlight: Promise<void> | null = null
export async function refreshSession() {
  if (refreshFlight) return refreshFlight
  const ticket = readSession()
  if (!ticket) throw new ApiError(401, 'UNAUTHORIZED', 'Inicia sesión para continuar')
  refreshFlight = (async () => {
    try {
      const result = loginResultSchema.parse(
        await request(
          '/auth/refresh',
          {
            method: 'POST',
            body: JSON.stringify({ refreshToken: ticket.session.refresh_token }),
          },
          false
        )
      )
      // Do not resurrect a session after logout while a refresh was pending.
      if (readSession()?.session.refresh_token === ticket.session.refresh_token) saveSession(result)
    } catch (error: unknown) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403))
        clearSession()
      throw error
    } finally {
      refreshFlight = null
    }
  })()
  return refreshFlight
}
export async function request<T = unknown>(
  path: string,
  init: RequestInit = {},
  authenticated = true,
  retried = false
): Promise<T> {
  const ticket = authenticated ? readSession() : null
  if (ticket && !retried && (ticket.session.expires_at ?? Infinity) <= Date.now() / 1000 + 30)
    await refreshSession()
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  const token = authenticated ? readSession()?.session.access_token : undefined
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${apiBase}${path}`, { ...init, headers })
  if (response.status === 401 && authenticated && !retried && readSession()) {
    await refreshSession()
    return request(path, init, authenticated, true)
  }
  if (response.status === 204) return undefined as T
  const body: unknown = await response.json().catch(() => null)
  const envelope = z
    .object({ error: z.object({ code: z.string(), message: z.string() }) })
    .safeParse(body)
  if (!response.ok) {
    if (response.status === 401 && authenticated) clearSession()
    throw new ApiError(
      response.status,
      envelope.success ? envelope.data.error.code : 'HTTP_ERROR',
      response.status === 409
        ? 'La versión cambió en el servidor. Recarga el tema antes de volver a guardar; tus cambios siguen en el formulario.'
        : envelope.success
          ? envelope.data.error.message
          : 'No fue posible completar la solicitud'
    )
  }
  return z.object({ data: z.unknown() }).parse(body).data as T
}
const json = (body: unknown, method = 'POST'): RequestInit => ({
  method,
  body: JSON.stringify(body),
})
const topicPath = (slug: string) => `/temas/${encodeURIComponent(slug)}`
const categorySchema = z.object({
  id: categoryIdSchema,
  nombre: z.string(),
  descripcion: z.string(),
  icono: z.string(),
  orden: z.number(),
})
export type ItemKind = 'secciones' | 'resumen' | 'formulas' | 'glosario'
const itemPath = (slug: string, kind: ItemKind) =>
  `${topicPath(slug)}/${kind === 'secciones' || kind === 'resumen' ? `teoria/${kind}` : kind}`

export const adminApi = {
  async login(email: string, password: string) {
    return loginResultSchema.parse(await request('/auth/login', json({ email, password }), false))
  },
  async me(token?: string) {
    return userProfileSchema.parse(
      await request(
        '/auth/me',
        token ? { headers: { Authorization: `Bearer ${token}` } } : {},
        !token
      )
    )
  },
  logout(token: string) {
    return request<void>(
      '/auth/logout',
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
      false
    )
  },
  requestPasswordReset(email: string) {
    return request('/auth/password-reset', json({ email }), false)
  },
  changePassword(password: string) {
    return request('/auth/password', json({ password }, 'PUT'))
  },
  async categories(): Promise<Category[]> {
    return z.array(categorySchema).parse(await request('/categories'))
  },
  async getTema(slug: string, signal?: AbortSignal) {
    return temaSchema.parse(await request(topicPath(slug), { signal }))
  },
  async temas(signal?: AbortSignal): Promise<TemaConfig[]> {
    const result: TemaConfig[] = []
    let offset = 0
    while (offset <= 1000000) {
      const page = z
        .object({
          items: z.array(temaSchema),
          total: z.number(),
          limit: z.number(),
          offset: z.number(),
        })
        .parse(await request(`/temas?limit=100&offset=${offset}`, { signal }))
      result.push(...page.items)
      if (result.length >= page.total || !page.items.length) break
      offset += page.items.length
    }
    return result
  },
  async createTema(body: unknown) {
    return temaSchema.parse(await request('/temas', json(body)))
  },
  async patchTema(slug: string, body: unknown, version: number) {
    return temaSchema.parse(
      await request(topicPath(slug), {
        ...json(body, 'PATCH'),
        headers: { 'If-Match': `"${version}"` },
      })
    )
  },
  async status(slug: string, status: TemaConfig['status'], version: number) {
    return temaSchema.parse(
      await request(`${topicPath(slug)}/status`, json({ status, version }, 'PATCH'))
    )
  },
  removeTema(slug: string, version: number) {
    return request<void>(topicPath(slug), {
      method: 'DELETE',
      headers: { 'If-Match': `"${version}"` },
    })
  },
  async introduction(slug: string, introduccion: string, version: number) {
    return temaSchema.parse(
      await request(`${topicPath(slug)}/teoria`, json({ introduccion, version }, 'PUT'))
    )
  },
  async saveItem(slug: string, kind: ItemKind, body: unknown, version: number, id?: string) {
    const path = `${itemPath(slug, kind)}${id ? `/${encodeURIComponent(id)}` : ''}`
    return temaSchema.parse(
      await request(path, {
        ...json(body, id ? 'PATCH' : 'POST'),
        headers: { 'If-Match': `"${version}"` },
      })
    )
  },
  removeItem(slug: string, kind: ItemKind, id: string, version: number) {
    return request<void>(`${itemPath(slug, kind)}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'If-Match': `"${version}"` },
    })
  },
  async reorder(slug: string, kind: Exclude<ItemKind, 'resumen'>, ids: string[], version: number) {
    return temaSchema.parse(
      await request(`${topicPath(slug)}/${kind}/reorder`, {
        ...json(ids, 'PATCH'),
        headers: { 'If-Match': `"${version}"` },
      })
    )
  },
  async revisions(slug: string): Promise<TemaRevision[]> {
    return z
      .array(
        z.object({
          id: z.string().uuid(),
          snapshot: temaSchema,
          editor: z.string(),
          fecha: z.string().datetime(),
          operation: z.string(),
        })
      )
      .parse(await request(`${topicPath(slug)}/revisions`))
  },
  async restore(slug: string, id: string, version: number) {
    return temaSchema.parse(
      await request(`${topicPath(slug)}/revisions/${encodeURIComponent(id)}/restore`, {
        method: 'POST',
        headers: { 'If-Match': `"${version}"` },
      })
    )
  },
  async users(q = '', limit = 20, offset = 0) {
    return z
      .object({ items: z.array(userProfileSchema), total: z.number() })
      .parse(await request(`/users?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`))
  },
  async createUser(body: unknown) {
    return userProfileSchema.parse(await request('/users', json(body)))
  },
  async patchUser(id: string, body: unknown, version: number) {
    return userProfileSchema.parse(
      await request(`/users/${encodeURIComponent(id)}`, {
        ...json(body, 'PATCH'),
        headers: { 'If-Match': `"${version}"` },
      })
    )
  },
  removeUser(id: string, version: number) {
    return request<void>(`/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'If-Match': `"${version}"` },
    })
  },
}
