/**
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
