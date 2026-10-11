import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import './Admin.css'

const navigation = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: '▦' },
  { label: 'Áreas', path: '/admin/areas', icon: '⌘' },
  { label: 'Temas', path: '/admin/temas', icon: '▤' },
  { label: 'Teoría', path: '/admin/teoria', icon: '▧' },
  { label: 'Fórmulas', path: '/admin/formulas', icon: 'Σ' },
  { label: 'Glosario', path: '/admin/glosario', icon: 'Aₓ' },
  { label: 'Ejercicios', path: '/admin/ejercicios', icon: '♧' },
]

export default function AdminLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(
    () => window.localStorage.getItem('fisicalab-admin-theme') === 'dark'
  )
  const selectedPage =
    navigation.find(item => item.path === location.pathname) ?? navigation[0]

  useEffect(() => {
    window.localStorage.setItem('fisicalab-admin-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  function logout() {
    signOut()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className={`admin-shell${darkMode ? ' admin-dark' : ''}`}>
      <aside
        className={`admin-sidebar${collapsed ? ' sidebar-collapsed' : ''}${drawerOpen ? ' drawer-open' : ''}`}
      >
        <NavLink className="admin-side-brand" to="/admin/dashboard" onClick={() => setDrawerOpen(false)}>
          <span className="brand-mark">⚛</span>
          {!collapsed && (
            <span className="admin-side-brand-copy">
              <strong>FísicaLab <small>STEM</small></strong>
              <span>Admin Suite</span>
            </span>
          )}
        </NavLink>
        <div className="sidebar-caption">{collapsed ? '•' : 'CURRÍCULO Y CONTENIDO'}</div>
        <nav className="admin-nav" aria-label="Navegación de administración">
          {navigation.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `admin-nav-link${isActive ? ' nav-active' : ''}`
              }
              onClick={() => setDrawerOpen(false)}
              end
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="admin-nav-link sidebar-logout" onClick={logout} title="Cerrar sesión">
            <span className="nav-icon" aria-hidden="true">↪</span>
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
          <button
            className="sidebar-collapse"
            onClick={() => setCollapsed(value => !value)}
            aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>
      </aside>

      {drawerOpen && (
        <button
          type="button"
          className="admin-drawer-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="mobile-menu-button"
            aria-label="Abrir menú"
            onClick={() => setDrawerOpen(true)}
          >
            ☰
          </button>
          <div className="admin-breadcrumb">
            <span>Inicio</span><span aria-hidden="true">›</span><strong>{selectedPage.label}</strong>
          </div>
          <label className="admin-search">
            <span aria-hidden="true">⌕</span>
            <input type="search" placeholder="Buscar temas, fórmulas, teoría…" aria-label="Buscar" />
            <kbd>Ctrl + K</kbd>
          </label>
          <div className="topbar-actions">
            <button className="topbar-icon-button notification-button" aria-label="Notificaciones">
              ♧<i />
            </button>
            <button
              className="topbar-icon-button"
              aria-label={darkMode ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              onClick={() => setDarkMode(value => !value)}
            >
              {darkMode ? '☀' : '☼'}
            </button>
            <div className="admin-profile">
              <button
                className="profile-trigger"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen(value => !value)}
              >
                <span className="profile-copy"><strong>{user?.nombre ?? 'Administrador'}</strong><small>Super Admin</small></span>
                <span className="profile-avatar">{user?.nombre?.trim().charAt(0).toUpperCase() || 'A'}</span>
                <span aria-hidden="true">⌄</span>
              </button>
              {profileOpen && (
                <div className="profile-menu">
                  <strong>{user?.nombre}</strong>
                  <span>{user?.correo}</span>
                  <button onClick={logout}>Cerrar sesión</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
