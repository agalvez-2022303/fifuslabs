import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import styles from './Header.module.css'

export default function Header(): JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const currentPath = location.pathname

  const navLinks = [
    { label: 'Dashboard', path: '/', icon: 'dashboard' },
    { label: 'Alcances y Encuentros MRU', path: '/tema/alcances-mru', icon: 'compare_arrows' },
    { label: 'Vectores', path: '/tema/vectores', icon: 'near_me' },
    { label: 'Suma de Vectores', path: '/tema/suma-vectores', icon: 'add_circle' },
    { label: 'Distancia vs Desplazamiento', path: '/tema/distancia-desplazamiento', icon: 'route' },
    { label: 'Velocidad vs Rapidez', path: '/tema/velocidad-rapidez', icon: 'speed' },
    { label: 'MRU / MRUV', path: '/tema/movimiento-aceleracion-constante', icon: 'trending_up' },
    { label: 'Tres Fuerzas Equilibrio', path: '/tema/tres-fuerzas-equilibrio', icon: 'balance' },
  ]

  // Cerrar drawer al cambiar de ruta
  useEffect(() => {
    setDrawerOpen(false)
  }, [currentPath])

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    if (drawerOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden' // Evitar scroll del fondo
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          {/* Brand & Version */}
          <div className={styles.brandGroup}>
            <Link to="/" className={styles.logo} aria-label="FísicaLab Inicio">
              <div className={styles.logoIconBox}>
                <span className="material-symbols-outlined">science</span>
              </div>
              <div className={styles.logoTextContainer}>
                <span className={styles.logoTitle}>FísicaLab</span>
                <div className={styles.logoBadge}>
                  <span className={styles.engineTag}>v2.4</span>
                  <span className={styles.statusDot} />
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Global Navigation Bar */}
          <nav className={styles.navBar} aria-label="Navegación principal">
            {navLinks.slice(0, 7).map(link => {
              const isActive = link.path === '/'
                ? currentPath === '/'
                : currentPath.startsWith(link.path) || (link.path === '/tema/alcances-mru' && currentPath.includes('alcances'))
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

          {/* Right Telemetry Widget & Mobile Hamburger */}
          <div className={styles.telemetryGroup}>
            <div className={styles.telemetryBadge}>
              <span className={styles.pulseDot} />
              <span className={styles.fpsText}>60.0 FPS</span>
              <span className={styles.telemetryDivider}>|</span>
              <span className={styles.precisionText}>IEEE 754</span>
            </div>

            {/* Hamburger Button on Mobile */}
            <button
              type="button"
              className={styles.hamburgerBtn}
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menú de navegación"
              aria-expanded={drawerOpen}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-in Drawer */}
      <div
        className={`${styles.drawerBackdrop} ${drawerOpen ? styles.drawerBackdropOpen : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      />

      <aside
        className={`${styles.drawerPanel} ${drawerOpen ? styles.drawerPanelOpen : ''}`}
        aria-label="Menú lateral de módulos"
      >
        <div className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>
            <span className="material-symbols-outlined" style={{ color: 'var(--corporate)' }}>apps</span>
            Módulos y Temas
          </h2>
          <button
            type="button"
            className={styles.drawerCloseBtn}
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className={styles.drawerNavList}>
          {navLinks.map((link) => {
            const isActive = link.path === '/'
              ? currentPath === '/'
              : currentPath.startsWith(link.path) || (link.path === '/tema/alcances-mru' && currentPath.includes('alcances'))

            return (
              <Link
                key={link.path}
                to={link.path}
                className={`${styles.drawerNavLink} ${isActive ? styles.drawerNavLinkActive : ''}`}
                onClick={() => setDrawerOpen(false)}
              >
                <span className="material-symbols-outlined" style={{ color: isActive ? 'var(--corporate)' : 'var(--slate-sub)' }}>
                  {link.icon}
                </span>
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className={styles.drawerFooter}>
          <div className={styles.drawerTelemetry}>
            <span>Motor Físico:</span>
            <strong style={{ color: 'var(--corporate)' }}>Float64 (60 FPS)</strong>
          </div>
          <div className={styles.drawerTelemetry}>
            <span>Versión:</span>
            <span>v2.4 Engine Stitch</span>
          </div>
        </div>
      </aside>

      {/* Bottom Navigation Bar for 1-handed mobile use */}
      <BottomNav onOpenMenu={() => setDrawerOpen(true)} />
    </>
  )
}
