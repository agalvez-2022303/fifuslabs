import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from './Header'
import styles from './SimulationShell.module.css'
import type { Simulation, SimulationContent } from '@physicslab/shared-types'
import katex from 'katex'
import 'katex/dist/katex.min.css'

/** Renderiza una expresión LaTeX a HTML usando KaTeX */
function renderLatex(expr: string): string {
  try {
    return katex.renderToString(expr, { throwOnError: false, displayMode: false })
  } catch {
    return expr
  }
}

interface Props {
  slug: string
  children: ReactNode
}

export default function SimulationShell({ slug, children }: Props) {
  const [sim, setSim] = useState<Simulation | null>(null)
  const [content, setContent] = useState<SimulationContent | null>(null)
  const [tab, setTab] = useState<'sim' | 'teoria' | 'glosario'>('sim')

  useEffect(() => {
    fetch(`/api/simulations/${slug}`)
      .then(r => r.json())
      .then(d => setSim(d.data))
      .catch(() => {}) // Falla silenciosa: el fallback visual maneja el estado

    fetch(`/api/content/${slug}`)
      .then(r => r.json())
      .then(d => setContent(d.data))
      .catch(() => {})
  }, [slug])

  return (
    <div className={styles.shell}>
      <Header />

      {/* Sub-header / Breadcrumb Bar */}
      <div className={styles.breadcrumbBar}>
        <div className={styles.breadcrumbInner}>
          <div className={styles.breadcrumbPath}>
            <Link to="/" className={styles.breadcrumbLink}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>dashboard</span>
              <span>Laboratorio</span>
            </Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>{sim?.titulo ?? slug}</span>
          </div>

          <div className={styles.metaBadges}>
            {sim && (
              <>
                <span className={`badge badge--${sim.dificultad}`}>
                  {sim.dificultad.toUpperCase()}
                </span>
                <span className={styles.activePill}>
                  <span className={styles.greenPulse} />
                  ACTIVO
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className={styles.mobileTabs}>
        <button
          className={`${styles.mobileTab} ${tab === 'sim' ? styles.mobileTabActive : ''}`}
          onClick={() => setTab('sim')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>precision_manufacturing</span>
          Simulación
        </button>
        <button
          className={`${styles.mobileTab} ${tab === 'teoria' ? styles.mobileTabActive : ''}`}
          onClick={() => setTab('teoria')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>menu_book</span>
          Teoría
        </button>
        <button
          className={`${styles.mobileTab} ${tab === 'glosario' ? styles.mobileTabActive : ''}`}
          onClick={() => setTab('glosario')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>dictionary</span>
          Glosario
        </button>
      </div>

      {/* Main Workspace Layout */}
      <main className={styles.main}>
        {/* Simulation Canvas Stage Area */}
        <div className={`${styles.simPanel} ${tab !== 'sim' ? styles.hiddenMobile : ''}`}>
          {children}
        </div>

        {/* Theory / Didactic Aside Area */}
        <aside className={`${styles.infoPanel} ${tab === 'sim' ? styles.hiddenMobile : ''}`}>
          {tab !== 'sim' && (
            <div className={styles.infoContent}>
              {tab === 'teoria' && content && (
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <span className="material-symbols-outlined text-corporate">school</span>
                    <h2 className={styles.sectionTitle}>Marco Teórico</h2>
                  </div>
                  <div className={styles.theory}>
                    {content.teoria.split('\n\n').map((p, i) => (
                      <p
                        key={i}
                        dangerouslySetInnerHTML={{
                          __html: p
                            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\n/g, '<br/>'),
                        }}
                      />
                    ))}
                  </div>

                  <h3 className={styles.subTitle}>Fórmulas Matemáticas</h3>
                  {content.formulas.map((f, i) => (
                    <div key={i} className={styles.formulaCard}>
                      <div
                        className={styles.formulaExpr}
                        dangerouslySetInnerHTML={{ __html: renderLatex(f.expresion) }}
                      />
                      <p className={styles.formulaDesc}>{f.descripcion}</p>
                      {f.variables && f.variables.length > 0 && (
                        <div className={styles.variables}>
                          {f.variables.map(v => (
                            <div key={v.simbolo} className={styles.variable}>
                              <code className={styles.varSymbol}>{v.simbolo}</code>
                              <span className={styles.varDesc}>{v.descripcion}</span>
                              <span className={styles.varUnit}>[{v.unidad}]</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  <h3 className={styles.subTitle}>Unidades en el Sistema Internacional (SI)</h3>
                  <div className={styles.tableContainer}>
                    <table className={styles.unitTable}>
                      <thead>
                        <tr>
                          <th>Magnitud</th>
                          <th>Unidad</th>
                          <th>Símbolo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {content.unidades.map(u => (
                          <tr key={u.simbolo}>
                            <td>{u.magnitud}</td>
                            <td>{u.unidad}</td>
                            <td><code>{u.simbolo}</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'glosario' && content && (
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <span className="material-symbols-outlined text-corporate">menu_book</span>
                    <h2 className={styles.sectionTitle}>Glosario Técnico</h2>
                  </div>
                  <div className={styles.glossaryList}>
                    {content.glosario.map(g => (
                      <div key={g.termino} className={styles.glossaryCard}>
                        <dt className={styles.glossaryTerm}>{g.termino}</dt>
                        <dd className={styles.glossaryDef}>{g.definicion}</dd>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Desktop Persistent Auxiliary Didactics */}
          <div className={styles.desktopInfo}>
            {content && (
              <>
                <div className={styles.desktopCard}>
                  <div className={styles.cardTitleRow}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--corporate)', fontSize: '18px' }}>functions</span>
                    <h3 className={styles.cardTitle}>Ecuaciones Clave</h3>
                  </div>
                  <div className={styles.formulaMiniList}>
                    {content.formulas.slice(0, 3).map((f, i) => (
                      <div key={i} className={styles.formulaMiniCard}>
                        <div
                          className={styles.formulaMiniExpr}
                          dangerouslySetInnerHTML={{ __html: renderLatex(f.expresion) }}
                        />
                        <span className={styles.formulaMiniDesc}>{f.descripcion}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.desktopCard}>
                  <div className={styles.cardTitleRow}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--gold)', fontSize: '18px' }}>straighten</span>
                    <h3 className={styles.cardTitle}>Unidades SI</h3>
                  </div>
                  <div className={styles.unitsGrid}>
                    {content.unidades.map(u => (
                      <div key={u.simbolo} className={styles.unitChip}>
                        <code className={styles.unitSym}>{u.simbolo}</code>
                        <span className={styles.unitMag}>{u.magnitud}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>
      </main>
    </div>
  )
}
