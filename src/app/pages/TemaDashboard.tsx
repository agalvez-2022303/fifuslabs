import React, { useState, useMemo, lazy, Suspense } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useTemaApi } from '../hooks/useTemaApi'
import { useEjerciciosApi } from '../hooks/useEjerciciosApi'
import EjerciciosTab from './EjerciciosTab'
import { desarrolloHtml, formattedHtml, mathHtml } from '../utils/content-format'
import 'katex/dist/katex.min.css'
import styles from './TemaDashboard.module.css'

const CATEGORY_LABELS: Record<string, string> = {
  mecanica: 'Mecánica Clásica & Cinemática',
  'oscilaciones-ondas': 'Oscilaciones y Ondas',
  electrodinamica: 'Electrodinámica & Campo Eléctrico',
  optica: 'Óptica Geométrica',
  termodinamica: 'Termodinámica',
  relatividad: 'Teoría de la Relatividad',
  'fisica-atomica': 'Física Atómica',
  'fisica-nuclear': 'Física Nuclear',
  'estado-solido': 'Estado Sólido',
}

// Lazy simulations mapping
const SIMULATION_COMPONENTS: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  mru: lazy(() => import('../simulations/mru/MRU')),
  'movimiento-rectilineo-uniforme': lazy(() => import('../simulations/mru/MRU')),
  'alcances-mru': lazy(() => import('../simulations/alcances-mru/alcancesMRU')),
  'alcances-encuentros': lazy(() => import('../simulations/alcances-mru/alcancesMRU')),
  'movimiento-aceleracion-constante': lazy(
    () => import('../simulations/constant-acceleration/ConstantAcceleration')
  ),
  'tres-fuerzas-equilibrio': lazy(
    () => import('../simulations/three-forces/ThreeForcesEquilibrium')
  ),
  'suma-vectores': lazy(() => import('../simulations/force-composition/ForceComposition')),
  vectores: lazy(() => import('../simulations/vector-representation/VectorRepresentation')),
  'distancia-desplazamiento': lazy(
    () => import('../simulations/distancia-desplazamiento/DistanciaDesplazamiento')
  ),
  'velocidad-rapidez': lazy(() => import('../simulations/velocidad-rapidez/VelocidadRapidez')),
}

const renderLatex = (expr: string): string => mathHtml(expr, true)
const renderLatexInline = (expr: string): string => mathHtml(expr)
const renderFormattedContent = (text: string): string => formattedHtml(text)

const renderDesarrollo = (desarrollo: string): string => desarrolloHtml(desarrollo)

type TabType = 'simulacion' | 'formulas' | 'glosario' | 'teoria' | 'ejercicios'

export default function TemaDashboard(): JSX.Element {
  const { id, seccion } = useParams<{ id: string; seccion?: string }>()
  const navigate = useNavigate()

  const { tema, source, loading } = useTemaApi(id)

  const activeTab: TabType = useMemo(() => {
    if (
      seccion === 'formulas' ||
      seccion === 'glosario' ||
      seccion === 'teoria' ||
      seccion === 'simulacion' ||
      seccion === 'ejercicios'
    ) {
      return seccion as TabType
    }
    return 'simulacion'
  }, [seccion])

  const [glossaryQuery, setGlossaryQuery] = useState('')

  // ── Ejercicios integration ──────────────────────────────────────────────
  const { ejercicios, loading: loadingEjercicios } = useEjerciciosApi(tema?.slug)

  /**
   * Parameters loaded from an exercise card.  When the student clicks
   * «Cargar en simulador» we store the preset here and switch to the
   * simulation tab so they can see the result immediately.
   */
  const [loadedParams, setLoadedParams] = useState<Record<string, unknown> | null>(null)

  function handleEjercicioLoad(params: Record<string, unknown>) {
    setLoadedParams(params)
    // Navigate to simulator tab (tema is guaranteed non-null here since
    // this handler is only reachable after the early-return guards below)
    if (id) navigate(`/tema/${id}/simulacion`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  // ───────────────────────────────────────────────────────────────────────

  const filteredGlossary = useMemo(() => {
    if (!tema) return []
    if (!glossaryQuery.trim()) return tema.glosario
    const q = glossaryQuery.toLowerCase()
    return tema.glosario.filter(
      g =>
        g.termino.toLowerCase().includes(q) ||
        g.definicion.toLowerCase().includes(q) ||
        (g.categoria && g.categoria.toLowerCase().includes(q))
    )
  }, [tema, glossaryQuery])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <main style={{ flex: 1, padding: '40px 20px', textAlign: 'center' }}>
          <div className="spinner" />
          <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>Cargando tema…</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (!tema) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <main
          style={{
            flex: 1,
            padding: '40px 20px',
            textAlign: 'center',
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          <h2>Tema no encontrado</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '16px 0 24px' }}>
            El tema que buscas no existe o ha sido movido.
          </p>
          <Link
            to="/"
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--corporate)',
              color: '#ffffff',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Volver al Inicio
          </Link>
        </main>
        <Footer />
      </div>
    )
  }

  const SimComponent = tema.simComponentSlug ? SIMULATION_COMPONENTS[tema.simComponentSlug] : null

  const handleTabChange = (newTab: TabType) => {
    navigate(`/tema/${tema.slug}/${newTab}`)
  }

  return (
    <div className={styles.page}>
      <Header />

      {/* Top Breadcrumb Bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarInner}>
          <nav className={styles.breadcrumbNav} aria-label="Ruta de navegación">
            <Link to="/" className={styles.backBtn}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                arrow_back
              </span>
              <span>Inicio</span>
            </Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>{tema.titulo}</span>
          </nav>

          <div className={styles.metaPills}>
            {source === 'estatico' && (
              <div
                className={styles.activePill}
                title="No pudimos contactar el servidor; se muestra la copia local"
              >
                <span className={styles.greenPulse} />
                <span>Contenido en caché</span>
              </div>
            )}
            <div className={styles.activePill}>
              <span className={styles.greenPulse} />
              <span>Simulación Activa</span>
            </div>
          </div>
        </div>
      </div>

      {/* Topic Hero Header */}
      <div className={styles.topicHero}>
        <div className={styles.topicTitleGroup}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--corporate)',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              {tema.icono.length > 2 ? (
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                  {tema.icono}
                </span>
              ) : (
                <span style={{ fontSize: '18px', fontWeight: 700 }}>{tema.icono}</span>
              )}
            </span>
            <h1 className={styles.topicTitle}>{tema.titulo}</h1>
          </div>

          <p className={styles.topicDesc}>{tema.descripcionCorta}</p>

          <div className={styles.tagsRow}>
            <span className={styles.tagChip}>Nivel: {tema.dificultad.toUpperCase()}</span>
            <span className={styles.tagChip}>
              {CATEGORY_LABELS[tema.categoriaId] || tema.categoriaId}
            </span>
          </div>
        </div>
      </div>

      {/* NAVEGACIÓN POR PESTAÑAS (4 secciones) */}
      <div className={styles.tabsContainer}>
        <nav className={styles.tabDeck} aria-label="Secciones del tema">
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'simulacion' ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabChange('simulacion')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              play_circle
            </span>
            <span>Simulador</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'formulas' ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabChange('formulas')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              functions
            </span>
            <span>Fórmulas</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'glosario' ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabChange('glosario')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              menu_book
            </span>
            <span>Glosario</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'teoria' ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabChange('teoria')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              school
            </span>
            <span>Teoría</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'ejercicios' ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabChange('ejercicios')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              quiz
            </span>
            <span>
              Ejercicios
              {ejercicios.length > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 18,
                    height: 18,
                    borderRadius: 999,
                    background: activeTab === 'ejercicios' ? 'var(--corporate)' : 'var(--sub-card-bg)',
                    border: '1px solid var(--border-neutral)',
                    color: activeTab === 'ejercicios' ? '#fff' : 'var(--text-secondary)',
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    marginLeft: 5,
                    padding: '0 4px',
                  }}
                >
                  {ejercicios.length}
                </span>
              )}
            </span>
          </button>
        </nav>
      </div>

      {/* Contenido de la sección activa */}
      <main className={styles.contentArea}>
        {/* Pestaña: Simulación */}
        {activeTab === 'simulacion' && (
          <div>
            {ejercicios.length > 0 && !loadedParams && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  background: 'rgba(217, 119, 6, 0.08)',
                  border: '1px solid rgba(217, 119, 6, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 16px',
                  marginBottom: 14,
                  fontSize: 13,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#d97706' }}>
                    quiz
                  </span>
                  <span>
                    <strong>{ejercicios.length} ejercicio{ejercicios.length !== 1 ? 's' : ''} disponible{ejercicios.length !== 1 ? 's' : ''}</strong> para practicar con este tema y simulación.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTabChange('ejercicios')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'var(--corporate)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <span>Ver ejercicios</span>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                </button>
              </div>
            )}

            {SimComponent ? (
              <Suspense
                key={loadedParams ? JSON.stringify(loadedParams) : 'default'}
                fallback={
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '300px',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div className="spinner" />
                    <span
                      style={{
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '13px',
                      }}
                    >
                      Cargando simulación interactiva...
                    </span>
                  </div>
                }
              >
                {loadedParams && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      background: 'rgba(36,52,108,0.06)',
                      border: '1px solid rgba(36,52,108,0.2)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 14px',
                      marginBottom: 12,
                      fontSize: 12,
                      color: 'var(--corporate-dark)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 16, color: 'var(--corporate)', flexShrink: 0 }}
                    >
                      tune
                    </span>
                    <span>
                      <strong>Parámetros cargados desde ejercicio:&nbsp;</strong>
                      {Object.entries(loadedParams)
                        .map(([k, v]) => `${k} = ${String(v)}`)
                        .join(' · ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLoadedParams(null)}
                      style={{
                        marginLeft: 'auto',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: 0,
                      }}
                      aria-label="Cerrar aviso"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                        close
                      </span>
                    </button>
                  </div>
                )}
                <SimComponent />
              </Suspense>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  background: 'var(--card-bg)',
                  borderRadius: 'var(--radius-xl)',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '36px', color: 'var(--gold)' }}
                >
                  construction
                </span>
                <h3 style={{ marginTop: '12px' }}>Simulador en construcción</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Esta simulación estará disponible próximamente en FísicaLab.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pestaña: Fórmulas */}
        {activeTab === 'formulas' && (
          <div className={styles.formulasGrid}>
            {tema.formulas.map(f => (
              <article key={f.id} className={styles.formulaCard}>
                <h3 className={styles.formulaTitle}>{f.nombre}</h3>
                <div
                  className={styles.formulaBox}
                  dangerouslySetInnerHTML={{ __html: renderLatex(f.expresion) }}
                />
                <p
                  className={styles.formulaDesc}
                  dangerouslySetInnerHTML={{ __html: renderFormattedContent(f.descripcion) }}
                />

                {f.variables && f.variables.length > 0 && (
                  <div className={styles.variablesSection}>
                    <span className={styles.varHeader}>Variables y Unidades:</span>
                    <div className={styles.varList}>
                      {f.variables.map(v => (
                        <div key={v.simbolo} className={styles.varItem}>
                          <div>
                            <span
                              className={styles.varSym}
                              dangerouslySetInnerHTML={{ __html: renderLatexInline(v.simbolo) }}
                            />
                            <span
                              style={{ marginLeft: '8px', color: 'var(--text-secondary)' }}
                              dangerouslySetInnerHTML={{
                                __html: renderFormattedContent(v.descripcion),
                              }}
                            />
                          </div>
                          <span className={styles.varUnit}>[{v.unidad}]</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {f.ejemploResuelto && (
                  <div className={styles.exampleCard}>
                    <div className={styles.exampleTitle}>
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '14px', color: 'var(--gold)' }}
                      >
                        check_circle
                      </span>
                      Ejemplo Resuelto:
                    </div>
                    <div>
                      <strong>Enunciado: </strong>
                      <span
                        dangerouslySetInnerHTML={{
                          __html: renderFormattedContent(f.ejemploResuelto.enunciado),
                        }}
                      />
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <strong>Desarrollo: </strong>
                      <span
                        dangerouslySetInnerHTML={{
                          __html: renderDesarrollo(f.ejemploResuelto.desarrollo),
                        }}
                      />
                    </div>
                    <div
                      style={{ fontWeight: 700, color: 'var(--corporate-dark)', marginTop: '4px' }}
                    >
                      <strong>Resultado: </strong>
                      <span
                        dangerouslySetInnerHTML={{
                          __html: renderFormattedContent(f.ejemploResuelto.resultado),
                        }}
                      />
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {/* Pestaña: Glosario */}
        {activeTab === 'glosario' && (
          <div className={styles.glossaryContainer}>
            <div className={styles.glossarySearch}>
              <span className={`material-symbols-outlined ${styles.glossaryIcon}`}>search</span>
              <input
                type="search"
                className={styles.glossaryInput}
                placeholder="Buscar término en el glosario..."
                value={glossaryQuery}
                onChange={e => setGlossaryQuery(e.target.value)}
                aria-label="Buscar en el glosario"
              />
            </div>

            <div className={styles.glossaryGrid}>
              {filteredGlossary.map(g => (
                <div key={g.id} className={styles.glossaryCard}>
                  {g.categoria && <span className={styles.glossaryCategory}>{g.categoria}</span>}
                  <h3 className={styles.glossaryTerm}>{g.termino}</h3>
                  <p
                    className={styles.glossaryDef}
                    dangerouslySetInnerHTML={{ __html: renderFormattedContent(g.definicion) }}
                  />
                </div>
              ))}
            </div>

            {filteredGlossary.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No se encontraron términos para &laquo;{glossaryQuery}&raquo;.
              </div>
            )}
          </div>
        )}

        {/* Pestaña: Teoría */}
        {activeTab === 'teoria' && (
          <div className={styles.theoryContainer}>
            {tema.teoria.introduccion && (
              <p
                className={styles.theoryIntro}
                dangerouslySetInnerHTML={{
                  __html: renderFormattedContent(tema.teoria.introduccion),
                }}
              />
            )}

            {tema.teoria.secciones.map(sec => (
              <section key={sec.id} className={styles.theorySection}>
                <h3 className={styles.sectionHeading}>{sec.titulo}</h3>
                <div
                  className={styles.sectionBody}
                  dangerouslySetInnerHTML={{ __html: renderFormattedContent(sec.contenido) }}
                />
                {sec.destacado && (
                  <div
                    className={styles.highlightBox}
                    dangerouslySetInnerHTML={{ __html: renderFormattedContent(sec.destacado) }}
                  />
                )}
              </section>
            ))}

            {tema.teoria.resumen && tema.teoria.resumen.length > 0 && (
              <div className={styles.summaryBox}>
                <div className={styles.summaryTitle}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '18px', color: 'var(--corporate)' }}
                  >
                    checklist
                  </span>
                  Puntos Clave a Recordar
                </div>
                <ul className={styles.summaryList}>
                  {tema.teoria.resumen.map((r, i) => (
                    <li
                      key={r.id ?? i}
                      dangerouslySetInnerHTML={{ __html: renderFormattedContent(r.contenido ?? r) }}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Pestaña: Ejercicios */}
        {activeTab === 'ejercicios' && (
          <EjerciciosTab
            ejercicios={ejercicios}
            loading={loadingEjercicios}
            hasSimulator={Boolean(SimComponent)}
            onLoad={handleEjercicioLoad}
          />
        )}
      </main>
      <Footer />
    </div>
  )
}
