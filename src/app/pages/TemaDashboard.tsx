import React, { useState, useMemo, lazy, Suspense } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header'
import { getTemaBySlug, type TemaConfig } from '../../data/temas'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import styles from './TemaDashboard.module.css'

// Lazy simulations mapping
const SIMULATION_COMPONENTS: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  'alcances-mru': lazy(() => import('../simulations/alcances-mru/alcancesMRU')),
  'alcances-encuentros': lazy(() => import('../simulations/alcances-mru/alcancesMRU')),
  'movimiento-aceleracion-constante': lazy(() => import('../simulations/constant-acceleration/ConstantAcceleration')),
  'tres-fuerzas-equilibrio': lazy(() => import('../simulations/three-forces/ThreeForcesEquilibrium')),
  'suma-vectores': lazy(() => import('../simulations/force-composition/ForceComposition')),
  'vectores': lazy(() => import('../simulations/vector-representation/VectorRepresentation')),
  'distancia-desplazamiento': lazy(() => import('../simulations/distancia-desplazamiento/DistanciaDesplazamiento')),
  'velocidad-rapidez': lazy(() => import('../simulations/velocidad-rapidez/VelocidadRapidez')),
}

function renderLatex(expr: string): string {
  try {
    return katex.renderToString(expr, { throwOnError: false, displayMode: true })
  } catch {
    return expr
  }
}

function renderLatexInline(expr: string): string {
  try {
    return katex.renderToString(expr, { throwOnError: false, displayMode: false })
  } catch {
    return expr
  }
}

type TabType = 'simulacion' | 'formulas' | 'glosario' | 'teoria'

export default function TemaDashboard(): JSX.Element {
  const { id, seccion } = useParams<{ id: string; seccion?: string }>()
  const navigate = useNavigate()

  const tema: TemaConfig | undefined = useMemo(() => {
    return id ? getTemaBySlug(id) : undefined
  }, [id])

  const activeTab: TabType = useMemo(() => {
    if (seccion === 'formulas' || seccion === 'glosario' || seccion === 'teoria' || seccion === 'simulacion') {
      return seccion as TabType
    }
    return 'simulacion'
  }, [seccion])

  const [glossaryQuery, setGlossaryQuery] = useState('')

  const filteredGlossary = useMemo(() => {
    if (!tema) return []
    if (!glossaryQuery.trim()) return tema.glosario
    const q = glossaryQuery.toLowerCase()
    return tema.glosario.filter(
      (g) => g.termino.toLowerCase().includes(q) || g.definicion.toLowerCase().includes(q)
    )
  }, [tema, glossaryQuery])

  if (!tema) {
    return (
      <div className={styles.page}>
        <Header />
        <div className={styles.notFound}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--warning)' }}>
            search_off
          </span>
          <h1 className={styles.notFoundTitle}>Tema no encontrado</h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>
            El módulo solicitado "{id}" no existe en el catálogo actual de simulaciones.
          </p>
          <Link to="/" className={styles.backBtn} style={{ marginTop: '16px' }}>
            <span className="material-symbols-outlined">arrow_back</span>
            Volver al Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const SimComponent = SIMULATION_COMPONENTS[tema.slug] || SIMULATION_COMPONENTS[tema.simComponentSlug || '']

  const handleTabChange = (tab: TabType) => {
    if (tab === 'simulacion') {
      navigate(`/tema/${tema.slug}`)
    } else {
      navigate(`/tema/${tema.slug}/${tab}`)
    }
  }

  return (
    <div className={styles.page}>
      <Header />

      {/* Barra superior de Breadcrumbs y Estado */}
      <div className={styles.topBar}>
        <div className={styles.topBarInner}>
          <div className={styles.breadcrumbNav}>
            <Link to="/" className={styles.backBtn} aria-label="Volver al laboratorio principal">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>dashboard</span>
              <span>Laboratorio</span>
            </Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>{tema.titulo}</span>
          </div>

          <div className={styles.metaPills}>
            <span className={`badge badge--${tema.dificultad}`}>
              {tema.dificultad.toUpperCase()}
            </span>
            <span className={styles.activePill}>
              <span className={styles.greenPulse} />
              DISPONIBLE
            </span>
          </div>
        </div>
      </div>

      {/* Hero del Tema */}
      <header className={styles.topicHero}>
        <div className={styles.topicTitleGroup}>
          <h1 className={styles.topicTitle}>{tema.titulo}</h1>
          <p className={styles.topicDesc}>{tema.descripcionCorta}</p>
          <div className={styles.tagsRow}>
            {tema.etiquetas.map((t) => (
              <span key={t} className={styles.tagChip}>#{t}</span>
            ))}
          </div>
        </div>
      </header>

      {/* Barra de Pestañas */}
      <div className={styles.tabsContainer}>
        <nav className={styles.tabDeck} aria-label="Secciones del tema">
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'simulacion' ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabChange('simulacion')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>precision_manufacturing</span>
            <span>Simulación</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'formulas' ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabChange('formulas')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>functions</span>
            <span>Fórmulas</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'glosario' ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabChange('glosario')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>menu_book</span>
            <span>Glosario</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'teoria' ? styles.tabBtnActive : ''}`}
            onClick={() => handleTabChange('teoria')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>school</span>
            <span>Teoría</span>
          </button>
        </nav>
      </div>

      {/* Contenido de la sección activa */}
      <main className={styles.contentArea}>
        {/* Pestaña: Simulación */}
        {activeTab === 'simulacion' && (
          <div>
            {SimComponent ? (
              <Suspense
                fallback={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', flexDirection: 'column', gap: '12px' }}>
                    <div className="spinner" />
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                      Cargando simulación interactiva...
                    </span>
                  </div>
                }
              >
                <SimComponent />
              </Suspense>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--card-bg)', borderRadius: 'var(--radius-xl)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--gold)' }}>construction</span>
                <h3 style={{ marginTop: '12px' }}>Simulador en construcción</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Esta simulación estará disponible próximamente en FísicaLab.</p>
              </div>
            )}
          </div>
        )}

        {/* Pestaña: Fórmulas */}
        {activeTab === 'formulas' && (
          <div className={styles.formulasGrid}>
            {tema.formulas.map((f) => (
              <article key={f.id} className={styles.formulaCard}>
                <h3 className={styles.formulaTitle}>{f.nombre}</h3>
                <div
                  className={styles.formulaBox}
                  dangerouslySetInnerHTML={{ __html: renderLatex(f.expresion) }}
                />
                <p className={styles.formulaDesc}>{f.descripcion}</p>

                {f.variables && f.variables.length > 0 && (
                  <div className={styles.variablesSection}>
                    <span className={styles.varHeader}>Variables y Unidades:</span>
                    <div className={styles.varList}>
                      {f.variables.map((v) => (
                        <div key={v.simbolo} className={styles.varItem}>
                          <div>
                            <span
                              className={styles.varSym}
                              dangerouslySetInnerHTML={{ __html: renderLatexInline(v.simbolo) }}
                            />
                            <span style={{ marginLeft: '8px', color: 'var(--text-secondary)' }}>{v.descripcion}</span>
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
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--gold)' }}>check_circle</span>
                      Ejemplo Resuelto:
                    </div>
                    <div><strong>Enunciado:</strong> {f.ejemploResuelto.enunciado}</div>
                    <div>
                      <strong>Desarrollo: </strong>
                      <span dangerouslySetInnerHTML={{ __html: renderLatexInline(f.ejemploResuelto.desarrollo) }} />
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--corporate-dark)' }}>
                      <strong>Resultado:</strong> {f.ejemploResuelto.resultado}
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
                onChange={(e) => setGlossaryQuery(e.target.value)}
                aria-label="Buscar en el glosario"
              />
            </div>

            <div className={styles.glossaryGrid}>
              {filteredGlossary.map((g) => (
                <div key={g.termino} className={styles.glossaryCard}>
                  {g.categoria && <span className={styles.glossaryCategory}>{g.categoria}</span>}
                  <h3 className={styles.glossaryTerm}>{g.termino}</h3>
                  <p className={styles.glossaryDef}>{g.definicion}</p>
                </div>
              ))}
            </div>

            {filteredGlossary.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No se encontraron términos para "{glossaryQuery}".
              </div>
            )}
          </div>
        )}

        {/* Pestaña: Teoría */}
        {activeTab === 'teoria' && (
          <div className={styles.theoryContainer}>
            {tema.teoria.introduccion && (
              <p className={styles.theoryIntro}>{tema.teoria.introduccion}</p>
            )}

            {tema.teoria.secciones.map((sec, idx) => (
              <section key={idx} className={styles.theorySection}>
                <h3 className={styles.sectionHeading}>{sec.titulo}</h3>
                <div className={styles.sectionBody}>{sec.contenido}</div>
                {sec.destacado && (
                  <div className={styles.highlightBox}>{sec.destacado}</div>
                )}
              </section>
            ))}

            {tema.teoria.resumen && tema.teoria.resumen.length > 0 && (
              <div className={styles.summaryBox}>
                <div className={styles.summaryTitle}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--corporate)' }}>
                    checklist
                  </span>
                  Puntos Clave a Recordar
                </div>
                <ul className={styles.summaryList}>
                  {tema.teoria.resumen.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
