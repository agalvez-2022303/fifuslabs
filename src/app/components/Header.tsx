import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import BottomNav from './BottomNav'
import styles from './Header.module.css'

export default function Header(): JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [temasOpen, setTemasOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = location.pathname

  const temaLinks = [
    { label: 'Alcances y Encuentros MRU', path: '/tema/alcances-mru', icon: 'compare_arrows' },
    { label: 'Vectores', path: '/tema/vectores', icon: 'near_me' },
    { label: 'Suma de Vectores', path: '/tema/suma-vectores', icon: 'add_circle' },
    { label: 'Distancia vs Desplazamiento', path: '/tema/distancia-desplazamiento', icon: 'route' },
    { label: 'Velocidad vs Rapidez', path: '/tema/velocidad-rapidez', icon: 'speed' },
    { label: 'MRU / MRUV', path: '/tema/movimiento-aceleracion-constante', icon: 'trending_up' },
    { label: 'Tres Fuerzas Equilibrio', path: '/tema/tres-fuerzas-equilibrio', icon: 'balance' },
  ]

  // Cerrar menús al cambiar de ruta
  useEffect(() => {
    setDrawerOpen(false)
    setTemasOpen(false)
  }, [currentPath])

  // Cerrar dropdown al hacer clic afuera o presionar Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTemasOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false)
        setTemasOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Bloquear scroll del fondo con drawer móvil abierto
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  const handleSearchClick = () => {
    if (currentPath === '/') {
      const searchInput = document.getElementById('search-simulations') as HTMLInputElement | null
      if (searchInput) {
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
        searchInput.focus()
      }
    } else {
      navigate('/?buscar=1#search-simulations')
    }
  }

  const isInicioActive = currentPath === '/'
  const isAnyTemaActive = currentPath.startsWith('/tema/')

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          {/* Brand & Logo */}
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

          {/* Desktop Global Navigation */}
          <nav className={styles.navBar} aria-label="Navegación principal">
            <Link
              to="/"
              className={`${styles.navLink} ${isInicioActive ? styles.navLinkActive : ''}`}
            >
              <span className={`material-symbols-outlined ${styles.navIcon}`}>home</span>
              <span>Inicio</span>
            </Link>

            {/* Dropdown Menu Temas */}
            <div className={styles.dropdownWrap} ref={dropdownRef}>
              <button
                type="button"
                className={`${styles.navLink} ${styles.dropdownTrigger} ${isAnyTemaActive ? styles.navLinkActive : ''}`}
                onClick={() => setTemasOpen(!temasOpen)}
                aria-expanded={temasOpen}
                aria-haspopup="true"
              >
                <span className={`material-symbols-outlined ${styles.navIcon}`}>topic</span>
                <span>Temas</span>
                <span className={`material-symbols-outlined ${styles.arrowIcon} ${temasOpen ? styles.arrowOpen : ''}`}>
                  expand_more
                </span>
              </button>

              {temasOpen && (
                <div className={styles.dropdownMenu} role="menu">
                  <div className={styles.dropdownHeader}>Temas disponibles</div>
                  {temaLinks.map(link => {
                    const isActive = currentPath.startsWith(link.path) || (link.path === '/tema/alcances-mru' && currentPath.includes('alcances'))
                    return (
                      <Link
                        key={link.path}
                        to={link.path}
                        className={`${styles.dropdownItem} ${isActive ? styles.dropdownItemActive : ''}`}
                        onClick={() => setTemasOpen(false)}
                        role="menuitem"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                          {link.icon}
                        </span>
                        <span>{link.label}</span>
                        {isActive && <span className={styles.activeDot} />}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Buscar Action */}
            <button
              type="button"
              className={styles.searchBtn}
              onClick={handleSearchClick}
              aria-label="Buscar simulaciones"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>search</span>
              <span>Buscar</span>
            </button>
          </nav>

          {/* Mobile Actions */}
          <div className={styles.rightGroup}>
            <button
              type="button"
              className={styles.searchBtnMobile}
              onClick={handleSearchClick}
              aria-label="Buscar simulaciones"
            >
              <span className="material-symbols-outlined">search</span>
            </button>

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
          <Link
            to="/"
            className={`${styles.drawerNavLink} ${isInicioActive ? styles.drawerNavLinkActive : ''}`}
            onClick={() => setDrawerOpen(false)}
          >
            <span className="material-symbols-outlined" style={{ color: isInicioActive ? 'var(--corporate)' : 'var(--slate-sub)' }}>
              home
            </span>
            <span>Inicio (Dashboard)</span>
          </Link>

          <div className={styles.drawerSectionDivider}>TEMAS DISPONIBLES</div>

          {temaLinks.map((link) => {
            const isActive = currentPath.startsWith(link.path) || (link.path === '/tema/alcances-mru' && currentPath.includes('alcances'))

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
          <div className={styles.drawerFooterText}>
            <span>FísicaLab v2.4</span>
            <span>Laboratorio Virtual de Física</span>
          </div>
        </div>
      </aside>

      {/* Bottom Navigation Bar */}
      <BottomNav onOpenMenu={() => setDrawerOpen(true)} />
    </>
  )
}
