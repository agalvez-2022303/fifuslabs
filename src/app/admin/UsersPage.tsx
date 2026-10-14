import { useEffect, useState, type FormEvent } from 'react'
import { createUserSchema, patchUserSchema, type UserProfile } from '@physicslab/shared-types'
import { adminApi } from './api'
import { useAuth } from './AuthContext'
import { Confirm, Empty, Field, Icon, Loading, Message, PageHeading, Pagination } from './ui'

export default function UsersPage() {
  const { user, signOut } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1),
    [size, setSize] = useState(10)
  const [q, setQ] = useState(''),
    [reload, setReload] = useState(0),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false)
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [open, setOpen] = useState(false),
    [editing, setEditing] = useState<UserProfile | null>(null),
    [pending, setPending] = useState<UserProfile | null>(null)
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    active: true,
  })
  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      setLoading(true)
      void adminApi
        .users(q, size, (page - 1) * size)
        .then(result => {
          if (active) {
            setUsers(result.items)
            setTotal(result.total)
          }
        })
        .catch((error: unknown) => {
          if (active)
            setError(error instanceof Error ? error.message : 'No se pudieron cargar los usuarios')
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 200)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [q, size, page, reload])
  function edit(profile?: UserProfile) {
    setEditing(profile ?? null)
    setOpen(true)
    setError('')
    setNotice('')
    setValues(
      profile
        ? {
            name: profile.name,
            email: profile.email ?? '',
            password: '',
            role: profile.role,
            active: profile.active,
          }
        : { name: '', email: '', password: '', role: 'student', active: true }
    )
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')
    const parsed = editing
      ? patchUserSchema.safeParse({ name: values.name, role: values.role, active: values.active })
      : createUserSchema.safeParse({
          name: values.name,
          email: values.email,
          password: values.password,
          role: values.role,
        })
    if (!parsed.success) {
      setError(parsed.error.issues.map(issue => issue.message).join(' · '))
      return
    }
    setBusy(true)
    try {
      const profile = editing
        ? await adminApi.patchUser(editing.id, parsed.data, editing.version)
        : await adminApi.createUser(parsed.data)
      if (profile.id === user?.id && (!profile.active || profile.role !== 'teacher'))
        await signOut()
      setNotice('Usuario guardado correctamente.')
      setOpen(false)
      setValues(current => ({ ...current, password: '' }))
      setReload(value => value + 1)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'No se pudo guardar el usuario')
    } finally {
      setBusy(false)
    }
  }
  async function remove() {
    if (!pending) return
    setBusy(true)
    setError('')
    try {
      await adminApi.removeUser(pending.id, pending.version)
      if (pending.id === user?.id) await signOut()
      setNotice('Usuario desactivado.')
      setReload(value => value + 1)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'No se pudo desactivar')
    } finally {
      setBusy(false)
      setPending(null)
    }
  }
  return (
    <div className="studio-page">
      <PageHeading
        title="Administración de usuarios"
        description="Gestiona maestros y alumnos. La última cuenta de maestro activo no puede desactivarse."
      >
        <button className="studio-button primary" onClick={() => edit()}>
          <Icon name="person_add" />
          Nuevo usuario
        </button>
      </PageHeading>
      {error && (
        <Message>
          {error}
          <button className="studio-button small" onClick={() => setReload(value => value + 1)}>
            Recargar datos
          </button>
        </Message>
      )}
      {notice && <Message success>{notice}</Message>}
      <section className="studio-card studio-filters">
        <label className="studio-search-input">
          <Icon name="search" />
          <input
            type="search"
            aria-label="Buscar usuarios"
            placeholder="Buscar por nombre o correo…"
            value={q}
            onChange={event => {
              setQ(event.target.value)
              setPage(1)
            }}
          />
        </label>
      </section>
      {open && (
        <form className="studio-card studio-user-form" onSubmit={save}>
          <header>
            <h2>{editing ? 'Editar usuario' : 'Crear usuario'}</h2>
            <button
              className="studio-icon-button"
              type="button"
              aria-label="Cerrar formulario de usuario"
              onClick={() => {
                setOpen(false)
                setValues(current => ({ ...current, password: '' }))
              }}
            >
              <Icon name="close" />
            </button>
          </header>
          <div className="studio-two-fields">
            <Field label="Nombre">
              <input
                required
                maxLength={150}
                value={values.name}
                onChange={event => setValues(current => ({ ...current, name: event.target.value }))}
              />
            </Field>
            <Field label="Correo electrónico">
              <input
                type="email"
                required
                readOnly={Boolean(editing)}
                value={values.email}
                onChange={event =>
                  setValues(current => ({ ...current, email: event.target.value }))
                }
              />
            </Field>
            <Field label="Rol">
              <select
                value={values.role}
                onChange={event => setValues(current => ({ ...current, role: event.target.value }))}
              >
                <option value="student">Alumno · Lectura de publicados</option>
                <option value="teacher">Maestro · Contenido y usuarios</option>
              </select>
            </Field>
            {!editing && (
              <Field
                label="Contraseña inicial"
                hint="Al menos 12 caracteres; no se almacena en tablas de contenido."
              >
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                  value={values.password}
                  onChange={event =>
                    setValues(current => ({ ...current, password: event.target.value }))
                  }
                />
              </Field>
            )}
          </div>
          {editing && (
            <label className="studio-checkbox-label">
              <input
                type="checkbox"
                checked={values.active}
                onChange={event =>
                  setValues(current => ({ ...current, active: event.target.checked }))
                }
              />
              Cuenta activa
            </label>
          )}
          <button className="studio-button primary" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar usuario'}
          </button>
        </form>
      )}
      {loading && <Loading />}
      <section className="studio-card studio-table-card">
        <div className="studio-table-scroll">
          <table className="studio-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Versión</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(profile => (
                <tr key={profile.id}>
                  <td>
                    <strong>{profile.name || 'Sin nombre'}</strong>
                    {profile.id === user?.id && <small>Tu cuenta</small>}
                  </td>
                  <td>{profile.email}</td>
                  <td>
                    <span className="studio-chip">
                      {profile.role === 'teacher' ? 'Maestro' : 'Alumno'}
                    </span>
                  </td>
                  <td>
                    <span className={`studio-status ${profile.active ? 'published' : 'draft'}`}>
                      {profile.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td>v{profile.version}</td>
                  <td>
                    <div className="studio-row-actions">
                      <button
                        className="studio-icon-button"
                        title="Editar usuario"
                        onClick={() => edit(profile)}
                      >
                        <Icon name="edit" />
                      </button>
                      <button
                        className="studio-icon-button danger"
                        title="Desactivar usuario"
                        disabled={!profile.active || busy}
                        onClick={() => setPending(profile)}
                      >
                        <Icon name="person_off" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!users.length && !loading && <Empty title="No se encontraron usuarios" />}
        <Pagination
          page={page}
          pages={Math.max(1, Math.ceil(total / size))}
          total={total}
          pageSize={size}
          onPage={setPage}
          onSize={size => {
            setSize(size)
            setPage(1)
          }}
        />
      </section>
      {pending && (
        <Confirm
          title="Desactivar usuario"
          busy={busy}
          onCancel={() => setPending(null)}
          onConfirm={() => void remove()}
        >
          <p>
            «{pending.name || pending.email}» dejará de acceder a las rutas protegidas. Su identidad
            y auditoría se conservarán.
          </p>
        </Confirm>
      )}
    </div>
  )
}
