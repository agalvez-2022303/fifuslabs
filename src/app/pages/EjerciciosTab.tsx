import { useState } from 'react'
import type { Ejercicio } from '@physicslab/shared-types'
import styles from './EjerciciosTab.module.css'

// ─── Difficulty Badge ────────────────────────────────────────────────────────

const DIFF_LABELS: Record<Ejercicio['dificultad'], { label: string; cls: string }> = {
  basico: { label: 'Básico', cls: styles.diffBasico },
  intermedio: { label: 'Intermedio', cls: styles.diffIntermedio },
  avanzado: { label: 'Avanzado', cls: styles.diffAvanzado },
}

// ─── Single Exercise Card ────────────────────────────────────────────────────

interface EjercicioCardProps {
  ejercicio: Ejercicio
  /** Called when the student clicks «Cargar en simulador» */
  onLoad?: (parametros: Record<string, unknown>) => void
  hasSimulator: boolean
}

function EjercicioCard({ ejercicio, onLoad, hasSimulator }: EjercicioCardProps) {
  const [showRespuesta, setShowRespuesta] = useState(false)
  const [showSolucion, setShowSolucion] = useState(false)
  const diff = DIFF_LABELS[ejercicio.dificultad]

  const params = ejercicio.parametros as Record<string, unknown> | null | undefined
  const hasParams = params && Object.keys(params).length > 0

  return (
    <article className={styles.card}>
      {/* Header */}
      <header className={styles.cardHeader}>
        <span className={`${styles.diffBadge} ${diff.cls}`}>{diff.label}</span>
        <h3 className={styles.cardTitle}>{ejercicio.titulo}</h3>
      </header>

      {/* Statement */}
      <p className={styles.enunciado}>{ejercicio.enunciado}</p>

      {/* Hint (pistas) */}
      {ejercicio.pistas && (
        <div className={styles.pistaBox}>
          <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--gold)' }}>
            lightbulb
          </span>
          <span>{ejercicio.pistas}</span>
        </div>
      )}

      {/* Simulator load button */}
      {hasSimulator && hasParams && onLoad && (
        <button
          type="button"
          className={styles.loadBtn}
          onClick={() => onLoad(params!)}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            play_circle
          </span>
          Cargar en simulador
        </button>
      )}

      {/* Reveal toggles */}
      <div className={styles.reveals}>
        <button
          type="button"
          className={styles.revealBtn}
          onClick={() => setShowRespuesta(v => !v)}
          aria-expanded={showRespuesta}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
            {showRespuesta ? 'visibility_off' : 'visibility'}
          </span>
          {showRespuesta ? 'Ocultar respuesta' : 'Ver respuesta'}
        </button>

        {ejercicio.solucionDetallada && (
          <button
            type="button"
            className={styles.revealBtn}
            onClick={() => setShowSolucion(v => !v)}
            aria-expanded={showSolucion}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
              {showSolucion ? 'unfold_less' : 'unfold_more'}
            </span>
            {showSolucion ? 'Ocultar desarrollo' : 'Ver desarrollo'}
          </button>
        )}
      </div>

      {/* Collapsible answer */}
      {showRespuesta && (
        <div className={styles.respuestaBox}>
          <span className={styles.respuestaLabel}>Respuesta esperada</span>
          <code className={styles.respuestaCode}>{ejercicio.respuesta}</code>
        </div>
      )}

      {/* Collapsible step-by-step solution */}
      {showSolucion && ejercicio.solucionDetallada && (
        <div className={styles.solucionBox}>
          <span className={styles.solucionLabel}>Desarrollo paso a paso</span>
          <p className={styles.solucionText}>{ejercicio.solucionDetallada}</p>
        </div>
      )}
    </article>
  )
}

// ─── Tab Panel ───────────────────────────────────────────────────────────────

export type EjercicioLoadHandler = (parametros: Record<string, unknown>) => void

interface EjerciciosTabProps {
  ejercicios: Ejercicio[]
  loading: boolean
  hasSimulator: boolean
  onLoad: EjercicioLoadHandler
}

export default function EjerciciosTab({
  ejercicios,
  loading,
  hasSimulator,
  onLoad,
}: EjerciciosTabProps) {
  const [filter, setFilter] = useState<'todos' | Ejercicio['dificultad']>('todos')

  const visible =
    filter === 'todos' ? ejercicios : ejercicios.filter(e => e.dificultad === filter)

  if (loading) {
    return (
      <div className={styles.emptyState}>
        <div className="spinner" />
        <p>Cargando ejercicios…</p>
      </div>
    )
  }

  if (ejercicios.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 40, color: 'var(--text-muted)' }}
        >
          quiz
        </span>
        <p>Aún no hay ejercicios publicados para este tema.</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.toolbarLabel}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>quiz</span>
          {ejercicios.length} ejercicio{ejercicios.length !== 1 ? 's' : ''}
        </span>
        <div className={styles.filterGroup} role="group" aria-label="Filtrar por dificultad">
          {(['todos', 'basico', 'intermedio', 'avanzado'] as const).map(level => (
            <button
              key={level}
              type="button"
              className={`${styles.filterBtn} ${filter === level ? styles.filterBtnActive : ''}`}
              onClick={() => setFilter(level)}
            >
              {level === 'todos' ? 'Todos' : DIFF_LABELS[level].label}
            </button>
          ))}
        </div>
      </div>

      {/* Simulator hint banner */}
      {hasSimulator && (
        <div className={styles.simHint}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--corporate)' }}>
            info
          </span>
          <span>
            Haz clic en <strong>«Cargar en simulador»</strong> para preconfigurar
            automáticamente los parámetros del ejercicio en la pestaña Simulador.
          </span>
        </div>
      )}

      {/* Cards grid */}
      {visible.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No hay ejercicios con ese nivel de dificultad.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {visible.map(ejercicio => (
            <EjercicioCard
              key={ejercicio.id}
              ejercicio={ejercicio}
              hasSimulator={hasSimulator}
              onLoad={onLoad}
            />
          ))}
        </div>
      )}
    </div>
  )
}

