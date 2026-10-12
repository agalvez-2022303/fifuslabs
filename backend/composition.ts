import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import { createApp } from './app'
import { DevAuthProvider } from './auth/dev-auth-provider'
import { JsonFileRepository } from './repositories/json-file-repository'
import { CategoryService } from './services/category-service'
import { LegacyService } from './services/legacy-service'
import { TemaService } from './services/tema-service'

/** Only composition changes when Supabase repositories / JWT provider become available. */
export function composeApp(dataDir = path.resolve(__dirname, '../data')) {
  // Vite runs from src/, so dotenv's default cwd would miss the root .env.
  // Existing process/Vercel environment always wins; this does not enable production auth.
  loadEnv({ path: path.resolve(dataDir, '../.env'), quiet: true })
  const repository = new JsonFileRepository(dataDir)
  const temas = new TemaService(repository, repository, repository, repository)
  return createApp({
    auth: new DevAuthProvider(),
    temas,
    categories: new CategoryService(repository),
    legacy: new LegacyService(repository, repository, repository, temas),
  })
}
export const app = composeApp()
