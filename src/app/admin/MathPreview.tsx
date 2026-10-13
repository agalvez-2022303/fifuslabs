import { formattedHtml, mathHtml } from '../utils/content-format'
import 'katex/dist/katex.min.css'
export function MathPreview({
  expression,
  display = false,
}: {
  expression: string
  display?: boolean
}) {
  return (
    <span
      className="studio-math"
      dangerouslySetInnerHTML={{ __html: mathHtml(expression, display) }}
    />
  )
}
export function TextPreview({ text }: { text: string }) {
  return (
    <div
      className="studio-text-preview"
      dangerouslySetInnerHTML={{ __html: formattedHtml(text) }}
    />
  )
}
