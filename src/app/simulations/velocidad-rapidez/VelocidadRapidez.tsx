// TODO: Implementar lógica de simulación
import { useState } from 'react'
import styles from './VelocidadRapidez.module.css'

type TopologyType = 'circ' | 'oval' | 'bern' | 'mru'

export default function VelocidadRapidez() {
  const [topology, setTopology] = useState<TopologyType>('circ')
  const [speed, setSpeed] = useState<number>(12)
  const [radius, setRadius] = useState<number>(10)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [showVelocityVector, setShowVelocityVector] = useState<boolean>(true)
  const [showTangent, setShowTangent] = useState<boolean>(true)
  const [showPositionVector, setShowPositionVector] = useState<boolean>(true)

  // Valores mockeados de presentación según el diseño Stitch
  const period = 5.24
  const avgSpeed = 12.0
  const avgVelocity = 0.0
  const centripetalAcc = 14.4

  return (
    <div className={styles.container}>
      {/* Barra de Sub-Header / Preajustes Rápidos */}
      <div className={styles.subHeader}>
        <div className={styles.presetGroup}>
          <span className={styles.presetLabel}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>tune</span>
            Preajustes Rápidos:
          </span>
          <button
            className={`${styles.presetBtn} ${topology === 'circ' && radius === 10 ? styles.presetBtnActive : ''}`}
            onClick={() => { setTopology('circ'); setRadius(10); setSpeed(12) }}
            type="button"
          >
            R=10m, v=12m/s
          </button>
          <button
            className={`${styles.presetBtn} ${topology === 'circ' && radius === 14 ? styles.presetBtnActive : ''}`}
            onClick={() => { setTopology('circ'); setRadius(14); setSpeed(20) }}
            type="button"
          >
            R=14m, v=20m/s
          </button>
          <button
            className={`${styles.presetBtn} ${topology === 'oval' ? styles.presetBtnActive : ''}`}
            onClick={() => { setTopology('oval'); setSpeed(6) }}
            type="button"
          >
            Óvalo Olímpico
          </button>
          <button
            className={`${styles.presetBtn} ${topology === 'bern' ? styles.presetBtnActive : ''}`}
            onClick={() => { setTopology('bern'); setSpeed(15) }}
            type="button"
          >
            Lemniscata ∞
          </button>
        </div>
        <span className={styles.badge}>MÓDULO 4: CINEMÁTICA</span>
      </div>

      {/* Grid principal de 3 columnas */}
      <div className={styles.gridWorkbench}>
        {/* Columna Izquierda: Parámetros y Trayectoria */}
        <div className={styles.column}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>schema</span>
                Trayectoria &amp; Parámetros
              </span>
              <span className={styles.badge}>MODO ORBITAL</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Topología Orbital
              </span>
              <button
                className={`${styles.topoButton} ${topology === 'circ' ? styles.topoButtonActive : ''}`}
                onClick={() => setTopology('circ')}
                type="button"
              >
                <span>Pista Circular (Radio R)</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>2πR</span>
              </button>
              <button
                className={`${styles.topoButton} ${topology === 'oval' ? styles.topoButtonActive : ''}`}
                onClick={() => setTopology('oval')}
                type="button"
              >
                <span>Óvalo Olímpico</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>Elipse</span>
              </button>
              <button
                className={`${styles.topoButton} ${topology === 'bern' ? styles.topoButtonActive : ''}`}
                onClick={() => setTopology('bern')}
                type="button"
              >
                <span>Curva Lemniscata</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>Lazo ∞</span>
              </button>
              <button
                className={`${styles.topoButton} ${topology === 'mru' ? styles.topoButtonActive : ''}`}
                onClick={() => setTopology('mru')}
                type="button"
              >
                <span>Oscilador Lineal (1D)</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>Armónico</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div className={styles.sliderRow}>
                  <span style={{ color: 'var(--text-muted)' }}>Rapidez Escalar |v|</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{speed.toFixed(1)} m/s</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="30"
                  step="1"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className={styles.slider}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div className={styles.sliderRow}>
                  <span style={{ color: 'var(--text-muted)' }}>Radio de Giro (R)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{radius.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="20"
                  step="1"
                  value={radius}
                  onChange={(e) => setRadius(parseFloat(e.target.value))}
                  className={styles.slider}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Capas Visuales
              </span>
              <label className={styles.layerCheckbox}>
                <input
                  type="checkbox"
                  checked={showVelocityVector}
                  onChange={(e) => setShowVelocityVector(e.target.checked)}
                />
                <span>Vector Velocidad <strong>v⃗(t)</strong> (Tangencial)</span>
              </label>
              <label className={styles.layerCheckbox}>
                <input
                  type="checkbox"
                  checked={showTangent}
                  onChange={(e) => setShowTangent(e.target.checked)}
                />
                <span>Línea Recta Tangente</span>
              </label>
              <label className={styles.layerCheckbox}>
                <input
                  type="checkbox"
                  checked={showPositionVector}
                  onChange={(e) => setShowPositionVector(e.target.checked)}
                />
                <span>Vector Posición <strong>r⃗(t)</strong></span>
              </label>
            </div>

            <div className={styles.transportGrid}>
              <button
                className={`btn ${isPlaying ? 'btn--secondary' : 'btn--primary'}`}
                onClick={() => setIsPlaying((p) => !p)}
                type="button"
                style={{ fontSize: 'var(--text-xs)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
                {isPlaying ? 'Pausar' : 'Iniciar'}
              </button>
              <button
                className="btn btn--secondary"
                type="button"
                style={{ fontSize: 'var(--text-xs)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>skip_next</span>
                Paso
              </button>
              <button
                className="btn btn--secondary"
                type="button"
                style={{ fontSize: 'var(--text-xs)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>restart_alt</span>
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Columna Central: Escenario Visual y Gráficas Dinámicas */}
        <div className={styles.stageCard}>
          <div className={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--corporate)' }} />
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
                Visualizador de Órbita y Vectores
              </span>
              <span className={styles.badge}>R = {radius} m</span>
            </div>
          </div>

          {/* Telemetría HUD */}
          <div className={styles.telemetryGrid}>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Rapidez |v|</span>
              <span className={styles.telemetryValue}>{speed.toFixed(1)} <small style={{ fontSize: '10px' }}>m/s</small></span>
            </div>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Velocidad Media Vm</span>
              <span className={styles.telemetryValue} style={{ color: '#2563eb' }}>{avgVelocity.toFixed(1)} <small style={{ fontSize: '10px' }}>m/s</small></span>
            </div>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Periodo (T)</span>
              <span className={styles.telemetryValue}>{period.toFixed(2)} <small style={{ fontSize: '10px' }}>s</small></span>
            </div>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Acel. Centrípeta</span>
              <span className={styles.telemetryValue} style={{ color: '#d97706' }}>{centripetalAcc.toFixed(1)} <small style={{ fontSize: '10px' }}>m/s²</small></span>
            </div>
          </div>

          {/* SVG Orbit Stage */}
          <div className={styles.svgStageWrapper}>
            <svg
              style={{ width: '100%', height: '100%' }}
              viewBox="-25 -25 50 50"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <marker id="arrow-vel" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M 0 0 L 6 3 L 0 6 z" fill="#2563eb" />
                </marker>
                <marker id="arrow-pos" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M 0 0 L 6 3 L 0 6 z" fill="#94a3b8" />
                </marker>
              </defs>

              {/* Grid / Coords */}
              <line x1="-24" y1="0" x2="24" y2="0" stroke="#e2e8f0" strokeWidth="0.5" />
              <line x1="0" y1="-24" x2="0" y2="24" stroke="#e2e8f0" strokeWidth="0.5" />

              {/* Circular Orbit */}
              <circle cx="0" cy="0" r={radius} fill="none" stroke="#cbd5e1" strokeDasharray="1 1" strokeWidth="0.6" />

              {/* Position vector */}
              {showPositionVector && (
                <line x1="0" y1="0" x2={radius * 0.707} y2={-radius * 0.707} stroke="#94a3b8" strokeWidth="0.8" markerEnd="url(#arrow-pos)" />
              )}

              {/* Tangent line */}
              {showTangent && (
                <line x1={radius * 0.707 - 10} y1={-radius * 0.707 - 10} x2={radius * 0.707 + 10} y2={-radius * 0.707 + 10} stroke="#cbd5e1" strokeWidth="0.4" strokeDasharray="0.8 0.8" />
              )}

              {/* Tangent velocity vector */}
              {showVelocityVector && (
                <g>
                  <line
                    x1={radius * 0.707}
                    y1={-radius * 0.707}
                    x2={radius * 0.707 - 8}
                    y2={-radius * 0.707 - 8}
                    stroke="#2563eb"
                    strokeWidth="1.2"
                    markerEnd="url(#arrow-vel)"
                  />
                  <text
                    x={radius * 0.707 - 9}
                    y={-radius * 0.707 - 9}
                    fill="#2563eb"
                    fontFamily="JetBrains Mono"
                    fontSize="2"
                    fontWeight="bold"
                  >
                    v⃗(t)
                  </text>
                </g>
              )}

              {/* Center */}
              <circle cx="0" cy="0" r="1" fill="#24346c" />

              {/* Orbiting Particle */}
              <g transform={`translate(${radius * 0.707}, ${-radius * 0.707})`}>
                <circle r="2.2" fill="#c8a932" opacity="0.3" />
                <circle r="1.4" fill="#24346c" />
                <circle r="0.5" fill="#ffffff" />
              </g>
            </svg>
          </div>

          {/* Mini-Charts */}
          <div className={styles.miniChartGrid}>
            <div className={styles.miniChartCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--corporate)', textTransform: 'uppercase' }}>
                  ● Rapidez Escalar v(t)
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>Constante: 12 m/s</span>
              </div>
              <div style={{ height: '56px', width: '100%' }}>
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                  <line x1="0" y1="20" x2="100" y2="20" stroke="#24346c" strokeWidth="2.5" />
                </svg>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right' }}>
                La rapidez instantánea no cambia
              </span>
            </div>

            <div className={styles.miniChartCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>
                  ● Velocidad Media Vm
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>Por ciclo: 0 m/s</span>
              </div>
              <div style={{ height: '56px', width: '100%' }}>
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                  <path d="M 0 20 Q 25 5, 50 20 T 100 20" fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="3 2" />
                </svg>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right' }}>
                El vector velocidad cambia continuamente
              </span>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Análisis Escalar vs Vectorial */}
        <div className={styles.column}>
          {/* Card: Rapidez Escalar */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.presetLabel}>Escalar</span>
              <span className={styles.badge}>Módulo</span>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
              Rapidez Media (r_m)
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span className={styles.bigValue}>{avgSpeed.toFixed(1)}</span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>m/s</span>
            </div>
            <div className={styles.formulaBox}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--corporate)' }}>
                r_m = s / Δt = (2πR) / T
              </span>
              <span>Razón de distancia recorrida por unidad de tiempo. Siempre no negativa.</span>
            </div>
          </div>

          {/* Card: Velocidad Vectorial */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.presetLabel} style={{ color: '#2563eb' }}>Vectorial</span>
              <span className={styles.badge} style={{ color: '#2563eb', background: '#eff6ff', borderColor: '#dbeafe' }}>
                Direccional
              </span>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
              Velocidad Media en 1 Ciclo (V_m)
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span className={styles.bigValue} style={{ color: '#2563eb' }}>{avgVelocity.toFixed(1)}</span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>m/s</span>
            </div>
            <div className={styles.formulaBox}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--corporate)' }}>
                V_m = Δr⃗ / Δt = 0 m/s
              </span>
              <span>Al completar 1 ciclo, Δr⃗ = 0⃗, lo que anula la velocidad media.</span>
            </div>
          </div>

          {/* Paradox Card */}
          <div className={styles.paradoxCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e40af', fontWeight: 700, fontSize: 'var(--text-xs)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>info</span>
              <span>Paradoja del Movimiento Periódico</span>
            </div>
            <div style={{ fontSize: '11px', color: '#1e3a8a', lineHeight: 1.4 }}>
              Un objeto puede viajar a <strong>12 m/s</strong> de rapidez constante durante horas y tener una velocidad media nula (<strong>V_m = 0</strong>) si regresa al mismo punto.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
