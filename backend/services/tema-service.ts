import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import {
  createTemaSchema,
  itemSchemas,
  patchStatusSchema,
  patchTemaSchema,
  putTeoriaSchema,
  type AuthUser,
  type TemaConfig,
  type TemaRevision,
  type TemasQuery,
} from '../../packages/shared-types/src'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../errors'
import type {
  AliasRepository,
  CategoryRepository,
  RevisionRepository,
  TemaRepository,
} from '../repositories/interfaces'
import { validateContent } from './content-validation'

export type ItemKind = keyof typeof itemSchemas
type Item =
  | TemaConfig['formulas'][number]
  | TemaConfig['glosario'][number]
  | TemaConfig['teoria']['secciones'][number]
  | TemaConfig['teoria']['resumen'][number]
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) throw new ValidationError('Entrada inválida', result.error.issues)
  return result.data
}
function items(tema: TemaConfig, kind: ItemKind): Item[] {
  return kind === 'secciones' || kind === 'resumen' ? tema.teoria[kind] : tema[kind]
}
function setItems(tema: TemaConfig, kind: ItemKind, value: Item[]): TemaConfig {
  return kind === 'secciones' || kind === 'resumen'
    ? ({ ...tema, teoria: { ...tema.teoria, [kind]: value } } as TemaConfig)
    : ({ ...tema, [kind]: value } as TemaConfig)
}
export class TemaService {
  constructor(
    private readonly temas: TemaRepository,
    private readonly categories: CategoryRepository,
    private readonly revisions: RevisionRepository,
    private readonly aliases: AliasRepository
  ) {}
  private teacher(user: AuthUser) {
    if (user.role !== 'teacher') throw new ForbiddenError()
  }
  async list(query: TemasQuery, user: AuthUser | null) {
    if (query.status && user?.role !== 'teacher')
      throw new ForbiddenError('El filtro status solo está disponible para maestros')
    const q = query.q?.toLocaleLowerCase()
    const filtered = (await this.temas.list())
      .filter(
        tema =>
          (user?.role === 'teacher' || tema.status === 'published') &&
          (!query.status || tema.status === query.status) &&
          (!query.categoriaId || tema.categoriaId === query.categoriaId) &&
          (!query.dificultad || tema.dificultad === query.dificultad) &&
          (!q ||
            [tema.titulo, tema.descripcionCorta, ...tema.etiquetas].some(text =>
              text.toLocaleLowerCase().includes(q)
            ))
      )
      .sort((a, b) => a.orden - b.orden || a.slug.localeCompare(b.slug))
    return {
      items: filtered.slice(query.offset, query.offset + query.limit),
      total: filtered.length,
      limit: query.limit,
      offset: query.offset,
    }
  }
  async get(slug: string, user: AuthUser | null): Promise<TemaConfig> {
    const tema = await this.temas.get(await this.aliases.resolveAlias(slug))
    if (!tema || (tema.status !== 'published' && user?.role !== 'teacher'))
      throw new NotFoundError()
    return tema
  }
  private async current(
    slug: string,
    user: AuthUser,
    version: number,
    includeDeleted = false
  ): Promise<TemaConfig> {
    this.teacher(user)
    const canonical = await this.aliases.resolveAlias(slug)
    const tema = await this.temas.get(canonical, includeDeleted)
    if (!tema) throw new NotFoundError()
    if (tema.version !== version)
      throw new ConflictError('Versión desactualizada; lee el tema de nuevo')
    return tema
  }
  private async save(
    value: TemaConfig,
    version: number | null,
    user: AuthUser,
    operation: string,
    deleted = false
  ) {
    this.teacher(user)
    const tema = validateContent({
      ...value,
      version: version === null ? 1 : version + 1,
      updatedAt: new Date().toISOString(),
    })
    if (
      !(await this.categories.listCategories()).some(category => category.id === tema.categoriaId)
    )
      throw new ValidationError('Categoría inexistente')
    const revision: TemaRevision = {
      id: randomUUID(),
      snapshot: tema,
      editor: user.userId,
      fecha: tema.updatedAt,
      operation,
    }
    await this.temas.commit(tema, version, revision, deleted)
    return tema
  }
  async create(input: unknown, user: AuthUser): Promise<TemaConfig> {
    this.teacher(user)
    const data = parse(createTemaSchema, input)
    if ((await this.aliases.resolveAlias(data.slug)) !== data.slug)
      throw new ConflictError('El slug está reservado como alias')
    const withIds = <T extends object>(values: T[]) =>
      values.map(item => ({ ...item, id: randomUUID() }))
    return this.save(
      {
        ...data,
        id: randomUUID(),
        version: 1,
        updatedAt: new Date().toISOString(),
        formulas: withIds(data.formulas),
        glosario: withIds(data.glosario),
        teoria: {
          ...data.teoria,
          secciones: withIds(data.teoria.secciones),
          resumen: withIds(data.teoria.resumen),
        },
      },
      null,
      user,
      'create'
    )
  }
  async patch(slug: string, input: unknown, user: AuthUser, version: number) {
    const patch = parse(patchTemaSchema, input)
    delete patch.version
    return this.save(
      { ...(await this.current(slug, user, version)), ...patch },
      version,
      user,
      'metadata'
    )
  }
  async status(slug: string, input: unknown, user: AuthUser, version: number) {
    const { status } = parse(patchStatusSchema, input)
    return this.save(
      { ...(await this.current(slug, user, version)), status },
      version,
      user,
      'status'
    )
  }
  async introduction(slug: string, input: unknown, user: AuthUser, version: number) {
    const { introduccion } = parse(putTeoriaSchema, input)
    const tema = await this.current(slug, user, version)
    return this.save(
      { ...tema, teoria: { ...tema.teoria, introduccion } },
      version,
      user,
      'introduction'
    )
  }
  async remove(slug: string, user: AuthUser, version: number) {
    return this.save(await this.current(slug, user, version), version, user, 'delete', true)
  }
  async addItem(slug: string, kind: ItemKind, input: unknown, user: AuthUser, version: number) {
    const data = parse(itemSchemas[kind] as z.ZodType<object>, input)
    const tema = await this.current(slug, user, version)
    return this.save(
      setItems(tema, kind, [...items(tema, kind), { ...data, id: randomUUID() } as Item]),
      version,
      user,
      `add:${kind}`
    )
  }
  async patchItem(
    slug: string,
    kind: ItemKind,
    id: string,
    input: unknown,
    user: AuthUser,
    version: number
  ) {
    const schema = itemSchemas[kind].partial().strict()
    const data = parse(schema as z.ZodType<object>, input)
    if (!Object.keys(data).length) throw new ValidationError('Actualización vacía')
    const tema = await this.current(slug, user, version)
    const values = items(tema, kind)
    if (!values.some(item => item.id === id)) throw new NotFoundError()
    return this.save(
      setItems(
        tema,
        kind,
        values.map(item => (item.id === id ? { ...item, ...data, id } : item))
      ),
      version,
      user,
      `patch:${kind}`
    )
  }
  async removeItem(slug: string, kind: ItemKind, id: string, user: AuthUser, version: number) {
    const tema = await this.current(slug, user, version)
    const values = items(tema, kind)
    if (!values.some(item => item.id === id)) throw new NotFoundError()
    return this.save(
      setItems(
        tema,
        kind,
        values.filter(item => item.id !== id)
      ),
      version,
      user,
      `delete:${kind}`
    )
  }
  async reorder(
    slug: string,
    kind: Exclude<ItemKind, 'resumen'>,
    ids: string[],
    user: AuthUser,
    version: number
  ) {
    const tema = await this.current(slug, user, version)
    const values = items(tema, kind)
    const byId = new Map(values.map(item => [item.id, item]))
    if (
      ids.length !== values.length ||
      new Set(ids).size !== ids.length ||
      ids.some(id => !byId.has(id))
    ) {
      throw new ValidationError('Los ids deben ser una permutación exacta de la colección')
    }
    return this.save(
      setItems(
        tema,
        kind,
        ids.map(id => byId.get(id)!)
      ),
      version,
      user,
      `reorder:${kind}`
    )
  }
  async history(slug: string, user: AuthUser) {
    this.teacher(user)
    const canonical = await this.aliases.resolveAlias(slug)
    if (!(await this.temas.get(canonical, true))) throw new NotFoundError()
    return this.revisions.listRevisions(canonical)
  }
  async restore(slug: string, id: string, user: AuthUser, version: number) {
    const current = await this.current(slug, user, version, true)
    const revision = (await this.revisions.listRevisions(current.slug)).find(item => item.id === id)
    if (!revision) throw new NotFoundError('Revisión no encontrada')
    return this.save(
      { ...revision.snapshot, id: current.id, slug: current.slug },
      version,
      user,
      `restore:${id}`
    )
  }
}
