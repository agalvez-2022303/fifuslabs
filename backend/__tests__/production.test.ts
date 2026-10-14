import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { DevAuthProvider } from '../auth/dev-auth-provider'
import { JsonFileRepository } from '../repositories/json-file-repository'
import { CategoryService } from '../services/category-service'
import { LegacyService } from '../services/legacy-service'
import { TemaService } from '../services/tema-service'
import { teacher } from './fixtures'

function productionApp(verified = false) {
  const repository = new JsonFileRepository(path.resolve(__dirname, '../../data'), true)
  const temas = new TemaService(repository, repository, repository, repository)
  return createApp({
    // Trusted fake provider verifies the repository gate independently of DevAuth's 401.
    auth: verified
      ? { verify: async () => teacher }
      : new DevAuthProvider({ NODE_ENV: 'production', DEV_AUTH: 'true' }),
    temas,
    categories: new CategoryService(repository),
    legacy: new LegacyService(repository, repository, repository, temas),
  })
}
describe('production gates', () => {
  it('serves published JSON and rejects development identities with 401', async () => {
    const app = productionApp()
    expect((await app.request('/api/temas')).status).toBe(200)
    const response = await app.request('/api/temas/mru', {
      method: 'PATCH',
      headers: {
        'x-dev-user': 'bypass',
        'x-dev-role': 'teacher',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ titulo: 'not stored', version: 1 }),
    })
    expect(response.status).toBe(401)
  })
  it('returns 501 to a trusted teacher when the production repository is read-only', async () => {
    const response = await productionApp(true).request('/api/temas/mru', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: 'not stored', version: 1 }),
    })
    expect(response.status).toBe(501)
    expect((await response.json()).error.code).toBe('STORAGE_READ_ONLY')
  })
})
