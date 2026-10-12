import { z } from 'zod'
import {
  temaSchema,
  type Category,
  type Simulation,
  type TemaConfig,
  type TemaRevision,
} from '../../packages/shared-types/src'
import type { SqlPool } from '../db/connection'
import { ConflictError } from '../errors'
import type {
  AliasRepository,
  CategoryRepository,
  RevisionRepository,
  SimulationRepository,
  TemaRepository,
} from './interfaces'

const categorySchema = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string(),
  icono: z.string(),
  orden: z.number(),
})
const simulationSchema = z.object({
  id: z.string(),
  slug: z.string(),
  titulo: z.string(),
  descripcionCorta: z.string(),
  categoriaId: z.string(),
  dificultad: z.enum(['basico', 'intermedio', 'avanzado']),
  estado: z.enum(['active', 'coming-soon']),
  orden: z.number(),
  icono: z.string(),
  etiquetas: z.array(z.string()),
})
export class PostgresRepository
  implements
    TemaRepository,
    CategoryRepository,
    RevisionRepository,
    SimulationRepository,
    AliasRepository
{
  constructor(private readonly database: SqlPool) {}
  async check(): Promise<void> {
    await this.database.query('SELECT 1 FROM fisicalab.temas LIMIT 1')
  }
  async list(): Promise<TemaConfig[]> {
    const result = await this.database.query(
      'SELECT document FROM fisicalab.temas WHERE NOT deleted ORDER BY slug'
    )
    return result.rows.map(row => temaSchema.parse(row.document))
  }
  async get(slug: string, includeDeleted = false): Promise<TemaConfig | null> {
    const result = await this.database.query(
      'SELECT document FROM fisicalab.temas WHERE slug = $1 AND ($2::boolean OR NOT deleted)',
      [slug, includeDeleted]
    )
    return result.rows[0] ? temaSchema.parse(result.rows[0].document) : null
  }
  async listCategories(): Promise<Category[]> {
    const result = await this.database.query(
      'SELECT document FROM fisicalab.categories ORDER BY id'
    )
    return result.rows.map(row => categorySchema.parse(row.document) as Category)
  }
  async listSimulations(): Promise<Simulation[]> {
    const result = await this.database.query(
      'SELECT document FROM fisicalab.simulations ORDER BY slug'
    )
    return result.rows.map(row => simulationSchema.parse(row.document) as Simulation)
  }
  async resolveAlias(slug: string): Promise<string> {
    const result = await this.database.query(
      'SELECT slug FROM fisicalab.aliases WHERE alias = $1',
      [slug]
    )
    return result.rows[0] ? z.string().parse(result.rows[0].slug) : slug
  }
  async listRevisions(slug: string): Promise<TemaRevision[]> {
    const result = await this.database.query(
      'SELECT id, snapshot, editor, fecha, operation FROM fisicalab.revisions WHERE slug = $1 ORDER BY sequence',
      [slug]
    )
    return result.rows.map(row => ({
      id: z.string().uuid().parse(row.id),
      snapshot: temaSchema.parse(row.snapshot),
      editor: z.string().parse(row.editor),
      fecha: z.coerce.date().parse(row.fecha).toISOString(),
      operation: z.string().parse(row.operation),
    }))
  }
  async commit(
    tema: TemaConfig,
    expectedVersion: number | null,
    revision: TemaRevision,
    deleted = false
  ): Promise<void> {
    const client = await this.database.connect()
    try {
      await client.query('BEGIN')
      if (expectedVersion === null) {
        await client.query(
          'INSERT INTO fisicalab.temas(slug, tema_id, categoria_id, status, version, updated_at, deleted, document) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [
            tema.slug,
            tema.id,
            tema.categoriaId,
            tema.status,
            tema.version,
            tema.updatedAt,
            deleted,
            JSON.stringify(tema),
          ]
        )
      } else {
        const result = await client.query(
          'UPDATE fisicalab.temas SET categoria_id=$2, status=$3, version=$4, updated_at=$5, deleted=$6, document=$7 WHERE slug=$1 AND version=$8 RETURNING slug',
          [
            tema.slug,
            tema.categoriaId,
            tema.status,
            tema.version,
            tema.updatedAt,
            deleted,
            JSON.stringify(tema),
            expectedVersion,
          ]
        )
        if (result.rowCount !== 1) throw new ConflictError()
      }
      await client.query(
        'INSERT INTO fisicalab.revisions(id, slug, editor, fecha, operation, snapshot) VALUES ($1,$2,$3,$4,$5,$6)',
        [
          revision.id,
          tema.slug,
          revision.editor,
          revision.fecha,
          revision.operation,
          JSON.stringify(revision.snapshot),
        ]
      )
      await client.query(
        'DELETE FROM fisicalab.revisions WHERE slug=$1 AND id NOT IN (SELECT id FROM fisicalab.revisions WHERE slug=$1 ORDER BY sequence DESC LIMIT 50)',
        [tema.slug]
      )
      await client.query('COMMIT')
    } catch (error: unknown) {
      await client.query('ROLLBACK')
      if (error instanceof Error && 'code' in error && error.code === '23505')
        throw new ConflictError('Slug o identificador duplicado')
      throw error
    } finally {
      client.release()
    }
  }
}
