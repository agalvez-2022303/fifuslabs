import katex from 'katex'

/**
 * Canonical renderer for editorial physics content.
 *
 * Content may come from PostgreSQL (sanitized on write) or from the legacy
 * static registry. This renderer escapes plain text BEFORE applying the two
 * supported inline formats, so it is safe regardless of the storage origin.
 *
 * Supported: `$inline$`, `$$display$$` and `**bold**`. Nothing else: HTML is
 * never interpreted as markup.
 */

const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, char => ENTITIES[char] ?? char)
}

/** KaTeX output is generated markup; `trust:false` keeps it free of raw HTML. */
export function mathHtml(expression: string, displayMode = false): string {
  try {
    return katex.renderToString(expression, {
      throwOnError: true,
      trust: false,
      strict: 'ignore',
      maxExpand: 1000,
      displayMode,
    })
  } catch {
    return `<code>${escapeHtml(expression)}</code>`
  }
}

// Split captures $$…$$, $…$ and **…** so plain segments can be escaped untouched.
const TOKENS = /(\$\$[\s\S]+?\$\$|\$(?!\$)[\s\S]+?\$|\*\*[\s\S]+?\*\*)/g

export function formattedHtml(value: string): string {
  if (!value) return ''
  return value
    .split(TOKENS)
    .map(part => {
      if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
        return mathHtml(part.slice(2, -2), true)
      }
      if (part.startsWith('$') && part.endsWith('$') && part.length > 2 && !part.startsWith('$$')) {
        return mathHtml(part.slice(1, -1))
      }
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return `<strong>${formattedHtml(part.slice(2, -2))}</strong>`
      }
      return escapeHtml(part).replace(/\n/g, '<br />')
    })
    .join('')
}

/**
 * Worked examples often store raw LaTeX without `$` delimiters; treat those as
 * math instead of printing markup characters as literal text.
 */
export function desarrolloHtml(value: string): string {
  if (!value) return ''
  return value.includes('$') ? formattedHtml(value) : mathHtml(value.trim())
}
