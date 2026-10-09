/**
 * alcancesMRU.utils.ts
 * Utilidades matemáticas y físicas puras para la simulación de Alcances y Encuentros en MRU.
 */

export type RegimenEncuentro = 'alcance' | 'encuentro' | 'paralelos' | 'coinciden_siempre' | 'mismo_punto_inicial' | 'sin_encuentro_futuro'

export interface ResultadoCalculoMRU {
  hayEncuentro: boolean
  tiempo: number | null
  puntoEncuentro: number | null
  regimen: RegimenEncuentro
  mensaje: string
  esAlcance: boolean
  esSentidosOpuestos: boolean
}

export interface RangoPista {
  min: number
  max: number
  span: number
}

export interface MarcaEscala {
  valor: number
  label: string
  posicionPorcentaje: number
}

/**
 * Formatea un número de forma legible con separador de miles y decimales controlados.
 * Si el valor es en km (>= 10,000 m o <= -10,000 m), puede expresarse en km o m con formato.
 */
export function formatDistance(metros: number, precision = 2): string {
  if (!Number.isFinite(metros)) return '0 m'
  const abs = Math.abs(metros)
  if (abs >= 10000) {
    const km = metros / 1000
    const str = parseFloat(km.toFixed(precision)).toString()
    return `${str} km`
  }
  const str = parseFloat(metros.toFixed(precision)).toString()
  return `${str} m`
}

export function formatNumberCompact(val: number, precision = 2): string {
  if (!Number.isFinite(val)) return '0'
  if (Math.abs(val) >= 10000) {
    return new Intl.NumberFormat('es-ES', { maximumFractionDigits: precision }).format(val)
  }
  return parseFloat(val.toFixed(precision)).toString()
}

/**
 * Calcula analíticamente el encuentro / alcance entre dos móviles en MRU 1D.
 * Ecuaciones:
 * xA(t) = xA0 + vA * t
 * xB(t) = xB0 + vB * t
 * xA(t) = xB(t) => (vA - vB)*t = xB0 - xA0
 */
export function calcularEncuentro(xA0: number, vA: number, xB0: number, vB: number): ResultadoCalculoMRU {
  const EPSILON = 1e-9
  const diffV = vA - vB
  const diffX0 = xB0 - xA0

  // Caso: Ya parten de la misma posición
  if (Math.abs(diffX0) < EPSILON) {
    if (Math.abs(diffV) < EPSILON) {
      return {
        hayEncuentro: true,
        tiempo: 0,
        puntoEncuentro: xA0,
        regimen: 'coinciden_siempre',
        mensaje: 'Los móviles coinciden en todo momento (misma posición y velocidad).',
        esAlcance: false,
        esSentidosOpuestos: false,
      }
    }
    return {
      hayEncuentro: true,
      tiempo: 0,
      puntoEncuentro: xA0,
      regimen: 'mismo_punto_inicial',
      mensaje: 'Ya están en el mismo punto inicial (t = 0.00 s).',
      esAlcance: false,
      esSentidosOpuestos: (vA * vB < -EPSILON),
    }
  }

  // Caso: Velocidades iguales y posiciones distintas -> Paralelos
  if (Math.abs(diffV) < EPSILON) {
    return {
      hayEncuentro: false,
      tiempo: null,
      puntoEncuentro: null,
      regimen: 'paralelos',
      mensaje: 'Móviles paralelos con igual velocidad: nunca se encuentran.',
      esAlcance: false,
      esSentidosOpuestos: false,
    }
  }

  // Tiempo teórico de intersección
  const t = diffX0 / diffV
  const xEncuentro = xA0 + vA * t

  // Determinar sentido relativo
  // Sentidos opuestos si el producto de velocidades es negativo o si viajan uno hacia el otro
  const viajanSentidosOpuestos = (vA > 0 && vB < 0) || (vA < 0 && vB > 0)
  const esAlcance = !viajanSentidosOpuestos && (vA * vB >= 0)

  if (t > 0) {
    const regimen: RegimenEncuentro = viajanSentidosOpuestos ? 'encuentro' : 'alcance'
    const accion = viajanSentidosOpuestos ? 'El encuentro frontal' : 'El alcance'
    const mensaje = `${accion} ocurre en x = ${formatDistance(xEncuentro, 2)} a los t = ${t.toFixed(2)} s.`

    return {
      hayEncuentro: true,
      tiempo: t,
      puntoEncuentro: xEncuentro,
      regimen,
      mensaje,
      esAlcance: !viajanSentidosOpuestos,
      esSentidosOpuestos: viajanSentidosOpuestos,
    }
  }

  // t < 0: Se cruzaron en el pasado y ahora se alejan
  return {
    hayEncuentro: false,
    tiempo: t,
    puntoEncuentro: xEncuentro,
    regimen: 'sin_encuentro_futuro',
    mensaje: `Los móviles se alejan hacia el futuro sin encuentro (se cruzaron en el pasado: t = ${t.toFixed(2)} s, x = ${formatDistance(xEncuentro, 2)}).`,
    esAlcance,
    esSentidosOpuestos: viajanSentidosOpuestos,
  }
}

/**
 * Calcula el rango dinámico de la pista en metros [min, max] asegurando margen y buena visualización.
 */
export function calcularRangoPista(
  xA0: number,
  vA: number,
  xB0: number,
  vB: number,
  resultado: ResultadoCalculoMRU,
  tiempoSimuladoMax = 10
): RangoPista {
  const puntos: number[] = [xA0, xB0]

  if (resultado.hayEncuentro && resultado.puntoEncuentro !== null && resultado.tiempo !== null && resultado.tiempo > 0) {
    puntos.push(resultado.puntoEncuentro)
    // También incluir un punto intermedio o final
    const xAFinal = xA0 + vA * Math.min(resultado.tiempo * 1.05, resultado.tiempo + 1)
    const xBFinal = xB0 + vB * Math.min(resultado.tiempo * 1.05, resultado.tiempo + 1)
    puntos.push(xAFinal, xBFinal)
  } else {
    // Si no hay encuentro futuro, proyectar hasta un tiempo de simulación razonable
    const tProy = Math.max(5, Math.min(20, tiempoSimuladoMax))
    puntos.push(xA0 + vA * tProy, xB0 + vB * tProy)
  }

  let minVal = Math.min(...puntos)
  let maxVal = Math.max(...puntos)

  if (minVal === maxVal) {
    minVal -= 50
    maxVal += 50
  }

  const spanOriginal = maxVal - minVal
  const padding = Math.max(spanOriginal * 0.12, 10)

  const min = minVal - padding
  const max = maxVal + padding

  return {
    min,
    max,
    span: max - min,
  }
}

/**
 * Genera marcas 'redondas' y legibles de escala para la regla de la pista.
 */
export function generarMarcasEscala(min: number, max: number, maxMarcas = 7): MarcaEscala[] {
  const span = max - min
  if (span <= 0) return []

  const rawStep = span / Math.max(2, maxMarcas - 1)
  const exponente = Math.floor(Math.log10(rawStep))
  const factor = Math.pow(10, exponente)
  const fraccion = rawStep / factor

  let niceStep = factor
  if (fraccion <= 1.2) niceStep = 1 * factor
  else if (fraccion <= 2.5) niceStep = 2 * factor
  else if (fraccion <= 6) niceStep = 5 * factor
  else niceStep = 10 * factor

  const startTick = Math.ceil(min / niceStep) * niceStep
  const endTick = Math.floor(max / niceStep) * niceStep

  const marcas: MarcaEscala[] = []
  for (let v = startTick; v <= endTick + niceStep * 0.001; v += niceStep) {
    // Evitar errores de coma flotante
    const cleanValue = Math.round(v * 1e6) / 1e6
    const pct = ((cleanValue - min) / span) * 100

    if (pct >= 0 && pct <= 100) {
      marcas.push({
        valor: cleanValue,
        label: formatDistance(cleanValue, 1),
        posicionPorcentaje: pct,
      })
    }
  }

  return marcas
}
