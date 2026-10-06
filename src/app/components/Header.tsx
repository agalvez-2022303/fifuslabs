import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import styles from './Header.module.css'

export default function Header() {
  const location = useLocation()
  const currentPath = location.pathname
  const [isOpen, setIsOpen] = useState(false)

  const navLinks = [
    { label: 'Dashboard', path: '/', icon: 'dashboard' },
    { label: 'Vectores', path: '/sim/vectores', icon: 'arrow_upward' },
    { label: 'Suma de Vectores', path: '/sim/suma-vectores', icon: 'add_circle' },
    { label: 'Distancia vs Desplazamiento', path: '/sim/distancia-desplazamiento', icon: 'straighten' },
    { label: 'Velocidad vs Rapidez', path: '/sim/velocidad-rapidez', icon: 'speed' },
    { label: 'Alcances y Encuentros MRU', path: '/sim/alcances-encuentros', icon: 'social_distance' },
    { label: 'MRU / MRUV', path: '/sim/movimiento-aceleracion-constante', icon: 'trending_up' },
  ]

  // Cerrar sidebar al cambiar de ruta
  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  // Bloquear scroll del body cuando está abierto en móvil
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const toggleSidebar = useCallback(() => setIsOpen(prev => !prev), [])
  const closeSidebar = useCallback(() => setIsOpen(false), [])

  return (
    <>
      {/* ── Top Bar (siempre visible) ── */}
      <header className={styles.topBar}>
        <div className={styles.topBarInner}>
          {/* Hamburger / Close button */}
          <button
            className={styles.menuBtn}
            onClick={toggleSidebar}
            aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={isOpen}
          >
            <span className={`material-symbols-outlined ${styles.menuIcon}`}>
              {isOpen ? 'close' : 'menu'}
            </span>
          </button>

          {/* Brand */}
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

          {/* Telemetry (right side) */}
          <div className={styles.telemetryGroup}>
            <div className={styles.telemetryBadge}>
              <span className={styles.pulseDot} />
              <span className={styles.fpsText}>60.0 FPS</span>
              <span className={styles.telemetryDivider}>|</span>
              <span className={styles.precisionText}>IEEE 754</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Overlay ── */}
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* ── Sidebar ── */}
      <aside
        className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}
        aria-label="Navegación lateral"
      >
        {/* Sidebar header */}
        <div className={styles.sidebarHeader}>
          <Link to="/" className={styles.sidebarLogo}>
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
          <button
            className={styles.closeBtn}
            onClick={closeSidebar}
            aria-label="Cerrar menú"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Nav section label */}
        <div className={styles.navSection}>
          <span className={styles.navSectionLabel}>Simulaciones</span>
        </div>

        {/* Navigation links */}
        <nav className={styles.navList} aria-label="Navegación principal">
          {navLinks.map(link => {
            const isActive = currentPath === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
              >
                <span className={`material-symbols-outlined ${styles.navIcon}`}>
                  {link.icon}
                </span>
                <span className={styles.navLinkText}>{link.label}</span>
                {isActive && (
                  <span className={`material-symbols-outlined ${styles.navLinkCheck}`}>
                    chevron_right
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar footer */}
        <div className={styles.sidebarFooter}>
          <div className={styles.telemetryBadgeSidebar}>
            <span className={styles.pulseDot} />
            <span className={styles.fpsText}>60.0 FPS</span>
            <span className={styles.telemetryDivider}>|</span>
            <span className={styles.precisionText}>IEEE 754 Float64</span>
          </div>
        </div>
      </aside>
    </>
  )
}
