import {
  ejercicioSchema,
  type Category,
  type CreateEjercicioInput,
  type Ejercicio,
  type PatchEjercicioInput,
  type Simulation,
  type TemaConfig,
  type TemaRevision,
} from '../../packages/shared-types/src'
import type {
  AliasRepository,
  CategoryRepository,
  EjercicioRepository,
  RevisionRepository,
  SimulationRepository,
  TemaRepository,
} from './interfaces'
import { nextRecord, type StoredTema } from './storage'

export class InMemoryRepository
  implements
    TemaRepository,
    CategoryRepository,
    RevisionRepository,
    SimulationRepository,
    AliasRepository,
    EjercicioRepository
{
  private readonly records = new Map<string, StoredTema>()
  private readonly ejercicios = new Map<string, Ejercicio>()
  constructor(
    temas: TemaConfig[] = [],
    private readonly categories: Category[] = [],
    private readonly simulations: Simulation[] = [],
    private readonly aliases: Record<string, string> = {}
  ) {
    for (const tema of temas)
      this.records.set(tema.slug, { tema: structuredClone(tema), deleted: false, revisions: [] })
  }
  async get(slug: string, includeDeleted = false): Promise<TemaConfig | null> {
    const record = this.records.get(slug)
    return record && (!record.deleted || includeDeleted) ? structuredClone(record.tema) : null
  }
  async list(): Promise<TemaConfig[]> {
    return [...this.records.values()]
      .filter(record => !record.deleted)
      .map(record => structuredClone(record.tema))
  }
  async commit(
    tema: TemaConfig,
    expected: number | null,
    revision: TemaRevision,
    deleted = false
  ): Promise<void> {
    this.records.set(
      tema.slug,
      nextRecord(this.records.get(tema.slug) ?? null, tema, expected, revision, deleted)
    )
  }
  async listRevisions(slug: string): Promise<TemaRevision[]> {
    return structuredClone(this.records.get(slug)?.revisions ?? [])
  }
  async listCategories(): Promise<Category[]> {
    return structuredClone(this.categories)
  }
  async listSimulations(): Promise<Simulation[]> {
    return structuredClone(this.simulations)
  }
  async resolveAlias(slug: string): Promise<string> {
    return Object.hasOwn(this.aliases, slug) ? this.aliases[slug] : slug
  }
  async listEjercicios(filter?: {
    temaSlug?: string
    dificultad?: string
    q?: string
  }): Promise<Ejercicio[]> {
    let list = Array.from(this.ejercicios.values())
    if (filter?.temaSlug) list = list.filter(e => e.temaSlug === filter.temaSlug)
    if (filter?.dificultad) list = list.filter(e => e.dificultad === filter.dificultad)
    if (filter?.q) {
      const query = filter.q.toLowerCase()
      list = list.filter(
        e => e.titulo.toLowerCase().includes(query) || e.enunciado.toLowerCase().includes(query)
      )
    }
    return structuredClone(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  }
  async getEjercicio(id: string): Promise<Ejercicio | null> {
    const item = this.ejercicios.get(id)
    return item ? structuredClone(item) : null
  }
  async createEjercicio(input: CreateEjercicioInput): Promise<Ejercicio> {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const ejercicio: Ejercicio = ejercicioSchema.parse({
      id,
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
    this.ejercicios.set(id, ejercicio)
    return structuredClone(ejercicio)
  }
  async updateEjercicio(id: string, input: PatchEjercicioInput): Promise<Ejercicio | null> {
    const item = this.ejercicios.get(id)
    if (!item) return null
    const updated: Ejercicio = ejercicioSchema.parse({
      ...item,
      temaSlug: input.temaSlug ?? item.temaSlug,
      titulo: input.titulo ?? item.titulo,
      enunciado: input.enunciado ?? item.enunciado,
      dificultad: input.dificultad ?? item.dificultad,
      respuesta: input.respuesta ?? item.respuesta,
      solucionDetallada:
        input.solucionDetallada !== undefined ? input.solucionDetallada : item.solucionDetallada,
      parametros: input.parametros !== undefined ? input.parametros : item.parametros,
      pistas: input.pistas !== undefined ? input.pistas : item.pistas,
      estado: input.estado ?? item.estado,
      updatedAt: new Date().toISOString(),
    })
    this.ejercicios.set(id, updated)
    return structuredClone(updated)
  }
  async deleteEjercicio(id: string): Promise<boolean> {
    return this.ejercicios.delete(id)
  }
}
