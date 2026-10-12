import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { AdminUser } from './types'

interface AuthContextValue {
  user: AdminUser | null
  signIn: (user: AdminUser, remember: boolean) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)
const SESSION_KEY = 'fisicalab-admin'

function readStoredUser(): AdminUser | null {
  try {
    const stored =
      window.sessionStorage.getItem(SESSION_KEY) ??
      window.localStorage.getItem(SESSION_KEY)
    if (!stored) return null

    const user = JSON.parse(stored) as AdminUser
    return user?.rol === 'admin' ? user : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(readStoredUser)

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      signIn: (nextUser, remember) => {
        const target = remember ? window.localStorage : window.sessionStorage
        const other = remember ? window.sessionStorage : window.localStorage
        other.removeItem(SESSION_KEY)
        target.setItem(SESSION_KEY, JSON.stringify(nextUser))
        setUser(nextUser)
      },
      signOut: () => {
        window.sessionStorage.removeItem(SESSION_KEY)
        window.localStorage.removeItem(SESSION_KEY)
        setUser(null)
      },
    }),
    [user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
