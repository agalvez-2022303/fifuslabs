import { useCallback, useEffect, useState } from 'react'
import type { TemaConfig } from '@physicslab/shared-types'
import { adminApi } from './api'
import { useContent } from './ContentContext'

export function useTopic(slug: string) {
  const content = useContent()
  const [tema, setTema] = useState<TemaConfig | null>(null),
    [loading, setLoading] = useState(Boolean(slug)),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0)
  useEffect(() => {
    const abort = new AbortController()
    setTema(null)
    setError('')
    setLoading(Boolean(slug))
    if (slug)
      void adminApi
        .getTema(slug, abort.signal)
        .then(setTema)
        .catch((error: unknown) => {
          if (!abort.signal.aborted)
            setError(error instanceof Error ? error.message : 'No se pudo cargar el tema')
        })
        .finally(() => {
          if (!abort.signal.aborted) setLoading(false)
        })
    return () => abort.abort()
  }, [slug, revision])
  const { update: updateCache } = content
  const update = useCallback(
    (saved: TemaConfig) => {
      setTema(saved)
      updateCache(saved)
    },
    [updateCache]
  )
  return { tema, loading, error, update, reload: () => setRevision(value => value + 1) }
}
