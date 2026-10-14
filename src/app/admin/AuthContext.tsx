import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authSessionSchema, type UserProfile } from '@physicslab/shared-types'
import { adminApi, refreshSession } from './api'
import { clearSession, readSession, saveSession, SESSION_EVENT } from './session'

interface AuthContextValue {
  user: UserProfile | null
  loading: boolean
  recovering: boolean
  signIn: (email: string, password: string, remember: boolean) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovering, setRecovering] = useState(false)
  useEffect(() => {
    let active = true
    const read = () => {
      if (active) setUser(readSession()?.user ?? null)
    }
    const restore = async () => {
      try {
        const hash = new URLSearchParams(window.location.hash.slice(1))
        if (hash.get('type') === 'recovery') {
          const session = authSessionSchema.parse({
            access_token: hash.get('access_token'),
            refresh_token: hash.get('refresh_token'),
            token_type: 'bearer',
            expires_in: Number(hash.get('expires_in') || 3600),
          })
          const profile = await adminApi.me(session.access_token)
          if (active) {
            saveSession({ session, user: profile }, false)
            setUser(profile)
            setRecovering(true)
          }
          window.history.replaceState(
            null,
            '',
            `${window.location.pathname}${window.location.search}`
          )
        } else if (readSession()) {
          const profile = await adminApi.me()
          const ticket = readSession()
          if (active && ticket) {
            saveSession({ ...ticket, user: profile })
            setUser(profile)
          }
        }
      } catch {
        if (active) clearSession()
      } finally {
        if (active) setLoading(false)
      }
    }
    void restore()
    window.addEventListener(SESSION_EVENT, read)
    window.addEventListener('storage', read)
    return () => {
      active = false
      window.removeEventListener(SESSION_EVENT, read)
      window.removeEventListener('storage', read)
    }
  }, [])
  useEffect(() => {
    if (!user) return
    const timer = window.setInterval(() => {
      const ticket = readSession()
      if (ticket && (ticket.session.expires_at ?? Infinity) <= Date.now() / 1000 + 60)
        void refreshSession().catch(() => {})
    }, 30000)
    return () => window.clearInterval(timer)
  }, [user])
  const signIn = useCallback(async (email: string, password: string, remember: boolean) => {
    const result = await adminApi.login(email, password)
    if (!result.user.active || result.user.role !== 'teacher') {
      await adminApi.logout(result.session.access_token).catch(() => {})
      throw new Error('Tu cuenta no tiene permisos de maestro para acceder a este panel.')
    }
    saveSession(result, remember)
    setUser(result.user)
  }, [])
  const signOut = useCallback(async () => {
    const token = readSession()?.session.access_token
    clearSession()
    setUser(null)
    setRecovering(false)
    if (token) await adminApi.logout(token).catch(() => {})
  }, [])
  const value = useMemo(
    () => ({ user, loading, recovering, signIn, signOut }),
    [user, loading, recovering, signIn, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
