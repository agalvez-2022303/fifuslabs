import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  itemSchemas,
  type GlosarioItem,
  type ResumenItem,
  type TeoriaSeccion,
  type TemaConfig,
} from '@physicslab/shared-types'
import { adminApi } from './api'
import { useContent } from './ContentContext'
import { useTopic } from './useTopic'
import { Confirm, Empty, Field, Icon, Loading, Message, PageHeading, Status } from './ui'
import { TextPreview } from './MathPreview'

type Kind = 'secciones' | 'resumen' | 'glosario'
type Item = TeoriaSeccion | ResumenItem | GlosarioItem
const fields = {
  secciones: [
    { key: 'titulo', label: 'T├¡tulo de la secci├│n', max: 300 },
    { key: 'contenido', label: 'Contenido de la secci├│n', max: 20000, multiline: true },
    { key: 'destacado', label: 'Destacado (opcional)', max: 2000, multiline: true, optional: true },
  ],
  resumen: [{ key: 'contenido', label: 'Punto clave del resumen', max: 4000, multiline: true }],
  glosario: [
    { key: 'termino', label: 'T├⌐rmino', max: 300 },
    { key: 'definicion', label: 'Definici├│n', max: 4000, multiline: true },
    { key: 'categoria', label: 'Categor├¡a del t├⌐rmino (opcional)', max: 300, optional: true },
  ],
} satisfies Record<
  Kind,
  { key: string; label: string; max: number; multiline?: boolean; optional?: boolean }[]
>
function valuesFor(kind: Kind, item?: Item): Record<string, string> {
  const data = (item ?? {}) as unknown as Record<string, unknown>
  return Object.fromEntries(
    fields[kind].map(field => [
      field.key,
      typeof data[field.key] === 'string' ? data[field.key] : '',
    ])
  ) as Record<string, string>
}
function ItemForm({
  kind,
  item,
  disabled,
  onSave,
  onDelete,
  onMove,
}: {
  kind: Kind
  item?: Item
  disabled: boolean
  onSave: (body: unknown) => Promise<Item | undefined>
  onDelete?: () => void
  onMove?: (direction: number) => void
}) {
  const savedFields = JSON.stringify(valuesFor(kind, item))
  const [values, setValues] = useState<Record<string, string>>(
    () => JSON.parse(savedFields) as Record<string, string>
  )
  const [error, setError] = useState('')
  useEffect(() => {
    setValues(JSON.parse(savedFields) as Record<string, string>)
  }, [savedFields])
  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    const body = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        !value &&
        fields[kind].find(field => field.key === key && 'optional' in field && field.optional)
          ? null
          : value,
      ])
    )
    const parsed = itemSchemas[kind].safeParse(body)
    if (!parsed.success) {
      setError(parsed.error.issues.map(issue => issue.message).join(' ┬╖ '))
      return
    }
    try {
      const result = await onSave(parsed.data)
      setValues(valuesFor(kind, result))
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'No se pudo guardar el elemento')
    }
  }
  return (
    <form className="studio-card studio-text-item" onSubmit={submit}>
      <header>
        <h3>
          {item
            ? kind === 'secciones'
              ? (item as TeoriaSeccion).titulo
              : kind === 'glosario'
                ? (item as GlosarioItem).termino
                : 'Punto del resumen'
            : `A├▒adir ${kind === 'secciones' ? 'secci├│n' : kind === 'glosario' ? 't├⌐rmino' : 'punto clave'}`}
        </h3>
        {item && (
          <div className="studio-row-actions">
            {onMove && (
              <>
                <button
                  className="studio-icon-button"
                  type="button"
                  disabled={disabled}
                  aria-label="Mover arriba"
                  onClick={() => onMove(-1)}
                >
                  <Icon name="arrow_upward" />
                </button>
                <button
                  className="studio-icon-button"
                  type="button"
                  disabled={disabled}
                  aria-label="Mover abajo"
                  onClick={() => onMove(1)}
                >
                  <Icon name="arrow_downward" />
                </button>
              </>
            )}
            <button
              className="studio-icon-button danger"
              type="button"
              disabled={disabled}
              aria-label="Eliminar elemento"
              onClick={onDelete}
            >
              <Icon name="delete" />
            </button>
          </div>
        )}
      </header>
      {error && <Message>{error}</Message>}
      {fields[kind].map(field => (
        <Field key={field.key} label={field.label}>
          {'multiline' in field && field.multiline ? (
            <textarea
              required={!('optional' in field && field.optional)}
              disabled={disabled}
              rows={4}
              maxLength={field.max}
              value={values[field.key]}
              onChange={event =>
                setValues(current => ({ ...current, [field.key]: event.target.value }))
              }
            />
          ) : (
            <input
              required={!('optional' in field && field.optional)}
              disabled={disabled}
              maxLength={field.max}
              value={values[field.key]}
              onChange={event =>
                setValues(current => ({ ...current, [field.key]: event.target.value }))
              }
            />
          )}
        </Field>
      ))}
      <details>
        <summary>Vista previa</summary>
        <TextPreview text={values.contenido || values.definicion || ''} />
      </details>
      <footer>
        <button className="studio-button primary small" disabled={disabled}>
          {item ? 'Guardar cambios' : 'A├▒adir al tema'}
        </button>
        {item && <code title={item.id}>{item.id.slice(0, 8)}</code>}
      </footer>
    </form>
  )
}
export default function TextEditorPage({ glossary = false }: { glossary?: boolean }) {
  const { temas, loading: contentLoading, error: contentError } = useContent()
  const [params, setParams] = useSearchParams()
  const slug = params.get('tema') || temas[0]?.slug || ''
  const remote = useTopic(slug)
  const [intro, setIntro] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('')
  const [pending, setPending] = useState<{ kind: Kind; id: string } | null>(null)
  useEffect(() => {
    setIntro(remote.tema?.teoria.introduccion || '')
  }, [remote.tema?.teoria.introduccion])
  const collection = (tema: TemaConfig, kind: Kind): Item[] =>
    kind === 'glosario' ? tema.glosario : tema.teoria[kind]
  async function save(kind: Kind, body: unknown, id?: string): Promise<Item | undefined> {
    if (!remote.tema) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const saved = await adminApi.saveItem(slug, kind, body, remote.tema.version, id)
      remote.update(saved)
      setNotice('Contenido guardado correctamente.')
      return id ? collection(saved, kind).find(item => item.id === id) : undefined
    } finally {
      setBusy(false)
    }
  }
  async function introduction(event: FormEvent) {
    event.preventDefault()
    if (!remote.tema) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      remote.update(await adminApi.introduction(slug, intro, remote.tema.version))
      setNotice('Introducci├│n guardada.')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'No se pudo guardar la introducci├│n')
    } finally {
      setBusy(false)
    }
  }
  async function erase() {
    if (!pending || !remote.tema) return
    setBusy(true)
    setError('')
    try {
      await adminApi.removeItem(slug, pending.kind, pending.id, remote.tema.version)
      remote.update(await adminApi.getTema(slug))
      setNotice('Elemento eliminado. La revisi├│n anterior conserva su contenido.')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'No se pudo eliminar')
    } finally {
      setBusy(false)
      setPending(null)
    }
  }
  async function move(kind: 'secciones' | 'glosario', id: string, direction: number) {
    if (!remote.tema) return
    const ids = collection(remote.tema, kind).map(item => item.id),
      index = ids.indexOf(id),
      next = index + direction
    if (next < 0 || next >= ids.length) return
    ;[ids[index], ids[next]] = [ids[next], ids[index]]
    setBusy(true)
    setError('')
    try {
      remote.update(await adminApi.reorder(slug, kind, ids, remote.tema.version))
      setNotice('Orden actualizado.')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'No se pudo ordenar')
    } finally {
      setBusy(false)
    }
  }
  if (contentLoading && !temas.length) return <Loading />
  if (!temas.length)
    return (
      <Empty title="Primero crea un tema">
        <p>{contentError}</p>
        <Link className="studio-button primary" to="/admin/temas/nuevo">
          Nuevo tema
        </Link>
      </Empty>
    )
  const tema = remote.tema
  return (
    <div className="studio-page">
      <PageHeading
        title={glossary ? 'Gesti├│n del glosario' : 'Editor de teor├¡a y resumen'}
        description="Edita el contenido textual con formato **negrita** y expresiones LaTeX entre $ΓÇª$."
      >
        <select
          aria-label="Seleccionar tema para editar"
          disabled={busy}
          value={slug}
          onChange={event => setParams({ tema: event.target.value })}
        >
          {temas.map(tema => (
            <option key={tema.slug} value={tema.slug}>
              {tema.titulo}
            </option>
          ))}
        </select>
        {tema && <Status status={tema.status} />}
      </PageHeading>
      {(error || remote.error) && (
        <Message>
          {error || remote.error}
          <button className="studio-button small" onClick={remote.reload}>
            Recargar versi├│n
          </button>
        </Message>
      )}
      {notice && <Message success>{notice}</Message>}
      {remote.loading ? (
        <Loading />
      ) : (
        tema && (
          <>
            <div className="studio-editor-context">
              <strong>{tema.titulo}</strong>
              <span>Versi├│n {tema.version} ┬╖ Estado heredado del tema</span>
              <Link to={`/admin/temas/${slug}/revisiones`}>Ver revisiones</Link>
            </div>
            {!glossary && (
              <form className="studio-card studio-form-section" onSubmit={introduction}>
                <header>
                  <Icon name="edit_note" />
                  <h2>Introducci├│n al tema</h2>
                </header>
                <Field label="Introducci├│n">
                  <textarea
                    disabled={busy}
                    required
                    rows={6}
                    maxLength={20000}
                    value={intro}
                    onChange={event => setIntro(event.target.value)}
                  />
                </Field>
                <details>
                  <summary>Vista previa estudiante</summary>
                  <TextPreview text={intro} />
                </details>
                <button className="studio-button primary" disabled={busy}>
                  Guardar introducci├│n
                </button>
              </form>
            )}
            {(glossary ? (['glosario'] as const) : (['secciones', 'resumen'] as const)).map(
              kind => (
                <section key={kind} className="studio-text-collection">
                  <header>
                    <h2>
                      {kind === 'secciones'
                        ? 'Secciones de teor├¡a'
                        : kind === 'resumen'
                          ? 'Resumen y puntos clave'
                          : 'T├⌐rminos del glosario'}
                    </h2>
                    <span className="studio-count">{collection(tema, kind).length} elementos</span>
                  </header>
                  {collection(tema, kind).map(item => (
                    <ItemForm
                      key={item.id}
                      kind={kind}
                      item={item}
                      disabled={busy}
                      onSave={body => save(kind, body, item.id)}
                      onDelete={() => setPending({ kind, id: item.id })}
                      onMove={
                        kind === 'resumen'
                          ? undefined
                          : direction => void move(kind, item.id, direction)
                      }
                    />
                  ))}
                  <ItemForm
                    key={`new-${kind}-${slug}`}
                    kind={kind}
                    disabled={busy}
                    onSave={body => save(kind, body)}
                  />
                </section>
              )
            )}
          </>
        )
      )}
      {pending && (
        <Confirm
          title="Eliminar elemento de contenido"
          busy={busy}
          onCancel={() => setPending(null)}
          onConfirm={() => void erase()}
        >
          <p>Se eliminar├í del tema. Podr├ís recuperar el snapshot anterior desde las revisiones.</p>
        </Confirm>
      )}
    </div>
  )
}
