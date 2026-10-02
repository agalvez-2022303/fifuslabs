import { describe, it, expect } from 'vitest'
import {
  distanceBetween,
  computeDisplacement,
  computePath,
  computeTotalDuration,
  computeMotionState,
  computeBoundingBox,
} from '../physics'

describe('Módulo de Física: Distancia vs Desplazamiento', () => {
  it('calcula correctamente la distancia entre dos puntos (Euclidiana)', () => {
    const p1 = { x: 0, y: 0 }
    const p2 = { x: 3, y: 4 }
    expect(distanceBetween(p1, p2)).toBeCloseTo(5.0, 5)

    const p3 = { x: -2, y: -3 }
    const p4 = { x: 1, y: 1 }
    expect(distanceBetween(p3, p4)).toBeCloseTo(5.0, 5)
  })

  it('calcula vector desplazamiento entre origen y destino', () => {
    const start = { x: 2, y: 3 }
    const end = { x: 8, y: 11 }
    const disp = computeDisplacement(start, end)

    expect(disp.dx).toBe(6)
    expect(disp.dy).toBe(8)
    expect(disp.magnitude).toBeCloseTo(10, 5)
    expect(disp.angleDeg).toBeCloseTo((Math.atan2(8, 6) * 180) / Math.PI, 4)
  })

  it('valida caso clásico de triángulo rectángulo 6-8-10', () => {
    // A(0,0) -> B(6,0) -> C(6,8)
    const nodes = [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 8 },
    ]
    const path = computePath(nodes)

    // Distancia recorrida: d = 6 + 8 = 14 m
    expect(path.totalDistance).toBeCloseTo(14, 5)

    // Desplazamiento neto: |Δr| = sqrt(6² + 8²) = 10 m
    expect(path.displacement.magnitude).toBeCloseTo(10, 5)
    expect(path.displacement.dx).toBe(6)
    expect(path.displacement.dy).toBe(8)

    // Eficiencia: (10 / 14) * 100% ≈ 71.43%
    expect(path.efficiency).toBeCloseTo((10 / 14) * 100, 2)
  })

  it('maneja circuito cerrado donde desplazamiento es cero y distancia es positiva', () => {
    // Circuito cuadrado cerrado: (0,0) -> (0,4) -> (4,4) -> (4,0) -> (0,0)
    const nodes = [
      { x: 0, y: 0 },
      { x: 0, y: 4 },
      { x: 4, y: 4 },
      { x: 4, y: 0 },
      { x: 0, y: 0 },
    ]
    const path = computePath(nodes)

    // Distancia: 4 + 4 + 4 + 4 = 16 m
    expect(path.totalDistance).toBeCloseTo(16, 5)

    // Desplazamiento: de (0,0) a (0,0) = 0 m
    expect(path.displacement.magnitude).toBeCloseTo(0, 5)
    expect(path.displacement.dx).toBe(0)
    expect(path.displacement.dy).toBe(0)
    expect(path.efficiency).toBe(0)
  })

  it('maneja movimiento 1D con cambio de sentido (ida y vuelta)', () => {
    // (0,0) -> (10,0) -> (4,0)
    // Va 10m al este, luego retrocede 6m al oeste
    const nodes = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 4, y: 0 },
    ]
    const path = computePath(nodes)

    // Distancia total: 10 + 6 = 16 m
    expect(path.totalDistance).toBeCloseTo(16, 5)

    // Desplazamiento neto: de (0,0) a (4,0) = +4 m en eje X
    expect(path.displacement.magnitude).toBeCloseTo(4, 5)
    expect(path.displacement.dx).toBe(4)
    expect(path.displacement.dy).toBe(0)
  })

  it('maneja casos borde de nodos vacíos o 1 solo nodo', () => {
    const emptyPath = computePath([])
    expect(emptyPath.totalDistance).toBe(0)
    expect(emptyPath.displacement.magnitude).toBe(0)

    const singleNodePath = computePath([{ x: 5, y: -3 }])
    expect(singleNodePath.totalDistance).toBe(0)
    expect(singleNodePath.displacement.magnitude).toBe(0)
  })

  it('calcula la cinemática con aceleración constante a > 0', () => {
    const nodes = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]
    const path = computePath(nodes)
    const params = { acceleration: 2.0, v0: 0 } // a = 2 m/s², v0 = 0

    // s = 10 m, a = 2 m/s² => t = sqrt(2 * 10 / 2) = sqrt(10) ≈ 3.162277 s
    const duration = computeTotalDuration(path.totalDistance, params)
    expect(duration).toBeCloseTo(Math.sqrt(10), 4)

    // En t = 1.0 s: s = 0.5 * 2 * 1² = 1.0 m, v = 2 * 1 = 2 m/s
    const stateAt1s = computeMotionState(1.0, path, params)
    expect(stateAt1s.distanceCovered).toBeCloseTo(1.0, 4)
    expect(stateAt1s.speed).toBeCloseTo(2.0, 4)
    expect(stateAt1s.currentPosition.x).toBeCloseTo(1.0, 4)
    expect(stateAt1s.currentPosition.y).toBeCloseTo(0, 4)
    expect(stateAt1s.currentDisplacement.magnitude).toBeCloseTo(1.0, 4)

    // En t = 4.0 s (después de terminar): debe clamp al final
    const stateAtEnd = computeMotionState(4.0, path, params)
    expect(stateAtEnd.distanceCovered).toBeCloseTo(10.0, 4)
    expect(stateAtEnd.currentPosition.x).toBeCloseTo(10.0, 4)
    expect(stateAtEnd.isComplete).toBe(true)
  })

  it('cumple el teorema cinemático s(t) >= |Δr(t)| en todo momento', () => {
    const nodes = [
      { x: 0, y: 0 },
      { x: 4, y: 6 },
      { x: 8, y: 2 },
      { x: 12, y: 8 },
    ]
    const path = computePath(nodes)
    const params = { acceleration: 2.5, v0: 0 }
    const duration = computeTotalDuration(path.totalDistance, params)

    for (let t = 0; t <= duration; t += 0.2) {
      const state = computeMotionState(t, path, params)
      expect(state.distanceCovered).toBeGreaterThanOrEqual(
        state.currentDisplacement.magnitude - 1e-9
      )
    }
  })

  it('calcula bounding box correcto con márgenes para el renderizado SVG', () => {
    const nodes = [
      { x: -5, y: -2 },
      { x: 15, y: 10 },
    ]
    const bbox = computeBoundingBox(nodes)

    expect(bbox.minX).toBeLessThan(-5)
    expect(bbox.maxX).toBeGreaterThan(15)
    expect(bbox.minY).toBeLessThan(-2)
    expect(bbox.maxY).toBeGreaterThan(10)
    expect(bbox.width).toBeGreaterThan(20)
    expect(bbox.height).toBeGreaterThan(12)
  })
})
