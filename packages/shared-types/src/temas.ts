import type { CategoryId, DifficultyLevel, SimulationStatus } from './index'
import type { z } from 'zod'
import type {
  temaSchema,
  formulaSchema,
  glosarioSchema,
  seccionSchema,
  resumenSchema,
  variableSchema,
  ejemploSchema,
  listTemasSchema,
} from './schemas'

export type TemaConfig = z.infer<typeof temaSchema>
export type FormulaDoc = z.infer<typeof formulaSchema>
export type GlosarioItem = z.infer<typeof glosarioSchema>
export type TeoriaSeccion = z.infer<typeof seccionSchema>
export type ResumenItem = z.infer<typeof resumenSchema>
export type VariableDef = z.infer<typeof variableSchema>
export type EjemploResuelto = z.infer<typeof ejemploSchema>
export type TeoriaDoc = TemaConfig['teoria']
export type TemasQuery = z.infer<typeof listTemasSchema>
export type UserRole = 'student' | 'teacher'
export interface AuthUser {
  userId: string
  role: UserRole
}
export interface TemaRevision {
  id: string
  snapshot: TemaConfig
  editor: string
  fecha: string
  operation: string
}

/** @deprecated Transitional static data contract; definitions only live here. */
export interface LegacyTemaConfig {
  id: string
  slug: string
  titulo: string
  descripcionCorta: string
  categoriaId: CategoryId
  dificultad: DifficultyLevel
  estado: SimulationStatus
  orden: number
  icono: string
  etiquetas: string[]
  formulaPrincipal: string
  formulas: LegacyFormulaDoc[]
  glosario: LegacyGlosarioItem[]
  teoria: LegacyTeoriaDoc
  simComponentSlug?: string
}
export interface LegacyFormulaDoc {
  id: string
  nombre: string
  expresion: string
  descripcion: string
  variables: VariableDef[]
  ejemploResuelto?: EjemploResuelto
}
export interface LegacyGlosarioItem {
  termino: string
  definicion: string
  categoria?: string
}
export interface LegacyTeoriaSeccion {
  titulo: string
  contenido: string
  destacado?: string
}
export interface LegacyTeoriaDoc {
  introduccion: string
  secciones: LegacyTeoriaSeccion[]
  resumen: string[]
}
