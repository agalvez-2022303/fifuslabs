import katex from 'katex'

export function escapeHtml(text: string) {
  return text.replace(
    /[&<>"']/g,
    char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char
  )
}
export function mathHtml(expression: string, displayMode = false): string {
  try {
    return katex.renderToString(expression, {
      throwOnError: true,
      trust: false,
      maxExpand: 1000,
      displayMode,
    })
  } catch {
    return `<code>${escapeHtml(expression)}</code>`
  }
}
/** Only the supported Markdown/LaTeX is converted to HTML; editorial text is always escaped. */
export function formattedHtml(value: string): string {
  return value
    .split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\*\*[^*]+?\*\*)/g)
    .map(part => {
      if (part.startsWith('$$') && part.endsWith('$$')) return mathHtml(part.slice(2, -2), true)
      if (part.startsWith('$') && part.endsWith('$')) return mathHtml(part.slice(1, -1))
      if (part.startsWith('**') && part.endsWith('**'))
        return `<strong>${formattedHtml(part.slice(2, -2))}</strong>`
      return escapeHtml(part).replace(/\n/g, '<br />')
    })
    .join('')
}
