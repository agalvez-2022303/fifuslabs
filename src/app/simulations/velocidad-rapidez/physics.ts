/**
 * physics.ts — Motor de física y cálculos para Velocidad vs Rapidez Media
 *
 * Principios:
 * 1. Rapidez Media (rm): Magnitud escalar = (Distancia total d) / (Tiempo total Δt) [m/s]
 * 2. Velocidad Media (vm): Vector = (Desplazamiento Δr) / (Tiempo total Δt) [m/s]
 *    vm = (Δx / Δt) î + (Δy / Δt) ĵ
 *    |vm| = sqrt((Δx/Δt)² + (Δy/Δt)²)
 *    θ = atan2(Δy, Δx)
 */

export interface Point2D {
  x: number
  y: number
  label?: string
}

export interface SegmentConfig {
  id: string
  fromLabel: string
  toLabel: string
  fromPoint: Point2D
  toPoint: Point2D
  distance: number // metros
  time: number     // segundos (Δt > 0)
}

export interface VelocitySpeedResult {
  totalDistance: number     // metros
  totalTime: number         // segundos
  displacementX: number     // metros (Δx)
  displacementY: number     // metros (Δy)
  displacementMagnitude: number // metros (|Δr|)
  displacementAngleDeg: number  // grados θ

  avgSpeed: number          // m/s (rm = d / Δt)
  avgVelocityX: number      // m/s (vmx = Δx / Δt)
  avgVelocityY: number      // m/s (vmy = Δy / Δt)
  avgVelocityMag: number    // m/s (|vm|)
  avgVelocityAngleDeg: number // grados θ
  geographicRumbo: string   // ej. "3.50 m/s, N 45.00° E"

  explanation: string
}

export interface ParticleMotionState {
  time: number
  currentPos: Point2D
  distanceCovered: number
  progressPercent: number
  isComplete: boolean
}

export function toDegrees(rad: number): number {
  let deg = (rad * 180) / Math.PI
  deg = deg % 360
  if (deg < 0) deg += 360
  return deg
}

export function normalizeAngle(deg: number): number {
  let a = deg % 360
  if (a < 0) a += 360
  if (Math.abs(a - 360) < 1e-9) return 0
  return a
}

export function computeGeographicRumbo(magnitude: number, angleDeg: number, unit = 'm/s'): string {
  if (magnitude < 1e-5) return `0.00 ${unit} (Nula)`
  const normTheta = normalizeAngle(angleDeg)

  if (Math.abs(normTheta - 0) < 1e-4 || Math.abs(normTheta - 360) < 1e-4) return `${magnitude.toFixed(2)} ${unit} al Este`
  if (Math.abs(normTheta - 90) < 1e-4) return `${magnitude.toFixed(2)} ${unit} al Norte`
  if (Math.abs(normTheta - 180) < 1e-4) return `${magnitude.toFixed(2)} ${unit} al Oeste`
  if (Math.abs(normTheta - 270) < 1e-4) return `${magnitude.toFixed(2)} ${unit} al Sur`

  if (normTheta > 0 && normTheta < 90) {
    const alphaN = 90 - normTheta
    return `${magnitude.toFixed(2)} ${unit}, N ${alphaN.toFixed(2)}° E`
  }
  if (normTheta > 90 && normTheta < 180) {
    const alphaN = normTheta - 90
    return `${magnitude.toFixed(2)} ${unit}, N ${alphaN.toFixed(2)}° O`
  }
  if (normTheta > 180 && normTheta < 270) {
    const alphaS = 270 - normTheta
    return `${magnitude.toFixed(2)} ${unit}, S ${alphaS.toFixed(2)}° O`
  }
  const alphaS = normTheta - 270
  return `${magnitude.toFixed(2)} ${unit}, S ${alphaS.toFixed(2)}° E`
}

/**
 * Procesa la lista de tramos para calcular rapidez y velocidad media
 */
export function computeVelocityVsSpeed(
  points: Point2D[],
  segmentTimes: number[]
): VelocitySpeedResult {
  if (points.length < 2) {
    return {
      totalDistance: 0,
      totalTime: 0,
      displacementX: 0,
      displacementY: 0,
      displacementMagnitude: 0,
      displacementAngleDeg: 0,
      avgSpeed: 0,
      avgVelocityX: 0,
      avgVelocityY: 0,
      avgVelocityMag: 0,
      avgVelocityAngleDeg: 0,
      geographicRumbo: '0.00 m/s (Nula)',
      explanation: 'Define al menos 2 puntos para trazar la trayectoria.',
    }
  }

  let totalDistance = 0
  let totalTime = 0

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
    const dt = Math.max(0.1, segmentTimes[i] ?? 2)
    totalDistance += dist
    totalTime += dt
  }

  const startPt = points[0]
  const endPt = points[points.length - 1]
  const dx = endPt.x - startPt.x
  const dy = endPt.y - startPt.y
  const dispMag = Math.hypot(dx, dy)
  const dispAngleRad = Math.atan2(dy, dx)
  const dispAngleDeg = toDegrees(dispAngleRad)

  const avgSpeed = totalTime > 0 ? totalDistance / totalTime : 0
  const avgVelocityX = totalTime > 0 ? dx / totalTime : 0
  const avgVelocityY = totalTime > 0 ? dy / totalTime : 0
  const avgVelocityMag = totalTime > 0 ? dispMag / totalTime : 0
  const avgVelocityAngleDeg = dispAngleDeg

  const geographicRumbo = computeGeographicRumbo(avgVelocityMag, avgVelocityAngleDeg)

  let explanation = ''
  if (Math.abs(totalDistance - dispMag) < 1e-4) {
    explanation = 'Como avanzó en línea recta y no cambió de dirección, la distancia recorrida y el desplazamiento son iguales. Por eso, la rapidez media y el valor de la velocidad media también son iguales.'
  } else if (dispMag < 1e-4) {
    explanation = `Regresó al punto de partida: recorrió ${totalDistance.toFixed(2)} m, pero terminó donde empezó y su desplazamiento es 0 m. Por eso, su rapidez media es ${avgSpeed.toFixed(2)} m/s y su velocidad media es 0 m/s.`
  } else {
    explanation = `Recorrió ${totalDistance.toFixed(2)} m, pero quedó a ${dispMag.toFixed(2)} m del punto de partida. La rapidez media usa todo el camino (${avgSpeed.toFixed(2)} m/s); la velocidad media usa el cambio entre inicio y final (${avgVelocityMag.toFixed(2)} m/s) e incluye la dirección.`
  }

  return {
    totalDistance,
    totalTime,
    displacementX: dx,
    displacementY: dy,
    displacementMagnitude: dispMag,
    displacementAngleDeg: dispAngleDeg,
    avgSpeed,
    avgVelocityX,
    avgVelocityY,
    avgVelocityMag,
    avgVelocityAngleDeg,
    geographicRumbo,
    explanation,
  }
}

/**
 * Calcula la posición instantánea de la partícula en el tiempo t
 */
export function computeParticlePosition(
  t: number,
  points: Point2D[],
  segmentTimes: number[]
): ParticleMotionState {
  if (points.length < 2) {
    return {
      time: t,
      currentPos: points[0] || { x: 0, y: 0 },
      distanceCovered: 0,
      progressPercent: 0,
      isComplete: true,
    }
  }

  const totalTime = segmentTimes.reduce((acc, curr) => acc + Math.max(0.1, curr), 0)
  const clampedT = Math.max(0, Math.min(t, totalTime))
  const isComplete = t >= totalTime

  let accumulatedTime = 0
  let distanceCovered = 0
  let currentPos: Point2D = { ...points[0] }

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    const segDist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
    const segTime = Math.max(0.1, segmentTimes[i] ?? 2)

    if (clampedT <= accumulatedTime + segTime) {
      const segElapsed = clampedT - accumulatedTime
      const ratio = segTime > 0 ? segElapsed / segTime : 1
      currentPos = {
        x: p1.x + ratio * (p2.x - p1.x),
        y: p1.y + ratio * (p2.y - p1.y),
      }
      distanceCovered += ratio * segDist
      break
    } else {
      accumulatedTime += segTime
      distanceCovered += segDist
      currentPos = { ...p2 }
    }
  }

  const progressPercent = totalTime > 0 ? (clampedT / totalTime) * 100 : 100

  return {
    time: clampedT,
    currentPos,
    distanceCovered,
    progressPercent,
    isComplete,
  }
}
