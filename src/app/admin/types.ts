export interface AdminUser {
  id_usuario: number
  nombre: string
  correo: string
  rol: 'admin'
}

export interface Statistic {
  total: number
  drafts: number | null
}

export interface TopicSummary {
  id_tema: number
  titulo: string
  slug: string
  area: string
  nivel: string
  estado: string
  total_teoria: number
  total_formulas: number
  total_glosario: number
  total_ejercicios: number
}

export interface DashboardSummary {
  stats: {
    areas: Statistic
    temas: Statistic
    teoria: Statistic
    formulas: Statistic
    glosario: Statistic
    ejercicios: Statistic
  }
  topics: TopicSummary[]
  contentStatus: {
    publicado: number
    borrador: number
    archivado: number
  }
  latestChanges: {
    tipo: string
    titulo: string
    tema: string
    estado: string
    fecha_actualizacion: string
  }[]
  pendings: {
    topics: {
      id_tema: number
      titulo: string
      area: string
      estado: string
      sin_formulas: boolean
      sin_glosario: boolean
      sin_ejercicios: boolean
    }[]
    draftContentCount: number
  }
}

