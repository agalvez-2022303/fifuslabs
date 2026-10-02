/**
 * physics.ts
 *
 * Módulo de física pura y cálculos matemáticos para la simulación
 * "Distancia vs Desplazamiento" destinada a estudiantes de 4.º Diversificado.
 *
 * Principios físicos:
 * 1. Distancia (s o d): Magnitud escalar que mide la longitud total del camino
 *    o trayectoria recorrida. Siempre es no negativa (s >= 0) y acumulativa.
 *    d_total = sum(d_i)
 * 2. Desplazamiento (Δr): Magnitud vectorial que describe el cambio neto de posición
 *    desde la posición inicial (r_i) hasta la posición final o actual (r_f).
 *    Δr = r_f - r_i = (x_f - x_i) î + (y_f - y_i) ĵ
 *    |Δr| = sqrt((Δx)² + (Δy)²)
 *    θ = atan2(Δy, Δx)
 * 3. Cinemática con aceleración (a) a lo largo de la trayectoria:
 *    s(t) = v0·t + (1/2)·a·t²
 *    v(t) = v0 + a·t
 *    Teorema fundamental de la cinemática: s(t) >= |Δr(t)| en todo instante.
 */

export interface Point2D {
  x: number
  y: number
  label?: string
}

export interface NodePoint extends Point2D {
  id: string
  label: string
}

export interface SegmentInfo {
  index: number
  p1: Point2D
  p2: Point2D
  dx: number
  dy: number
  length: number
  cumLengthStart: number
  cumLengthEnd: number
}

export interface DisplacementResult {
  dx: number
  dy: number
  magnitude: number
  angleRad: number
  angleDeg: number
  canonicalString: string
}

export interface PathCalculations {
  segments: SegmentInfo[]
  totalDistance: number
  initialPoint: Point2D | null
  finalPoint: Point2D | null
  displacement: DisplacementResult
  efficiency: number // (|Δr| / d) * 100 %
}

export interface KinematicsParams {
  acceleration: number // m/s² (a >= 0)
  v0: number          // m/s (rapidez inicial, por defecto 0)
}

export interface MotionState {
  time: number
  distanceCovered: number
  speed: number
  currentPosition: Point2D
  activeSegmentIndex: number
  currentDisplacement: DisplacementResult
  progressPercent: number
  isComplete: boolean
  totalDuration: number
}

export interface BoundingBox {
  minX: number
  maxX: number
  minY: number
  maxY: number
  width: number
  height: number
  viewBox: string
}

/**
 * Calcula la distancia euclidiana entre dos puntos (x1, y1) y (x2, y2).
 */
export function distanceBetween(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.hypot(dx, dy)
}

/**
 * Calcula el vector desplazamiento entre un punto inicial y un punto final.
 */
export function computeDisplacement(pStart: Point2D, pEnd: Point2D): DisplacementResult {
  const dx = pEnd.x - pStart.x
  const dy = pEnd.y - pStart.y
  const magnitude = Math.hypot(dx, dy)
  let angleRad = Math.atan2(dy, dx)
  if (angleRad < 0) {
    angleRad += 2 * Math.PI
  }
  const angleDeg = (angleRad * 180) / Math.PI

  const signX = dx < 0 ? '-' : ''
  const absX = Math.abs(dx).toFixed(2)
  const signY = dy >= 0 ? '+' : '-'
  const absY = Math.abs(dy).toFixed(2)
  const canonicalString = `${signX}${absX} î ${signY} ${absY} ĵ m`

  return {
    dx,
    dy,
    magnitude,
    angleRad,
    angleDeg,
    canonicalString,
  }
}

/**
 * Procesa la lista ordenada de nodos para calcular segmentos, distancias acumuladas y desplazamiento neto.
 */
export function computePath(nodes: Point2D[]): PathCalculations {
  if (nodes.length === 0) {
    return {
      segments: [],
      totalDistance: 0,
      initialPoint: null,
      finalPoint: null,
      displacement: {
        dx: 0,
        dy: 0,
        magnitude: 0,
        angleRad: 0,
        angleDeg: 0,
        canonicalString: '0.00 î + 0.00 ĵ m',
      },
      efficiency: 100,
    }
  }

  if (nodes.length === 1) {
    return {
      segments: [],
      totalDistance: 0,
      initialPoint: nodes[0],
      finalPoint: nodes[0],
      displacement: {
        dx: 0,
        dy: 0,
        magnitude: 0,
        angleRad: 0,
        angleDeg: 0,
        canonicalString: '0.00 î + 0.00 ĵ m',
      },
      efficiency: 100,
    }
  }

  const segments: SegmentInfo[] = []
  let cumulative = 0

  for (let i = 0; i < nodes.length - 1; i++) {
    const p1 = nodes[i]
    const p2 = nodes[i + 1]
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const len = Math.hypot(dx, dy)
    const cumStart = cumulative
    cumulative += len

    segments.push({
      index: i,
      p1,
      p2,
      dx,
      dy,
      length: len,
      cumLengthStart: cumStart,
      cumLengthEnd: cumulative,
    })
  }

  const initialPoint = nodes[0]
  const finalPoint = nodes[nodes.length - 1]
  const displacement = computeDisplacement(initialPoint, finalPoint)
  const efficiency = cumulative > 0 ? (displacement.magnitude / cumulative) * 100 : 100

  return {
    segments,
    totalDistance: cumulative,
    initialPoint,
    finalPoint,
    displacement,
    efficiency,
  }
}

/**
 * Calcula el tiempo total necesario para recorrer una distancia total dada,
 * partiendo de v0 con aceleración constante a.
 *
 * s = v0·t + (1/2)·a·t²  =>  (1/2)·a·t² + v0·t - s = 0
 */
export function computeTotalDuration(totalDistance: number, params: KinematicsParams): number {
  if (totalDistance <= 0) return 0
  const { acceleration: a, v0 } = params

  if (a > 0) {
    // Cuadrática: (a/2) t² + v0 t - s = 0
    // t = (-v0 + sqrt(v0² + 2·a·s)) / a
    const discriminant = v0 * v0 + 2 * a * totalDistance
    return (-v0 + Math.sqrt(discriminant)) / a
  } else if (v0 > 0) {
    return totalDistance / v0
  }
  return 0
}

/**
 * Calcula el estado de movimiento en un instante t determinado (segundos).
 */
export function computeMotionState(
  t: number,
  path: PathCalculations,
  params: KinematicsParams
): MotionState {
  const { totalDistance, initialPoint, segments } = path
  const { acceleration: a, v0 } = params

  if (!initialPoint || totalDistance <= 0) {
    const defaultPt = initialPoint || { x: 0, y: 0 }
    return {
      time: t,
      distanceCovered: 0,
      speed: 0,
      currentPosition: defaultPt,
      activeSegmentIndex: 0,
      currentDisplacement: {
        dx: 0,
        dy: 0,
        magnitude: 0,
        angleRad: 0,
        angleDeg: 0,
        canonicalString: '0.00 î + 0.00 ĵ m',
      },
      progressPercent: 0,
      isComplete: true,
      totalDuration: 0,
    }
  }

  const totalDuration = computeTotalDuration(totalDistance, params)
  const effectiveTime = totalDuration > 0 ? Math.min(Math.max(0, t), totalDuration) : 0
  const isComplete = totalDuration > 0 ? t >= totalDuration : true

  // Distancia recorrida escalar: s(t) = v0·t + (1/2)·a·t²
  let s = v0 * effectiveTime + 0.5 * a * effectiveTime * effectiveTime
  if (s > totalDistance || isComplete) {
    s = totalDistance
  }

  // Rapidez tangencial instantánea: v(t) = v0 + a·t
  const speed = isComplete ? (v0 + a * totalDuration) : (v0 + a * effectiveTime)

  // Encontrar el segmento correspondiente a la distancia s
  let currentPosition: Point2D = { ...initialPoint }
  let activeSegmentIndex = 0

  if (segments.length > 0) {
    if (s <= 0) {
      currentPosition = { x: segments[0].p1.x, y: segments[0].p1.y }
      activeSegmentIndex = 0
    } else if (s >= totalDistance) {
      const lastSeg = segments[segments.length - 1]
      currentPosition = { x: lastSeg.p2.x, y: lastSeg.p2.y }
      activeSegmentIndex = segments.length - 1
    } else {
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        if (s >= seg.cumLengthStart && s <= seg.cumLengthEnd) {
          activeSegmentIndex = i
          const segDist = s - seg.cumLengthStart
          const ratio = seg.length > 0 ? segDist / seg.length : 0
          currentPosition = {
            x: seg.p1.x + ratio * seg.dx,
            y: seg.p1.y + ratio * seg.dy,
          }
          break
        }
      }
    }
  }

  const currentDisplacement = computeDisplacement(initialPoint, currentPosition)
  const progressPercent = totalDistance > 0 ? Math.min(100, (s / totalDistance) * 100) : 100

  return {
    time: effectiveTime,
    distanceCovered: s,
    speed,
    currentPosition,
    activeSegmentIndex,
    currentDisplacement,
    progressPercent,
    isComplete,
    totalDuration,
  }
}

/**
 * Calcula un BoundingBox y viewBox SVG dinámico para que cualquier conjunto
 * de puntos (incluyendo negativos, decimales y rangos grandes) se encuadre
 * perfectamente con márgenes adecuados y cuadrícula ortogonal.
 */
export function computeBoundingBox(nodes: Point2D[]): BoundingBox {
  if (nodes.length === 0) {
    return {
      minX: -2,
      maxX: 12,
      minY: -2,
      maxY: 10,
      width: 14,
      height: 12,
      viewBox: '-2 -10 14 12',
    }
  }

  let minX = Math.min(0, ...nodes.map(p => p.x))
  let maxX = Math.max(0, ...nodes.map(p => p.x))
  let minY = Math.min(0, ...nodes.map(p => p.y))
  let maxY = Math.max(0, ...nodes.map(p => p.y))

  const spanX = Math.max(maxX - minX, 4)
  const spanY = Math.max(maxY - minY, 4)

  const padX = spanX * 0.18
  const padY = spanY * 0.18

  minX -= padX
  maxX += padX
  minY -= padY
  maxY += padY

  const width = maxX - minX
  const height = maxY - minY

  // En SVG, Y positivo va hacia abajo, mientras que en coordenadas cartesianas va hacia arriba.
  // Usaremos transformación matemática de coordenadas para SVG.
  return {
    minX,
    maxX,
    minY,
    maxY,
    width,
    height,
    viewBox: `${minX.toFixed(2)} ${minY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`,
  }
}

/**
 * Plantillas de rutas de aprendizaje (presets didácticos)
 * para 4.º Diversificado.
 */
export interface RoutePreset {
  id: string
  name: string
  description: string
  nodes: { x: number; y: number; label: string }[]
}

export const ROUTE_PRESETS: RoutePreset[] = [
  {
    id: 'sinuous',
    name: 'Ruta Sinuosa A-B-C-D',
    description: 'Cuatro cuadrantes mostrando cómo la distancia supera al desplazamiento.',
    nodes: [
      { x: 0, y: 0, label: 'A' },
      { x: 4, y: 6, label: 'B' },
      { x: 8, y: 2, label: 'C' },
      { x: 12, y: 8, label: 'D' },
    ],
  },
  {
    id: 'closed',
    name: 'Circuito Cerrado (Δr = 0)',
    description: 'El móvil regresa al origen: desplazamiento neto nulo con distancia positiva.',
    nodes: [
      { x: 0, y: 0, label: 'A' },
      { x: 0, y: 6, label: 'B' },
      { x: 8, y: 6, label: 'C' },
      { x: 8, y: 0, label: 'D' },
      { x: 0, y: 0, label: 'A' },
    ],
  },
  {
    id: 'linear',
    name: 'Ida y Vuelta 1D',
    description: 'Movimiento sobre el eje X con cambio de sentido: inversión del desplazamiento.',
    nodes: [
      { x: 0, y: 0, label: 'A' },
      { x: 10, y: 0, label: 'B' },
      { x: 4, y: 0, label: 'C' },
    ],
  },
  {
    id: 'triangle',
    name: 'Desplazamiento Rectangular (6-8-10)',
    description: 'Tramo perpendicular clásico que ilustra el Teorema de Pitágoras.',
    nodes: [
      { x: 0, y: 0, label: 'A' },
      { x: 6, y: 0, label: 'B' },
      { x: 6, y: 8, label: 'C' },
    ],
  },
]
