import {
  createEjercicioSchema,
  patchEjercicioSchema,
  type Ejercicio,
} from '../../packages/shared-types/src'
import { NotFoundError, ValidationError } from '../errors'
import type { EjercicioRepository, TemaRepository } from '../repositories/interfaces'

export class EjercicioService {
  constructor(
    private readonly repository: EjercicioRepository,
    private readonly temas?: TemaRepository
  ) {}

  async list(filter?: {
    temaSlug?: string
    dificultad?: string
    q?: string
  }): Promise<Ejercicio[]> {
    return this.repository.listEjercicios(filter)
  }

  async get(id: string): Promise<Ejercicio> {
    const item = await this.repository.getEjercicio(id)
    if (!item) throw new NotFoundError('Ejercicio no encontrado')
    return item
  }

  async create(data: unknown): Promise<Ejercicio> {
    const parsed = createEjercicioSchema.safeParse(data)
    if (!parsed.success) {
      throw new ValidationError(
        'Datos del ejercicio inválidos',
        parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
      )
    }
    if (this.temas) {
      const tema = await this.temas.get(parsed.data.temaSlug)
      if (!tema) throw new NotFoundError(`El tema/módulo '${parsed.data.temaSlug}' no existe`)
    }
    return this.repository.createEjercicio(parsed.data)
  }

  async update(id: string, data: unknown): Promise<Ejercicio> {
    const parsed = patchEjercicioSchema.safeParse(data)
    if (!parsed.success) {
      throw new ValidationError(
        'Datos de actualización inválidos',
        parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
      )
    }
    if (parsed.data.temaSlug && this.temas) {
      const tema = await this.temas.get(parsed.data.temaSlug)
      if (!tema) throw new NotFoundError(`El tema/módulo '${parsed.data.temaSlug}' no existe`)
    }
    const updated = await this.repository.updateEjercicio(id, parsed.data)
    if (!updated) throw new NotFoundError('Ejercicio no encontrado')
    return updated
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.repository.deleteEjercicio(id)
    if (!deleted) throw new NotFoundError('Ejercicio no encontrado')
  }
}

