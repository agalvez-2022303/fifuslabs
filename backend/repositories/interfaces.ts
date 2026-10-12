import type {
  Category,
  Simulation,
  TemaConfig,
  TemaRevision,
} from '../../packages/shared-types/src'

export interface TemaRepository {
  list(): Promise<TemaConfig[]>
  get(slug: string, includeDeleted?: boolean): Promise<TemaConfig | null>
  /** Atomic compare-and-swap INCLUDING revision, deletion flag and history trimming. */
  commit(
    tema: TemaConfig,
    expectedVersion: number | null,
    revision: TemaRevision,
    deleted?: boolean
  ): Promise<void>
}
export interface CategoryRepository {
  listCategories(): Promise<Category[]>
}
export interface RevisionRepository {
  listRevisions(slug: string): Promise<TemaRevision[]>
}
/** Legacy catalog only; simulations themselves are never writable. */
export interface SimulationRepository {
  listSimulations(): Promise<Simulation[]>
}
export interface AliasRepository {
  resolveAlias(slug: string): Promise<string>
}
