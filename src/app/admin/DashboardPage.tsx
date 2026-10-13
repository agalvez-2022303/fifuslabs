import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { adminApi } from './api'
import type { DashboardSummary, Statistic } from './types'

const statisticCards: {
  key: keyof DashboardSummary['stats']
  title: string
  unit: string
  icon: string
  tone: string
}[] = [
  { key: 'areas', title: 'Áreas STEM', unit: 'áreas', icon: '⌘', tone: 'blue' },
  { key: 'temas', title: 'Temas didácticos', unit: 'temas', icon: '▤', tone: 'gold' },
  { key: 'teoria', title: 'Artículos teóricos', unit: 'artículos', icon: '▧', tone: 'blue' },
  { key: 'formulas', title: 'Ecuaciones / leyes', unit: 'fórmulas', icon: 'Σ', tone: 'gold' },
  { key: 'glosario', title: 'Términos A–Z', unit: 'conceptos', icon: 'Aₓ', tone: 'blue' },
  { key: 'ejercicios', title: 'Banco de problemas', unit: 'ejercicios', icon: '♧', tone: 'gold' },
]

const contentKinds = [
  { key: 'total_teoria', label: 'Teoría' },
  { key: 'total_formulas', label: 'Fórmulas' },
  { key: 'total_glosario', label: 'Glosario' },
  { key: 'total_ejercicios', label: 'Ejercicios' },
] as const

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function StatCard({ item, data }: { item: (typeof statisticCards)[number]; data: Statistic }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon stat-icon-${item.tone}`} aria-hidden="true">{item.icon}</div>
      <div className="stat-tag">{data.drafts === null ? 'Catálogo' : 'Contenido'}</div>
      <p className="stat-title">{item.title}</p>
      <strong className="stat-total">{data.total.toLocaleString('es-MX')}</strong>
      <span className="stat-unit">{item.unit}</span>
      <div className="stat-footer">
        {data.drafts === null
          ? <span>Sin estado de publicación</span>
          : <><span>{data.drafts} en borrador</span><span className="stat-footer-total">{data.total} total</span></>}
      </div>
    </article>
  )
}

function PanelEmpty({ children }: { children: string }) {
  return <p className="panel-empty">{children}</p>
}

function LoadingDashboard() {
  return (
    <div className="dashboard-skeleton" aria-label="Cargando resumen">
      <div className="skeleton-heading" />
      <div className="skeleton-stat-grid">
        {statisticCards.map(item => <div className="skeleton-card" key={item.key} />)}
      </div>
      <div className="skeleton-panels">
        <div className="skeleton-panel" />
        <div className="skeleton-panel" />
      </div>
    </div>
  )
}

function DonutChart({ data }: { data: DashboardSummary['contentStatus'] }) {
  const entries = [
    { label: 'Publicado', value: data.publicado, color: '#16845b' },
    { label: 'Borrador', value: data.borrador, color: '#d4a91e' },
    { label: 'Archivado', value: data.archivado, color: '#a6b1be' },
  ]
  const total = entries.reduce((sum, entry) => sum + entry.value, 0)
  const circumference = 2 * Math.PI * 47
  let offset = 0

  return (
    <div className="donut-chart-wrap">
      <svg viewBox="0 0 120 120" className="donut-chart" role="img" aria-label={`Estado del contenido, ${total} elementos`}>
        <circle cx="60" cy="60" r="47" className="donut-track" />
        {total > 0 ? entries.map(entry => {
          const segment = (entry.value / total) * circumference
          const circle = (
            <circle
              key={entry.label}
              cx="60"
              cy="60"
              r="47"
              fill="none"
              stroke={entry.color}
              strokeWidth="13"
              strokeDasharray={`${segment} ${circumference - segment}`}
              strokeDashoffset={-offset}
              className="donut-segment"
            />
          )
          offset += segment
          return circle
        }) : null}
        <text x="60" y="57" className="donut-total">{total}</text>
        <text x="60" y="72" className="donut-label">elementos</text>
      </svg>
      <div className="donut-legend">
        {entries.map(entry => (
          <div key={entry.label}>
            <span className="legend-name"><i style={{ backgroundColor: entry.color }} />{entry.label}</span>
            <strong>{entry.value}</strong>
          </div>
        ))}
        {total === 0 && <p className="donut-empty">Aún no hay contenido registrado.</p>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadSummary = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setSummary(await adminApi.getDashboardSummary())
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No fue posible cargar el resumen.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  if (loading && !summary) return <LoadingDashboard />
  if (error && !summary) {
    return (
      <section className="dashboard-error" role="alert">
        <span aria-hidden="true">!</span>
        <h1>No se pudo cargar el dashboard</h1>
        <p>{error}</p>
        <button className="admin-primary-button" onClick={() => void loadSummary()}>Reintentar</button>
      </section>
    )
  }
  if (!summary) return <PanelEmpty>No hay datos disponibles.</PanelEmpty>

  const maxTopicCount = Math.max(
    0,
    ...summary.topics.map(topic =>
      topic.total_teoria + topic.total_formulas + topic.total_glosario + topic.total_ejercicios
    )
  )

  return (
    <>
      <div className="dashboard-heading">
        <div>
          <p className="section-eyebrow"><span /> PANEL DE CONTROL PEDAGÓGICO</p>
          <h1>Bienvenido, {user?.nombre ?? 'Administrador'}</h1>
          <p className="dashboard-date">◷ &nbsp;{new Intl.DateTimeFormat('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          }).format(new Date())} <span>·</span> Ciclo lectivo activo</p>
        </div>
      </div>

      {error && (
        <div className="inline-error" role="alert">
          <span>{error}</span>
          <button onClick={() => void loadSummary()}>Reintentar</button>
        </div>
      )}

      <section className="stat-grid" aria-label="Estadísticas de contenido">
        {statisticCards.map(item => (
          <StatCard key={item.key} item={item} data={summary.stats[item.key]} />
        ))}
      </section>

      <section className="dashboard-panels">
        <article className="dashboard-panel topic-panel">
          <div className="panel-heading">
            <div><p className="section-eyebrow">DESGLOSE</p><h2>Contenido por tema</h2></div>
            <span className="panel-count">{summary.topics.length} temas</span>
          </div>
          {summary.topics.length ? (
            <div className="topic-chart">
              {summary.topics.slice(0, 8).map(topic => {
                const total = topic.total_teoria + topic.total_formulas + topic.total_glosario + topic.total_ejercicios
                return (
                  <div className="topic-bar-row" key={topic.id_tema}>
                    <span className="topic-bar-label" title={`${topic.titulo} · ${topic.area}`}>{topic.titulo}</span>
                    <div className="topic-bar-track">
                      <span style={{ width: `${maxTopicCount ? Math.max(3, total / maxTopicCount * 100) : 0}%` }} />
                    </div>
                    <strong>{total}</strong>
                  </div>
                )
              })}
              <div className="topic-chart-legend">
                {contentKinds.map(kind => <span key={kind.key}><i />{kind.label}</span>)}
              </div>
            </div>
          ) : <PanelEmpty>Aún no hay temas en la base de datos.</PanelEmpty>}
        </article>

        <article className="dashboard-panel status-panel">
          <div className="panel-heading">
            <div><p className="section-eyebrow">PUBLICACIÓN</p><h2>Estado del contenido</h2></div>
          </div>
          <DonutChart data={summary.contentStatus} />
        </article>
      </section>

      <section className="dashboard-panels lower-panels">
        <article className="dashboard-panel changes-panel">
          <div className="panel-heading">
            <div><p className="section-eyebrow">ACTIVIDAD</p><h2>Últimos cambios</h2></div>
            <span className="panel-count">Últimos 8</span>
          </div>
          {summary.latestChanges.length ? (
            <div className="table-scroll">
              <table className="changes-table">
                <thead><tr><th>Contenido</th><th>Tema</th><th>Estado</th><th>Actualizado</th></tr></thead>
                <tbody>
                  {summary.latestChanges.map((change, index) => (
                    <tr key={`${change.tipo}-${change.titulo}-${index}`}>
                      <td><span className="change-type">{change.tipo}</span><strong>{change.titulo}</strong></td>
                      <td>{change.tema}</td>
                      <td><span className={`status-pill status-${change.estado}`}>{change.estado}</span></td>
                      <td>{formatDate(change.fecha_actualizacion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <PanelEmpty>Aún no hay cambios registrados.</PanelEmpty>}
        </article>

        <article className="dashboard-panel pending-panel">
          <div className="panel-heading">
            <div><p className="section-eyebrow">POR COMPLETAR</p><h2>Pendientes</h2></div>
            <span className="pending-total">{summary.pendings.draftContentCount} borradores</span>
          </div>
          <p className="pending-description">Temas sin fórmulas, glosario o ejercicios asociados.</p>
          {summary.pendings.topics.length ? (
            <ul className="pending-list">
              {summary.pendings.topics.slice(0, 8).map(topic => {
                const missing = [
                  topic.sin_formulas && 'fórmulas',
                  topic.sin_glosario && 'glosario',
                  topic.sin_ejercicios && 'ejercicios',
                ].filter((label): label is string => Boolean(label))
                return <li key={topic.id_tema}>
                  <span><strong>{topic.titulo}</strong><small>{topic.area}</small></span>
                  <span className="missing-badges">{missing.map(label => <i key={label}>{label}</i>)}</span>
                </li>
              })}
            </ul>
          ) : <PanelEmpty>Todos los temas tienen sus recursos asociados.</PanelEmpty>}
          {!summary.pendings.draftContentCount && <p className="no-drafts-note">No hay contenido en borrador.</p>}
        </article>
      </section>
    </>
  )
}
