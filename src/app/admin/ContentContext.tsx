import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Category, TemaConfig } from '@physicslab/shared-types'
import { adminApi } from './api'

interface ContentState {
  temas: TemaConfig[]
  categories: Category[]
  loading: boolean
  error: string
  reload: () => Promise<void>
  update: (tema: TemaConfig) => void
  remove: (slug: string) => void
}
const Context = createContext<ContentState | null>(null)
export function ContentProvider({ children }: { children: ReactNode }) {
  const [temas, setTemas] = useState<TemaConfig[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [topics, cats] = await Promise.all([adminApi.temas(), adminApi.categories()])
      setTemas(topics)
      setCategories(cats)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'No se pudo cargar el contenido')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void reload()
  }, [reload])
  const update = useCallback(
    (tema: TemaConfig) =>
      setTemas(current =>
        current.some(item => item.slug === tema.slug)
          ? current.map(item => (item.slug === tema.slug ? tema : item))
          : [...current, tema]
      ),
    []
  )
  const remove = useCallback(
    (slug: string) => setTemas(current => current.filter(item => item.slug !== slug)),
    []
  )
  const value = useMemo(
    () => ({ temas, categories, loading, error, reload, update, remove }),
    [temas, categories, loading, error, reload, update, remove]
  )
  return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useContent() {
  const value = useContext(Context)
  if (!value) throw new Error('ContentProvider requerido')
  return value
}
