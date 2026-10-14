import { z } from 'zod'
import {
  ejercicioSchema,
  temaSchema,
  type Category,
  type CreateEjercicioInput,
  type Ejercicio,
  type PatchEjercicioInput,
  type Simulation,
  type TemaConfig,
  type TemaRevision,
} from '../../packages/shared-types/src'
import type { SqlPool } from '../db/connection'
import { ConflictError } from '../errors'
import type {
  AliasRepository,
  CategoryRepository,
  EjercicioRepository,
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
    AliasRepository,
    EjercicioRepository
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
  async listEjercicios(filter?: {
    temaSlug?: string
    dificultad?: string
    q?: string
  }): Promise<Ejercicio[]> {
    const conditions: string[] = []
    const values: unknown[] = []
    if (filter?.temaSlug) {
      values.push(filter.temaSlug)
      conditions.push(`tema_slug = $${values.length}`)
    }
    if (filter?.dificultad) {
      values.push(filter.dificultad)
      conditions.push(`dificultad = $${values.length}`)
    }
    if (filter?.q) {
      values.push(`%${filter.q}%`)
      conditions.push(`(titulo ILIKE $${values.length} OR enunciado ILIKE $${values.length})`)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const result = await this.database.query(
      `SELECT * FROM fisicalab.ejercicios ${where} ORDER BY created_at DESC`,
      values
    )
    return result.rows.map(toEjercicio)
  }
  async getEjercicio(id: string): Promise<Ejercicio | null> {
    const result = await this.database.query(
      'SELECT * FROM fisicalab.ejercicios WHERE id = $1',
      [id]
    )
    return result.rows[0] ? toEjercicio(result.rows[0]) : null
  }
  async createEjercicio(input: CreateEjercicioInput): Promise<Ejercicio> {
    const result = await this.database.query(
      `INSERT INTO fisicalab.ejercicios (tema_slug, titulo, enunciado, dificultad, respuesta, solucion_detallada, parametros, pistas, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        input.temaSlug,
        input.titulo,
        input.enunciado,
        input.dificultad,
        input.respuesta,
        input.solucionDetallada ?? null,
        JSON.stringify(input.parametros ?? {}),
        input.pistas ?? null,
        input.estado ?? 'published',
      ]
    )
    return toEjercicio(result.rows[0])
  }
  async updateEjercicio(id: string, input: PatchEjercicioInput): Promise<Ejercicio | null> {
    const existing = await this.getEjercicio(id)
    if (!existing) return null
    const updated = {
      temaSlug: input.temaSlug ?? existing.temaSlug,
      titulo: input.titulo ?? existing.titulo,
      enunciado: input.enunciado ?? existing.enunciado,
      dificultad: input.dificultad ?? existing.dificultad,
      respuesta: input.respuesta ?? existing.respuesta,
      solucionDetallada:
        input.solucionDetallada !== undefined ? input.solucionDetallada : existing.solucionDetallada,
      parametros: input.parametros !== undefined ? input.parametros : existing.parametros,
      pistas: input.pistas !== undefined ? input.pistas : existing.pistas,
      estado: input.estado ?? existing.estado,
    }
    const result = await this.database.query(
      `UPDATE fisicalab.ejercicios
       SET tema_slug = $1, titulo = $2, enunciado = $3, dificultad = $4, respuesta = $5,
           solucion_detallada = $6, parametros = $7, pistas = $8, estado = $9, updated_at = now()
       WHERE id = $10
       RETURNING *`,
      [
        updated.temaSlug,
        updated.titulo,
        updated.enunciado,
        updated.dificultad,
        updated.respuesta,
        updated.solucionDetallada ?? null,
        JSON.stringify(updated.parametros ?? {}),
        updated.pistas ?? null,
        updated.estado,
        id,
      ]
    )
    return result.rows[0] ? toEjercicio(result.rows[0]) : null
  }
  async deleteEjercicio(id: string): Promise<boolean> {
    const result = await this.database.query('DELETE FROM fisicalab.ejercicios WHERE id = $1', [id])
    return (result.rowCount ?? 0) > 0
  }
}

function toEjercicio(row: Record<string, unknown>): Ejercicio {
  return ejercicioSchema.parse({
    id: String(row.id),
    temaSlug: String(row.tema_slug),
    titulo: String(row.titulo),
    enunciado: String(row.enunciado),
    dificultad: row.dificultad,
    respuesta: String(row.respuesta),
    solucionDetallada: row.solucion_detallada ?? null,
    parametros:
      typeof row.parametros === 'string'
        ? JSON.parse(row.parametros)
        : (row.parametros ?? {}),
    pistas: row.pistas ?? null,
    estado: row.estado,
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString(),
  })
}
