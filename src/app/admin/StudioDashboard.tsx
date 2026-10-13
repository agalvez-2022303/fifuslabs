import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useContent } from './ContentContext'
import { Empty, Icon, Loading, Message, PageHeading, Status, dateLabel } from './ui'

export default function StudioDashboard() {
  const { user } = useAuth()
  const { temas, categories, loading, error, reload } = useContent()
  const [query, setQuery] = useState('')
  const summary = useMemo(() => {
    const theory = temas.reduce((sum, tema) => sum + 1 + tema.teoria.secciones.length, 0)
    const formulas = temas.reduce((sum, tema) => sum + tema.formulas.length, 0)
    const glossary = temas.reduce((sum, tema) => sum + tema.glosario.length, 0)
    const examples = temas.reduce(
      (sum, tema) => sum + tema.formulas.filter(item => item.ejemploResuelto).length,
      0
    )
    const resources = temas.map(tema => ({
      tema,
      total:
        1 +
        tema.teoria.secciones.length +
        tema.formulas.length +
        tema.glosario.length +
        tema.formulas.filter(item => item.ejemploResuelto).length,
    }))
    const published = resources
      .filter(item => item.tema.status === 'published')
      .reduce((sum, item) => sum + item.total, 0)
    const drafts = resources
      .filter(item => item.tema.status === 'draft')
      .reduce((sum, item) => sum + item.total, 0)
    const incomplete = temas.filter(
      tema => !tema.formulas.length || !tema.glosario.length || !tema.teoria.secciones.length
    )
    return { theory, formulas, glossary, examples, resources, published, drafts, incomplete }
  }, [temas])
  if (loading && !temas.length) return <Loading text="Cargando el plan de contenido…" />
  if (error && !temas.length)
    return (
      <Message>
        {error}
        <button className="studio-button" onClick={() => void reload()}>
          Reintentar
        </button>
      </Message>
    )
  const cards = [
    {
      name: 'Áreas STEM',
      total: categories.length,
      icon: 'category',
      note: 'Catálogo de conocimiento',
    },
    {
      name: 'Temas didácticos',
      total: temas.length,
      icon: 'folder_open',
      note: `${temas.filter(tema => tema.status === 'draft').length} en borrador`,
    },
    {
      name: 'Artículos teóricos',
      total: summary.theory,
      icon: 'menu_book',
      note: 'Introducciones y secciones',
    },
    {
      name: 'Ecuaciones / leyes',
      total: summary.formulas,
      icon: 'functions',
      note: 'Con variables del SI',
    },
    {
      name: 'Términos A–Z',
      total: summary.glossary,
      icon: 'spellcheck',
      note: 'Conceptos del glosario',
    },
    {
      name: 'Ejemplos resueltos',
      total: summary.examples,
      icon: 'edit_note',
      note: 'Problemas de aplicación',
    },
  ]
  const total = summary.published + summary.drafts
  const percent = total ? Math.round((summary.published / total) * 100) : 0
  const max = Math.max(1, ...summary.resources.map(item => item.total))
  const recent = [...temas]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .filter(tema => `${tema.titulo} ${tema.slug}`.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8)
  return (
    <div className="studio-page">
      <PageHeading
        title={`Bienvenido, ${user?.name || user?.email?.split('@')[0] || 'Maestro'}`}
        eyebrow="PANEL DE CONTROL PEDAGÓGICO"
        description={new Intl.DateTimeFormat('es-GT', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(new Date())}
      >
        <button className="studio-button" onClick={() => void reload()} disabled={loading}>
          <Icon name="refresh" />
          Actualizar
        </button>
        <Link className="studio-button primary" to="/admin/temas/nuevo">
          <Icon name="add_circle" />
          Nuevo tema
        </Link>
      </PageHeading>
      {error && <Message>{error}</Message>}
      <section className="studio-stat-grid" aria-label="Estadísticas de contenido">
        {cards.map((card, index) => (
          <article className="studio-card studio-stat" key={card.name}>
            <div className={`studio-stat-icon tone-${index % 4}`}>
              <Icon name={card.icon} />
            </div>
            <small>{card.name}</small>
            <strong>{card.total.toLocaleString('es-GT')}</strong>
            <footer>{card.note}</footer>
          </article>
        ))}
      </section>
      <section className="studio-card studio-quick-actions">
        <div>
          <span className="studio-gold-icon">
            <Icon name="bolt" />
          </span>
          <span>
            <h2>Acciones rápidas</h2>
            <small>Generación ágil de recursos pedagógicos</small>
          </span>
        </div>
        <Link to="/admin/teoria">
          <Icon name="edit_note" />
          Nueva teoría
        </Link>
        <Link to="/admin/formulas/nueva">
          <Icon name="calculate" />
          Nueva fórmula
        </Link>
        <Link to="/admin/glosario">
          <Icon name="menu_book" />
          Nuevo término
        </Link>
        <Link to="/admin/usuarios">
          <Icon name="group_add" />
          Gestionar usuarios
        </Link>
      </section>
      <section className="studio-dashboard-panels">
        <article className="studio-card">
          <header className="studio-panel-heading">
            <div>
              <h2>
                <Icon name="bar_chart" />
                Contenido por tema principal
              </h2>
              <p>Teoría, fórmulas, glosario y ejemplos del repositorio</p>
            </div>
            <span className="studio-count">Total: {total}</span>
          </header>
          <div className="studio-chart-legend">
            <span>
              <i className="theory" />
              Teoría
            </span>
            <span>
              <i className="formula" />
              Fórmulas
            </span>
            <span>
              <i className="glossary" />
              Glosario
            </span>
            <span>
              <i className="example" />
              Ejemplos
            </span>
          </div>
          <div
            className="studio-bar-chart"
            role="img"
            aria-label="Distribución de contenido por tema"
          >
            {summary.resources.slice(0, 8).map(({ tema, total }) => (
              <div className="studio-chart-group" key={tema.slug}>
                <div className="studio-chart-bars">
                  <span
                    className="theory"
                    style={{ height: `${((1 + tema.teoria.secciones.length) / max) * 100}%` }}
                    title={`${1 + tema.teoria.secciones.length} artículos`}
                  />
                  <span
                    className="formula"
                    style={{ height: `${(tema.formulas.length / max) * 100}%` }}
                    title={`${tema.formulas.length} fórmulas`}
                  />
                  <span
                    className="glossary"
                    style={{ height: `${(tema.glosario.length / max) * 100}%` }}
                    title={`${tema.glosario.length} términos`}
                  />
                  <span
                    className="example"
                    style={{
                      height: `${(tema.formulas.filter(item => item.ejemploResuelto).length / max) * 100}%`,
                    }}
                    title="Ejemplos"
                  />
                </div>
                <small title={tema.titulo}>{tema.slug}</small>
                <strong>{total}</strong>
              </div>
            ))}
          </div>
          <Link className="studio-panel-link" to="/admin/temas">
            Ver desglose completo
            <Icon name="arrow_forward" />
          </Link>
        </article>
        <article className="studio-card">
          <header className="studio-panel-heading">
            <div>
              <h2>
                <Icon name="pie_chart" />
                Estado del contenido
              </h2>
              <p>Publicación editorial por tema completo</p>
            </div>
          </header>
          <div className="studio-donut-wrap">
            <div
              className="studio-donut"
              style={{
                background: total
                  ? `conic-gradient(#10b981 0 ${percent}%, #fdcf3f ${percent}% 100%)`
                  : 'var(--s-soft)',
              }}
            >
              <div>
                <strong>{total}</strong>
                <small>RECURSOS</small>
              </div>
            </div>
          </div>
          <div className="studio-status-summary">
            <div>
              <Status status="published" />
              <strong>{summary.published} elem.</strong>
              <span>{percent}%</span>
            </div>
            <div>
              <Status status="draft" />
              <strong>{summary.drafts} elem.</strong>
              <span>{total ? 100 - percent : 0}%</span>
            </div>
          </div>
        </article>
      </section>
      <section className="studio-dashboard-panels lower">
        <article className="studio-card studio-table-card">
          <header className="studio-panel-heading">
            <div>
              <h2>
                <Icon name="history_edu" />
                Últimos cambios
              </h2>
              <p>Versión guardada más reciente de cada tema</p>
            </div>
            <label className="studio-search-input">
              <Icon name="search" />
              <input
                type="search"
                aria-label="Filtrar cambios"
                placeholder="Filtrar cambios…"
                value={query}
                onChange={event => setQuery(event.target.value)}
              />
            </label>
          </header>
          <div className="studio-table-scroll">
            <table className="studio-table">
              <thead>
                <tr>
                  <th>Contenido y slug</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Actualización</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(tema => (
                  <tr key={tema.slug}>
                    <td>
                      <Link to={`/admin/temas/${tema.slug}`}>{tema.titulo}</Link>
                      <code>/{tema.slug}</code>
                    </td>
                    <td>
                      <span className="studio-chip">Tema</span>
                    </td>
                    <td>
                      <Status status={tema.status} />
                    </td>
                    <td>{dateLabel(tema.updatedAt)}</td>
                    <td>
                      <Link
                        className="studio-icon-button"
                        to={`/admin/temas/${tema.slug}/revisiones`}
                        title="Ver revisiones"
                      >
                        <Icon name="history" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!recent.length && <Empty title="No hay cambios que mostrar" />}
        </article>
        <article className="studio-card">
          <header className="studio-panel-heading">
            <div>
              <h2>
                <Icon name="pending_actions" />
                Auditoría y pendientes
              </h2>
              <p>Recursos que faltan en los temas actuales</p>
            </div>
            <span className="studio-count">{summary.incomplete.length} temas</span>
          </header>
          <div className="studio-pending-list">
            {summary.incomplete.slice(0, 8).map(tema => (
              <div key={tema.slug}>
                <strong>{tema.titulo}</strong>
                <span>
                  {[
                    !tema.teoria.secciones.length && 'Sin secciones',
                    !tema.formulas.length && 'Sin fórmulas',
                    !tema.glosario.length && 'Sin glosario',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                <Link className="studio-button primary small" to={`/admin/temas/${tema.slug}`}>
                  Completar
                  <Icon name="arrow_forward" />
                </Link>
              </div>
            ))}
          </div>
          {!summary.incomplete.length && (
            <Empty title="Contenido completo">
              <p>Todos los temas tienen secciones, fórmulas y glosario.</p>
            </Empty>
          )}
          <div className="studio-integrity">
            <span>
              Integridad de los temas
              <strong>
                {temas.length
                  ? Math.round(((temas.length - summary.incomplete.length) / temas.length) * 100)
                  : 0}
                %
              </strong>
            </span>
            <progress
              max={Math.max(1, temas.length)}
              value={temas.length - summary.incomplete.length}
            />
          </div>
        </article>
      </section>
    </div>
  )
}
