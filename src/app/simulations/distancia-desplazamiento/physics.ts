/**
<<<<<<< HEAD
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
=======
 * physics.ts — Distancia vs. Desplazamiento
 *
 * Motor de física para la simulación de distancia y desplazamiento.
 * Implementa parametrización por longitud de arco exacta garantizando:
 *   1. Distancia s(t) estrictamente creciente y calculada a lo largo de la trayectoria.
 *   2. Desplazamiento vectorial Δr(t) = r(t) - r(0).
 *   3. Teorema de la trayectoria s(t) >= |Δr(t)| verificado en todo punto (desigualdad triangular).
 *   4. Cuatro presets físicos: Sinuosa, Circuito Cerrado (Δr = 0), Ida y Vuelta 1D, Parábola 2D.
 */

export type PresetType = 'sinuous' | 'closed' | 'linear' | 'parabola' | 'custom'

export interface CustomCoordinates {
  x0: number
  y0: number
  xf: number
  yf: number
  type?: 'direct' | 'curve' | 'return'
}

export interface TrajectoryPoint {
  x: number
  y: number
}

export interface PhysicsState {
  /** Posición actual del móvil en metros */
  pos: TrajectoryPoint
  /** Posición inicial del móvil */
  origin: TrajectoryPoint
  /** Distancia total recorrida [m] — escalar, siempre creciente */
  distance: number
  /** Magnitud del desplazamiento |Δr| [m] */
  displacementMag: number
  /** Componentes del desplazamiento */
  dx: number
  dy: number
  /** Ángulo del desplazamiento respecto al eje X [grados] */
  angle: number
  /** Progreso de la simulación [0..1] */
  progress: number
  /** Tiempo transcurrido en la simulación [s] */
  time: number
  /** Puntos de la trayectoria recorrida hasta ahora */
  trail: TrajectoryPoint[]
  /** Indicador de si el móvil completó el recorrido */
  completed: boolean
}

interface PathData {
  waypoints: TrajectoryPoint[]
  points: TrajectoryPoint[]
  cumDist: number[]
  totalLength: number
}

// ─── Generación de puntos densos para cada topología ────────────────────────

function generateLinearPoints(N = 500): { waypoints: TrajectoryPoint[]; points: TrajectoryPoint[] } {
  const waypoints: TrajectoryPoint[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 0, y: 0 },
  ]
  const points: TrajectoryPoint[] = []
  const half = Math.floor(N / 2)

  // Tramo de ida: (0,0) -> (10,0)
  for (let i = 0; i <= half; i++) {
    const frac = i / half
    points.push({ x: frac * 10, y: 0 })
  }
  // Tramo de vuelta: (10,0) -> (0,0)
  for (let i = 1; i <= half; i++) {
    const frac = i / half
    points.push({ x: 10 - frac * 10, y: 0 })
  }

  return { waypoints, points }
}

function generateClosedPoints(N = 800): { waypoints: TrajectoryPoint[]; points: TrajectoryPoint[] } {
  const waypoints: TrajectoryPoint[] = [
    { x: 0, y: 0 },
    { x: 5, y: 4 },
    { x: 10, y: 0 },
    { x: 5, y: -4 },
    { x: 0, y: 0 },
  ]
  const points: TrajectoryPoint[] = []

  // Curva elíptica cerrada suave: x(θ) = 5 - 5*cos(θ), y(θ) = 4*sin(θ)
  for (let i = 0; i <= N; i++) {
    const theta = (i / N) * 2 * Math.PI
    points.push({
      x: 5 - 5 * Math.cos(theta),
      y: 4 * Math.sin(theta),
    })
  }

  return { waypoints, points }
}

function generateParabolaPoints(N = 800): { waypoints: TrajectoryPoint[]; points: TrajectoryPoint[] } {
  const waypoints: TrajectoryPoint[] = [
    { x: 0, y: 0 },
    { x: 3, y: 4.5 },
    { x: 6, y: 6.0 },
    { x: 9, y: 4.5 },
    { x: 12, y: 0 },
  ]
  const points: TrajectoryPoint[] = []

  // Parábola invertida: y = 2x - x²/6
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * 12
    const y = 2 * x - (x * x) / 6
    points.push({ x, y: Math.max(0, y) })
  }

  return { waypoints, points }
}

function catmullRom(
  p0: TrajectoryPoint,
  p1: TrajectoryPoint,
  p2: TrajectoryPoint,
  p3: TrajectoryPoint,
  t: number
): TrajectoryPoint {
  const t2 = t * t
  const t3 = t2 * t
  return {
    x: 0.5 * (
      2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    ),
    y: 0.5 * (
      2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    ),
  }
}

function generateSinuousPoints(samplesPerSeg = 300): { waypoints: TrajectoryPoint[]; points: TrajectoryPoint[] } {
  const waypoints: TrajectoryPoint[] = [
    { x: 0, y: 0 },
    { x: 4, y: 6 },
    { x: 8, y: 2 },
    { x: 12, y: 8 },
  ]

  // Extensión para Catmull-Rom
  const p0 = { x: -4, y: -6 }
  const p1 = waypoints[0]
  const p2 = waypoints[1]
  const p3 = waypoints[2]
  const p4 = waypoints[3]
  const p5 = { x: 16, y: 14 }

  const segs: [TrajectoryPoint, TrajectoryPoint, TrajectoryPoint, TrajectoryPoint][] = [
    [p0, p1, p2, p3],
    [p1, p2, p3, p4],
    [p2, p3, p4, p5],
  ]

  const points: TrajectoryPoint[] = []
  segs.forEach(([c0, c1, c2, c3], segIdx) => {
    const startStep = segIdx === 0 ? 0 : 1
    for (let i = startStep; i <= samplesPerSeg; i++) {
      points.push(catmullRom(c0, c1, c2, c3, i / samplesPerSeg))
    }
  })

  return { waypoints, points }
}

function generateCustomPoints(coords: CustomCoordinates, N = 500): { waypoints: TrajectoryPoint[]; points: TrajectoryPoint[] } {
  const { x0, y0, xf, yf, type = 'direct' } = coords
  const p0: TrajectoryPoint = { x: x0, y: y0 }
  const pf: TrajectoryPoint = { x: xf, y: yf }

  if (type === 'return') {
    const waypoints = [p0, pf, p0]
    const points: TrajectoryPoint[] = []
    const half = Math.floor(N / 2)
    for (let i = 0; i <= half; i++) {
      const frac = i / half
      points.push({ x: x0 + frac * (xf - x0), y: y0 + frac * (yf - y0) })
    }
    for (let i = 1; i <= half; i++) {
      const frac = i / half
      points.push({ x: xf - frac * (xf - x0), y: yf - frac * (yf - y0) })
    }
    return { waypoints, points }
  }

  if (type === 'curve') {
    const dx = xf - x0
    const dy = yf - y0
    const len = Math.hypot(dx, dy)
    const midX = (x0 + xf) / 2
    const midY = (y0 + yf) / 2
    const perpX = len > 0.01 ? -dy / len : 0
    const perpY = len > 0.01 ? dx / len : 1
    const offset = Math.max(2, len * 0.35)
    const pv: TrajectoryPoint = {
      x: midX + perpX * offset,
      y: midY + perpY * offset,
    }
    const waypoints = [p0, pv, pf]
    const points: TrajectoryPoint[] = []
    for (let i = 0; i <= N; i++) {
      const t = i / N
      const mt = 1 - t
      points.push({
        x: mt * mt * p0.x + 2 * mt * t * pv.x + t * t * pf.x,
        y: mt * mt * p0.y + 2 * mt * t * pv.y + t * t * pf.y,
      })
    }
    return { waypoints, points }
  }

  // Rectilíneo directo
  const waypoints = [p0, pf]
  const points: TrajectoryPoint[] = []
  for (let i = 0; i <= N; i++) {
    const frac = i / N
    points.push({ x: x0 + frac * (xf - x0), y: y0 + frac * (yf - y0) })
  }
  return { waypoints, points }
}

// ─── Construcción de la tabla de longitud de arco acumulada ─────────────────

function buildPathData(raw: { waypoints: TrajectoryPoint[]; points: TrajectoryPoint[] }): PathData {
  const { waypoints, points } = raw
  const cumDist: number[] = [0]
  let totalLength = 0

  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    const d = Math.sqrt(dx * dx + dy * dy)
    totalLength += d
    cumDist.push(totalLength)
  }

  return { waypoints, points, cumDist, totalLength }
}

const pathCache = new Map<PresetType, PathData>()

function getPath(preset: PresetType, customCoords?: CustomCoordinates): PathData {
  if (preset === 'custom') {
    const coords = customCoords ?? { x0: 2, y0: 3, xf: 8, yf: 6, type: 'direct' }
    return buildPathData(generateCustomPoints(coords))
  }
  if (!pathCache.has(preset)) {
    let raw: { waypoints: TrajectoryPoint[]; points: TrajectoryPoint[] }
    switch (preset) {
      case 'linear':
        raw = generateLinearPoints()
        break
      case 'closed':
        raw = generateClosedPoints()
        break
      case 'parabola':
        raw = generateParabolaPoints()
        break
      case 'sinuous':
      default:
        raw = generateSinuousPoints()
        break
    }
    pathCache.set(preset, buildPathData(raw))
  }
  return pathCache.get(preset)!
}

/**
 * Interpola con precisión la posición a lo largo de la trayectoria
 * para una distancia acumulada dada `s`.
 */
function samplePositionAtDistance(path: PathData, targetDist: number): TrajectoryPoint {
  const { points, cumDist, totalLength } = path

  if (targetDist <= 0) return points[0]
  if (targetDist >= totalLength) return points[points.length - 1]

  // Búsqueda binaria en el array monótonamente creciente cumDist
  let low = 0
  let high = cumDist.length - 1

  while (low <= high) {
    const mid = (low + high) >> 1
    if (cumDist[mid] < targetDist) {
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  const idx = Math.max(0, low - 1)
  const nextIdx = Math.min(points.length - 1, idx + 1)

  const d0 = cumDist[idx]
  const d1 = cumDist[nextIdx]
  const segLen = d1 - d0

  if (segLen <= 1e-9) return points[idx]

  const fraction = (targetDist - d0) / segLen
  return {
    x: points[idx].x + fraction * (points[nextIdx].x - points[idx].x),
    y: points[idx].y + fraction * (points[nextIdx].y - points[idx].y),
  }
}

// ─── API Pública del Motor Físico ──────────────────────────────────────────

/**
 * Calcula el estado físico instantáneo para un tiempo `elapsed` [s] y rapidez `speed` [m/s].
 */
export function computeState(
  preset: PresetType,
  elapsed: number,
  speed: number,
  trail: TrajectoryPoint[],
  customCoords?: CustomCoordinates
): PhysicsState {
  const path = getPath(preset, customCoords)
  const { totalLength, waypoints } = path
  const origin = waypoints[0]

  // La distancia recorrida es el escalar s = v * t, acotado por la longitud total
  const distance = Math.min(elapsed * speed, totalLength)
  const progress = totalLength > 0 ? distance / totalLength : 0

  // Posición física exacta a lo largo de la curva para la distancia recorrida
  const pos = samplePositionAtDistance(path, distance)

  // Vector desplazamiento: Δr = r(t) - r(0)
  const dx = pos.x - origin.x
  const dy = pos.y - origin.y
  const displacementMag = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)

  const completed = progress >= 1

  return {
    pos,
    origin,
    distance,
    displacementMag,
    dx,
    dy,
    angle,
    progress,
    time: elapsed,
    trail,
    completed,
  }
}

/** Retorna la duración de la simulación en segundos para la rapidez indicada */
export function getDuration(preset: PresetType, speed: number, customCoords?: CustomCoordinates): number {
  const path = getPath(preset, customCoords)
  return path.totalLength / Math.max(speed, 0.1)
}

/** Retorna la longitud total de la trayectoria */
export function getTotalLength(preset: PresetType, customCoords?: CustomCoordinates): number {
  return getPath(preset, customCoords).totalLength
}

/** Retorna los waypoints canónicos para la tabla */
export function getWaypoints(preset: PresetType, customCoords?: CustomCoordinates): TrajectoryPoint[] {
  return getPath(preset, customCoords).waypoints
}

/** Retorna los puntos para dibujar la trayectoria fantasma continua */
export function getFullTrailPoints(preset: PresetType, samples = 200, customCoords?: CustomCoordinates): TrajectoryPoint[] {
  const path = getPath(preset, customCoords)
  const step = path.totalLength / samples
  const result: TrajectoryPoint[] = []

  for (let i = 0; i <= samples; i++) {
    result.push(samplePositionAtDistance(path, i * step))
  }

  return result
}
>>>>>>> c197d6a067b97eb283a3d32bde5ab31f92eb82e1
