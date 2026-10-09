import { describe, it, expect } from 'vitest'
import { computeMRU, timeAtMRUPosition, solveMRUUnknown } from '../physics'

describe('MRU Physics Unit Tests', () => {
  it('calculates position and displacement accurately for positive velocity', () => {
    const state = computeMRU({ x0: 10, v: 5 }, 4)
    expect(state.x).toBe(30)
    expect(state.deltaX).toBe(20)
    expect(state.v).toBe(5)
    expect(state.t).toBe(4)
  })

  it('calculates position and displacement for negative velocity (return motion)', () => {
    const state = computeMRU({ x0: 50, v: -10 }, 3)
    expect(state.x).toBe(20)
    expect(state.deltaX).toBe(-30)
    expect(state.v).toBe(-10)
  })

  it('calculates exact time at photogate position', () => {
    const t = timeAtMRUPosition({ x0: 0, v: 20 }, 100)
    expect(t).toBe(5)
  })

  it('solves unknown time given deltaX and velocity', () => {
    const res = solveMRUUnknown({ x0: 5, deltaX: 40, v: 8 })
    expect(res.isValid).toBe(true)
    expect(res.t).toBe(5)
    expect(res.x).toBe(45)
  })

  it('solves unknown velocity given deltaX and time', () => {
    const res = solveMRUUnknown({ x0: 0, x: 100, t: 10 })
    expect(res.isValid).toBe(true)
    expect(res.v).toBe(10)
    expect(res.deltaX).toBe(100)
  })

  it('detects invalid negative time scenario in solver', () => {
    const res = solveMRUUnknown({ x0: 10, x: 50, v: -5 })
    expect(res.isValid).toBe(false)
    expect(res.errorMessage).toBeDefined()
  })
})
