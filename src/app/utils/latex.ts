import katex from 'katex'
import 'katex/dist/katex.min.css'

export function renderLatex(expression: string, displayMode = false): string {
  let source = expression.trim()

  if (source.startsWith('$$') && source.endsWith('$$')) {
    source = source.slice(2, -2).trim()
  } else if (source.startsWith('$') && source.endsWith('$')) {
    source = source.slice(1, -1).trim()
  } else if (source.startsWith('\\(') && source.endsWith('\\)')) {
    source = source.slice(2, -2).trim()
  } else if (source.startsWith('\\[') && source.endsWith('\\]')) {
    source = source.slice(2, -2).trim()
  }

  return katex.renderToString(source, { throwOnError: false, displayMode })
}
