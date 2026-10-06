import type { CategoryId, DifficultyLevel, SimulationStatus } from '@physicslab/shared-types'

export interface VariableDef {
  simbolo: string
  descripcion: string
  unidad: string
}

export interface EjemploResuelto {
  enunciado: string
  datos: string
  desarrollo: string
  resultado: string
}

export interface FormulaDoc {
  id: string
  nombre: string
  expresion: string
  descripcion: string
  variables: VariableDef[]
  ejemploResuelto?: EjemploResuelto
}

export interface GlosarioItem {
  termino: string
  definicion: string
  categoria?: string
}

export interface TeoriaSeccion {
  titulo: string
  contenido: string
  destacado?: string
}

export interface TeoriaDoc {
  introduccion: string
  secciones: TeoriaSeccion[]
  resumen: string[]
}

export interface TemaConfig {
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
  formulas: FormulaDoc[]
  glosario: GlosarioItem[]
  teoria: TeoriaDoc
  simComponentSlug?: string
}
