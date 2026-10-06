import { Link } from 'react-router-dom'
import type { SimulationEntry } from '../registry/simulations.registry'
import styles from './SimulationCard.module.css'

/** Devuelve true si el string parece un nombre de Material Symbol (ej. "compare_arrows") */
function isMaterialIcon(icon: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(icon)
}

interface Props {
  simulation: SimulationEntry
  index?: number
}

const FORMULA_PREVIEWS: Record<string, string> = {
  'vectores': 'V = (Vx, Vy) = (r, θ)',
  'movimiento-aceleracion-constante': 'x(t) = x₀ + v₀t + ½at²',
  'tres-fuerzas-equilibrio': 'ΣF = F₁ + F₂ + F₃ = 0',
  'suma-vectores': 'R⃗ = A⃗ + B⃗ = √(Rx² + Ry²)',
  'distancia-desplazamiento': 'd = Σ|Δs|  vs  Δr⃗ = r⃗_f - r⃗_i',
  'velocidad-rapidez': 'v_med = Δr⃗/Δt  vs  r = d/Δt',
  'alcances-encuentros': 'x₁(t) = x₂(t) ⇒ t_encuentro',
}

export default function SimulationCard({ simulation, index = 0 }: Props) {
  const isActive = simulation.estado === 'active'
  const formula = FORMULA_PREVIEWS[simulation.slug]

  const cardContent = (
    <article
      className={`${styles.card} ${isActive ? styles.active : styles.comingSoon}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Header card: Icon + Badges */}
      <div className={styles.cardHeader}>
        <div className={styles.iconBox}>
          {isMaterialIcon(simulation.icono) ? (
            <span className={`material-symbols-outlined ${styles.icon}`}>
              {simulation.icono}
            </span>
          ) : (
            <span className={styles.icon}>{simulation.icono}</span>
          )}
        </div>
        <div className={styles.badgeRow}>
          <span className={`badge badge--${simulation.dificultad}`}>
            {simulation.dificultad.toUpperCase()}
          </span>
          {isActive ? (
            <span className={styles.activePill}>
              <span className={styles.dot} />
              DISPONIBLE
            </span>
          ) : (
            <span className={styles.comingSoonPill}>PRÓXIMAMENTE</span>
          )}
        </div>
      </div>

      {/* Title & Description */}
      <div className={styles.cardBody}>
        <h3 className={styles.title}>{simulation.titulo}</h3>
        <p className={styles.desc}>{simulation.descripcionCorta}</p>

        {/* Formula preview */}
        {formula && (
          <div className={styles.formulaBox}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--corporate)' }}>
              calculate
            </span>
            <code className={styles.formulaCode}>{formula}</code>
          </div>
        )}

        {/* Tags */}
        <div className={styles.tags}>
          {simulation.etiquetas.slice(0, 3).map(tag => (
            <span key={tag} className={styles.tag}>
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Footer / Action */}
      <div className={styles.cardFooter}>
        <span className={styles.actionText}>
          {isActive ? 'Abrir Simulación' : 'En Desarrollo'}
        </span>
        <span className={`material-symbols-outlined ${styles.actionArrow}`}>
          arrow_forward
        </span>
      </div>
    </article>
  )

  if (!isActive) return cardContent

  return (
    <Link to={simulation.path} className={styles.link}>
      {cardContent}
    </Link>
  )
}
