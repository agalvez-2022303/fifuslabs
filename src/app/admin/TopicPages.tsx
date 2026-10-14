import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  createTemaSchema,
  metadataSchema,
  SIM_COMPONENT_SLUGS,
  type TemaConfig,
} from '@physicslab/shared-types'
import { adminApi } from './api'
import { useContent } from './ContentContext'
import { useTopic } from './useTopic'
import {
  Confirm,
  Empty,
  Field,
  Icon,
  Loading,
  Message,
  PageHeading,
  Pagination,
  Status,
  dateLabel,
} from './ui'

export function TopicListPage() {
  const { temas, categories, error, loading, reload, remove, update } = useContent()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || ''),
    [category, setCategory] = useState(''),
    [status, setStatus] = useState('')
  const [page, setPage] = useState(1),
    [size, setSize] = useState(10),
    [failure, setFailure] = useState(''),
    [removed, setRemoved] = useState('')
  const [confirmation, setConfirmation] = useState<TemaConfig | null>(null),
    [busy, setBusy] = useState(false),
    [recoverySlug, setRecoverySlug] = useState('')
  const navigate = useNavigate()
  useEffect(() => {
    setQ(params.get('q') || '')
    setPage(1)
  }, [params])
  const rows = temas.filter(
    tema =>
      (!category || tema.categoriaId === category) &&
      (!status || tema.status === status) &&
      `${tema.titulo} ${tema.slug} ${tema.descripcionCorta} ${tema.etiquetas.join(' ')}`
        .toLowerCase()
        .includes(q.toLowerCase())
  )
  const pages = Math.max(1, Math.ceil(rows.length / size)),
    activePage = Math.min(page, pages)
  async function changeStatus(tema: TemaConfig) {
    setBusy(true)
    setFailure('')
    try {
      update(
        await adminApi.status(
          tema.slug,
          tema.status === 'published' ? 'draft' : 'published',
          tema.version
        )
      )
    } catch (error: unknown) {
      setFailure(error instanceof Error ? error.message : 'No se pudo cambiar la publicaci├│n')
    } finally {
      setBusy(false)
    }
  }
  async function erase() {
    if (!confirmation) return
    setBusy(true)
    setFailure('')
    try {
      await adminApi.removeTema(confirmation.slug, confirmation.version)
      remove(confirmation.slug)
      setRemoved(confirmation.slug)
      setConfirmation(null)
    } catch (error: unknown) {
      setFailure(error instanceof Error ? error.message : 'No se pudo retirar el tema')
      setConfirmation(null)
    } finally {
      setBusy(false)
    }
  }
  if (loading && !temas.length) return <Loading />
  return (
    <div className="studio-page">
      <PageHeading
        title="Gesti├│n de temas did├ícticos"
        description="Organiza la teor├¡a, las f├│rmulas y el glosario de cada tema."
        eyebrow="CURR├ìCULO Y CONTENIDO"
      >
        <button className="studio-button" onClick={() => void reload()}>
          <Icon name="refresh" />
          Actualizar
        </button>
        <Link className="studio-button primary" to="/admin/temas/nuevo">
          <Icon name="add" />
          Nuevo tema
        </Link>
      </PageHeading>
      {(error || failure) && (
        <Message>
          {failure || error}
          <button className="studio-button small" onClick={() => void reload()}>
            Recargar datos
          </button>
        </Message>
      )}
      {removed && (
        <Message success>
          Tema retirado.{' '}
          <Link to={`/admin/temas/${removed}/revisiones`}>Consultar historial o restaurarlo</Link>
        </Message>
      )}
      <section className="studio-card studio-filters">
        <div className="studio-filter-row">
          <label className="studio-search-input">
            <Icon name="search" />
            <input
              type="search"
              aria-label="Buscar temas"
              placeholder="Buscar temas, slugs o etiquetasΓÇª"
              value={q}
              onChange={event => {
                setQ(event.target.value)
                setPage(1)
              }}
            />
          </label>
          <select
            aria-label="├ürea del tema"
            value={category}
            onChange={event => {
              setCategory(event.target.value)
              setPage(1)
            }}
          >
            <option value="">Todas las ├íreas</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
          </select>
          <select
            aria-label="Estado del tema"
            value={status}
            onChange={event => {
              setStatus(event.target.value)
              setPage(1)
            }}
          >
            <option value="">Todos los estados</option>
            <option value="published">Publicado</option>
            <option value="draft">Borrador</option>
          </select>
        </div>
      </section>
      <section className="studio-card studio-table-card">
        <div className="studio-table-scroll">
          <table className="studio-table">
            <thead>
              <tr>
                <th>Tema y slug</th>
                <th>├ürea y nivel</th>
                <th>Recursos</th>
                <th>Estado</th>
                <th>Actualizaci├│n</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice((activePage - 1) * size, activePage * size).map(tema => (
                <tr key={tema.slug}>
                  <td>
                    <Link to={`/admin/temas/${tema.slug}`}>{tema.titulo}</Link>
                    <code>/{tema.slug}</code>
                  </td>
                  <td>
                    {categories.find(cat => cat.id === tema.categoriaId)?.nombre}
                    <small>{tema.dificultad}</small>
                  </td>
                  <td>
                    <span>{tema.teoria.secciones.length} secciones</span>
                    <small>
                      {tema.formulas.length} f├│rmulas ┬╖ {tema.glosario.length} t├⌐rminos
                    </small>
                  </td>
                  <td>
                    <Status status={tema.status} />
                  </td>
                  <td>
                    {dateLabel(tema.updatedAt)}
                    <small>v{tema.version}</small>
                  </td>
                  <td>
                    <div className="studio-row-actions">
                      <Link
                        className="studio-icon-button"
                        title="Editar tema"
                        to={`/admin/temas/${tema.slug}`}
                      >
                        <Icon name="edit" />
                      </Link>
                      <button
                        className="studio-icon-button"
                        disabled={busy}
                        title={tema.status === 'published' ? 'Pasar a borrador' : 'Publicar tema'}
                        onClick={() => void changeStatus(tema)}
                      >
                        <Icon name={tema.status === 'published' ? 'unpublished' : 'publish'} />
                      </button>
                      <Link
                        className="studio-icon-button"
                        title="Revisiones del tema"
                        to={`/admin/temas/${tema.slug}/revisiones`}
                      >
                        <Icon name="history" />
                      </Link>
                      <button
                        className="studio-icon-button danger"
                        disabled={busy}
                        title="Retirar tema"
                        onClick={() => setConfirmation(tema)}
                      >
                        <Icon name="delete" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty title="No se encontraron temas" />}
        <Pagination
          page={activePage}
          pages={pages}
          total={rows.length}
          pageSize={size}
          onPage={setPage}
          onSize={size => {
            setSize(size)
            setPage(1)
          }}
        />
      </section>
      <form
        className="studio-card studio-recovery-lookup"
        onSubmit={event => {
          event.preventDefault()
          navigate(`/admin/temas/${encodeURIComponent(recoverySlug)}/revisiones`)
        }}
      >
        <div>
          <h2>Recuperar un tema retirado</h2>
          <p>Su historial sigue disponible mediante el slug original.</p>
        </div>
        <Field label="Slug del tema retirado">
          <input
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            maxLength={100}
            value={recoverySlug}
            onChange={event => setRecoverySlug(event.target.value)}
            placeholder="ej. mru"
          />
        </Field>
        <button className="studio-button" type="submit">
          <Icon name="history" />
          Ver historial
        </button>
      </form>
      {confirmation && (
        <Confirm
          title="Retirar tema"
          onCancel={() => setConfirmation(null)}
          onConfirm={() => void erase()}
          busy={busy}
        >
          <p>
            Se ocultar├í ┬½{confirmation.titulo}┬╗ de las lecturas p├║blicas. Sus revisiones permitir├ín
            restaurarlo.
          </p>
        </Confirm>
      )}
    </div>
  )
}

interface Fields {
  titulo: string
  slug: string
  descripcionCorta: string
  categoriaId: string
  dificultad: string
  estado: string
  orden: number
  icono: string
  etiquetas: string
  formulaPrincipal: string
  simComponentSlug: string
  introduccion: string
}
const initial = (): Fields => ({
  titulo: '',
  slug: '',
  descripcionCorta: '',
  categoriaId: 'mecanica',
  dificultad: 'basico',
  estado: 'active',
  orden: 0,
  icono: 'menu_book',
  etiquetas: '',
  formulaPrincipal: '',
  simComponentSlug: '',
  introduccion: '',
})
function fields(tema: TemaConfig): Fields {
  return {
    ...tema,
    etiquetas: tema.etiquetas.join(', '),
    simComponentSlug: tema.simComponentSlug ?? '',
    introduccion: tema.teoria.introduccion,
  }
}
const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)

export function TopicEditorPage() {
  const { slug = '' } = useParams()
  const { categories, update } = useContent()
  const remote = useTopic(slug)
  const navigate = useNavigate()
  const [values, setValues] = useState<Fields>(initial),
    [slugEdited, setSlugEdited] = useState(false)
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false)
  useEffect(() => {
    setValues(remote.tema ? fields(remote.tema) : initial())
    setSlugEdited(Boolean(slug))
  }, [remote.tema, slug])
  const set = <K extends keyof Fields>(key: K, value: Fields[K]) =>
    setValues(current => ({ ...current, [key]: value }))
  const dirty = remote.tema ? JSON.stringify(values) !== JSON.stringify(fields(remote.tema)) : true
  async function save(event: FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')
    const metadata = metadataSchema.safeParse({
      titulo: values.titulo,
      descripcionCorta: values.descripcionCorta,
      categoriaId: values.categoriaId,
      dificultad: values.dificultad,
      estado: values.estado,
      orden: values.orden,
      icono: values.icono,
      etiquetas: [
        ...new Set(
          values.etiquetas
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean)
        ),
      ],
      formulaPrincipal: values.formulaPrincipal,
      simComponentSlug: values.simComponentSlug || null,
    })
    if (!metadata.success) {
      setError(
        metadata.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(' ┬╖ ')
      )
      return
    }
    setBusy(true)
    try {
      const saved = remote.tema
        ? await adminApi.patchTema(slug, metadata.data, remote.tema.version)
        : await adminApi.createTema(
            createTemaSchema.parse({
              ...metadata.data,
              slug: values.slug,
              teoria: { introduccion: values.introduccion },
            })
          )
      remote.update(saved)
      update(saved)
      setNotice('Metadatos guardados correctamente.')
      if (!slug) navigate(`/admin/temas/${saved.slug}`, { replace: true })
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'No se pudo guardar el tema')
    } finally {
      setBusy(false)
    }
  }
  async function publish() {
    if (!remote.tema) return
    setBusy(true)
    setError('')
    try {
      remote.update(
        await adminApi.status(
          slug,
          remote.tema.status === 'published' ? 'draft' : 'published',
          remote.tema.version
        )
      )
      setNotice('Publicaci├│n actualizada.')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'No se pudo actualizar')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="studio-page">
      <PageHeading
        title={slug ? 'Editar tema' : 'Nuevo tema did├íctico'}
        description="Define los metadatos. La simulaci├│n se referencia mediante una lista de componentes permitidos."
      >
        <Link className="studio-button" to="/admin/temas">
          Volver al cat├ílogo
        </Link>
        {remote.tema && (
          <>
            <Status status={remote.tema.status} />
            <button
              className="studio-button primary"
              disabled={busy || dirty}
              onClick={() => void publish()}
            >
              {remote.tema.status === 'published' ? 'Pasar a borrador' : 'Publicar tema'}
            </button>
          </>
        )}
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
        <form className="studio-card studio-topic-form" onSubmit={save}>
          <div className="studio-two-fields">
            <Field label="T├¡tulo">
              <input
                required
                maxLength={300}
                value={values.titulo}
                onChange={event => {
                  set('titulo', event.target.value)
                  if (!slugEdited) set('slug', slugify(event.target.value))
                }}
              />
            </Field>
            <Field
              label="Slug"
              hint={
                slug
                  ? 'El slug es inmutable despu├⌐s de crear el tema.'
                  : 'Solo min├║sculas, n├║meros y guiones.'
              }
            >
              <input
                required
                disabled={Boolean(slug)}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                maxLength={100}
                value={values.slug}
                onChange={event => {
                  setSlugEdited(true)
                  set('slug', event.target.value)
                }}
              />
            </Field>
          </div>
          <Field label="Descripci├│n corta">
            <textarea
              required
              maxLength={1000}
              rows={3}
              value={values.descripcionCorta}
              onChange={event => set('descripcionCorta', event.target.value)}
            />
          </Field>
          <div className="studio-two-fields">
            <Field label="├ürea">
              <select
                value={values.categoriaId}
                onChange={event => set('categoriaId', event.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Dificultad">
              <select
                value={values.dificultad}
                onChange={event => set('dificultad', event.target.value)}
              >
                <option value="basico">B├ísico</option>
                <option value="intermedio">Intermedio</option>
                <option value="avanzado">Avanzado</option>
              </select>
            </Field>
            <Field label="Componente de simulaci├│n">
              <select
                value={values.simComponentSlug}
                onChange={event => set('simComponentSlug', event.target.value)}
              >
                <option value="">Sin simulaci├│n vinculada</option>
                {SIM_COMPONENT_SLUGS.map(item => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Disponibilidad de simulaci├│n">
              <select value={values.estado} onChange={event => set('estado', event.target.value)}>
                <option value="active">Activa</option>
                <option value="coming-soon">Pr├│ximamente</option>
              </select>
            </Field>
            <Field label="Orden">
              <input
                required
                type="number"
                min={0}
                max={100000}
                step="any"
                value={values.orden}
                onChange={event => set('orden', Number(event.target.value))}
              />
            </Field>
            <Field label="Icono">
              <input
                required
                maxLength={100}
                value={values.icono}
                onChange={event => set('icono', event.target.value)}
              />
            </Field>
          </div>
          <Field label="Etiquetas" hint="Separadas por comas, m├íximo 30">
            <input
              value={values.etiquetas}
              onChange={event => set('etiquetas', event.target.value)}
            />
          </Field>
          <Field label="F├│rmula principal (LaTeX)">
            <input
              maxLength={4000}
              value={values.formulaPrincipal}
              onChange={event => set('formulaPrincipal', event.target.value)}
            />
          </Field>
          {!slug && (
            <Field label="Introducci├│n inicial">
              <textarea
                required
                maxLength={20000}
                rows={5}
                value={values.introduccion}
                onChange={event => set('introduccion', event.target.value)}
              />
            </Field>
          )}
          <footer>
            <button
              className="studio-button primary"
              disabled={busy || (Boolean(slug) && !remote.tema)}
            >
              {busy ? 'GuardandoΓÇª' : 'Guardar metadatos'}
            </button>
            <small>
              {remote.tema
                ? `Versi├│n ${remote.tema.version}. Guarda tus cambios antes de publicar.`
                : 'Se crear├í como borrador.'}
            </small>
          </footer>
        </form>
      )}
      {remote.tema && (
        <section className="studio-card studio-quick-actions">
          <h2>Editar contenido del tema</h2>
          <Link to={`/admin/teoria?tema=${slug}`}>
            <Icon name="menu_book" />
            Introducci├│n, secciones y resumen
          </Link>
          <Link to={`/admin/formulas?tema=${slug}`}>
            <Icon name="functions" />
            F├│rmulas y ejemplos
          </Link>
          <Link to={`/admin/glosario?tema=${slug}`}>
            <Icon name="spellcheck" />
            Glosario
          </Link>
          <Link to={`/admin/temas/${slug}/revisiones`}>
            <Icon name="history" />
            Revisiones
          </Link>
        </section>
      )}
    </div>
  )
}
