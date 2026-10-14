import { PGlite } from '@electric-sql/pglite'
import type { SqlClient, SqlPool, SqlResult } from '../db/connection'
import { migrateDatabase } from '../db/migrate'
import { seedDatabase } from '../db/seed'

/** Real PostgreSQL engine compiled to WASM; no network or credentials in tests. */
export async function postgresFixture(): Promise<SqlPool> {
  const pg = new PGlite()
  await pg.exec(
    "CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY, email text UNIQUE, raw_user_meta_data jsonb NOT NULL DEFAULT '{}');"
  )
  let queue = Promise.resolve()
  const query = async (sql: string, values?: unknown[]): Promise<SqlResult> => {
    if (!values?.length) {
      const results = await pg.exec(sql)
      const last = results.at(-1)
      return {
        rows: (last?.rows ?? []) as Record<string, unknown>[],
        rowCount: last?.affectedRows ?? null,
      }
    }
    const result = await pg.query<Record<string, unknown>>(sql, values)
    return { rows: result.rows, rowCount: result.affectedRows ?? null }
  }
  const database: SqlPool = {
    query,
    async connect(): Promise<SqlClient> {
      const previous = queue
      let release!: () => void
      queue = new Promise<void>(resolve => {
        release = resolve
      })
      await previous
      return { query, release }
    },
    end: () => pg.close(),
  }
  await migrateDatabase(database)
  await seedDatabase(database)
  return database
}
