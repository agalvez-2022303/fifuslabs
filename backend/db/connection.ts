import { Pool } from 'pg'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { rootCertificates } from 'node:tls'

export interface SqlResult {
  rows: Record<string, unknown>[]
  rowCount: number | null
}
export interface SqlExecutor {
  query(sql: string, values?: unknown[]): Promise<SqlResult>
}
export interface SqlClient extends SqlExecutor {
  release(): void
}
export interface SqlPool extends SqlExecutor {
  connect(): Promise<SqlClient>
  end(): Promise<void>
}

/** Small typed boundary around pg. No credentials or SQL parameter values in logs. */
export function createDatabase(
  connectionString: string,
  options: { local?: boolean; max?: number; ca?: string } = {}
): SqlPool {
  const url = new URL(connectionString)
  if (!['postgres:', 'postgresql:'].includes(url.protocol))
    throw new Error('DATABASE_URL debe ser PostgreSQL')
  if (options.local && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    throw new Error('Solo localhost permite DATABASE_SSL=false')
  // Prevent URL sslmode overrides from silently disabling certificate verification.
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key)
  // Public vendor CA, fetched over HTTPS from the official Supabase distribution.
  // Keep hostname verification enabled; never "fix" TLS errors with rejectUnauthorized=false.
  const ca =
    options.ca ??
    (url.hostname.endsWith('.supabase.co') || url.hostname.endsWith('.supabase.com')
      ? [
          ...rootCertificates,
          readFileSync(path.resolve(__dirname, 'certs/supabase-ca-2021.crt'), 'utf8'),
        ]
      : undefined)
  const pool = new Pool({
    connectionString: url.toString(),
    max: options.max ?? 3,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
    allowExitOnIdle: true,
    ssl: options.local ? false : { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
  })
  pool.on('error', () => {
    console.error('Conexión PostgreSQL inactiva cerrada; el pool abrirá una nueva conexión')
  })
  return {
    query: (sql, values) => pool.query<Record<string, unknown>>(sql, values),
    async connect() {
      const client = await pool.connect()
      return {
        query: (sql, values) => client.query<Record<string, unknown>>(sql, values),
        release: () => client.release(),
      }
    },
    end: () => pool.end(),
  }
}
