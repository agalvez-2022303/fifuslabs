import { Link, useLocation, useNavigate } from 'react-router-dom'
import styles from './BottomNav.module.css'

interface Props {
  onOpenMenu?: () => void
}

export default function BottomNav({ onOpenMenu }: Props): JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const path = location.pathname

  const isSearch = location.search.includes('buscar=1')
  const isHome = path === '/' && !isSearch
  const isSims = path.startsWith('/tema')

  const handleSearchClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (path === '/') {
      const searchInput = document.getElementById('search-simulations') as HTMLInputElement | null
      if (searchInput) {
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
        searchInput.focus()
      }
    } else {
      navigate('/?buscar=1')
    }
  }

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

      <button
        type="button"
        className={`${styles.navItem} ${isSearch ? styles.navItemActive : ''}`}
        onClick={handleSearchClick}
        aria-label="Buscar simulaciones y conceptos"
      >
        <div className={styles.navIconBox}>
          <span className={`material-symbols-outlined ${styles.navIcon}`}>search</span>
        </div>
        <span>Buscar</span>
      </button>

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
