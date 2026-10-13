import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { TemaConfig, TemaRevision } from '@physicslab/shared-types'
import { adminApi, ApiError } from './api'
import { useContent } from './ContentContext'
import { Confirm, Empty, Icon, Loading, Message, PageHeading, Status, dateLabel } from './ui'
import { TextPreview } from './MathPreview'

export default function RevisionPage() {
  const { slug = '' } = useParams()
  const { update } = useContent()
  const [history, setHistory] = useState<TemaRevision[]>([]),
    [tema, setTema] = useState<TemaConfig | null>(null)
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<TemaRevision | null>(null),
    [confirm, setConfirm] = useState<TemaRevision | null>(null),
    [reload, setReload] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    void Promise.all([
      adminApi.revisions(slug),
      adminApi.getTema(slug).catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
      }),
    ])
      .then(([revisions, current]) => {
        if (active) {
          setHistory(revisions)
          setTema(current)
        }
      })
      .catch((error: unknown) => {
        if (active)
          setError(error instanceof Error ? error.message : 'No se pudo cargar el historial')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [slug, reload])
  async function restore() {
    if (!confirm) return
    const version = tema?.version ?? history.at(-1)?.snapshot.version
    if (!version) return
    setBusy(true)
    setError('')
    try {
      const saved = await adminApi.restore(slug, confirm.id, version)
      update(saved)
      setTema(saved)
      setHistory(await adminApi.revisions(slug))
      setNotice('Revisión restaurada como una nueva versión del tema.')
      setConfirm(null)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'No se pudo restaurar')
      setConfirm(null)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="studio-page">
      <PageHeading
        title="Historial y revisiones"
        description={`Snapshots completos de /${slug}. Se conservan las últimas 50 revisiones.`}
      >
        <Link className="studio-button" to="/admin/temas">
          Volver al catálogo
        </Link>
        <button className="studio-button" onClick={() => setReload(value => value + 1)}>
          <Icon name="refresh" />
          Actualizar
        </button>
      </PageHeading>
      {error && <Message>{error}</Message>}
      {notice && <Message success>{notice}</Message>}
      {loading ? (
        <Loading />
      ) : (
        <>
          {!tema && history.length > 0 && (
            <Message>
              El tema está retirado. Restaurar una revisión recuperará su contenido y estado de
              publicación.
            </Message>
          )}
          <section className="studio-card studio-table-card">
            <div className="studio-table-scroll">
              <table className="studio-table">
                <thead>
                  <tr>
                    <th>Versión</th>
                    <th>Fecha</th>
                    <th>Editor</th>
                    <th>Operación</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map(revision => (
                    <tr key={revision.id}>
                      <td>v{revision.snapshot.version}</td>
                      <td>
                        {dateLabel(revision.fecha)}
                        <small>{new Date(revision.fecha).toLocaleTimeString('es-GT')}</small>
                      </td>
                      <td>
                        <code>{revision.editor}</code>
                      </td>
                      <td>{revision.operation}</td>
                      <td>
                        <Status status={revision.snapshot.status} />
                      </td>
                      <td>
                        <div className="studio-row-actions">
                          <button
                            className="studio-button small"
                            onClick={() => setSelected(revision)}
                          >
                            Ver snapshot
                          </button>
                          <button
                            className="studio-button primary small"
                            disabled={busy}
                            onClick={() => setConfirm(revision)}
                          >
                            <Icon name="restore" />
                            Restaurar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!history.length && <Empty title="Este tema aún no tiene revisiones" />}
          </section>
          {selected && (
            <article className="studio-card studio-snapshot">
              <header>
                <h2>
                  Snapshot v{selected.snapshot.version}: {selected.snapshot.titulo}
                </h2>
                <button
                  className="studio-icon-button"
                  aria-label="Cerrar snapshot"
                  onClick={() => setSelected(null)}
                >
                  <Icon name="close" />
                </button>
              </header>
              <TextPreview text={selected.snapshot.teoria.introduccion} />
              <details>
                <summary>Ver documento completo (JSON)</summary>
                <pre>{JSON.stringify(selected.snapshot, null, 2)}</pre>
              </details>
            </article>
          )}
        </>
      )}
      {confirm && (
        <Confirm
          title="Restaurar snapshot completo"
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => void restore()}
        >
          <p>
            Se recuperarán los metadatos, teoría, fórmulas, glosario y estado de la versión{' '}
            {confirm.snapshot.version}. La restauración crea una nueva revisión.
          </p>
        </Confirm>
      )}
    </div>
  )
}
