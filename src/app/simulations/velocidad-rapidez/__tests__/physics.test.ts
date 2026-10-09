import { describe, it, expect } from 'vitest'
import { computeVelocityVsSpeed, computeParticlePosition } from '../physics'

describe('Velocidad vs Rapidez Physics Engine', () => {
  it('calcula rapidez y velocidad media en recta 1D', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }]
    const times = [2] // 10m en 2s

    const res = computeVelocityVsSpeed(points, times)
    expect(res.totalDistance).toBe(10)
    expect(res.totalTime).toBe(2)
    expect(res.avgSpeed).toBe(5)
    expect(res.avgVelocityMag).toBe(5)
    expect(res.geographicRumbo).toContain('Este')
  })

  it('calcula rapidez y velocidad media en circuito cerrado (ida y vuelta)', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 0 }]
    const times = [2, 2] // 20m en 4s

    const res = computeVelocityVsSpeed(points, times)
    expect(res.totalDistance).toBe(20)
    expect(res.totalTime).toBe(4)
    expect(res.avgSpeed).toBe(5) // 20m / 4s = 5 m/s
    expect(res.avgVelocityMag).toBe(0) // Δr = 0, vm = 0
    expect(res.explanation).toContain('NULA')
  })

  it('calcula rapidez y velocidad media en L (cuadrante I)', () => {
    const points = [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 4 }] // 3m + 4m = 7m distancia, 5m desplazamiento
    const times = [1, 1] // 2s total

    const res = computeVelocityVsSpeed(points, times)
    expect(res.totalDistance).toBe(7)
    expect(res.totalTime).toBe(2)
    expect(res.avgSpeed).toBe(3.5)
    expect(res.avgVelocityMag).toBe(2.5) // 5m / 2s = 2.5 m/s
    expect(res.geographicRumbo).toContain('N')
  })

  it('calcula posición de partícula correctamente', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }]
    const times = [4]

    const stateAt2s = computeParticlePosition(2, points, times)
    expect(stateAt2s.currentPos.x).toBe(5)
    expect(stateAt2s.progressPercent).toBe(50)
  })
})
