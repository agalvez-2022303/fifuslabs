import katex from 'katex'
import sanitizeHtml from 'sanitize-html'
import { temaSchema, type TemaConfig } from '../../packages/shared-types/src'
import { ValidationError } from '../errors'

/** No HTML allowed. Escape decoding restores plain text / LaTeX comparisons, not markup. */
export function sanitizeText(value: string): string {
  let current = value
  // Reparse decoded entities too: encoded <script> must not become stored HTML.
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
    if (next === current) return next
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
