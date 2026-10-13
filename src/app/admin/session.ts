import { z } from 'zod'
import { authSessionSchema, userProfileSchema } from '@physicslab/shared-types'

export const SESSION_KEY = 'fisicalab-studio-session'
export const SESSION_EVENT = 'fisicalab-session-changed'
export const loginResultSchema = z.object({ session: authSessionSchema, user: userProfileSchema })
export type StoredSession = z.infer<typeof loginResultSchema>
export function readSession(): StoredSession | null {
  try {
    const raw =
      window.sessionStorage.getItem(SESSION_KEY) ?? window.localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const result = loginResultSchema.safeParse(JSON.parse(raw))
    return result.success ? result.data : null
  } catch {
    return null
  }
}
export function saveSession(value: StoredSession, remember?: boolean) {
  const data = loginResultSchema.parse(value)
  data.session.expires_at ??= Math.floor(Date.now() / 1000) + data.session.expires_in
  const persistent = remember ?? Boolean(window.localStorage.getItem(SESSION_KEY))
  const target = persistent ? window.localStorage : window.sessionStorage
  const other = persistent ? window.sessionStorage : window.localStorage
  other.removeItem(SESSION_KEY)
  target.setItem(SESSION_KEY, JSON.stringify(data))
  window.dispatchEvent(new Event(SESSION_EVENT))
}
export function clearSession() {
  window.sessionStorage.removeItem(SESSION_KEY)
  window.localStorage.removeItem(SESSION_KEY)
  window.sessionStorage.removeItem('fisicalab-admin')
  window.localStorage.removeItem('fisicalab-admin')
  window.dispatchEvent(new Event(SESSION_EVENT))
}
