import { useState, useMemo } from 'react'
import Header from '../components/Header'
import HeroCanvas from '../components/HeroCanvas'
import SimulationCard from '../components/SimulationCard'
import {
  SIMULATIONS_REGISTRY,
  getByCategory,
  filterByText,
  SHOW_COMING_SOON,
  type SimulationEntry,
} from '../registry/simulations.registry'
import styles from './HomePage.module.css'

const CATEGORY_NAMES: Record<string, string> = {
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

const CATEGORIES = Object.keys(CATEGORY_NAMES)

export default function HomePage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('todas')

  const availableSims = useMemo(
    () => (SHOW_COMING_SOON ? SIMULATIONS_REGISTRY : SIMULATIONS_REGISTRY.filter(s => s.estado === 'active')),
    []
  )

  const filtered: SimulationEntry[] = useMemo(() => {
    let sims = [...availableSims]
    if (filter !== 'todas') sims = sims.filter(s => s.categoriaId === filter)
    if (search.trim()) sims = filterByText(sims, search)
    return sims
  }, [search, filter, availableSims])

  const byCategory = useMemo(() => getByCategory(), [])
  const showSearch = search.trim() || filter !== 'todas'

  return (
    <div className={styles.page}>
      <Header />

      {/* ─── Hero Section ────────────────────────────────────────── */}
      <section className={styles.hero}>
        <HeroCanvas />
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--gold)' }}>
              science
            </span>
            <span>LABORATORIO VIRTUAL DE FÍSICA FUNDAMENTAL</span>
          </div>

          <h1 className={styles.heroTitle}>
            Simuladores <span className={styles.heroAccent}>Computacionales</span>
          </h1>

          <p className={styles.heroSubtitle}>
            Modelado analítico en tiempo real con precisión matemática (IEEE 754 Float64),
            visualización gráfica sincrónica y cálculo vectorial interactivo.
          </p>

          {/* Telemetry Metrics Bar */}
          <div className={styles.metricsDeck}>
            <div className={styles.metricCard}>
              <div className={styles.metricValue}>
                <span className={styles.metricNumber}>{availableSims.length}</span>
                <span className={styles.metricSuffix}>Módulos</span>
              </div>
              <span className={styles.metricLabel}>Simuladores Disponibles</span>
            </div>

            <div className={styles.metricDivider} />

            <div className={styles.metricCard}>
              <div className={styles.metricValue}>
                <span className={styles.metricNumber}>60.0</span>
                <span className={styles.metricSuffix}>FPS</span>
              </div>
              <span className={styles.metricLabel}>Renderizado Sincrónico</span>
            </div>

            <div className={styles.metricDivider} />

            <div className={styles.metricCard}>
              <div className={styles.metricValue}>
                <span className={styles.metricNumber}>Float64</span>
              </div>
              <span className={styles.metricLabel}>Precisión IEEE 754</span>
            </div>

            <div className={styles.metricDivider} />

            <div className={styles.metricCard}>
              <div className={styles.metricValue}>
                <span className={styles.metricNumber}>100%</span>
              </div>
              <span className={styles.metricLabel}>Parámetros Dinámicos</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Control Bar (Search + Categories) ───────────────────── */}
      <section className={styles.controlsBar}>
        <div className={styles.controlsInner}>
          {/* Search Box */}
          <div className={styles.searchWrap}>
            <span className={`material-symbols-outlined ${styles.searchIcon}`} aria-hidden="true">
              search
            </span>
            <input
              id="search-simulations"
              type="search"
              className={styles.searchInput}
              placeholder="Buscar simulación o concepto (p. ej. vectores, MRUA, cinemática)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Buscar simulaciones"
            />
          </div>

          {/* Category Filter Pills */}
          <div className={styles.filtersGroup} role="group" aria-label="Filtrar por categoría">
            <button
              className={`${styles.filterPill} ${filter === 'todas' ? styles.filterPillActive : ''}`}
              onClick={() => setFilter('todas')}
            >
              Todas las áreas
            </button>
            {CATEGORIES.filter(cat =>
              availableSims.some(s => s.categoriaId === cat)
            ).map(cat => (
              <button
                key={cat}
                className={`${styles.filterPill} ${filter === cat ? styles.filterPillActive : ''}`}
                onClick={() => setFilter(cat)}
              >
                {CATEGORY_NAMES[cat]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Simulation Catalog Grid ─────────────────────────────── */}
      <main className={styles.main} id="simulaciones">
        {showSearch ? (
          <section className={styles.categorySection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleRow}>
                <span className="material-symbols-outlined" style={{ color: 'var(--corporate)', fontSize: '20px' }}>
                  filter_list
                </span>
                <h2 className={styles.sectionTitle}>
                  {filtered.length > 0
                    ? `Resultados (${filtered.length} módulo${filtered.length !== 1 ? 's' : ''})`
                    : 'Sin resultados'}
                </h2>
              </div>
            </div>

            {filtered.length > 0 ? (
              <div className={styles.grid}>
                {filtered.map((sim, i) => (
                  <SimulationCard key={sim.id} simulation={sim} index={i} />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--slate-muted)' }}>
                  search_off
                </span>
                <p>No se encontraron simulaciones que coincidan con &quot;{search}&quot;</p>
              </div>
            )}
          </section>
        ) : (
          Object.entries(byCategory).map(([catId, sims]) => (
            <section key={catId} className={styles.categorySection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleRow}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--corporate)', fontSize: '22px' }}>
                    token
                  </span>
                  <h2 className={styles.sectionTitle}>{CATEGORY_NAMES[catId] ?? catId}</h2>
                </div>
                <span className={styles.sectionCount}>
                  {sims.length} módulo{sims.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className={styles.grid}>
                {sims.map((sim, i) => (
                  <SimulationCard key={sim.id} simulation={sim} index={i} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* ─── Academic & Scientific Footer ────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogoIcon}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>science</span>
            </div>
            <div>
              <span className={styles.footerTitle}>FísicaLab Engine v2.4</span>
              <p className={styles.footerSub}>Plataforma de Simulación y Análisis de Física Fundamental</p>
            </div>
          </div>
          <span className={styles.footerTech}>
            Modelado Numérico en React & TypeScript
          </span>
        </div>
      </footer>
    </div>
  )
}
