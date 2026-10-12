import { describe, it, expect } from 'vitest'
import {
  calcularEncuentro,
  calcularRangoPista,
  generarMarcasEscala,
  formatDistance,
} from '../alcancesMRU.utils'

describe('MRU Alcances y Encuentros - Lógica Física', () => {
  it('Caso 1: Alcance clásico A: x0=0, v=20 | B: x0=100, v=10 -> encuentro en x=200m a t=10s', () => {
    const res = calcularEncuentro(0, 20, 100, 10)
    expect(res.hayEncuentro).toBe(true)
    expect(res.tiempo).toBeCloseTo(10)
    expect(res.puntoEncuentro).toBeCloseTo(200)
    expect(res.regimen).toBe('alcance')
    expect(res.esAlcance).toBe(true)
  })

  it('Caso 2: Encuentro frontal con escala grande A: x0=0, v=300 | B: x0=5000, v=-200 -> encuentro en x=3000m a t=10s', () => {
    const res = calcularEncuentro(0, 300, 5000, -200)
    expect(res.hayEncuentro).toBe(true)
    expect(res.tiempo).toBeCloseTo(10)
    expect(res.puntoEncuentro).toBeCloseTo(3000)
    expect(res.regimen).toBe('encuentro')
    expect(res.esSentidosOpuestos).toBe(true)
  })

  it('Caso 3: Móviles paralelos con igual velocidad A: x0=0, v=10 | B: x0=100, v=10 -> sin encuentro', () => {
    const res = calcularEncuentro(0, 10, 100, 10)
    expect(res.hayEncuentro).toBe(false)
    expect(res.tiempo).toBeNull()
    expect(res.puntoEncuentro).toBeNull()
    expect(res.regimen).toBe('paralelos')
  })

  it('Caso 4: Móviles que se alejan A: x0=0, v=5 | B: x0=100, v=10 -> se alejan (t < 0)', () => {
    const res = calcularEncuentro(0, 5, 100, 10)
    expect(res.hayEncuentro).toBe(false)
    expect(res.tiempo).toBeCloseTo(-20)
    expect(res.regimen).toBe('sin_encuentro_futuro')
  })

  it('Caso 5: Móviles que coinciden en todo momento A: x0=50, v=15 | B: x0=50, v=15', () => {
    const res = calcularEncuentro(50, 15, 50, 15)
    expect(res.hayEncuentro).toBe(true)
    expect(res.tiempo).toBe(0)
    expect(res.puntoEncuentro).toBe(50)
    expect(res.regimen).toBe('coinciden_siempre')
  })

  it('Caso 6: Mismo punto inicial en t=0 con distinta velocidad A: x0=0, v=20 | B: x0=0, v=10', () => {
    const res = calcularEncuentro(0, 20, 0, 10)
    expect(res.hayEncuentro).toBe(true)
    expect(res.tiempo).toBe(0)
    expect(res.puntoEncuentro).toBe(0)
    expect(res.regimen).toBe('mismo_punto_inicial')
  })

  it('Caso 7: Posiciones y velocidades negativas A: x0=-500, v=50 | B: x0=-100, v=-30', () => {
    const res = calcularEncuentro(-500, 50, -100, -30)
    expect(res.hayEncuentro).toBe(true)
    // t = (-100 - (-500)) / (50 - (-30)) = 400 / 80 = 5s
    expect(res.tiempo).toBeCloseTo(5)
    // x = -500 + 50*5 = -250m
    expect(res.puntoEncuentro).toBeCloseTo(-250)
    expect(res.regimen).toBe('encuentro')
  })

  it('Calcula rango de pista dinámico con márgenes y posiciones negativas', () => {
    const res = calcularEncuentro(-200, 20, 600, -20)
    const rango = calcularRangoPista(-200, 20, 600, -20, res)
    expect(rango.min).toBeLessThan(-200)
    expect(rango.max).toBeGreaterThan(600)
    expect(rango.span).toBeGreaterThan(800)
  })

  it('Genera marcas de escala redondas y ordenadas', () => {
    const marcas = generarMarcasEscala(0, 5000, 6)
    expect(marcas.length).toBeGreaterThan(3)
    expect(marcas[0].valor).toBeGreaterThanOrEqual(0)
    expect(marcas[marcas.length - 1].valor).toBeLessThanOrEqual(5000)
    marcas.forEach(m => {
      expect(m.posicionPorcentaje).toBeGreaterThanOrEqual(0)
      expect(m.posicionPorcentaje).toBeLessThanOrEqual(100)
    })
  })

  it('Formato de distancia legible para metros y kilómetros', () => {
    expect(formatDistance(250)).toBe('250 m')
    expect(formatDistance(15000)).toBe('15 km')
    expect(formatDistance(12500)).toBe('12.5 km')
  })
})
