import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import { createApp } from './app'
import { DevAuthProvider } from './auth/dev-auth-provider'
import { JsonFileRepository } from './repositories/json-file-repository'
import { CategoryService } from './services/category-service'
import { LegacyService } from './services/legacy-service'
import { TemaService } from './services/tema-service'
import { createDatabase } from './db/connection'
import { PostgresRepository } from './repositories/postgres-repository'
import { PostgresUserRepository } from './repositories/postgres-user-repository'
import { SupabaseAuthClient } from './auth/supabase-auth-client'
import { SupabaseAuthProvider } from './auth/supabase-auth-provider'
import { AuthService } from './services/auth-service'
import { UserService } from './services/user-service'
import { HealthService } from './services/health-service'
import { UnconfiguredIdentityGateway } from './auth/unconfigured-identity-gateway'
import { EjercicioService } from './services/ejercicio-service'

/** Only composition changes when Supabase repositories / JWT provider become available. */
export function composeApp(dataDir = path.resolve(__dirname, '../data')) {
  // Vite runs from src/, so dotenv's default cwd would miss the root .env.
  // Existing process/Vercel environment always wins; this does not enable production auth.
  loadEnv({ path: path.resolve(dataDir, '../.env'), quiet: true })
  const storage = process.env.CONTENT_REPOSITORY || (process.env.DATABASE_URL ? 'postgres' : 'json')
  if (storage !== 'postgres' && storage !== 'json')
    throw new Error('CONTENT_REPOSITORY debe ser postgres o json')
  if (storage === 'postgres') {
    const {
      DATABASE_URL,
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_SECRET_KEY,
    } = process.env
    if (!DATABASE_URL) throw new Error('Configura DATABASE_URL para usar PostgreSQL')
    const database = createDatabase(DATABASE_URL, {
      ca: process.env.DATABASE_CA_CERT,
      local: process.env.DATABASE_SSL === 'false' && process.env.NODE_ENV !== 'production',
    })
    const repository = new PostgresRepository(database)
    const profiles = new PostgresUserRepository(database)
    const publicKey = SUPABASE_PUBLISHABLE_KEY || SUPABASE_ANON_KEY
    const adminKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SECRET_KEY
    const identities =
      SUPABASE_URL && publicKey && adminKey
        ? new SupabaseAuthClient(SUPABASE_URL, publicKey, adminKey)
        : new UnconfiguredIdentityGateway()
    const temas = new TemaService(repository, repository, repository, repository)
    return createApp({
      auth: new SupabaseAuthProvider(identities, profiles),
      temas,
      ejercicios: new EjercicioService(repository, repository),
      storage: 'postgres',
      health: new HealthService(repository, 'postgres'),
      categories: new CategoryService(repository),
      legacy: new LegacyService(repository, repository, repository, temas),
      accounts: {
        auth: new AuthService(identities, profiles),
        users: new UserService(profiles, identities),
      },
    })
  }
  const repository = new JsonFileRepository(dataDir)
  const temas = new TemaService(repository, repository, repository, repository)
  return createApp({
    auth: new DevAuthProvider(),
    temas,
    ejercicios: new EjercicioService(repository, repository),
    categories: new CategoryService(repository),
    legacy: new LegacyService(repository, repository, repository, temas),
  })
}
export const app = composeApp()
