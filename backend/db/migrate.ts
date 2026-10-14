import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import type { SqlPool } from './connection'

export async function migrateDatabase(
  database: SqlPool,
  dir = path.resolve(__dirname, 'migrations')
) {
  const files = (await readdir(dir)).filter(file => /^\d+_[a-z0-9_]+\.sql$/.test(file)).sort()
  for (const file of files) {
    const raw = await readFile(path.join(dir, file), 'utf8')
    const sql = raw.replace(/\r\n/g, '\n')
    const checksum = createHash('sha256').update(sql).digest('hex')
    const client = await database.connect()
    try {
      await client.query('BEGIN')
      await client.query('SELECT pg_advisory_xact_lock(64261701)')
      await client.query('CREATE SCHEMA IF NOT EXISTS fisicalab')
      await client.query(
        'CREATE TABLE IF NOT EXISTS fisicalab.migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())'
      )
      const existing = await client.query(
        'SELECT checksum FROM fisicalab.migrations WHERE name = $1',
        [file]
      )
      if (existing.rows.length) {
        if (existing.rows[0].checksum !== checksum)
          throw new Error(`Migración ya aplicada fue modificada: ${file}`)
      } else {
        await client.query(sql)
        await client.query('INSERT INTO fisicalab.migrations(name, checksum) VALUES ($1, $2)', [
          file,
          checksum,
        ])
      }
      await client.query('COMMIT')
    } catch (error: unknown) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}
