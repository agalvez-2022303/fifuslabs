import { useEffect, useState } from 'react'
import { z } from 'zod'
import { ejercicioSchema, type Ejercicio } from '@physicslab/shared-types'

export interface EjerciciosState {
  ejercicios: Ejercicio[]
  loading: boolean
  error: string | null
}

const responseSchema = z.object({ data: z.array(ejercicioSchema) })

/**
 * Public hook – no authentication required.
 * Fetches exercises for a given topic slug (temaSlug) and returns only those
 * with `estado === 'published'`.  Falls back to an empty array on network
 * error so the rest of the page continues to render.
 */
export function useEjerciciosApi(temaSlug: string | undefined): EjerciciosState {
  const [state, setState] = useState<EjerciciosState>({
    ejercicios: [],
    loading: Boolean(temaSlug),
    error: null,
  })

  useEffect(() => {
    if (!temaSlug) {
      setState({ ejercicios: [], loading: false, error: null })
      return
    }

    const controller = new AbortController()
    let active = true

    const token = typeof window !== 'undefined'
      ? (() => {
          try {
            const raw = localStorage.getItem('fisicalab-studio-session')
            return raw ? JSON.parse(raw)?.session?.access_token : undefined
          } catch {
            return undefined
          }
        })()
      : undefined

    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    void fetch(`/api/ejercicios?tema=${encodeURIComponent(temaSlug)}`, {
      signal: controller.signal,
      headers,
    })
      .then(async response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const body: unknown = await response.json()
        const items = responseSchema.parse(body).data
        // Return items (if teacher token, all items; otherwise filter published)
        return token ? items : items.filter(e => e.estado === 'published')
      })
      .then(ejercicios => {
        if (!active) return
        setState({ ejercicios, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (!active || (err instanceof DOMException && err.name === 'AbortError')) return
        console.warn('No fue posible cargar ejercicios del tema:', err)
        setState({
          ejercicios: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Error al cargar ejercicios',
        })
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [temaSlug])

  return state
}

