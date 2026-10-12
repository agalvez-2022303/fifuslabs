import raw from '../../data/temas/mru.json'
import categories from '../../data/categories.json'
import {
  metadataSchema,
  temaSchema,
  type AuthUser,
  type Category,
} from '../../packages/shared-types/src'
import { InMemoryRepository } from '../repositories/in-memory-repository'
import { TemaService } from '../services/tema-service'

export const teacher: AuthUser = { userId: 'teacher-test', role: 'teacher' }
export const student: AuthUser = { userId: 'student-test', role: 'student' }
export const fixture = temaSchema.parse(raw)
export function setup() {
  const repository = new InMemoryRepository([fixture], categories as Category[])
  return { repository, service: new TemaService(repository, repository, repository, repository) }
}
export function createInput(slug = 'new-tema') {
  const tema = fixture
  return {
    ...metadataSchema.strip().parse(tema),
    slug,
    status: 'draft',
    formulas: tema.formulas.map(({ id: _id, ...item }) => item),
    glosario: tema.glosario.map(({ id: _id, ...item }) => item),
    teoria: {
      ...tema.teoria,
      secciones: tema.teoria.secciones.map(({ id: _id, ...item }) => item),
      resumen: tema.teoria.resumen.map(({ id: _id, ...item }) => item),
    },
  }
}
