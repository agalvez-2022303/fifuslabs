import React, { useState, useMemo, lazy, Suspense } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { getTemaBySlug, type TemaConfig } from '../../data/temas'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import styles from './TemaDashboard.module.css'

const CATEGORY_LABELS: Record<string, string> = {
  mecanica:             'Mecánica Clásica & Cinemática',
  'oscilaciones-ondas': 'Oscilaciones y Ondas',
  electrodinamica:      'Electrodinámica & Campo Eléctrico',
  optica:               'Óptica Geométrica',
  termodinamica:        'Termodinámica',
  relatividad:          'Teoría de la Relatividad',
  'fisica-atomica':     'Física Atómica',
  'fisica-nuclear':     'Física Nuclear',
  'estado-solido':      'Estado Sólido',
}

// Lazy simulations mapping
const SIMULATION_COMPONENTS: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  'mru': lazy(() => import('../simulations/mru/MRU')),
  'movimiento-rectilineo-uniforme': lazy(() => import('../simulations/mru/MRU')),
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

/** Renderiza texto con fórmulas LaTeX ($...$) y formato Markdown (**negrita**) */
function renderFormattedContent(text: string): string {
  if (!text) return ''

  // 1. Reemplazar bloques $$...$$
  let processed = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { throwOnError: false, displayMode: true })
    } catch {
      return math
    }
  })

  // 2. Reemplazar inline $...$
  processed = processed.replace(/\$([^$]+?)\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { throwOnError: false, displayMode: false })
    } catch {
      return math
    }
  })

  // 3. Formato **negrita**
  processed = processed.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')

  // 4. Saltos de línea
  processed = processed.replace(/\n\n/g, '<br /><br />')
  processed = processed.replace(/\n/g, '<br />')

  return processed
}

/** Renderiza el desarrollo de una fórmula con notación matemática KaTeX */
function renderDesarrollo(desarrollo: string): string {
  if (!desarrollo) return ''
  const trimmed = desarrollo.trim()

  if (trimmed.includes('$')) {
    return renderFormattedContent(trimmed)
  }

  return renderLatexInline(trimmed)
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
      (g) =>
        g.termino.toLowerCase().includes(q) ||
        g.definicion.toLowerCase().includes(q) ||
        (g.categoria && g.categoria.toLowerCase().includes(q))
    )
  }, [tema, glossaryQuery])

  if (!tema) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <main style={{ flex: 1, padding: '40px 20px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
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
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
              <span>Inicio</span>
            </Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>{tema.titulo}</span>
          </nav>

          <div className={styles.metaPills}>
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
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'var(--corporate)', color: '#ffffff', flexShrink: 0 }}>
              {tema.icono.length > 2 ? (
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>{tema.icono}</span>
              ) : (
                <span style={{ fontSize: '18px', fontWeight: 700 }}>{tema.icono}</span>
              )}
            </span>
            <h1 className={styles.topicTitle}>{tema.titulo}</h1>
          </div>

          <p className={styles.topicDesc}>{tema.descripcionCorta}</p>

          <div className={styles.tagsRow}>
            <span className={styles.tagChip}>Nivel: {tema.dificultad.toUpperCase()}</span>
            <span className={styles.tagChip}>{CATEGORY_LABELS[tema.categoriaId] || tema.categoriaId}</span>
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
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>play_circle</span>
            <span>Simulador</span>
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
                <p
                  className={styles.formulaDesc}
                  dangerouslySetInnerHTML={{ __html: renderFormattedContent(f.descripcion) }}
                />

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
                            <span
                              style={{ marginLeft: '8px', color: 'var(--text-secondary)' }}
                              dangerouslySetInnerHTML={{ __html: renderFormattedContent(v.descripcion) }}
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
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--gold)' }}>check_circle</span>
                      Ejemplo Resuelto:
                    </div>
                    <div>
                      <strong>Enunciado: </strong>
                      <span dangerouslySetInnerHTML={{ __html: renderFormattedContent(f.ejemploResuelto.enunciado) }} />
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <strong>Desarrollo: </strong>
                      <span dangerouslySetInnerHTML={{ __html: renderDesarrollo(f.ejemploResuelto.desarrollo) }} />
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--corporate-dark)', marginTop: '4px' }}>
                      <strong>Resultado: </strong>
                      <span dangerouslySetInnerHTML={{ __html: renderFormattedContent(f.ejemploResuelto.resultado) }} />
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
                  <p
                    className={styles.glossaryDef}
                    dangerouslySetInnerHTML={{ __html: renderFormattedContent(g.definicion) }}
                  />
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
              <p
                className={styles.theoryIntro}
                dangerouslySetInnerHTML={{ __html: renderFormattedContent(tema.teoria.introduccion) }}
              />
            )}

            {tema.teoria.secciones.map((sec, idx) => (
              <section key={idx} className={styles.theorySection}>
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
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--corporate)' }}>
                    checklist
                  </span>
                  Puntos Clave a Recordar
                </div>
                <ul className={styles.summaryList}>
                  {tema.teoria.resumen.map((r, i) => (
                    <li key={i} dangerouslySetInnerHTML={{ __html: renderFormattedContent(r) }} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
