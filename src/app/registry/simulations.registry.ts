/**
 * simulations.registry.ts
 *
 * Registro central de simulaciones del frontend.
 * Cada entrada tiene la metadata estática necesaria para renderizar
 * la tarjeta en Home y navegar al Dashboard del Tema.
 */

import type { CategoryId, DifficultyLevel, SimulationStatus } from '@physicslab/shared-types'

export interface SimulationEntry {
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
  /** Ruta al dashboard del tema o simulación */
  path: string
}

export const SIMULATIONS_REGISTRY: SimulationEntry[] = [
  {
    id: 'sim-000',
    slug: 'vectores',
    titulo: 'Vectores',
    descripcionCorta: 'Coordenadas rectangulares, polares y geográficas con práctica interactiva.',
    categoriaId: 'mecanica',
    dificultad: 'basico',
    estado: 'active',
    orden: 1,
    icono: '↗',
    etiquetas: ['vectores', 'coordenadas', 'polar', 'rectangular', 'geográfico', 'práctica'],
    path: '/tema/vectores',
  },
  {
    id: 'sim-014',
    slug: 'mru',
    titulo: 'Movimiento Rectilíneo Uniforme (MRU)',
    descripcionCorta: 'Velocidad constante, gráficas x-t y v-t, tabla de valores y fotopuertas.',
    categoriaId: 'mecanica',
    dificultad: 'basico',
    estado: 'active',
    orden: 1.5,
    icono: 'east',
    etiquetas: ['cinemática', 'MRU', 'velocidad constante', 'gráficas', 'posición', 'tiempo'],
    path: '/tema/mru',
  },
  {
    id: 'sim-001',
    slug: 'movimiento-aceleracion-constante',
    titulo: 'Movimiento con Aceleración Constante',
    descripcionCorta: 'MRUA con gráficas x-t, v-t y a-t en tiempo real.',
    categoriaId: 'mecanica',
    dificultad: 'basico',
    estado: 'active',
    orden: 2,
    icono: '→',
    etiquetas: ['cinemática', 'MRUA', 'gráficas', 'aceleración', 'velocidad'],
    path: '/tema/movimiento-aceleracion-constante',
  },
  {
    id: 'sim-002',
    slug: 'tres-fuerzas-equilibrio',
    titulo: 'Tres Fuerzas en Equilibrio',
    descripcionCorta: 'Equilibrio estático con poleas y pesas arrastrables.',
    categoriaId: 'mecanica',
    dificultad: 'basico',
    estado: 'active',
    orden: 3,
    icono: '△',
    etiquetas: ['estática', 'equilibrio', 'vectores', 'fuerzas'],
    path: '/tema/tres-fuerzas-equilibrio',
  },
  {
    id: 'sim-003',
    slug: 'suma-vectores',
    titulo: 'Suma de vectores',
    descripcionCorta: 'Método del paralelogramo, triángulo, polígono y método analítico.',
    categoriaId: 'mecanica',
    dificultad: 'basico',
    estado: 'active',
    orden: 4,
    icono: '⊕',
    etiquetas: ['vectores', 'suma vectorial', 'resultante', 'analítico'],
    path: '/tema/suma-vectores',
  },
  {
    id: 'sim-013',
    slug: 'alcances-mru',
    titulo: 'Alcances y Encuentros MRU',
    descripcionCorta: 'Simulación 1D de móviles en persecución o sentidos opuestos con resolución analítica y escala dinámica.',
    categoriaId: 'mecanica',
    dificultad: 'basico',
    estado: 'active',
    orden: 5,
    icono: 'compare_arrows',
    etiquetas: ['cinemática', 'MRU', 'alcance', 'encuentro', 'gráficas', 'tiempo'],
    path: '/tema/alcances-mru',
  },
  {
    id: 'sim-011',
    slug: 'distancia-desplazamiento',
    titulo: 'Distancia vs Desplazamiento',
    descripcionCorta: 'Comparativa interactiva entre longitud de trayectoria escalar s(t) y vector desplazamiento Δr(t).',
    categoriaId: 'mecanica',
    dificultad: 'basico',
    estado: 'active',
    orden: 6,
    icono: 'route',
    etiquetas: ['cinemática', 'distancia', 'desplazamiento', 'trayectoria', 'escalar', 'vectorial'],
    path: '/tema/distancia-desplazamiento',
  },
  {
    id: 'sim-012',
    slug: 'velocidad-rapidez',
    titulo: 'Velocidad vs Rapidez',
    descripcionCorta: 'Análisis de rapidez tangencial escalar vs vector velocidad en trayectorias curvilíneas y periódicas.',
    categoriaId: 'mecanica',
    dificultad: 'intermedio',
    estado: 'active',
    orden: 7,
    icono: 'speed',
    etiquetas: ['cinemática', 'velocidad', 'rapidez', 'órbita', 'vectorial'],
    path: '/tema/velocidad-rapidez',
  },
  // ─── Próximamente ──────────────────────────────────────────────
  {
    id: 'sim-004',
    slug: 'pendulo-simple',
    titulo: 'Péndulo Simple',
    descripcionCorta: 'Oscilación y periodo en función de la longitud.',
    categoriaId: 'mecanica',
    dificultad: 'basico',
    estado: 'coming-soon',
    orden: 8,
    icono: '◷',
    etiquetas: ['péndulo', 'oscilación'],
    path: '/tema/pendulo-simple',
  },
  {
    id: 'sim-005',
    slug: 'tiro-parabolico',
    titulo: 'Tiro Parabólico',
    descripcionCorta: 'Trayectoria de un proyectil bajo gravedad.',
    categoriaId: 'mecanica',
    dificultad: 'basico',
    estado: 'coming-soon',
    orden: 9,
    icono: '⌒',
    etiquetas: ['proyectil', 'parábola'],
    path: '/tema/tiro-parabolico',
  },
  {
    id: 'sim-006',
    slug: 'ley-de-hooke',
    titulo: 'Ley de Hooke',
    descripcionCorta: 'Deformación de un resorte y relación fuerza-elongación.',
    categoriaId: 'mecanica',
    dificultad: 'basico',
    estado: 'coming-soon',
    orden: 10,
    icono: '⌀',
    etiquetas: ['resorte', 'elasticidad'],
    path: '/tema/ley-de-hooke',
  },
  {
    id: 'sim-007',
    slug: 'onda-transversal',
    titulo: 'Onda Transversal',
    descripcionCorta: 'Propagación de ondas y parámetros de onda.',
    categoriaId: 'oscilaciones-ondas',
    dificultad: 'intermedio',
    estado: 'coming-soon',
    orden: 1,
    icono: '≋',
    etiquetas: ['onda', 'amplitud', 'frecuencia'],
    path: '/tema/onda-transversal',
  },
  {
    id: 'sim-008',
    slug: 'campo-electrico',
    titulo: 'Campo Eléctrico',
    descripcionCorta: 'Campo eléctrico por cargas puntuales.',
    categoriaId: 'electrodinamica',
    dificultad: 'intermedio',
    estado: 'coming-soon',
    orden: 1,
    icono: '⚡',
    etiquetas: ['campo eléctrico', 'Coulomb'],
    path: '/tema/campo-electrico',
  },
  {
    id: 'sim-009',
    slug: 'espejo-convergente',
    titulo: 'Espejo Convergente',
    descripcionCorta: 'Trazado de rayos en espejos esféricos.',
    categoriaId: 'optica',
    dificultad: 'intermedio',
    estado: 'coming-soon',
    orden: 1,
    icono: '◑',
    etiquetas: ['espejos', 'óptica'],
    path: '/tema/espejo-convergente',
  },
  {
    id: 'sim-010',
    slug: 'ciclo-carnot',
    titulo: 'Ciclo de Carnot',
    descripcionCorta: 'Ciclo termodinámico ideal en diagrama P-V.',
    categoriaId: 'termodinamica',
    dificultad: 'avanzado',
    estado: 'coming-soon',
    orden: 1,
    icono: '♨',
    etiquetas: ['Carnot', 'termodinámica'],
    path: '/tema/ciclo-carnot',
  },
]

/** Si es false, oculta las tarjetas "Próximamente" de la interfaz */
export const SHOW_COMING_SOON = false

/** Devuelve simulaciones agrupadas por categoría */
export function getByCategory(includeComingSoon = SHOW_COMING_SOON) {
  const registry = includeComingSoon
    ? SIMULATIONS_REGISTRY
    : SIMULATIONS_REGISTRY.filter(s => s.estado === 'active')

  return registry.reduce(
    (acc, sim) => {
      if (!acc[sim.categoriaId]) acc[sim.categoriaId] = []
      acc[sim.categoriaId].push(sim)
      return acc
    },
    {} as Record<string, SimulationEntry[]>
  )
}

/** Filtra por texto (título, descripción o etiquetas) */
export function filterByText(sims: SimulationEntry[], q: string) {
  const query = q.toLowerCase()
  return sims.filter(
    s =>
      s.titulo.toLowerCase().includes(query) ||
      s.descripcionCorta.toLowerCase().includes(query) ||
      s.etiquetas.some(t => t.toLowerCase().includes(query))
  )
}
