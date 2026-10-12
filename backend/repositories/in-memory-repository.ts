import type {
  Category,
  Simulation,
  TemaConfig,
  TemaRevision,
} from '../../packages/shared-types/src'
import type {
  AliasRepository,
  CategoryRepository,
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
    AliasRepository
{
  private readonly records = new Map<string, StoredTema>()
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
}
