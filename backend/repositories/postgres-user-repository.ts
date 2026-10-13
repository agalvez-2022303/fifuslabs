import {
  userProfileSchema,
  type UserProfile,
  type UsersQuery,
} from '../../packages/shared-types/src'
import type { SqlPool } from '../db/connection'
import { ConflictError, NotFoundError } from '../errors'
import type { UserRepository } from './user-repository'

function parseRow(row: Record<string, unknown>): UserProfile {
  const { created_at, updated_at, ...fields } = row
  return userProfileSchema.parse({
    ...fields,
    createdAt: new Date(String(created_at)).toISOString(),
    updatedAt: new Date(String(updated_at)).toISOString(),
  })
}
export class PostgresUserRepository implements UserRepository {
  constructor(private readonly database: SqlPool) {}
  async get(id: string): Promise<UserProfile | null> {
    const result = await this.database.query('SELECT * FROM fisicalab.profiles WHERE id=$1', [id])
    return result.rows[0] ? parseRow(result.rows[0]) : null
  }
  async list(query: UsersQuery) {
    const pattern = `%${(query.q ?? '').replace(/[\\%_]/g, '\\$&')}%`
    const result = await this.database.query(
      'SELECT * FROM fisicalab.profiles WHERE name ILIKE $1 OR email ILIKE $1 ORDER BY created_at, id LIMIT $2 OFFSET $3',
      [pattern, query.limit, query.offset]
    )
    const count = await this.database.query(
      'SELECT count(*)::integer AS total FROM fisicalab.profiles WHERE name ILIKE $1 OR email ILIKE $1',
      [pattern]
    )
    return { items: result.rows.map(parseRow), total: Number(count.rows[0].total) }
  }
  async update(
    id: string,
    patch: Partial<Pick<UserProfile, 'name' | 'role' | 'active'>>,
    version: number
  ): Promise<UserProfile> {
    const client = await this.database.connect()
    try {
      await client.query('BEGIN')
      // Serialize teacher membership changes across instances, preventing loss of the last teacher.
      await client.query('SELECT pg_advisory_xact_lock(64261702)')
      const found = await client.query('SELECT * FROM fisicalab.profiles WHERE id=$1 FOR UPDATE', [
        id,
      ])
      if (!found.rows[0]) throw new NotFoundError('Usuario no encontrado')
      const current = parseRow(found.rows[0])
      if (current.version !== version) throw new ConflictError('Versión de usuario desactualizada')
      const next = { ...current, ...patch }
      if (
        current.role === 'teacher' &&
        current.active &&
        (next.role !== 'teacher' || !next.active)
      ) {
        const count = await client.query(
          "SELECT count(*)::integer AS total FROM fisicalab.profiles WHERE role='teacher' AND active"
        )
        if (Number(count.rows[0].total) <= 1)
          throw new ConflictError('No se puede desactivar o degradar al último maestro')
      }
      const result = await client.query(
        'UPDATE fisicalab.profiles SET name=$2, role=$3, active=$4, version=version+1, updated_at=now() WHERE id=$1 RETURNING *',
        [id, next.name, next.role, next.active]
      )
      await client.query('COMMIT')
      return parseRow(result.rows[0])
    } catch (error: unknown) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
  async bootstrapTeacher(id: string): Promise<UserProfile> {
    const client = await this.database.connect()
    try {
      await client.query('BEGIN')
      await client.query('SELECT pg_advisory_xact_lock(64261702)')
      const count = await client.query(
        "SELECT count(*)::integer AS total FROM fisicalab.profiles WHERE role='teacher' AND active"
      )
      if (Number(count.rows[0].total) !== 0)
        throw new ConflictError('Ya existe un maestro; usa la API de usuarios')
      const result = await client.query(
        "UPDATE fisicalab.profiles SET role='teacher', active=true, version=version+1, updated_at=now() WHERE id=$1 RETURNING *",
        [id]
      )
      if (!result.rows[0]) throw new NotFoundError('Primero crea el usuario en Supabase Auth')
      await client.query('COMMIT')
      return parseRow(result.rows[0])
    } catch (error: unknown) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}
