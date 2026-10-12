/**
 * physics.ts - Motor de cálculo físico para Movimiento Rectilíneo Uniforme (MRU)
 */

export interface MRUParams {
  x0: number // Posición inicial en metros [m]
  v: number  // Velocidad constante en metros por segundo [m/s]
}

export interface MRUState {
  t: number      // Tiempo transcurrido [s]
  x: number      // Posición actual [m]
  v: number      // Velocidad actual [m/s]
  deltaX: number // Desplazamiento acumulado [m]
}

export interface MRUSolverInput {
  x0?: number
  x?: number
  v?: number
  t?: number
  deltaX?: number
}

export interface MRUSolverResult {
  x0: number
  x: number
  v: number
  t: number
  deltaX: number
  steps: string[]
  isValid: boolean
  errorMessage?: string
}

/**
 * Calcula el estado de un móvil en MRU en un instante dado t
 */
export function computeMRU(params: MRUParams, t: number): MRUState {
  const safeT = Math.max(0, isNaN(t) ? 0 : t)
  const x0 = isNaN(params.x0) ? 0 : params.x0
  const v = isNaN(params.v) ? 0 : params.v

  const deltaX = v * safeT
  const x = x0 + deltaX

  return {
    t: safeT,
    x,
    v,
    deltaX,
  }
}

/**
 * Calcula el instante t en el que el móvil alcanza una posición dada xTarget
 */
export function timeAtMRUPosition(params: MRUParams, targetX: number): number | null {
  const x0 = isNaN(params.x0) ? 0 : params.x0
  const v = isNaN(params.v) ? 0 : params.v
  if (isNaN(targetX)) return null

  if (Math.abs(v) < 1e-9) {
    return Math.abs(targetX - x0) < 1e-9 ? 0 : null
  }

  const t = (targetX - x0) / v
  return t >= 0 ? t : null
}

/**
 * Resolutor de incógnitas en MRU dado un conjunto de valores conocidos
 */
export function solveMRUUnknown(input: MRUSolverInput): MRUSolverResult {
  let { x0 = 0, x, v, t, deltaX } = input
  const steps: string[] = []

  // Si se conoce deltaX y x0, pero no x:
  if (deltaX !== undefined && x === undefined) {
    x = x0 + deltaX
    steps.push(`x = x_0 + \\Delta x = ${x0} + ${deltaX} = ${x} \\text{ m}`)
  }

  // Si se conoce x y x0, pero no deltaX:
  if (x !== undefined && deltaX === undefined) {
    deltaX = x - x0
    steps.push(`\\Delta x = x - x_0 = ${x} - ${x0} = ${deltaX} \\text{ m}`)
  }

  // Caso 1: Buscar t si se conocen deltaX (o x y x0) y v
  if (t === undefined && deltaX !== undefined && v !== undefined) {
    if (Math.abs(v) < 1e-9) {
      if (Math.abs(deltaX) < 1e-9) {
        t = 0
        steps.push(`v = 0 \\text{ m/s} \\implies t = 0 \\text{ s}`)
      } else {
        return {
          x0, x: x ?? x0, v, t: 0, deltaX: deltaX ?? 0,
          steps,
          isValid: false,
          errorMessage: 'Imposible alcanzar la posición con velocidad cero (v = 0).',
        }
      }
    } else {
      t = deltaX / v
      if (t < 0) {
        return {
          x0, x: x ?? x0, v, t, deltaX,
          steps,
          isValid: false,
          errorMessage: 'El tiempo resultante es negativo. La posición se encontraría en el pasado para esa dirección de velocidad.',
        }
      }
      steps.push(`t = \\frac{\\Delta x}{v} = \\frac{${deltaX.toFixed(2)}}{${v.toFixed(2)}} = ${t.toFixed(2)} \\text{ s}`)
    }
  }

  // Caso 2: Buscar v si se conocen deltaX y t
  if (v === undefined && deltaX !== undefined && t !== undefined) {
    if (t <= 0) {
      return {
        x0, x: x ?? x0, v: 0, t, deltaX,
        steps,
        isValid: false,
        errorMessage: 'El tiempo transcurrido t debe ser mayor que cero.',
      }
    }
    v = deltaX / t
    steps.push(`v = \\frac{\\Delta x}{t} = \\frac{${deltaX.toFixed(2)}}{${t.toFixed(2)}} = ${v.toFixed(2)} \\text{ m/s}`)
  }

  // Caso 3: Buscar deltaX y x si se conocen v y t
  if (deltaX === undefined && v !== undefined && t !== undefined) {
    deltaX = v * t
    x = x0 + deltaX
    steps.push(`\\Delta x = v \\cdot t = ${v.toFixed(2)} \\cdot ${t.toFixed(2)} = ${deltaX.toFixed(2)} \\text{ m}`)
    steps.push(`x = x_0 + \\Delta x = ${x0} + ${deltaX.toFixed(2)} = ${x.toFixed(2)} \\text{ m}`)
  }

  // Si al final faltan datos
  if (x === undefined || v === undefined || t === undefined || deltaX === undefined) {
    return {
      x0, x: x ?? 0, v: v ?? 0, t: t ?? 0, deltaX: deltaX ?? 0,
      steps,
      isValid: false,
      errorMessage: 'Se requieren al menos 2 variables conocidas para resolver el sistema.',
    }
  }

  return {
    x0,
    x,
    v,
    t,
    deltaX,
    steps,
    isValid: true,
  }
}
