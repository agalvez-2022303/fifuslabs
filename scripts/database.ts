import path from 'node:path'
import { config } from 'dotenv'
import { z } from 'zod'
import { createDatabase } from '../backend/db/connection'
import { migrateDatabase } from '../backend/db/migrate'
import { seedDatabase } from '../backend/db/seed'
import { PostgresUserRepository } from '../backend/repositories/postgres-user-repository'
import { SupabaseAuthClient } from '../backend/auth/supabase-auth-client'
import { registerSchema } from '../packages/shared-types/src'

async function main() {
  config({ path: path.resolve(__dirname, '../.env'), quiet: true })
  if (!process.env.DATABASE_URL) throw new Error('Configura DATABASE_URL en el .env local')
  const database = createDatabase(process.env.DATABASE_URL, {
    ca: process.env.DATABASE_CA_CERT,
    local: process.env.DATABASE_SSL === 'false' && process.env.NODE_ENV !== 'production',
  })
  try {
    const action = process.argv[2]
    if (action === 'migrate' || action === 'setup') {
      await migrateDatabase(database)
      console.log('Migraciones aplicadas correctamente')
    }
    if (action === 'seed' || action === 'setup')
      console.log(`Temas importados: ${await seedDatabase(database)} (los existentes se conservan)`)
    if (action === 'bootstrap') {
      let id = process.env.BOOTSTRAP_USER_ID
      if (!id) {
        const credentials = registerSchema.parse({
          email: process.env.BOOTSTRAP_EMAIL,
          password: process.env.BOOTSTRAP_PASSWORD,
          name: 'Maestro inicial',
        })
        const {
          SUPABASE_URL,
          SUPABASE_PUBLISHABLE_KEY,
          SUPABASE_ANON_KEY,
          SUPABASE_SERVICE_ROLE_KEY,
          SUPABASE_SECRET_KEY,
        } = process.env
        if (
          !SUPABASE_URL ||
          !(SUPABASE_PUBLISHABLE_KEY || SUPABASE_ANON_KEY) ||
          !(SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SECRET_KEY)
        )
          throw new Error('Configura las claves de Supabase Auth')
        const identities = new SupabaseAuthClient(
          SUPABASE_URL,
          (SUPABASE_PUBLISHABLE_KEY || SUPABASE_ANON_KEY)!,
          (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SECRET_KEY)!
        )
        id = await identities.createUser(credentials.email, credentials.password)
      }
      z.string().uuid().parse(id)
      const profiles = new PostgresUserRepository(database)
      const profile = await profiles.bootstrapTeacher(id)
      if (!profile.name) await profiles.update(id, { name: 'Maestro inicial' }, profile.version)
      console.log(`Maestro inicial habilitado: ${profile.id}`)
    }
    if (!['migrate', 'seed', 'setup', 'bootstrap'].includes(action))
      throw new Error('Acción desconocida')
  } finally {
    await database.end()
  }
}
main().catch((error: unknown) => {
  // Never print connection strings, password inputs, tokens or upstream request objects.
  if (error instanceof z.ZodError)
    console.error('Configuración inválida: revisa las variables del .env')
  else
    console.error(
      error instanceof Error && 'code' in error
        ? `Error de base de datos: ${String(error.code)}`
        : error instanceof Error
          ? error.message
          : 'No se pudo configurar la base de datos'
    )
  process.exitCode = 1
})
