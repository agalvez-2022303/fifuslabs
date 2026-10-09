import { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
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
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('buscar') === '1' || location.hash === '#search-simulations') {
      const timer = setTimeout(() => {
        const searchInput = document.getElementById('search-simulations') as HTMLInputElement | null
        if (searchInput) {
          searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
          searchInput.focus()
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [location.search, location.hash])

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

  const scrollToSection = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className={styles.page}>
      <Header />

      {/* ─── Hero Section ────────────────────────────────────────── */}
      <section className={styles.hero}>
        <HeroCanvas />

        <div className={styles.heroContent}>
          <div className={styles.heroHeaderBlock}>
            <div className={styles.heroBadge}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--corporate)' }}>
                science
              </span>
              <span>Laboratorio virtual de física</span>
            </div>

            <h1 className={styles.heroTitle}>
              Aprende física <span className={styles.heroAccent}>viendo cómo funciona</span>
            </h1>

            <p className={styles.heroSubtitle}>
              Practica con simulaciones interactivas, consulta fórmulas, explora el glosario y refuerza tu teoría de cada tema.
            </p>

            {/* Stats Reales */}
            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <span className={styles.statNumber}>{availableSims.length}</span>
                <span className={styles.statLabel}>Temas interactivos</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statCard}>
                <span className={styles.statNumber}>4</span>
                <span className={styles.statLabel}>Secciones por tema</span>
              </div>
            </div>

            {/* Botones de acción */}
            <div className={styles.actionButtons}>
              <a href="#simulaciones" className={styles.btnPrimary} onClick={scrollToSection('simulaciones')}>
                <span className="material-symbols-outlined">explore</span>
                <span>Empezar a explorar</span>
              </a>
              <a href="#como-funciona" className={styles.btnSecondary} onClick={scrollToSection('como-funciona')}>
                <span className="material-symbols-outlined">help_outline</span>
                <span>Ver cómo funciona</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Bloque "¿Cómo funciona?" ───────────────────────────── */}
      <section className={styles.howItWorksSection} id="como-funciona">
        <div className={styles.howItWorksInner}>
          <details className={styles.howDetails}>
            <summary className={styles.howSummary}>
              <span className={styles.howSummaryText}>
                <span className={styles.howTitle}>¿Cómo funciona FísicaLab?</span>
                <span className={styles.howDesc}>4 pasos sencillos para dominar cualquier concepto a tu ritmo</span>
              </span>
              <span className={`material-symbols-outlined ${styles.howChevron}`} aria-hidden="true">
                expand_more
              </span>
            </summary>

            <div className={styles.stepsGrid}>
              <div className={styles.stepCard}>
                <div className={styles.stepBadge}>1</div>
                <div className={styles.stepIconBox}>
                  <span className="material-symbols-outlined">touch_app</span>
                </div>
                <h3 className={styles.stepTitle}>Elige un tema</h3>
                <p className={styles.stepText}>Explora vectores, cinemática, velocidad, alcance de móviles y estática.</p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepBadge}>2</div>
                <div className={styles.stepIconBox}>
                  <span className="material-symbols-outlined">tune</span>
                </div>
                <h3 className={styles.stepTitle}>Juega con la simulación</h3>
                <p className={styles.stepText}>Ajusta variables en tiempo real y observa la respuesta gráfica inmediata.</p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepBadge}>3</div>
                <div className={styles.stepIconBox}>
                  <span className="material-symbols-outlined">functions</span>
                </div>
                <h3 className={styles.stepTitle}>Repasa fórmulas y glosario</h3>
                <p className={styles.stepText}>Comprueba ecuaciones despejadas y definiciones claras de cada magnitud.</p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepBadge}>4</div>
                <div className={styles.stepIconBox}>
                  <span className="material-symbols-outlined">menu_book</span>
                </div>
                <h3 className={styles.stepTitle}>Lee la teoría</h3>
                <p className={styles.stepText}>Consolida tu aprendizaje con explicaciones conceptuales y paso a paso.</p>
              </div>
            </div>
          </details>
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

      <Footer />
    </div>
  )
}
