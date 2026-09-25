import { describe, it, expect } from 'vitest'
import {
  computeState,
  getTotalLength,
  getWaypoints,
  getDuration,
  getFullTrailPoints,
  type PresetType,
} from '../physics'

describe('Distancia vs. Desplazamiento — Motor Físico', () => {
  // ─── CASO 1: Movimiento en línea recta ─────────────────────────────────────
  describe('Caso 1 — Movimiento en línea recta (antes de retorno)', () => {
    it('la distancia recorrida y el módulo del desplazamiento coinciden en trayectoria rectilínea sin cambio de sentido', () => {
      // En el preset "linear", el tramo inicial va de (0,0) hacia (10,0) en el eje X
      const speed = 2.0 // m/s
      const time = 2.0  // s -> distancia teórica = 4.0 m
      const state = computeState('linear', time, speed, [])

      // Posición esperada: avanzando en X
      expect(state.pos.x).toBeGreaterThan(0)
      expect(state.pos.y).toBeCloseTo(0, 1)

      // Distancia = 4.0 m
      expect(state.distance).toBeCloseTo(4.0, 1)

      // En el tramo directo sin giro, s ≈ |Δr|
      expect(state.displacementMag).toBeCloseTo(state.distance, 1)
      expect(state.dx).toBeCloseTo(state.pos.x, 1)
      expect(state.dy).toBeCloseTo(0, 1)
    })
  })

  // ─── CASO 2: Cambio de dirección ──────────────────────────────────────────
  describe('Caso 2 — Cambio de dirección', () => {
    it('al cambiar de sentido, la distancia sigue aumentando mientras el módulo del desplazamiento disminuye', () => {
      const speed = 5.0 // m/s
      // Longitud total ida y vuelta = 20 m
      // t1 = 2 s -> d = 10 m (vértice extremo derecho)
      const state1 = computeState('linear', 2.0, speed, [])
      // t2 = 3 s -> d = 15 m (regresando hacia el origen)
      const state2 = computeState('linear', 3.0, speed, [])

      // Distancia siempre aumenta (propiedad monótona creciente del escalar)
      expect(state2.distance).toBeGreaterThan(state1.distance)
      expect(state2.distance).toBeCloseTo(15.0, 1)

      // Desplazamiento neto en t2 es menor que en t1 debido al cambio de sentido
      expect(state2.displacementMag).toBeLessThan(state1.displacementMag)

      // La distancia es estrictamente mayor que el módulo del desplazamiento
      expect(state2.distance).toBeGreaterThan(state2.displacementMag)
    })
  })

  // ─── CASO 3: Regreso al punto inicial (Circuito Cerrado) ───────────────────
  describe('Caso 3 — Regreso al punto inicial (Circuito cerrado)', () => {
    it('al completar el circuito, la distancia recorrida es > 0 y el desplazamiento neto es exactamente 0', () => {
      const speed = 2.5
      const duration = getDuration('closed', speed)

      // Estado al finalizar el circuito completo
      const finalState = computeState('closed', duration, speed, [])

      // Distancia > 0
      expect(finalState.distance).toBeGreaterThan(0)
      expect(finalState.completed).toBe(true)

      // Desplazamiento neto |Δr| = 0 (rf = r0)
      expect(finalState.dx).toBeCloseTo(0, 1)
      expect(finalState.dy).toBeCloseTo(0, 1)
      expect(finalState.displacementMag).toBeCloseTo(0, 1)

      // La posición final coincide con la posición de origen
      expect(finalState.pos.x).toBeCloseTo(finalState.origin.x, 1)
      expect(finalState.pos.y).toBeCloseTo(finalState.origin.y, 1)
    })

    it('en ida y vuelta 1D completada, la distancia es 20m y el desplazamiento es 0', () => {
      const speed = 4.0
      const duration = getDuration('linear', speed)
      const finalState = computeState('linear', duration, speed, [])

      expect(finalState.completed).toBe(true)
      expect(finalState.distance).toBeCloseTo(20.0, 1)
      expect(finalState.displacementMag).toBeCloseTo(0, 1)
    })
  })

  // ─── CASO 4: Movimiento bidimensional ─────────────────────────────────────
  describe('Caso 4 — Movimiento bidimensional (X e Y)', () => {
    it('calcula correctamente Δx, Δy, la magnitud euclidiana |Δr| y el ángulo θ en 2D', () => {
      const speed = 3.0
      const time = 2.0
      const state = computeState('sinuous', time, speed, [])

      // Ambas componentes deben existir en movimiento 2D
      const expectedMag = Math.sqrt(state.dx * state.dx + state.dy * state.dy)
      expect(state.displacementMag).toBeCloseTo(expectedMag, 4)

      // Ángulo coherente con atan2(dy, dx)
      const expectedAngle = Math.atan2(state.dy, state.dx) * (180 / Math.PI)
      expect(state.angle).toBeCloseTo(expectedAngle, 2)
    })
  })

  // ─── TEOREMA FUNDAMENTAL: s(t) >= |Δr(t)| ─────────────────────────────────
  describe('Teorema fundamental de la cinemática: s(t) >= |Δr(t)|', () => {
    const presets: PresetType[] = ['sinuous', 'closed', 'linear', 'parabola']

    presets.forEach(preset => {
      it(`cumple s(t) >= |Δr(t)| en todo instante para la topología "${preset}"`, () => {
        const speed = 2.0
        const duration = getDuration(preset, speed)
        const step = duration / 20

        for (let t = 0; t <= duration; t += step) {
          const state = computeState(preset, t, speed, [])
          // s(t) jamás puede ser menor que |Δr(t)|
          expect(state.distance + 1e-4).toBeGreaterThanOrEqual(state.displacementMag)
        }
      })
    })
  })

  // ─── UTILIDADES Y WAYPOINTS ───────────────────────────────────────────────
  describe('Waypoints y geometría de trayectoria', () => {
    it('retorna waypoints válidos para cada preset', () => {
      const wpSinuous = getWaypoints('sinuous')
      expect(wpSinuous.length).toBe(4)
      expect(wpSinuous[0]).toEqual({ x: 0, y: 0 })
      expect(wpSinuous[3]).toEqual({ x: 12, y: 8 })

      const wpClosed = getWaypoints('closed')
      expect(wpClosed.length).toBe(5)
      expect(wpClosed[0]).toEqual(wpClosed[4]) // Mismo punto inicial y final
    })

    it('genera puntos de trayectoria continua (ghost trail) con número solicitado de muestras', () => {
      const points = getFullTrailPoints('sinuous', 100)
      expect(points.length).toBe(101)
      expect(points[0].x).toBeCloseTo(0, 1)
      expect(points[0].y).toBeCloseTo(0, 1)
    })

    it('la longitud total de la trayectoria es positiva y consistente', () => {
      const lenSinuous = getTotalLength('sinuous')
      const lenClosed = getTotalLength('closed')
      const lenLinear = getTotalLength('linear')
      const lenParabola = getTotalLength('parabola')

      expect(lenSinuous).toBeGreaterThan(12)
      expect(lenClosed).toBeGreaterThan(15)
      expect(lenLinear).toBeCloseTo(20, 1)
      expect(lenParabola).toBeGreaterThan(12)
    })
  })

  // ─── CASO 5: Coordenadas personalizadas y rapidez tangencial ─────────────
  describe('Caso 5 — Coordenadas personalizadas y rapidez tangencial', () => {
    it('calcula correctamente el desplazamiento para coordenadas manuales (2, 3) a (8, 6)', () => {
      const customCoords = { x0: 2, y0: 3, xf: 8, yf: 6, type: 'direct' as const }
      const speed = 2.0
      const duration = getDuration('custom', speed, customCoords)
      const expectedDist = Math.hypot(8 - 2, 6 - 3) // sqrt(36 + 9) = sqrt(45) ≈ 6.708

      expect(getTotalLength('custom', customCoords)).toBeCloseTo(expectedDist, 2)
      expect(duration).toBeCloseTo(expectedDist / speed, 2)

      const finalState = computeState('custom', duration, speed, [], customCoords)
      expect(finalState.origin).toEqual({ x: 2, y: 3 })
      expect(finalState.pos.x).toBeCloseTo(8, 1)
      expect(finalState.pos.y).toBeCloseTo(6, 1)
      expect(finalState.dx).toBeCloseTo(6, 2)
      expect(finalState.dy).toBeCloseTo(3, 2)
      expect(finalState.displacementMag).toBeCloseTo(expectedDist, 2)
      expect(finalState.distance).toBeCloseTo(expectedDist, 2)
      expect(finalState.completed).toBe(true)
    })

    it('en trayectoria curva personalizada, la distancia s es mayor que |Δr|', () => {
      const customCoords = { x0: 2, y0: 3, xf: 8, yf: 6, type: 'curve' as const }
      const speed = 3.0
      const duration = getDuration('custom', speed, customCoords)
      const finalState = computeState('custom', duration, speed, [], customCoords)
      const expectedDisp = Math.hypot(8 - 2, 6 - 3)

      expect(finalState.displacementMag).toBeCloseTo(expectedDisp, 2)
      expect(finalState.distance).toBeGreaterThan(finalState.displacementMag)
    })

    it('en trayectoria con retorno personalizada, Δr = 0 y s > 0', () => {
      const customCoords = { x0: 2, y0: 3, xf: 8, yf: 6, type: 'return' as const }
      const speed = 4.0
      const duration = getDuration('custom', speed, customCoords)
      const finalState = computeState('custom', duration, speed, [], customCoords)

      expect(finalState.displacementMag).toBeCloseTo(0, 1)
      expect(finalState.distance).toBeCloseTo(2 * Math.hypot(6, 3), 1)
      expect(finalState.distance).toBeGreaterThan(0)
    })
  })
})
