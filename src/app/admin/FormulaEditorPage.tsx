import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import katex from 'katex'
import {
  formulaInputSchema,
  type EjemploResuelto,
  type FormulaDoc,
  type TemaConfig,
  type VariableDef,
} from '@physicslab/shared-types'
import { useContent } from './ContentContext'
import { adminApi } from './api'
import { Empty, Field, Icon, Loading, Message, Status } from './ui'
import { MathPreview, TextPreview } from './MathPreview'

interface FormulaDraft {
  nombre: string
  expresion: string
  descripcion: string
  variables: (VariableDef & { key: string })[]
  ejemplo: EjemploResuelto
  withExample: boolean
}
const empty = (): FormulaDraft => ({
  nombre: '',
  expresion: '',
  descripcion: '',
  variables: [],
  withExample: false,
  ejemplo: { enunciado: '', datos: '', desarrollo: '', resultado: '' },
})
const fromFormula = (formula: FormulaDoc): FormulaDraft => ({
  nombre: formula.nombre,
  expresion: formula.expresion,
  descripcion: formula.descripcion,
  variables: formula.variables.map(variable => ({ ...variable, key: crypto.randomUUID() })),
  ejemplo: formula.ejemploResuelto ?? empty().ejemplo,
  withExample: Boolean(formula.ejemploResuelto),
})
const symbols = [
  ['Estructuras', ['x/y', '\\frac{x}{y}'], ['√x', '\\sqrt{x}'], ['x²', 'x^{2}'], ['xᵢ', 'x_{i}']],
  ['Operadores', ['·', '\\cdot'], ['±', '\\pm'], ['Vector', '\\vec{v}'], ['∑', '\\sum']],
  [
    'Griegas',
    ['Δ', '\\Delta'],
    ['θ', '\\theta'],
    ['λ', '\\lambda'],
    ['μ', '\\mu'],
    ['ω', '\\omega'],
    ['π', '\\pi'],
  ],
] as const

export default function FormulaEditorPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>()
  const [params] = useSearchParams()
  const { temas, categories, loading: contentLoading, error: contentError, update } = useContent()
  const navigate = useNavigate()
  const [choice, setChoice] = useState(params.get('tema') || '')
  const activeSlug = slug || choice || temas[0]?.slug || ''
  const [tema, setTema] = useState<TemaConfig | null>(null),
    [draft, setDraft] = useState<FormulaDraft>(empty)
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('')
  const [mobile, setMobile] = useState(false),
    [reloadKey, setReloadKey] = useState(0)
  const currentId = useRef(id)
  const input = useRef<HTMLTextAreaElement>(null),
    advanced = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const abort = new AbortController()
    if (!activeSlug) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    currentId.current = id
    void adminApi
      .getTema(activeSlug, abort.signal)
      .then(tema => {
        setTema(tema)
        if (id) {
          const formula = tema.formulas.find(item => item.id === id)
          if (!formula) throw new Error('La fórmula solicitada ya no existe en este tema.')
          setDraft(fromFormula(formula))
        }
      })
      .catch((error: unknown) => {
        if (!abort.signal.aborted)
          setError(error instanceof Error ? error.message : 'No se pudo cargar la fórmula')
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false)
      })
    return () => abort.abort()
  }, [activeSlug, id, reloadKey])
  const set = <K extends keyof FormulaDraft>(key: K, value: FormulaDraft[K]) =>
    setDraft(current => ({ ...current, [key]: value }))
  let latexError = ''
  if (draft.expresion) {
    try {
      katex.renderToString(draft.expresion, { throwOnError: true, trust: false, maxExpand: 1000 })
    } catch {
      latexError = 'La sintaxis LaTeX aún no es válida.'
    }
  }
  function insert(value: string) {
    const start = input.current?.selectionStart ?? draft.expresion.length,
      end = input.current?.selectionEnd ?? start
    set('expresion', `${draft.expresion.slice(0, start)}${value}${draft.expresion.slice(end)}`)
    if (advanced.current) advanced.current.open = true
    requestAnimationFrame(() => {
      input.current?.focus()
      input.current?.setSelectionRange(start + value.length, start + value.length)
    })
  }
  async function save(publish = false) {
    if (!tema) return
    setError('')
    setNotice('')
    const payload = formulaInputSchema.safeParse({
      nombre: draft.nombre,
      expresion: draft.expresion,
      descripcion: draft.descripcion,
      variables: draft.variables.map(({ key: _key, ...variable }) => variable),
      ejemploResuelto: draft.withExample ? draft.ejemplo : null,
    })
    if (!payload.success) {
      setError(
        payload.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(' · ')
      )
      return
    }
    if (latexError) {
      setError(latexError)
      return
    }
    setBusy(true)
    let stored = false
    try {
      const previous = new Set(tema.formulas.map(item => item.id))
      let saved = await adminApi.saveItem(
        tema.slug,
        'formulas',
        payload.data,
        tema.version,
        currentId.current
      )
      const formula = saved.formulas.find(
        item => item.id === currentId.current || !previous.has(item.id)
      )
      if (!formula) throw new Error('La fórmula se guardó, pero no se recibió su identificador.')
      currentId.current = formula.id
      stored = true
      setTema(saved)
      update(saved)
      if (publish && saved.status !== 'published') {
        saved = await adminApi.status(saved.slug, 'published', saved.version)
        setTema(saved)
        update(saved)
      }
      setNotice('Fórmula guardada correctamente en PostgreSQL.')
      setDraft(fromFormula(formula))
      if (!id) navigate(`/admin/formulas/${saved.slug}/${formula.id}`, { replace: true })
    } catch (error: unknown) {
      setError(
        `${stored ? 'La fórmula se guardó; no se pudo completar la publicación del tema. ' : ''}${error instanceof Error ? error.message : 'No se pudo guardar'}`
      )
    } finally {
      setBusy(false)
    }
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    void save()
  }
  if (contentLoading && !temas.length) return <Loading />
  if (!temas.length)
    return (
      <Empty title="Crea un tema antes de añadir fórmulas">
        <p>{contentError}</p>
        <Link className="studio-button primary" to="/admin/temas/nuevo">
          Nuevo tema
        </Link>
      </Empty>
    )
  const category = categories.find(item => item.id === tema?.categoriaId)
  return (
    <div className="studio-page studio-editor-page">
      <header className="studio-editor-heading">
        <div>
          <h1>
            Editor de Fórmulas y Ecuaciones{' '}
            <span className="studio-chip gold">{id ? 'Modo edición' : 'Nueva fórmula'}</span>
          </h1>
          <p>
            Define el formalismo matemático, variables del SI y casos de resolución para FísicaLab.
          </p>
        </div>
        {tema && (
          <div className="studio-editor-status">
            <Status status={tema.status} />
            <small>Estado del tema completo</small>
          </div>
        )}
      </header>
      {error && (
        <Message>
          {error}
          <button className="studio-button small" onClick={() => setReloadKey(value => value + 1)}>
            Recargar versión del servidor
          </button>
        </Message>
      )}
      {notice && <Message success>{notice}</Message>}
      {loading && <Loading />}
      <form onSubmit={submit} className="studio-editor-grid">
        <section className="studio-editor-fields">
          <article className="studio-card studio-form-section">
            <header>
              <Icon name="account_tree" />
              <div>
                <h2>1. Vinculación curricular</h2>
                <p>Ubicación dentro de la malla pedagógica y nomenclatura</p>
              </div>
              <small>Paso 1 de 5</small>
            </header>
            <div className="studio-two-fields">
              <Field label="Tema curricular principal">
                <select
                  value={activeSlug}
                  disabled={Boolean(id) || busy}
                  onChange={event => setChoice(event.target.value)}
                >
                  {temas.map(tema => (
                    <option value={tema.slug} key={tema.slug}>
                      {tema.titulo}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Identificador estable (UUID)"
                hint="Generado por el servidor; no cambia al editar"
              >
                <input readOnly value={currentId.current || 'Se genera al guardar'} />
              </Field>
            </div>
            <Field label="Nombre formal de la ecuación">
              <input
                required
                maxLength={300}
                value={draft.nombre}
                onChange={event => set('nombre', event.target.value)}
                placeholder="Ej. Ecuación horaria del MRU"
              />
            </Field>
            <small>
              Área asignada: <strong>{category?.nombre ?? '—'}</strong>. La publicación se
              administra desde el tema.
            </small>
          </article>
          <article className="studio-card studio-form-section">
            <header>
              <Icon name="functions" />
              <div>
                <h2>2. Expresión matemática</h2>
                <p>Editor asistido con soporte de sintaxis LaTeX</p>
              </div>
            </header>
            <div className="studio-symbol-keyboard">
              {symbols.map(([label, ...buttons]) => (
                <div key={label}>
                  <small>{label}:</small>
                  {buttons.map(([text, code]) => (
                    <button type="button" key={text} onClick={() => insert(code)}>
                      {text}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div className="studio-equation-editor">
              <small>Renderizador interactivo</small>
              {draft.expresion ? (
                <MathPreview expression={draft.expresion} display />
              ) : (
                <span className="studio-muted">Introduce una expresión o selecciona símbolos</span>
              )}
            </div>
            <details ref={advanced} className="studio-advanced" open>
              <summary>
                <Icon name="code" />
                Modo avanzado (Sintaxis LaTeX)
              </summary>
              <Field label="Código LaTeX">
                <textarea
                  ref={input}
                  required
                  maxLength={4000}
                  rows={3}
                  value={draft.expresion}
                  onChange={event => set('expresion', event.target.value)}
                  placeholder={'x(t) = x_0 + v \\cdot t'}
                />
              </Field>
              <small className={latexError ? 'studio-danger-text' : ''}>
                {latexError ||
                  (draft.expresion ? 'Sintaxis válida · KaTeX' : 'La expresión es obligatoria')}
              </small>
            </details>
          </article>
          <article className="studio-card studio-form-section">
            <header>
              <Icon name="menu_book" />
              <div>
                <h2>3. Fundamento y principio físico</h2>
                <p>Explicación intuitiva para el estudiante</p>
              </div>
              <small>Markdown y LaTeX</small>
            </header>
            <Field label="Descripción pedagógica">
              <textarea
                required
                rows={4}
                maxLength={20000}
                value={draft.descripcion}
                onChange={event => set('descripcion', event.target.value)}
                placeholder="Explica qué representa la fórmula y cuándo se utiliza."
              />
            </Field>
            <small>{draft.descripcion.length.toLocaleString('es-GT')} / 20.000 caracteres</small>
          </article>
          <article className="studio-card studio-form-section">
            <header>
              <Icon name="tune" />
              <div>
                <h2>4. Variables y unidades del SI</h2>
                <p>Desglose paramétrico de la expresión</p>
              </div>
              <button
                type="button"
                className="studio-button primary small"
                disabled={draft.variables.length >= 50}
                onClick={() =>
                  set('variables', [
                    ...draft.variables,
                    { key: crypto.randomUUID(), simbolo: '', descripcion: '', unidad: '' },
                  ])
                }
              >
                <Icon name="add" />
                Agregar variable
              </button>
            </header>
            <div className="studio-variable-rows">
              {draft.variables.map((variable, index) => (
                <div className="studio-variable-row" key={variable.key}>
                  {(['simbolo', 'descripcion', 'unidad'] as const).map(key => (
                    <Field
                      key={key}
                      label={
                        key === 'simbolo'
                          ? 'Símbolo'
                          : key === 'descripcion'
                            ? 'Magnitud física'
                            : 'Unidad SI'
                      }
                    >
                      <input
                        aria-label={`${key === 'simbolo' ? 'Símbolo' : key === 'descripcion' ? 'Magnitud física' : 'Unidad SI'} ${index + 1}`}
                        required={key !== 'unidad'}
                        maxLength={key === 'simbolo' ? 200 : key === 'unidad' ? 100 : 1000}
                        value={variable[key]}
                        onChange={event =>
                          set(
                            'variables',
                            draft.variables.map(item =>
                              item.key === variable.key
                                ? { ...item, [key]: event.target.value }
                                : item
                            )
                          )
                        }
                      />
                    </Field>
                  ))}
                  <button
                    type="button"
                    className="studio-icon-button danger"
                    aria-label={`Eliminar variable ${index + 1}`}
                    onClick={() =>
                      set(
                        'variables',
                        draft.variables.filter(item => item.key !== variable.key)
                      )
                    }
                  >
                    <Icon name="delete" />
                  </button>
                </div>
              ))}
            </div>
            {!draft.variables.length && (
              <p className="studio-muted">
                Agrega los símbolos, su significado y unidad de medida.
              </p>
            )}
          </article>
          <article className="studio-card studio-form-section">
            <header>
              <Icon name="fact_check" />
              <div>
                <h2>5. Caso de ejemplo guiado</h2>
                <p>Problema con sustitución numérica y solución</p>
              </div>
            </header>
            <label className="studio-checkbox-label">
              <input
                type="checkbox"
                checked={draft.withExample}
                onChange={event => set('withExample', event.target.checked)}
              />
              Incluir ejemplo resuelto
            </label>
            {draft.withExample &&
              (['enunciado', 'datos', 'desarrollo', 'resultado'] as const).map(key => (
                <Field
                  key={key}
                  label={
                    {
                      enunciado: 'Enunciado del problema',
                      datos: 'Datos conocidos',
                      desarrollo: 'Desarrollo y despeje paso a paso',
                      resultado: 'Resultado final',
                    }[key]
                  }
                >
                  <textarea
                    required
                    maxLength={20000}
                    rows={key === 'desarrollo' ? 4 : 2}
                    value={draft.ejemplo[key]}
                    onChange={event =>
                      set('ejemplo', { ...draft.ejemplo, [key]: event.target.value })
                    }
                  />
                </Field>
              ))}
          </article>
        </section>
        <aside className="studio-student-preview">
          <header>
            <span>
              <i />
              Vista previa estudiante
            </span>
            <div className="studio-segmented">
              <button
                type="button"
                className={mobile ? 'active' : ''}
                onClick={() => setMobile(true)}
              >
                <Icon name="smartphone" />
                Móvil
              </button>
              <button
                type="button"
                className={!mobile ? 'active' : ''}
                onClick={() => setMobile(false)}
              >
                <Icon name="desktop_windows" />
                Desktop
              </button>
            </div>
          </header>
          <article className={`studio-card studio-preview-frame${mobile ? ' mobile' : ''}`}>
            <div className="studio-preview-title">
              <span className="studio-chip navy">{category?.nombre ?? 'FísicaLab'}</span>
              <small>{tema?.titulo}</small>
              <h2>{draft.nombre || 'Nombre de la ecuación'}</h2>
            </div>
            <div className="studio-formula-hero">
              <span className="studio-chip gold">ECUACIÓN FUNDAMENTAL</span>
              {draft.expresion ? (
                <MathPreview expression={draft.expresion} display />
              ) : (
                <span>f(x) = …</span>
              )}
            </div>
            <div className="studio-preview-body">
              <small>CONCEPTO CLAVE</small>
              <TextPreview
                text={draft.descripcion || 'La descripción pedagógica aparecerá aquí.'}
              />
              {!!draft.variables.length && (
                <>
                  <small>VARIABLES EN EL SI</small>
                  <div className="studio-preview-variables">
                    {draft.variables.map(variable => (
                      <div key={variable.key}>
                        <strong>
                          <MathPreview expression={variable.simbolo} />
                        </strong>
                        <span>{variable.descripcion}</span>
                        <code>{variable.unidad}</code>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {draft.withExample && (
                <div className="studio-example">
                  <h3>
                    <Icon name="lightbulb" />
                    Ejemplo resuelto de aplicación
                  </h3>
                  <TextPreview text={draft.ejemplo.enunciado} />
                  <pre>{draft.ejemplo.datos}</pre>
                  <TextPreview text={draft.ejemplo.desarrollo} />
                  <strong>Solución: {draft.ejemplo.resultado}</strong>
                </div>
              )}
              {tema?.status === 'published' && tema.simComponentSlug && (
                <Link
                  className="studio-button primary"
                  target="_blank"
                  rel="noreferrer"
                  to={`/tema/${tema.slug}/simulacion`}
                >
                  <Icon name="science" />
                  Abrir simulación
                </Link>
              )}
            </div>
          </article>
        </aside>
        <footer className="studio-save-bar">
          <span>
            <Icon name="cloud_done" />
            {notice
              ? 'Cambios guardados'
              : tema
                ? `Versión ${tema.version} · ${latexError || 'Vista previa en tiempo real'}`
                : 'Preparando editor'}
          </span>
          <div>
            <Link className="studio-button" to="/admin/formulas">
              Cancelar
            </Link>
            <button className="studio-button" type="submit" disabled={busy || loading || !tema}>
              {busy ? 'Guardando…' : 'Guardar fórmula'}
            </button>
            {tema?.status === 'draft' && (
              <button
                className="studio-button primary"
                type="button"
                disabled={busy || loading || !tema}
                onClick={() => void save(true)}
              >
                <Icon name="rocket_launch" />
                Guardar y publicar tema
              </button>
            )}
          </div>
        </footer>
      </form>
    </div>
  )
}
