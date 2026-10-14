import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useContent } from './ContentContext'
import { adminApi } from './api'
import {
  Confirm,
  Empty,
  Icon,
  Loading,
  Message,
  PageHeading,
  Pagination,
  Status,
  dateLabel,
} from './ui'
import { MathPreview, TextPreview } from './MathPreview'

export default function FormulaListPage({ examples = false }: { examples?: boolean }) {
  const { temas, categories, loading, error, reload, update } = useContent()
  const [params] = useSearchParams()
  const [q, setQ] = useState(''),
    [category, setCategory] = useState(''),
    [topic, setTopic] = useState(params.get('tema') || '')
  const [status, setStatus] = useState(''),
    [level, setLevel] = useState(''),
    [view, setView] = useState('table')
  const [page, setPage] = useState(1),
    [size, setSize] = useState(10),
    [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [failure, setFailure] = useState('')
  const [confirmation, setConfirmation] = useState<{ keys: string[]; publish?: boolean } | null>(
    null
  )
  const all = useMemo(
    () =>
      temas.flatMap(tema =>
        tema.formulas
          .filter(formula => !examples || formula.ejemploResuelto)
          .map(formula => ({ tema, formula, key: `${tema.slug}:${formula.id}` }))
      ),
    [temas, examples]
  )
  const rows = all.filter(
    ({ tema, formula }) =>
      (!category || tema.categoriaId === category) &&
      (!topic || tema.slug === topic) &&
      (!status || tema.status === status) &&
      (!level || tema.dificultad === level) &&
      `${formula.nombre} ${formula.expresion} ${formula.descripcion} ${formula.variables.map(item => item.simbolo).join(' ')}`
        .toLowerCase()
        .includes(q.toLowerCase())
  )
  const pages = Math.max(1, Math.ceil(rows.length / size)),
    activePage = Math.min(page, pages)
  const shown = rows.slice((activePage - 1) * size, activePage * size)
  const toggle = (key: string) =>
    setSelected(current =>
      current.includes(key) ? current.filter(item => item !== key) : [...current, key]
    )
  const clear = () => {
    setQ('')
    setCategory('')
    setTopic('')
    setStatus('')
    setLevel('')
    setPage(1)
  }
  async function act() {
    if (!confirmation) return
    setBusy(true)
    setFailure('')
    setNotice('')
    let completed = 0
    try {
      const versions = new Map(temas.map(tema => [tema.slug, tema.version]))
      if (confirmation.publish) {
        const slugs = [
          ...new Set(
            all.filter(row => confirmation.keys.includes(row.key)).map(row => row.tema.slug)
          ),
        ]
        for (const slug of slugs) {
          const saved = await adminApi.status(slug, 'published', versions.get(slug)!)
          update(saved)
          completed++
        }
      } else {
        for (const key of confirmation.keys) {
          const row = all.find(item => item.key === key)
          if (!row) continue
          await adminApi.removeItem(
            row.tema.slug,
            'formulas',
            row.formula.id,
            versions.get(row.tema.slug)!
          )
          const saved = await adminApi.getTema(row.tema.slug)
          versions.set(row.tema.slug, saved.version)
          update(saved)
          completed++
        }
      }
      setSelected([])
      setNotice(
        `${completed} ${confirmation.publish ? 'tema(s) publicado(s)' : 'f├│rmula(s) eliminada(s)'}.`
      )
      setConfirmation(null)
    } catch (error: unknown) {
      setFailure(
        `${completed ? `${completed} operaci├│n(es) completada(s). ` : ''}${error instanceof Error ? error.message : 'No se pudo completar la operaci├│n'}`
      )
      setConfirmation(null)
      setSelected([])
      await reload()
    } finally {
      setBusy(false)
    }
  }
  function exportCsv() {
    const cell = (value: string) =>
      `"${(/^[=+\-@]/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`
    const csv = [
      'Nombre,Tema,Expresi├│n,Estado',
      ...rows.map(row =>
        [row.formula.nombre, row.tema.titulo, row.formula.expresion, row.tema.status]
          .map(cell)
          .join(',')
      ),
    ].join('\r\n')
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'fisicalab-formulas.csv'
    link.click()
    URL.revokeObjectURL(url)
  }
  if (loading && !temas.length) return <Loading />
  return (
    <div className="studio-page">
      <div className="studio-context-bar">
        <span>
          <Icon name="home" />
          Inicio
          <Icon name="chevron_right" />
          {examples ? 'Ejemplos resueltos' : 'F├│rmulas'}
        </span>
        <span className="studio-chip">
          <i />
          Motor LaTeX: KaTeX
        </span>
      </div>
      <PageHeading
        title={examples ? 'Ejemplos resueltos de aplicaci├│n' : 'Gesti├│n de F├│rmulas y Ecuaciones'}
        description={
          examples
            ? 'Problemas, datos, desarrollo y resultados asociados a cada f├│rmula.'
            : 'Administra definiciones f├¡sico-matem├íticas, variables y ejemplos del cat├ílogo interactivo.'
        }
        eyebrow="M├ôDULO PEDAG├ôGICO"
      >
        <button className="studio-button" onClick={exportCsv}>
          <Icon name="file_download" />
          Exportar CSV
        </button>
        <Link
          className="studio-button primary"
          to={`/admin/formulas/nueva${topic ? `?tema=${topic}` : ''}`}
        >
          <Icon name="add" />
          Nueva f├│rmula
        </Link>
      </PageHeading>
      <div className="studio-inline-metrics">
        <span className="studio-chip">
          <Icon name="functions" />
          {all.length} {examples ? 'ejemplos' : 'f├│rmulas'} totales
        </span>
        <span className="studio-status published">
          {all.filter(row => row.tema.status === 'published').length} publicadas
        </span>
        <span className="studio-status draft">
          {all.filter(row => row.tema.status === 'draft').length} en borrador
        </span>
      </div>
      {(error || failure) && (
        <Message>
          {failure || error}
          <button className="studio-button small" onClick={() => void reload()}>
            Recargar datos
          </button>
        </Message>
      )}
      {notice && <Message success>{notice}</Message>}
      <section className="studio-metric-grid">
        {categories.slice(0, 4).map((cat, index) => (
          <article className="studio-card studio-mini-stat" key={cat.id}>
            <div>
              <small>{cat.nombre.toUpperCase()}</small>
              <strong>{all.filter(row => row.tema.categoriaId === cat.id).length} eq</strong>
              <span>
                {all.length
                  ? Math.round(
                      (all.filter(row => row.tema.categoriaId === cat.id).length / all.length) * 100
                    )
                  : 0}
                % del repositorio
              </span>
            </div>
            <span className={`studio-stat-icon tone-${index}`}>
              <Icon name={['precision_manufacturing', 'waves', 'bolt', 'flare'][index]} />
            </span>
          </article>
        ))}
      </section>
      <section className="studio-card studio-filters">
        <div className="studio-filter-row">
          <label className="studio-search-input">
            <Icon name="search" />
            <input
              type="search"
              placeholder="Buscar por nombre, s├¡mbolo o expresi├│n LaTeXΓÇª"
              aria-label="Buscar f├│rmulas"
              value={q}
              onChange={event => {
                setQ(event.target.value)
                setPage(1)
              }}
            />
          </label>
          <select
            aria-label="Filtrar ├írea"
            value={category}
            onChange={event => {
              setCategory(event.target.value)
              setPage(1)
            }}
          >
            <option value="">├ürea (Todas)</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar tema"
            value={topic}
            onChange={event => {
              setTopic(event.target.value)
              setPage(1)
            }}
          >
            <option value="">Tema (Todos)</option>
            {temas
              .filter(tema => !category || tema.categoriaId === category)
              .map(tema => (
                <option key={tema.slug} value={tema.slug}>
                  {tema.titulo}
                </option>
              ))}
          </select>
          <select
            aria-label="Filtrar estado"
            value={status}
            onChange={event => {
              setStatus(event.target.value)
              setPage(1)
            }}
          >
            <option value="">Estado (Todos)</option>
            <option value="published">Publicado</option>
            <option value="draft">Borrador</option>
          </select>
          <select
            aria-label="Filtrar nivel"
            value={level}
            onChange={event => {
              setLevel(event.target.value)
              setPage(1)
            }}
          >
            <option value="">Nivel (Todos)</option>
            <option value="basico">B├ísico</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
        </div>
        <div className="studio-filter-toolbar">
          <button className="studio-button small" onClick={clear}>
            <Icon name="restart_alt" />
            Limpiar filtros
          </button>
          <span className="studio-muted">La publicaci├│n se hereda del tema.</span>
          <div className="studio-segmented">
            <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>
              <Icon name="table_rows" />
              Tabla
            </button>
            <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}>
              <Icon name="grid_view" />
              Cuadr├¡cula
            </button>
          </div>
        </div>
      </section>
      {!!selected.length && (
        <div className="studio-bulk-bar">
          <span className="studio-gold-icon">
            <Icon name="checklist" />
          </span>
          <div>
            <strong>{selected.length} f├│rmulas seleccionadas</strong>
            <small>Publicar aplica al tema completo, incluido el resto de su contenido.</small>
          </div>
          <button
            className="studio-button"
            disabled={busy}
            onClick={() => setConfirmation({ keys: selected, publish: true })}
          >
            Publicar temas
          </button>
          <button
            className="studio-button danger"
            disabled={busy}
            onClick={() => setConfirmation({ keys: selected })}
          >
            <Icon name="delete" />
            Eliminar
          </button>
          <button className="studio-text-button" onClick={() => setSelected([])}>
            Deseleccionar
          </button>
        </div>
      )}
      {!rows.length ? (
        <Empty title="No se encontraron f├│rmulas con estos par├ímetros">
          <p>Prueba otros filtros o crea contenido para un tema existente.</p>
          <button className="studio-button" onClick={clear}>
            Restablecer filtros
          </button>
        </Empty>
      ) : view === 'table' ? (
        <section className="studio-card studio-table-card">
          <div className="studio-table-scroll">
            <table className="studio-table studio-formula-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Seleccionar todas las f├│rmulas de esta p├ígina"
                      checked={shown.length > 0 && shown.every(row => selected.includes(row.key))}
                      onChange={event =>
                        setSelected(current =>
                          event.target.checked
                            ? [...new Set([...current, ...shown.map(row => row.key)])]
                            : current.filter(key => !shown.some(row => row.key === key))
                        )
                      }
                    />
                  </th>
                  <th>F├│rmula / Identificador</th>
                  <th>├ürea y tema</th>
                  <th>Expresi├│n matem├ítica</th>
                  <th>Variables</th>
                  <th>Estado</th>
                  <th>Actualizaci├│n</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ tema, formula, key }) => (
                  <tr className={selected.includes(key) ? 'selected' : ''} key={key}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar ${formula.nombre}`}
                        checked={selected.includes(key)}
                        onChange={() => toggle(key)}
                      />
                    </td>
                    <td>
                      <Link to={`/admin/formulas/${tema.slug}/${formula.id}`}>
                        {formula.nombre}
                      </Link>
                      <code title={formula.id}>
                        /{tema.slug}/{formula.id.slice(0, 8)}
                      </code>
                    </td>
                    <td>
                      {categories.find(cat => cat.id === tema.categoriaId)?.nombre}
                      <small>Γå│ {tema.titulo}</small>
                    </td>
                    <td>
                      <div className="studio-equation-cell">
                        <MathPreview expression={formula.expresion} />
                      </div>
                    </td>
                    <td>
                      <div className="studio-variable-chips">
                        {formula.variables.map((variable, index) => (
                          <span key={index} title={`${variable.descripcion} (${variable.unidad})`}>
                            <MathPreview expression={variable.simbolo} />
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <Status status={tema.status} />
                    </td>
                    <td>{dateLabel(tema.updatedAt)}</td>
                    <td>
                      <div className="studio-row-actions">
                        <Link
                          className="studio-icon-button"
                          title={`Editar ${formula.nombre}`}
                          to={`/admin/formulas/${tema.slug}/${formula.id}`}
                        >
                          <Icon name="edit" />
                        </Link>
                        <button
                          className="studio-icon-button danger"
                          title={`Eliminar ${formula.nombre}`}
                          onClick={() => setConfirmation({ keys: [key] })}
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
          <Pagination
            page={activePage}
            pages={pages}
            total={rows.length}
            pageSize={size}
            onPage={setPage}
            onSize={value => {
              setSize(value)
              setPage(1)
            }}
          />
        </section>
      ) : (
        <>
          <section className="studio-formula-grid">
            {shown.map(({ tema, formula, key }) => (
              <article className="studio-card studio-formula-card" key={key}>
                <header>
                  <Status status={tema.status} />
                  <Link
                    className="studio-icon-button"
                    to={`/admin/formulas/${tema.slug}/${formula.id}`}
                    title="Editar f├│rmula"
                  >
                    <Icon name="edit" />
                  </Link>
                </header>
                <h2>{formula.nombre}</h2>
                <small>{tema.titulo}</small>
                <div className="studio-formula-hero">
                  <MathPreview expression={formula.expresion} display />
                </div>
                <TextPreview text={formula.descripcion} />
                {examples && formula.ejemploResuelto && (
                  <div className="studio-example">
                    <strong>Ejemplo resuelto</strong>
                    <TextPreview text={formula.ejemploResuelto.enunciado} />
                    <pre>{formula.ejemploResuelto.datos}</pre>
                    <TextPreview text={formula.ejemploResuelto.desarrollo} />
                    <strong>{formula.ejemploResuelto.resultado}</strong>
                  </div>
                )}
              </article>
            ))}
          </section>
          <Pagination
            page={activePage}
            pages={pages}
            total={rows.length}
            pageSize={size}
            onPage={setPage}
            onSize={value => {
              setSize(value)
              setPage(1)
            }}
          />
        </>
      )}
      <section className="studio-editorial-banner">
        <div>
          <span className="studio-chip gold">Consejo pedag├│gico</span>
          <h2>Notaci├│n clara, aprendizaje preciso</h2>
          <p>
            Declara s├¡mbolos, unidades y un ejemplo resuelto. Usa <code>{'\\vec{F}'}</code> para
            magnitudes vectoriales.
          </p>
        </div>
        <div className="studio-chalkboard" aria-hidden="true">
          <span>F = ma</span>
          <span>Γêæ F = 0</span>
          <span>v = ╬öx / ╬öt</span>
        </div>
      </section>
      {confirmation && (
        <Confirm
          title={confirmation.publish ? 'Publicar temas relacionados' : 'Eliminar f├│rmulas'}
          busy={busy}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => void act()}
        >
          <p>
            {confirmation.publish
              ? 'Se publicar├ín completos los temas asociados a las f├│rmulas seleccionadas.'
              : 'Se eliminar├ín las f├│rmulas seleccionadas. El contenido anterior queda disponible en las revisiones de cada tema.'}
          </p>
        </Confirm>
      )}
    </div>
  )
}
