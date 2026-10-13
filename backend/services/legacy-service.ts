import type {
  AuthUser,
  Simulation,
  SimulationContent,
  SimulationsQuery,
  TemaConfig,
} from '../../packages/shared-types/src'
import { NotFoundError } from '../errors'
import type {
  AliasRepository,
  SimulationRepository,
  TemaRepository,
} from '../repositories/interfaces'
import type { TemaService } from './tema-service'

/** @deprecated Compatibility projections; all editable text comes from TemaConfig. */
export class LegacyService {
  constructor(
    private readonly temas: TemaRepository,
    private readonly simulations: SimulationRepository,
    private readonly aliases: AliasRepository,
    private readonly temaService: TemaService
  ) {}
  private metadata(tema: TemaConfig): Simulation {
    const {
      id,
      slug,
      titulo,
      descripcionCorta,
      categoriaId,
      dificultad,
      estado,
      orden,
      icono,
      etiquetas,
    } = tema
    return {
      id,
      slug,
      titulo,
      descripcionCorta,
      categoriaId,
      dificultad,
      estado,
      orden,
      icono,
      etiquetas,
    }
  }
  async list(query: SimulationsQuery, user: AuthUser | null) {
    const themes = await this.temas.list()
    const bySlug = new Map(themes.map(tema => [tema.slug, tema]))
    const result = new Map<string, Simulation>()
    for (const sim of await this.simulations.listSimulations()) {
      const tema = bySlug.get(sim.slug)
      // A deleted canonical theme must not fall back to the old catalog.
      const stored = tema ?? (await this.temas.get(sim.slug, true))
      if (stored && (!tema || (tema.status !== 'published' && user?.role !== 'teacher'))) continue
      result.set(sim.slug, tema ? this.metadata(tema) : sim)
    }
    for (const tema of themes) {
      if (tema.simComponentSlug && (tema.status === 'published' || user?.role === 'teacher'))
        result.set(tema.slug, this.metadata(tema))
    }
    const q = query.q?.toLowerCase()
    const data = [...result.values()]
      .filter(
        sim =>
          (!query.categoriaId || sim.categoriaId === query.categoriaId) &&
          (!query.estado || sim.estado === query.estado) &&
          (!q ||
            [sim.titulo, sim.descripcionCorta, ...sim.etiquetas].some(text =>
              text.toLowerCase().includes(q)
            ))
      )
      .sort((a, b) => a.orden - b.orden)
    return { data, total: data.length }
  }
  async get(slug: string, user: AuthUser | null) {
    const canonical = await this.aliases.resolveAlias(slug)
    const sim = (await this.list({}, user)).data.find(item => item.slug === canonical)
    if (!sim) throw new NotFoundError('Simulación no encontrada')
    return sim
  }
  async content(slug: string, user: AuthUser | null): Promise<SimulationContent> {
    const tema = await this.temaService.get(slug, user)
    const units = new Map<string, { magnitud: string; unidad: string; simbolo: string }>()
    for (const formula of tema.formulas)
      for (const variable of formula.variables) {
        units.set(`${variable.simbolo}:${variable.unidad}`, {
          magnitud: variable.descripcion,
          unidad: variable.unidad,
          simbolo: variable.simbolo,
        })
      }
    return {
      slug: tema.slug,
      titulo: tema.titulo,
      teoria: [
        tema.teoria.introduccion,
        ...tema.teoria.secciones.map(
          section =>
            `## ${section.titulo}\n\n${section.contenido}${section.destacado ? `\n\n${section.destacado}` : ''}`
        ),
        `## Resumen\n\n${tema.teoria.resumen.map(item => `- ${item.contenido}`).join('\n')}`,
      ].join('\n\n'),
      formulas: tema.formulas.map(({ expresion, descripcion, variables }) => ({
        expresion,
        descripcion,
        variables,
      })),
      glosario: tema.glosario.map(({ termino, definicion }) => ({ termino, definicion })),
      unidades: [...units.values()],
    }
  }
}
