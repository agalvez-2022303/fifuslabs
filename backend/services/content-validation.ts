import katex from 'katex'
import sanitizeHtml from 'sanitize-html'
import { temaSchema, type TemaConfig } from '../../packages/shared-types/src'
import { ValidationError } from '../errors'

/**
 * Strips every tag and attribute, leaving plain text.
 *
 * Markers are stored decoded (`<`, `>`, `&`) because the frontend escapes on
 * render: storing `&amp;` instead would make it display literally. The loop
 * normalizes once and then reaches a fixed point, so saving a topic repeatedly
 * never mutates the text further. Encoded markup such as `&lt;script&gt;`
 * survives as inert text and can never become live markup.
 */
export function sanitizeText(value: string): string {
  let current = value
  // Re-parse to defeat nested encodings (&amp;lt;script&amp;gt;).
  for (let depth = 0; depth < 32; depth++) {
    const next = sanitizeHtml(current, {
      allowedTags: [],
      allowedAttributes: {},
      nonTextTags: ['script', 'style', 'textarea', 'option'],
      disallowedTagsMode: 'discard',
    })
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
    if (next === current) return current
    current = next
  }
  throw new ValidationError('Codificación HTML excesivamente anidada')
}
function clean(value: unknown): unknown {
  if (typeof value === 'string') return sanitizeText(value)
  if (Array.isArray(value)) return value.map(clean)
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clean(item)]))
  return value
}
export function validateContent(value: unknown): TemaConfig {
  const parsed = temaSchema.safeParse(clean(value))
  if (!parsed.success)
    throw new ValidationError('Contenido inválido tras sanitizar', parsed.error.issues)
  const tema = parsed.data
  for (const expression of [
    tema.formulaPrincipal,
    ...tema.formulas.map(formula => formula.expresion),
  ]) {
    if (!expression) continue
    try {
      katex.renderToString(expression, { throwOnError: true, trust: false, maxExpand: 1000 })
    } catch (error: unknown) {
      throw new ValidationError('Expresión LaTeX inválida', {
        expression,
        reason: error instanceof Error ? error.message : 'Parse error',
      })
    }
  }
  return tema
}
