import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from './api'
import { useAuth } from './AuthContext'
import './Admin.css'

function PhysicsArtwork() {
  return (
    <svg className="login-artwork" viewBox="0 0 280 220" role="img" aria-label="Órbita de vectores">
      <ellipse cx="140" cy="120" rx="108" ry="38" transform="rotate(-24 140 120)" />
      <ellipse cx="140" cy="120" rx="108" ry="38" transform="rotate(26 140 120)" />
      <ellipse cx="140" cy="120" rx="108" ry="38" transform="rotate(90 140 120)" />
      <path className="artwork-axis" d="M32 120h216M140 14v204" />
      <path className="artwork-vector" d="m84 171 73-58 37-51M157 113l43 60" />
      <path className="artwork-arrow" d="m190 61 2 12 9-8zM80 175l12-1-7-9z" />
      <circle cx="157" cy="113" r="5" className="artwork-point" />
      <circle cx="194" cy="61" r="4" className="artwork-point" />
      <circle cx="84" cy="171" r="4" className="artwork-point" />
      <circle cx="105" cy="68" r="4" className="artwork-point" />
      <circle cx="208" cy="145" r="4" className="artwork-point" />
      <text x="202" y="59">v</text>
      <text x="72" y="190">x</text>
    </svg>
  )
}

export default function AdminLoginPage() {
  const { signIn } = useAuth()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      setError('Ingresa un correo electrónico válido.')
      return
    }
    if (!password) {
      setError('Ingresa tu contraseña.')
      return
    }

    setLoading(true)
    try {
      const user = await adminApi.login(correo.trim(), password)
      signIn(user, remember)
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'No fue posible iniciar sesión. Intenta de nuevo.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card" aria-label="Acceso al panel de administración">
        <aside className="login-brand-panel">
          <Link className="login-brand" to="/">
            <span className="brand-mark">⚛</span>
            <span>FísicaLab</span>
          </Link>
          <div className="login-brand-copy">
            <h1>Panel de administración</h1>
            <p>Gestiona la teoría, fórmulas, glosario y ejercicios de FísicaLab</p>
          </div>
          <PhysicsArtwork />
          <div className="login-restricted">◈ &nbsp;FísicaLab · Acceso restringido</div>
        </aside>

        <div className="login-form-panel">
          <div className="login-form-heading">
            <h2>Iniciar sesión</h2>
            <p>Ingresa tus credenciales autorizadas</p>
          </div>
          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="login-error" role="alert">
                <span aria-hidden="true">ⓘ</span>
                <div>
                  <strong>Error de autenticación</strong>
                  <p>{error}</p>
                </div>
                <button type="button" aria-label="Cerrar mensaje" onClick={() => setError('')}>
                  ×
                </button>
              </div>
            )}
            <label className="login-field">
              <span>Correo electrónico</span>
              <span className="login-input-wrap">
                <span aria-hidden="true">✉</span>
                <input
                  type="email"
                  value={correo}
                  onChange={event => setCorreo(event.target.value)}
                  placeholder="admin@institucion.edu"
                  autoComplete="username"
                  required
                />
              </span>
            </label>
            <label className="login-field">
              <span>Contraseña</span>
              <span className="login-input-wrap">
                <span aria-hidden="true">♙</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword(value => !value)}
                >
                  {showPassword ? 'Ocultar' : '◉'}
                </button>
              </span>
            </label>
            <div className="login-options">
              <label className="remember-option">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={event => setRemember(event.target.checked)}
                />
                <span>Mantener sesión iniciada</span>
              </label>
              <a href="#recuperacion" onClick={event => event.preventDefault()}>
                ¿Olvidaste tu contraseña?
              </a>
            </div>
            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? <span className="login-spinner" /> : null}
              {loading ? 'Verificando…' : 'Iniciar sesión'}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>
          <div className="login-access-note">
            <span aria-hidden="true">♧</span>
            <p>Acceso exclusivo para administradores y coordinadores de contenido.</p>
          </div>
        </div>
      </section>
    </main>
  )
}
