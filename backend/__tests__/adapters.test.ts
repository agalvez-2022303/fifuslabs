import { createServer } from 'node:http'
import { once } from 'node:events'
import path from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { DevAuthProvider } from '../auth/dev-auth-provider'
import { CategoryService } from '../services/category-service'
import { LegacyService } from '../services/legacy-service'
import { setup } from './fixtures'
import { getRequestListener } from '@hono/node-server'
import vercelHandler from '../../api/[[...route]]'
import { MAX_BODY_BYTES } from '../middleware/body-limit'

describe('Node HTTP adapters', () => {
  it('serves the exported Vercel catch-all as a Node handler', async () => {
    const server = createServer(vercelHandler)
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    try {
      const address = server.address()
      if (!address || typeof address === 'string') throw new Error('Expected TCP address')
      const response = await fetch(`http://127.0.0.1:${address.port}/api/temas/mru`)
      expect(response.status).toBe(200)
      expect((await response.json()).data.slug).toBe('mru')
    } finally {
      await promisify(server.close.bind(server))()
    }
  })
  it('adapts raw HTTP bodies, auth headers and response envelopes', async () => {
    const { repository, service } = setup()
    const app = createApp({
      auth: new DevAuthProvider({ NODE_ENV: 'development', DEV_AUTH: 'true' }),
      temas: service,
      categories: new CategoryService(repository),
      legacy: new LegacyService(repository, repository, repository, service),
    })
    const server = createServer(getRequestListener(app.fetch))
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    try {
      const address = server.address()
      if (!address || typeof address === 'string') throw new Error('Expected TCP address')
      const url = `http://127.0.0.1:${address.port}`
      const response = await fetch(`${url}/api/temas/mru`, {
        method: 'PATCH',
        headers: {
          'x-dev-user': 'test',
          'x-dev-role': 'teacher',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ titulo: 'HTTP adapter', version: 1 }),
      })
      expect(response.status).toBe(200)
      expect((await response.json()).data.titulo).toBe('HTTP adapter')
      expect((await fetch(`${url}/api/health`)).status).toBe(200)
      const oversized = await fetch(`${url}/api/temas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'x'.repeat(MAX_BODY_BYTES + 1),
      })
      expect(oversized.status).toBe(413)
    } finally {
      await promisify(server.close.bind(server))()
    }
  })
  it('serves the actual Vite plugin through the shared Hono app', async () => {
    const { createServer: createViteServer } = await import('vite')
    const server = await createViteServer({
      root: path.resolve(__dirname, '../../src'),
      configFile: path.resolve(__dirname, '../../src/vite.config.ts'),
      server: { host: '127.0.0.1', port: 0, strictPort: true, watch: null },
      logLevel: 'silent',
    })
    try {
      await server.listen()
      const address = server.httpServer?.address()
      if (!address || typeof address === 'string') throw new Error('Expected TCP address')
      const url = `http://127.0.0.1:${address.port}`
      const themes = await fetch(`${url}/api/temas?limit=1`)
      expect(themes.status).toBe(200)
      expect((await themes.json()).data.total).toBe(8)
      expect((await (await fetch(`${url}/api/content/mru`)).json()).data.formulas).toHaveLength(3)
      expect((await fetch(`${url}/api/temas?limit=0`)).status).toBe(422)
      expect(
        (await fetch(`${url}/api/temas/mru`, { method: 'DELETE', headers: { 'If-Match': '1' } }))
          .status
      ).toBe(401)
    } finally {
      await server.close()
    }
  }, 20000)
})
