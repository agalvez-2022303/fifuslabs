import { describe, expect, it } from 'vitest'
import { desarrolloHtml, escapeHtml, formattedHtml, mathHtml } from '../content-format'

describe('content-format', () => {
  it('escapes HTML in plain text instead of interpreting it', () => {
    const output = formattedHtml('<script>alert(1)</script>')
    expect(output).not.toContain('<script>')
    expect(output).toContain('&lt;script&gt;')
  })

  it('neutralizes attribute-based injection', () => {
    const output = formattedHtml('<img src=x onerror=alert(1)>Hola')
    expect(output).not.toMatch(/<img/i)
    expect(output).toContain('&lt;img')
  })

  it('escapes text that surrounds supported inline formats', () => {
    expect(formattedHtml('a < b **negrita** c > d')).toBe(
      'a &lt; b <strong>negrita</strong> c &gt; d'
    )
  })

  it('keeps bold markup and LaTeX working', () => {
    expect(formattedHtml('**texto**')).toBe('<strong>texto</strong>')
    expect(formattedHtml('$x^2$')).toContain('katex')
    expect(formattedHtml('$$x^2$$')).toContain('katex-display')
  })

  it('cannot be tricked into markup through LaTeX payloads', () => {
    // KaTeX is rendered with trust:false; a failed parse falls back to escaped code.
    const output = mathHtml('\\href{javascript:alert(1)}{x}')
    expect(output).not.toMatch(/href\s*=/i)
  })

  it('escapes malformed LaTeX instead of emitting it raw', () => {
    expect(mathHtml('\\frac{')).toBe('<code>\\frac{</code>')
  })

  it('escapes apostrophes and quotes', () => {
    expect(escapeHtml(`"a" & 'b' <c>`)).toBe('&quot;a&quot; &amp; &#39;b&#39; &lt;c&gt;')
  })

  it('treats undelimited worked examples as math', () => {
    expect(desarrolloHtml('x = v \\cdot t')).toContain('katex')
    expect(desarrolloHtml('con $x$ delimiters')).toContain('katex')
  })

  it('returns an empty string for empty content', () => {
    expect(formattedHtml('')).toBe('')
    expect(desarrolloHtml('')).toBe('')
    expect(mathHtml('')).toContain('katex')
  })
})
