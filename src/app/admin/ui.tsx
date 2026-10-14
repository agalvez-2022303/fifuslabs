import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function Icon({ name }: { name: string }) {
  return (
    <span className="material-symbols-outlined studio-icon" aria-hidden="true">
      {name}
    </span>
  )
}
export function PageHeading({
  title,
  description,
  eyebrow = 'CONTENIDO PEDAG├ôGICO',
  children,
}: {
  title: string
  description: string
  eyebrow?: string
  children?: ReactNode
}) {
  return (
    <header className="studio-heading">
      <div>
        <p className="studio-eyebrow">
          <i />
          {eyebrow}
        </p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="studio-actions">{children}</div>
    </header>
  )
}
export function Status({ status }: { status: 'draft' | 'published' }) {
  return (
    <span className={`studio-status ${status}`}>
      <i />
      {status === 'published' ? 'Publicado' : 'Borrador'}
    </span>
  )
}
export function Message({ children, success = false }: { children: ReactNode; success?: boolean }) {
  return (
    <div
      className={`studio-message ${success ? 'success' : 'error'}`}
      role={success ? 'status' : 'alert'}
    >
      <Icon name={success ? 'check_circle' : 'error'} />
      <div>{children}</div>
    </div>
  )
}
export function Loading({ text = 'Cargando contenidoΓÇª' }: { text?: string }) {
  return (
    <div className="studio-loading" role="status">
      <span className="studio-spinner" />
      {text}
    </div>
  )
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="studio-empty">
      <Icon name="science" />
      <h2>{title}</h2>
      {children}
    </div>
  )
}
export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="studio-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  )
}
export function Pagination({
  page,
  pages,
  total,
  pageSize,
  onPage,
  onSize,
}: {
  page: number
  pages: number
  total: number
  pageSize: number
  onPage: (page: number) => void
  onSize: (size: number) => void
}) {
  return (
    <footer className="studio-pagination">
      <span>
        {total
          ? `Mostrando ${(page - 1) * pageSize + 1}ΓÇô${Math.min(total, page * pageSize)} de ${total}`
          : '0 resultados'}
      </span>
      <label>
        Filas por p├ígina{' '}
        <select
          aria-label="Filas por p├ígina"
          value={pageSize}
          onChange={event => onSize(Number(event.target.value))}
        >
          <option>10</option>
          <option>25</option>
          <option>50</option>
        </select>
      </label>
      <div>
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <Icon name="chevron_left" />
          Anterior
        </button>
        <strong>
          {page} / {Math.max(1, pages)}
        </strong>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Siguiente
          <Icon name="chevron_right" />
        </button>
      </div>
    </footer>
  )
}
export function Confirm({
  title,
  children,
  onCancel,
  onConfirm,
  busy = false,
}: {
  title: string
  children: ReactNode
  onCancel: () => void
  onConfirm: () => void
  busy?: boolean
}) {
  const dialog = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialog.current?.focus()
    return () => previous?.focus()
  }, [])
  return (
    <div className="studio-modal-backdrop">
      <div
        ref={dialog}
        className="studio-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="studio-confirm-title"
        tabIndex={-1}
        onKeyDown={event => {
          if (event.key === 'Escape' && !busy) onCancel()
          if (event.key === 'Tab') {
            const controls =
              dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
            if (!controls?.length) return
            const first = controls[0],
              last = controls[controls.length - 1]
            if (
              event.shiftKey &&
              (document.activeElement === first || document.activeElement === dialog.current)
            ) {
              event.preventDefault()
              last.focus()
            } else if (
              !event.shiftKey &&
              (document.activeElement === last || document.activeElement === dialog.current)
            ) {
              event.preventDefault()
              first.focus()
            }
          }
        }}
      >
        <h2 id="studio-confirm-title">{title}</h2>
        <div>{children}</div>
        <footer>
          <button type="button" className="studio-button" disabled={busy} onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className="studio-button danger"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'ProcesandoΓÇª' : 'Confirmar'}
          </button>
        </footer>
      </div>
    </div>
  )
}
export const dateLabel = (value: string) =>
  new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(value)
  )
export function TopicLink({ slug, children }: { slug: string; children: ReactNode }) {
  return <Link to={`/admin/temas/${encodeURIComponent(slug)}`}>{children}</Link>
}
