import type { AdminUser, DashboardSummary } from './types'

const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(
  /\/+$/,
  ''
)

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  const body = (await response.json()) as T | { error?: string }

  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? body.error
        : 'No fue posible completar la solicitud'
    throw new Error(message || 'No fue posible completar la solicitud')
  }

  return body as T
}

export const adminApi = {
  login(correo: string, password: string) {
    return request<AdminUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ correo, password }),
    })
  },
  getDashboardSummary() {
    return request<DashboardSummary>('/dashboard/resumen')
  },
}
