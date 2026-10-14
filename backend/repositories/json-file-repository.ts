import { randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import {
  categoryIdSchema,
  difficultySchema,
  ejercicioSchema,
  slugSchema,
  temaSchema,
  type Category,
  type CreateEjercicioInput,
  type Ejercicio,
  type PatchEjercicioInput,
  type Simulation,
  type TemaConfig,
  type TemaRevision,
} from '../../packages/shared-types/src'
import { NotImplementedError, ValidationError } from '../errors'
import type {
  AliasRepository,
  CategoryRepository,
  EjercicioRepository,
  RevisionRepository,
  SimulationRepository,
  TemaRepository,
} from './interfaces'
import { nextRecord, storageSchema, type StoredTema } from './storage'

const locks = new Map<string, Promise<void>>()
const categorySchema = z
  .object({
    id: categoryIdSchema,
    nombre: z.string(),
    descripcion: z.string(),
    icono: z.string(),
    orden: z.number(),
  })
  .strict()
const simulationSchema = z
  .object({
    id: z.string(),
    slug: slugSchema,
    titulo: z.string(),
    descripcionCorta: z.string(),
    categoriaId: categoryIdSchema,
    dificultad: difficultySchema,
    estado: z.enum(['active', 'coming-soon']),
    orden: z.number(),
    icono: z.string(),
    etiquetas: z.array(z.string()),
  })
  .strict()
function missing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

/** TEMPORARY: one local process only. Vercel/production is read-only; replace in composition.ts. */
export class JsonFileRepository
  implements
    TemaRepository,
    CategoryRepository,
    RevisionRepository,
    SimulationRepository,
    AliasRepository,
    EjercicioRepository
{
  constructor(
    private readonly dataDir: string,
    private readonly production = process.env.NODE_ENV === 'production' ||
      Boolean(process.env.VERCEL)
  ) {}
  private file(slug: string): string {
    if (!slugSchema.safeParse(slug).success) throw new ValidationError('Slug inválido')
    return path.join(this.dataDir, 'temas', `${slug}.json`)
  }
  private async read(slug: string): Promise<StoredTema | null> {
    let raw: string
    try {
      raw = await readFile(this.file(slug), 'utf8')
    } catch (error: unknown) {
      if (missing(error)) return null
      throw error
    }
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('Invalid stored theme')
    const { _storage, ...content } = value as Record<string, unknown>
    const tema = temaSchema.parse(content)
    if (tema.slug !== slug) throw new Error('Stored slug does not match filename')
    const storage =
      _storage === undefined ? { deleted: false, revisions: [] } : storageSchema.parse(_storage)
    return { tema, ...storage }
  }
  async get(slug: string, includeDeleted = false): Promise<TemaConfig | null> {
    const record = await this.read(slug)
    return record && (!record.deleted || includeDeleted) ? record.tema : null
  }
  async list(): Promise<TemaConfig[]> {
    const files = await readdir(path.join(this.dataDir, 'temas'))
    const temas = await Promise.all(
      files.filter(file => file.endsWith('.json')).map(file => this.get(file.slice(0, -5)))
    )
    return temas.filter((tema): tema is TemaConfig => tema !== null)
  }
  async listRevisions(slug: string): Promise<TemaRevision[]> {
    return (await this.read(slug))?.revisions ?? []
  }
  async listCategories(): Promise<Category[]> {
    return z
      .array(categorySchema)
      .parse(JSON.parse(await readFile(path.join(this.dataDir, 'categories.json'), 'utf8')))
  }
  async listSimulations(): Promise<Simulation[]> {
    return z
      .array(simulationSchema)
      .parse(JSON.parse(await readFile(path.join(this.dataDir, 'simulations.json'), 'utf8')))
  }
  async resolveAlias(slug: string): Promise<string> {
    const aliases = z
      .record(z.string(), slugSchema)
      .parse(JSON.parse(await readFile(path.join(this.dataDir, 'tema-aliases.json'), 'utf8')))
    return Object.hasOwn(aliases, slug) ? aliases[slug] : slug
  }
  async commit(
    tema: TemaConfig,
    expectedVersion: number | null,
    revision: TemaRevision,
    deleted = false
  ): Promise<void> {
    if (this.production || process.env.NODE_ENV === 'production' || process.env.VERCEL)
      throw new NotImplementedError()
    const file = this.file(tema.slug)
    const previous = locks.get(file) ?? Promise.resolve()
    let release!: () => void
    const waiting = new Promise<void>(resolve => {
      release = resolve
    })
    const queue = previous.then(() => waiting)
    locks.set(file, queue)
    await previous
    const temporary = `${file}.${randomUUID()}.tmp`
    try {
      const record = nextRecord(
        await this.read(tema.slug),
        tema,
        expectedVersion,
        revision,
        deleted
      )
      temaSchema.parse(record.tema)
      storageSchema.parse({ deleted: record.deleted, revisions: record.revisions })
      await mkdir(path.dirname(file), { recursive: true })
      await writeFile(
        temporary,
        `${JSON.stringify({ ...record.tema, _storage: { deleted: record.deleted, revisions: record.revisions } }, null, 2)}\n`,
        { flag: 'wx', mode: 0o600 }
      )
      await rename(temporary, file)
    } finally {
      await unlink(temporary)
        .catch((error: unknown) => {
          if (!missing(error)) throw error
        })
        .finally(() => {
          release()
          if (locks.get(file) === queue) locks.delete(file)
        })
    }
  }
  private ejerciciosFile(): string {
    return path.join(this.dataDir, 'ejercicios.json')
  }
  private async readEjercicios(): Promise<Ejercicio[]> {
    try {
      const raw = await readFile(this.ejerciciosFile(), 'utf8')
      const items: unknown = JSON.parse(raw)
      return Array.isArray(items) ? items.map(item => ejercicioSchema.parse(item)) : []
    } catch (error: unknown) {
      if (missing(error)) return []
      throw error
    }
  }
  private async writeEjercicios(items: Ejercicio[]): Promise<void> {
    await mkdir(this.dataDir, { recursive: true })
    const file = this.ejerciciosFile()
    const temp = `${file}.${randomUUID()}.tmp`
    await writeFile(temp, `${JSON.stringify(items, null, 2)}\n`, 'utf8')
    await rename(temp, file)
  }
  async listEjercicios(filter?: {
    temaSlug?: string
    dificultad?: string
    q?: string
  }): Promise<Ejercicio[]> {
    let items = await this.readEjercicios()
    if (filter?.temaSlug) items = items.filter(e => e.temaSlug === filter.temaSlug)
    if (filter?.dificultad) items = items.filter(e => e.dificultad === filter.dificultad)
    if (filter?.q) {
      const query = filter.q.toLowerCase()
      items = items.filter(
        e => e.titulo.toLowerCase().includes(query) || e.enunciado.toLowerCase().includes(query)
      )
    }
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  async getEjercicio(id: string): Promise<Ejercicio | null> {
    const items = await this.readEjercicios()
    return items.find(e => e.id === id) ?? null
  }
  async createEjercicio(input: CreateEjercicioInput): Promise<Ejercicio> {
    const items = await this.readEjercicios()
    const now = new Date().toISOString()
    const ejercicio: Ejercicio = ejercicioSchema.parse({
      id: randomUUID(),
      temaSlug: input.temaSlug,
      titulo: input.titulo,
      enunciado: input.enunciado,
      dificultad: input.dificultad,
      respuesta: input.respuesta,
      solucionDetallada: input.solucionDetallada ?? null,
      parametros: input.parametros ?? {},
      pistas: input.pistas ?? null,
      estado: input.estado ?? 'published',
      createdAt: now,
      updatedAt: now,
    })
    items.push(ejercicio)
    await this.writeEjercicios(items)
    return ejercicio
  }
  async updateEjercicio(id: string, input: PatchEjercicioInput): Promise<Ejercicio | null> {
    const items = await this.readEjercicios()
    const index = items.findIndex(e => e.id === id)
    if (index === -1) return null
    const current = items[index]
    const updated: Ejercicio = ejercicioSchema.parse({
      ...current,
      temaSlug: input.temaSlug ?? current.temaSlug,
      titulo: input.titulo ?? current.titulo,
      enunciado: input.enunciado ?? current.enunciado,
      dificultad: input.dificultad ?? current.dificultad,
      respuesta: input.respuesta ?? current.respuesta,
      solucionDetallada:
        input.solucionDetallada !== undefined ? input.solucionDetallada : current.solucionDetallada,
      parametros: input.parametros !== undefined ? input.parametros : current.parametros,
      pistas: input.pistas !== undefined ? input.pistas : current.pistas,
      estado: input.estado ?? current.estado,
      updatedAt: new Date().toISOString(),
    })
    items[index] = updated
    await this.writeEjercicios(items)
    return updated
  }
  async deleteEjercicio(id: string): Promise<boolean> {
    const items = await this.readEjercicios()
    const next = items.filter(e => e.id !== id)
    if (next.length === items.length) return false
    await this.writeEjercicios(next)
    return true
  }
}
