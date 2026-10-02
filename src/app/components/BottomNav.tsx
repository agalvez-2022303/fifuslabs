import { Link, useLocation } from 'react-router-dom'
import styles from './BottomNav.module.css'

interface Props {
  onOpenMenu?: () => void
}

export default function BottomNav({ onOpenMenu }: Props): JSX.Element {
  const location = useLocation()
  const path = location.pathname

  const isHome = path === '/'
  const isAlcances = path.includes('alcances')
  const isSims = path.startsWith('/tema') && !isAlcances

  return (
    <nav className={styles.bottomNav} aria-label="Navegación inferior móvil">
      <Link
        to="/"
        className={`${styles.navItem} ${isHome ? styles.navItemActive : ''}`}
        aria-label="Ir al inicio del laboratorio"
      >
        <div className={styles.navIconBox}>
          <span className={`material-symbols-outlined ${styles.navIcon}`}>dashboard</span>
        </div>
        <span>Inicio</span>
      </Link>

      <Link
        to="/tema/alcances-mru"
        className={`${styles.navItem} ${isAlcances ? styles.navItemActive : ''}`}
        aria-label="Abrir módulo Alcances y Encuentros MRU"
      >
        <div className={styles.navIconBox}>
          <span className={`material-symbols-outlined ${styles.navIcon}`}>compare_arrows</span>
        </div>
        <span>MRU</span>
      </Link>

      <button
        type="button"
        className={`${styles.navItem} ${isSims ? styles.navItemActive : ''}`}
        onClick={onOpenMenu}
        aria-label="Ver catálogo y temas"
      >
        <div className={styles.navIconBox}>
          <span className={`material-symbols-outlined ${styles.navIcon}`}>apps</span>
        </div>
        <span>Temas</span>
      </button>
    </nav>
  )
}
