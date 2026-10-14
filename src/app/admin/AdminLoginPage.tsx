import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { adminApi, ApiError } from './api'
import { useAuth } from './AuthContext'
import { Field, Icon, Message } from './ui'

function PhysicsArtwork() {
  return (
    <svg
      className="studio-login-artwork"
      viewBox="0 0 280 220"
      role="img"
      aria-label="Órbita de vectores"
    >
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
      <text x="202" y="59">
        v
      </text>
      <text x="72" y="190">
        x
      </text>
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
  const [recovery, setRecovery] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      setError('Ingresa un correo electrónico válido.')
      return
    }
    if (!recovery && !password) {
      setError('Ingresa tu contraseña.')
      return
    }

    setLoading(true)
    try {
      if (recovery) {
        await adminApi.requestPasswordReset(correo.trim())
        setMessage(
          'Si existe una cuenta con ese correo, recibirás instrucciones para recuperar el acceso.'
        )
      } else await signIn(correo.trim(), password, remember)
    } catch (loginError) {
      setError(
        loginError instanceof ApiError && loginError.status === 401
          ? 'Correo o contraseña incorrectos. Verifica tus credenciales.'
          : loginError instanceof Error
            ? loginError.message
            : 'No fue posible iniciar sesión. Intenta de nuevo.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="studio-login-page">
      <section className="studio-login-card" aria-label="Acceso al panel de administración">
        <aside className="studio-login-brand-panel">
          <span className="studio-environment">
            <i />
            Ambiente de {import.meta.env.PROD ? 'Producción' : 'Desarrollo'}
          </span>
          <Link className="studio-login-brand" to="/">
            <span className="studio-brand-mark">
              <Icon name="science" />
            </span>
            <span>
              <strong>FísicaLab</strong>
              <small>EDUCACIÓN STEM</small>
            </span>
          </Link>
          <div className="studio-login-brand-copy">
            <h1>Panel de administración</h1>
            <p>Gestiona la teoría, fórmulas, glosario y ejercicios de FísicaLab</p>
          </div>
          <PhysicsArtwork />
          <div className="studio-login-restricted">
            <Icon name="verified_user" />
            FísicaLab · Acceso para maestros
          </div>
        </aside>

        <div className="studio-login-form-panel">
          <div className="studio-login-top-bar">
            <Link to="/" className="studio-back-button" title="Regresar al Dashboard">
              <Icon name="arrow_back" />
              <span>Regresar al Dashboard</span>
            </Link>
          </div>
          <div className="studio-login-form-heading">
            <h2>{recovery ? 'Recuperar acceso' : 'Iniciar sesión'}</h2>
            <p>
              {recovery
                ? 'Enviaremos instrucciones a tu correo'
                : 'Ingresa tus credenciales autorizadas'}
            </p>
          </div>
          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <Message>
                <strong>Error de autenticación</strong>
                <p>{error}</p>
              </Message>
            )}
            {message && <Message success>{message}</Message>}
            <label className="studio-field">
              <span>Correo electrónico</span>
              <span className="studio-input-wrap">
                <Icon name="mail" />
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
            {!recovery && (
              <label className="studio-field">
                <span>Contraseña</span>
                <span className="studio-input-wrap">
                  <Icon name="lock" />
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
                    className="studio-password-toggle"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    onClick={() => setShowPassword(value => !value)}
                  >
                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} />
                  </button>
                </span>
              </label>
            )}
            <div className="studio-login-options">
              {!recovery && (
                <label className="studio-remember-option">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={event => setRemember(event.target.checked)}
                  />
                  <span>Mantener sesión iniciada</span>
                </label>
              )}
              <button
                type="button"
                className="studio-text-button"
                onClick={() => {
                  setRecovery(value => !value)
                  setError('')
                  setMessage('')
                }}
              >
                {recovery ? 'Volver a iniciar sesión' : '¿Olvidaste tu contraseña?'}
              </button>
            </div>
            <button
              className="studio-button primary studio-login-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? <span className="studio-spinner" /> : null}
              {loading ? 'Procesando…' : recovery ? 'Enviar instrucciones' : 'Iniciar sesión'}
              {!loading && <Icon name="arrow_forward" />}
            </button>
          </form>
          <div className="studio-login-access-note">
            <Icon name="shield_person" />
            <p>
              Acceso exclusivo para maestros y administradores de contenido. Tu sesión se verifica
              con Supabase Auth.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

export function ResetPasswordPage() {
  const { signOut } = useAuth()
  const [password, setPassword] = useState(''),
    [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (password.length < 12 || password !== confirmation) {
      setError('Usa al menos 12 caracteres y confirma la misma contraseña.')
      return
    }
    setBusy(true)
    try {
      await adminApi.changePassword(password)
      await signOut()
      window.location.replace('/admin/login')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'No se pudo actualizar la contraseña')
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="studio-login-page">
      <form className="studio-card studio-reset-form" onSubmit={submit}>
        <Icon name="lock_reset" />
        <h1>Restablecer contraseña</h1>
        <p>El enlace de recuperación se ha verificado.</p>
        {error && <Message>{error}</Message>}
        <Field label="Nueva contraseña">
          <input
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
        </Field>
        <Field label="Confirmar contraseña">
          <input
            type="password"
            autoComplete="new-password"
            required
            value={confirmation}
            onChange={event => setConfirmation(event.target.value)}
          />
        </Field>
        <button className="studio-button primary" disabled={busy}>
          {busy ? 'Guardando…' : 'Actualizar contraseña'}
        </button>
      </form>
    </main>
  )
}
