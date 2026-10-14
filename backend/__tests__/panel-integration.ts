import { createServer, type ViteDevServer } from 'vite'
import { config as loadEnv } from 'dotenv'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'

/**
 * Verifies the panel against a running Vite server backed by the configured
 * repository. Phase A checks the public surface against real PostgreSQL.
 * Phase B replays the exact request sequence the Studio panel performs.
 *
 * Panel credentials (SUPABASE_PANEL_EMAIL / SUPABASE_PANEL_PASSWORD) enable
 * the real Supabase Auth path. Without them, phase B runs against the JSON
 * repository with the local DevAuth provider so behaviour stays covered.
 */

let base = ''

interface Result {
  name: string
  ok: boolean
  detail: string
}
type Json = Record<string, unknown>

const results: Result[] = []
function check(name: string, ok: boolean, detail = ''): void {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} · ${name}${detail ? ` — ${detail}` : ''}`)
}

async function call(
  pathname: string,
  init: RequestInit = {}
): Promise<{ status: number; body: Json | null }> {
  const response = await fetch(`${base}${pathname}`, init)
  if (response.status === 204) return { status: 204, body: null }
  return {
    status: response.status,
    body: (await response.json().catch(() => null)) as Json | null,
  }
}

function json(method: string, payload: unknown, headers: Record<string, string> = {}): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  }
}

async function startServer(mode: 'postgres' | 'json'): Promise<ViteDevServer> {
  // The composition reads process.env, so set it directly; Vite's `env` option
  // only affects import.meta.env substitution.
  process.env.CONTENT_REPOSITORY = mode
  process.env.DEV_AUTH = mode === 'json' ? 'true' : 'false'
  const server = await createServer({
    root: path.resolve(__dirname, '../../src'),
    configFile: path.resolve(__dirname, '../../src/vite.config.ts'),
    server: { host: '127.0.0.1', port: 0, strictPort: true, watch: null },
    logLevel: 'silent',
  })
  await server.listen()
  const address = server.httpServer?.address()
  if (!address || typeof address === 'string') throw new Error('No TCP address')
  base = `http://127.0.0.1:${address.port}/api`
  return server
}

const list = (body: Json | null): Json[] =>
  ((body?.data as Json | undefined)?.items ?? []) as Json[]

async function main() {
  loadEnv({ path: path.resolve(__dirname, '../../.env'), quiet: true })
  const email = process.env.SUPABASE_PANEL_EMAIL ?? process.env.BOOTSTRAP_EMAIL
  const password = process.env.SUPABASE_PANEL_PASSWORD ?? process.env.BOOTSTRAP_PASSWORD
  const devMode = !email || !password

  // ── Phase A · public surface against the real PostgreSQL repository ──
  let server = await startServer('postgres')
  try {
    const health = await call('/health')
    check(
      'GET /health reports postgres storage',
      health.status === 200 && (health.body?.data as Json | undefined)?.storage === 'postgres',
      JSON.stringify(health.body?.error ?? '')
    )
    const categories = await call('/categories')
    const categoryList = (categories.body?.data ?? []) as Json[]
    check(
      'GET /categories returns the catalog',
      categories.status === 200 && categoryList.length > 0,
      `${categoryList.length} categorías`
    )
    const publicList = await call('/temas?limit=100')
    check(
      'GET /temas is public and paginated',
      publicList.status === 200 && list(publicList.body).length > 0,
      `total=${(publicList.body?.data as Json | undefined)?.total}`
    )
    const secretRead = await call('/temas?status=draft')
    check(
      'Public reads cannot filter by status',
      secretRead.status === 403,
      String(secretRead.status)
    )
    const content = await call('/content/mru')
    check('Legacy /content/:slug still resolves', content.status === 200, String(content.status))
  } finally {
    await server.close()
  }

  // ── Phase B · panel flows ──
  const categories = await (async () => {
    const probe = await startServer('postgres')
    const body = (await call('/categories')).body
    await probe.close()
    return (body?.data ?? []) as Json[]
  })()
  server = await startServer(devMode ? 'json' : 'postgres')
  try {
    if (devMode) {
      console.log(
        '\nSin SUPABASE_PANEL_EMAIL/SUPABASE_PANEL_PASSWORD: los flujos del panel se validan en modo JSON + DevAuth.'
      )
    }
    const devHeaders = { 'x-dev-user': 'panel-check', 'x-dev-role': 'teacher' }
    const login = devMode
      ? await call('/temas?limit=100', { headers: devHeaders })
      : await call('/auth/login', json('POST', { email, password }))
    const session = ((login.body?.data as Json | undefined)?.session ?? {}) as Json
    const token = session.access_token as string | undefined
    const auth: RequestInit = devMode
      ? { headers: devHeaders }
      : token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {}
    check(
      devMode ? 'DevAuth identifies a teacher' : 'POST /auth/login issues a session',
      login.status === 200 && (devMode || Boolean(token)),
      login.status === 401 ? 'credenciales del panel no configuradas' : String(login.status)
    )

    const authCall = (pathname: string, init: RequestInit = {}) =>
      call(pathname, {
        ...init,
        headers: {
          ...(auth.headers as Record<string, string>),
          ...((init.headers as Record<string, string>) ?? {}),
        },
      })
    // Dashboard aggregates and topic filters.
    const teacherList = await authCall('/temas?limit=100')
    const items = list(teacherList.body)
    check(
      'GET /temas returns drafts to teachers',
      teacherList.status === 200 && items.length > 0,
      `${items.length} temas`
    )
    const categoryId = String(categories[0].id)
    const draftFilter = await authCall('/temas?status=draft&limit=100')
    const filtered = await authCall(`/temas?categoriaId=${categoryId}&limit=100`)
    check(
      'GET /temas filters by categoriaId',
      filtered.status === 200 && list(filtered.body).every(item => item.categoriaId === categoryId),
      `${list(filtered.body).length} resultados`
    )
    check(
      'GET /temas?status works for teachers',
      draftFilter.status === 200,
      String(draftFilter.status)
    )

    // Topic editor: create with the full metadata payload.
    const slug = `panel-check-${randomUUID()}`
    const metadata = {
      titulo: 'Verificación del panel',
      descripcionCorta: 'Tema temporal creado por la comprobación automática.',
      categoriaId: categoryId,
      dificultad: 'basico',
      estado: 'active',
      orden: 999,
      icono: 'menu_book',
      etiquetas: ['verificacion'],
      formulaPrincipal: 'x=vt',
      simComponentSlug: 'mru',
    }
    const created = await authCall(
      '/temas',
      json('POST', { ...metadata, slug, teoria: { introduccion: 'Introducción inicial.' } })
    )
    let tema = (created.body?.data ?? {}) as Json
    check(
      'POST /temas creates a draft',
      created.status === 201 && tema.version === 1 && tema.status === 'draft',
      String(created.status)
    )

    // Formula editor: add, then reject invalid LaTeX and strip injected HTML.
    const formula = await authCall(
      `/temas/${slug}/formulas`,
      json('POST', {
        nombre: 'Ecuación de comprobación',
        expresion: 'x = v \\cdot t',
        descripcion: 'Posición en movimiento uniforme.',
        variables: [{ simbolo: 'v', descripcion: 'Velocidad', unidad: 'm/s' }],
        version: tema.version,
      })
    )
    tema = (formula.body?.data ?? {}) as Json
    const formulaId = ((tema.formulas ?? []) as Json[])[0]?.id
    check(
      'POST formula assigns a uuid',
      formula.status === 201 && typeof formulaId === 'string',
      String(formulaId ?? 'sin id')
    )
    check(
      'Invalid LaTeX is rejected with 422',
      (
        await authCall(
          `/temas/${slug}/formulas/${String(formulaId)}`,
          json('PATCH', { expresion: '\\frac{', version: tema.version })
        )
      ).status === 422
    )
    const stripped = await authCall(
      `/temas/${slug}/teoria`,
      json('PUT', { introduccion: '<script>evil()</script>**Seguro**', version: tema.version })
    )
    const introduction = String(
      ((stripped.body?.data as Json | undefined)?.teoria as Json | undefined)?.introduccion ?? ''
    )
    check(
      'HTML is stripped, bold text kept',
      stripped.status === 200 && introduction === '**Seguro**',
      introduction
    )

    // Optimistic concurrency: stale version conflicts, current version wins.
    check(
      'Stale version is rejected with 409',
      (await authCall(`/temas/${slug}`, json('PATCH', { titulo: 'Cambio antiguo', version: 1 })))
        .status === 409
    )
    const current = ((await authCall(`/temas/${slug}`)).body?.data ?? {}) as Json
    const renamed = await authCall(
      `/temas/${slug}`,
      json('PATCH', { titulo: 'Verificación editada', version: current.version })
    )
    check('Current version is accepted', renamed.status === 200, String(renamed.status))

    // Publication plus revision history and restore.
    const published = await authCall(
      `/temas/${slug}/status`,
      json('PATCH', { status: 'published', version: (renamed.body?.data as Json).version })
    )
    check(
      'PATCH status publishes the theme',
      published.status === 200 && (published.body?.data as Json).status === 'published',
      String(published.status)
    )
    const revisions = await authCall(`/temas/${slug}/revisions`)
    const history = (revisions.body?.data ?? []) as Json[]
    check(
      'GET revisions lists snapshots',
      revisions.status === 200 && history.length >= 4,
      `${history.length} revisiones`
    )
    const restored = await authCall(`/temas/${slug}/revisions/${String(history[0].id)}/restore`, {
      method: 'POST',
      headers: { 'If-Match': `"${String((published.body?.data as Json).version)}"` },
    })
    check(
      'POST restore returns a new version',
      restored.status === 200 && (restored.body?.data as Json).version === 6,
      String(restored.status)
    )

    // Users screen. These routes only exist when Supabase Auth is configured.
    if (devMode) {
      check(
        'Users routes require the postgres repository',
        (await call('/users', auth)).status === 404
      )
    } else {
      const users = await call('/users?limit=20', auth)
      check('GET /users lists accounts', users.status === 200, String(users.status))
    }
    const revoke = await authCall(`/temas/${slug}`, {
      method: 'DELETE',
      headers: { 'If-Match': `"${String((restored.body?.data as Json).version)}"` },
    })
    check('DELETE retires the theme (204)', revoke.status === 204, String(revoke.status))
    check('Retired theme is hidden from reads', (await authCall(`/temas/${slug}`)).status === 404)
    // The verification theme is a draft artifact; drop its file entirely.
    if (devMode)
      await rm(path.resolve(__dirname, '../../data/temas', `${slug}.json`), { force: true })
  } finally {
    await server.close()
  }

  const failed = results.filter(result => !result.ok)
  console.log(`\n${results.length - failed.length}/${results.length} comprobaciones correctas`)
  if (failed.length) {
    console.error(`Fallaron: ${failed.map(result => result.name).join(', ')}`)
    process.exitCode = 1
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Falló la verificación del panel')
  process.exitCode = 1
})
