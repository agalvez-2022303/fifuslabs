import { describe, expect, it } from 'vitest'
import { sanitizeText, validateContent } from '../services/content-validation'
import { fixture } from './fixtures'

describe('sanitizeText', () => {
  it('removes tags but keeps the surrounding text', () => {
    expect(sanitizeText('<b>texto</b>')).toBe('texto')
    expect(sanitizeText('<script>alert(1)</script>resto')).toBe('resto')
    expect(sanitizeText('<img src=x onerror=alert(1)>')).toBe('')
  })

  it('keeps LaTeX comparison characters decoded so the UI can escape them once', () => {
    expect(sanitizeText('x < y y a > b')).toBe('x < y y a > b')
    expect(sanitizeText('A & B')).toBe('A & B')
  })

  it('reaches a fixed point: saving twice never mutates the text again', () => {
    for (const input of [
      '<b>negrita</b> & mas',
      '&lt;script&gt;alert(1)&lt;/script&gt;',
      'x < y $a < b$',
      '**texto** con $\\vec{F}$',
      'comilla \' y " doble',
    ]) {
      const once = sanitizeText(input)
      expect(sanitizeText(once)).toBe(once)
      expect(sanitizeText(sanitizeText(once))).toBe(once)
    }
  })

  it('never lets encoded markup become live markup', () => {
    const result = sanitizeText('&amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;')
    expect(result).not.toMatch(/<script/i)
  })

  it('validates a full topic and rejects invalid LaTeX', () => {
    const tema = validateContent({ ...fixture, status: 'published' })
    expect(tema.slug).toBe('mru')
    expect(() =>
      validateContent({
        ...fixture,
        formulas: [{ ...fixture.formulas[0], expresion: '\\frac{' }],
      })
    ).toThrow(/LaTeX/i)
  })
})
