import { Link, useLocation } from 'react-router-dom'
import styles from './Header.module.css'

export default function Header() {
  const location = useLocation()
  const currentPath = location.pathname

  const navLinks = [
    { label: 'Dashboard', path: '/' },
    { label: 'Vectores', path: '/sim/vectores' },
    { label: 'Suma de Vectores', path: '/sim/suma-vectores' },
    { label: 'Distancia vs Desplazamiento', path: '/sim/distancia-desplazamiento' },
    { label: 'Velocidad vs Rapidez', path: '/sim/velocidad-rapidez' },
    { label: 'Alcances y Encuentros MRU', path: '/sim/alcances-encuentros' },
    { label: 'MRU / MRUV', path: '/sim/movimiento-aceleracion-constante' },
  ]

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* Brand & Version */}
        <div className={styles.brandGroup}>
          <Link to="/" className={styles.logo}>
            <div className={styles.logoIconBox}>
              <span className="material-symbols-outlined">science</span>
            </div>
            <div className={styles.logoTextContainer}>
              <span className={styles.logoTitle}>FísicaLab</span>
              <div className={styles.logoBadge}>
                <span className={styles.engineTag}>v2.4 Engine</span>
                <span className={styles.statusDot} />
              </div>
            </div>
          </Link>
        </div>

        {/* Global Navigation Bar */}
        <nav className={styles.navBar} aria-label="Navegación principal">
          {navLinks.map(link => {
            const isActive = currentPath === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
              >
                {link.path === '/' && (
                  <span className={`material-symbols-outlined ${styles.navIcon}`}>dashboard</span>
                )}
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right Telemetry Widget */}
        <div className={styles.telemetryGroup}>
          <div className={styles.telemetryBadge}>
            <span className={styles.pulseDot} />
            <span className={styles.fpsText}>60.0 FPS</span>
            <span className={styles.telemetryDivider}>|</span>
            <span className={styles.precisionText}>IEEE 754 Float64</span>
          </div>
        </div>
      </div>
    </header>
  )
}
