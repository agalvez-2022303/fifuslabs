import { useEffect, useRef, useState, type FormEvent } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Icon } from './ui'
import { request } from './api'

const navigation = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard' },
  { label: 'Áreas', path: '/admin/areas', icon: 'category' },
  { label: 'Temas', path: '/admin/temas', icon: 'folder_open' },
  { label: 'Teoría', path: '/admin/teoria', icon: 'menu_book' },
  { label: 'Fórmulas', path: '/admin/formulas', icon: 'functions' },
  { label: 'Glosario', path: '/admin/glosario', icon: 'spellcheck' },
  { label: 'Ejercicios', path: '/admin/ejercicios', icon: 'quiz' },
  { label: 'Usuarios', path: '/admin/usuarios', icon: 'group' },
]

export default function AdminLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(
    () => window.localStorage.getItem('fisicalab-studio-theme') === 'dark'
  )
  const [query, setQuery] = useState('')
  const [online, setOnline] = useState<boolean | null>(null)
  const search = useRef<HTMLInputElement>(null)
  const selectedPage =
    navigation.find(item => location.pathname.startsWith(item.path)) ?? navigation[0]

  useEffect(() => {
    window.localStorage.setItem('fisicalab-studio-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])
  useEffect(() => {
    setDrawerOpen(false)
    setProfileOpen(false)
  }, [location.pathname])
  useEffect(() => {
    const abort = new AbortController()
    void request('/health', { signal: abort.signal }, false)
      .then(() => setOnline(true))
      .catch(() => {
        if (!abort.signal.aborted) setOnline(false)
      })
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        search.current?.focus()
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => {
      abort.abort()
      window.removeEventListener('keydown', shortcut)
    }
  }, [])
  function find(event: FormEvent) {
    event.preventDefault()
    navigate(`/admin/temas?q=${encodeURIComponent(query)}`)
  }
  const logout = () => {
    void signOut()
    navigate('/admin/login', { replace: true })
  }
  const name = user?.name || user?.email?.split('@')[0] || 'Maestro'

  return (
    <div className={`studio-shell${darkMode ? ' is-dark' : ''}`}>
      <aside className={`studio-sidebar${drawerOpen ? ' open' : ''}`}>
        <NavLink className="studio-brand" to="/admin/dashboard">
          <span className="studio-brand-mark">
            <Icon name="science" />
          </span>
          <span>
            <strong>
              FísicaLab <small>STEM</small>
            </strong>
            <em>Admin Suite</em>
          </span>
        </NavLink>
        <p className="studio-nav-caption">CURRÍCULO Y CONTENIDO</p>
        <nav className="studio-nav" aria-label="Navegación de administración">
          {navigation.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `studio-nav-link${isActive ? ' active' : ''}`}
              onClick={() => setDrawerOpen(false)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="studio-sidebar-bottom">
          <div className="studio-api-status">
            <i className={online ? 'online' : 'offline'} />
            <span>Servidor API</span>
            <strong>{online === null ? 'Verificando' : online ? 'Online' : 'Sin conexión'}</strong>
          </div>
          <button className="studio-logout" onClick={logout}>
            Cerrar sesión
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      {drawerOpen && (
        <button
          type="button"
          className="studio-drawer-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div className="studio-main">
        <header className="studio-topbar">
          <button
            type="button"
            className="studio-menu-button"
            aria-label="Abrir menú"
            onClick={() => setDrawerOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <div className="studio-breadcrumb">
            <NavLink to="/">Inicio</NavLink>
            <Icon name="chevron_right" />
            <strong>{selectedPage.label}</strong>
          </div>
          <form className="studio-global-search" onSubmit={find}>
            <Icon name="search" />
            <input
              ref={search}
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Buscar temas, fórmulas, teoría…"
              aria-label="Buscar contenido"
            />
            <kbd>Ctrl + K</kbd>
          </form>
          <div className="studio-topbar-actions">
            <button
              className="studio-icon-button"
              aria-label={darkMode ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              onClick={() => setDarkMode(value => !value)}
            >
              <Icon name={darkMode ? 'light_mode' : 'dark_mode'} />
            </button>
            <div className="studio-profile">
              <button
                className="studio-profile-trigger"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen(value => !value)}
              >
                <span className="studio-profile-copy">
                  <strong>{name}</strong>
                  <small>Maestro · Editor</small>
                </span>
                <span className="studio-avatar">{name.charAt(0).toUpperCase()}</span>
                <Icon name="expand_more" />
              </button>
              {profileOpen && (
                <div className="studio-profile-menu">
                  <strong>{name}</strong>
                  <span>{user?.email}</span>
                  <NavLink to="/admin/usuarios">Administrar usuarios</NavLink>
                  <button onClick={logout}>Cerrar sesión</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="studio-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
