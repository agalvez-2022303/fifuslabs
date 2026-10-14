import { useEffect, useState } from 'react'
import { getTemaBySlug } from '../../data/temas'
import {
  fallbackUuid,
  temaSchema,
  type LegacyTemaConfig,
  type TemaConfig,
} from '@physicslab/shared-types'

/**
 * Public topic reader.
 *
 * Content edited in the Studio panel lives in PostgreSQL, so the API is the
 * source of truth. The static `.ts` registry stays as a fallback so the page
 * still renders if the API is unreachable (offline demo, backend down).
 *
 * The canonical model stores the summary as `{ id, contenido }[]` and gives
 * every sub-element a UUID, while the legacy registry keeps plain strings.
 * `toCanonical` bridges both so the UI only ever sees one shape.
 */
export type TemaSource = 'api' | 'estatico'

export interface TemaState {
  tema: TemaConfig | null
  source: TemaSource | null
  loading: boolean
}

/**
 * Resumen entries need a stable id whether they arrive as canonical objects or
 * as plain strings from the legacy registry.
 */
function normalizeResumen(
  resumen: unknown,
  key: (index: number) => string = index => `resumen/${index}`
): { id: string; contenido: string }[] {
  if (!Array.isArray(resumen)) return []
  return resumen.map((item, index) => {
    if (typeof item === 'string') return { id: fallbackUuid(key(index)), contenido: item }
    const record = item as { id?: string; contenido?: string }
    return { id: record.id ?? fallbackUuid(key(index)), contenido: String(record.contenido ?? '') }
  })
}

/** Validates an API payload against the shared schema. */
export function toCanonical(value: unknown): TemaConfig {
  const tema = temaSchema.parse(value)
  return { ...tema, teoria: { ...tema.teoria, resumen: normalizeResumen(tema.teoria.resumen) } }
}

/**
 * Projects the legacy static registry onto the canonical shape. Ids are derived
 * deterministically so the fallback renders stable identities; PostgreSQL keeps
 * its own UUIDs, which is fine because ids are only used locally for keys.
 */
export function legacyToCanonical(legacy: LegacyTemaConfig): TemaConfig {
  const slug = legacy.slug
  const id = (kind: string, index: number) => fallbackUuid(`${slug}/${kind}/${index}`)
  return toCanonical({
    ...legacy,
    status: 'published',
    version: 1,
    updatedAt: new Date(0).toISOString(),
    simComponentSlug: legacy.simComponentSlug ?? null,
    teoria: {
      introduccion: legacy.teoria.introduccion,
      secciones: legacy.teoria.secciones.map((section, index) => ({
        id: id('secciones', index),
        titulo: section.titulo,
        contenido: section.contenido,
        destacado: section.destacado ?? null,
      })),
      resumen: normalizeResumen(legacy.teoria.resumen, index => `${slug}/resumen/${index}`),
    },
    formulas: legacy.formulas.map((formula, index) => ({
      ...formula,
      id: fallbackUuid(`${slug}/formulas/${index}/${formula.id}`),
      ejemploResuelto: formula.ejemploResuelto ?? null,
    })),
    glosario: legacy.glosario.map((item, index) => ({
      ...item,
      id: id('glosario', index),
      categoria: item.categoria ?? null,
    })),
  })
}

export function useTemaApi(slug: string | undefined): TemaState {
  const [state, setState] = useState<TemaState>({
    tema: null,
    source: null,
    loading: Boolean(slug),
  })

  useEffect(() => {
    if (!slug) {
      setState({ tema: null, source: null, loading: false })
      return
    }
    const controller = new AbortController()
    let active = true
    setState({ tema: null, source: null, loading: true })
    void fetch(`/api/temas/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const body = (await response.json()) as { data: unknown }
        return toCanonical(body.data)
      })
      .then(tema => {
        // An unpublished topic must never leak through the static fallback.
        if (!active) return
        setState(
          tema.status === 'published'
            ? { tema, source: 'api', loading: false }
            : { tema: null, source: 'api', loading: false }
        )
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return
        const legacy = getTemaBySlug(slug)
        try {
          const fallback = legacy ? legacyToCanonical(legacy) : null
          setState({ tema: fallback, source: legacy ? 'estatico' : 'api', loading: false })
        } catch {
          setState({ tema: null, source: 'api', loading: false })
        }
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [slug])

  return state
}
