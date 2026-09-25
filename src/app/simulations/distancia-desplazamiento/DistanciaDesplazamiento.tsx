// TODO: Implementar lógica de simulación
import { useState } from 'react'
import styles from './DistanciaDesplazamiento.module.css'

type PresetType = 'sinuous' | 'closed' | 'linear' | 'parabola'

export default function DistanciaDesplazamiento() {
  const [preset, setPreset] = useState<PresetType>('sinuous')
  const [speed, setSpeed] = useState<number>(2.5)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [showTrajectory, setShowTrajectory] = useState<boolean>(true)
  const [showDisplacement, setShowDisplacement] = useState<boolean>(true)
  const [showOdometer, setShowOdometer] = useState<boolean>(true)
  const [showGrid, setShowGrid] = useState<boolean>(true)

  // Valores mockeados de presentación según el diseño Stitch
  const time = 3.23
  const distance = 8.08
  const displacementMag = 7.21
  const efficiency = 89.1

  return (
    <div className={styles.container}>
      {/* Barra de Sub-Header / Preajustes de topología */}
      <div className={styles.subHeader}>
        <div className={styles.presetGroup}>
          <span className={styles.presetLabel}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>alt_route</span>
            Topología:
          </span>
          <button
            className={`${styles.presetBtn} ${preset === 'sinuous' ? styles.presetBtnActive : ''}`}
            onClick={() => setPreset('sinuous')}
            type="button"
          >
            Sinuosa A-B-C-D
          </button>
          <button
            className={`${styles.presetBtn} ${preset === 'closed' ? styles.presetBtnActive : ''}`}
            onClick={() => setPreset('closed')}
            type="button"
          >
            Circuito Cerrado (Δr = 0)
          </button>
          <button
            className={`${styles.presetBtn} ${preset === 'linear' ? styles.presetBtnActive : ''}`}
            onClick={() => setPreset('linear')}
            type="button"
          >
            Ida y Vuelta 1D
          </button>
          <button
            className={`${styles.presetBtn} ${preset === 'parabola' ? styles.presetBtnActive : ''}`}
            onClick={() => setPreset('parabola')}
            type="button"
          >
            Parabólica 2D
          </button>
        </div>
        <span className={styles.badge}>MÓDULO 3: CINEMÁTICA</span>
      </div>

      {/* Grid principal de 3 columnas */}
      <div className={styles.gridWorkbench}>
        {/* Columna Izquierda: Controles y Configuración */}
        <div className={styles.column}>
          {/* Card: Topología de Ruta */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>route</span>
                Topología de Ruta
              </span>
              <span className={styles.badge}>MODO 2D</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                className={`${styles.radioOption} ${preset === 'sinuous' ? styles.radioOptionActive : ''}`}
                onClick={() => setPreset('sinuous')}
              >
                <input
                  type="radio"
                  name="trajectory"
                  checked={preset === 'sinuous'}
                  onChange={() => setPreset('sinuous')}
                />
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Ruta Sinuosa A-B-C-D</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Curvas en 4 cuadrantes</div>
                </div>
              </label>

              <label
                className={`${styles.radioOption} ${preset === 'closed' ? styles.radioOptionActive : ''}`}
                onClick={() => setPreset('closed')}
              >
                <input
                  type="radio"
                  name="trajectory"
                  checked={preset === 'closed'}
                  onChange={() => setPreset('closed')}
                />
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Circuito Cerrado (Δr = 0)</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Retorno exacto al inicio</div>
                </div>
              </label>

              <label
                className={`${styles.radioOption} ${preset === 'linear' ? styles.radioOptionActive : ''}`}
                onClick={() => setPreset('linear')}
              >
                <input
                  type="radio"
                  name="trajectory"
                  checked={preset === 'linear'}
                  onChange={() => setPreset('linear')}
                />
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Ida y Vuelta 1D Lineal</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Inversión sobre eje X</div>
                </div>
              </label>
            </div>

            {/* Tabla de Waypoints */}
            <div style={{ marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Nodos Clave (Waypoints)
                </span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--corporate)', fontWeight: 700 }}>
                  4 PUNTOS
                </span>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Nodo</th>
                      <th>Coord (m)</th>
                      <th style={{ textAlign: 'right' }}>Rol</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 700, color: 'var(--corporate)' }}>A</td>
                      <td>(0.0, 0.0)</td>
                      <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>Origen</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, color: 'var(--corporate)' }}>B</td>
                      <td>(4.0, 6.0)</td>
                      <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>Vértice</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, color: 'var(--corporate)' }}>C</td>
                      <td>(8.0, 2.0)</td>
                      <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>Inflexión</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, color: 'var(--corporate)' }}>D</td>
                      <td>(12.0, 8.0)</td>
                      <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>Destino</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Card: Cinemática del Móvil */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>speed</span>
                Cinemática del Móvil
              </span>
              <span className={styles.badge}>|v| = {speed.toFixed(2)} m/s</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className={styles.sliderRow}>
                <span style={{ color: 'var(--text-muted)' }}>Rapidez Tangencial</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{speed.toFixed(2)} m/s</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.25"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className={styles.slider}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Capas Visuales
              </span>
              <label className={styles.layerCheckbox}>
                <input
                  type="checkbox"
                  checked={showTrajectory}
                  onChange={(e) => setShowTrajectory(e.target.checked)}
                />
                <span>Trazo de trayectoria real <strong>s(t)</strong></span>
              </label>
              <label className={styles.layerCheckbox}>
                <input
                  type="checkbox"
                  checked={showDisplacement}
                  onChange={(e) => setShowDisplacement(e.target.checked)}
                />
                <span>Vector desplazamiento <strong>Δr(t)</strong></span>
              </label>
              <label className={styles.layerCheckbox}>
                <input
                  type="checkbox"
                  checked={showOdometer}
                  onChange={(e) => setShowOdometer(e.target.checked)}
                />
                <span>Odómetro dinámico flotante</span>
              </label>
              <label className={styles.layerCheckbox}>
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                />
                <span>Retícula ortogonal</span>
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

        {/* Columna Central: Lienzo Cartesiano y Gráficas */}
        <div className={styles.stageCard}>
          <div className={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--corporate)' }} />
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
                Plano Cartesiano [X vs Y]
              </span>
              <span className={styles.badge}>1 DIV = 1.0 M</span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button className="btn btn--secondary" style={{ padding: '4px 8px' }} title="Acercar">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>zoom_in</span>
              </button>
              <button className="btn btn--secondary" style={{ padding: '4px 8px' }} title="Alejar">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>zoom_out</span>
              </button>
              <button className="btn btn--secondary" style={{ padding: '4px 8px' }} title="Encuadre">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>fit_screen</span>
              </button>
            </div>
          </div>

          {/* HUD Telemetría */}
          <div className={styles.telemetryGrid}>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Tiempo (t)</span>
              <div>
                <span className={styles.telemetryValue}>{time.toFixed(2)}</span>
                <span className={styles.telemetryUnit}>s</span>
              </div>
            </div>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Longitud Arco s(t)</span>
              <div>
                <span className={styles.telemetryValue}>{distance.toFixed(2)}</span>
                <span className={styles.telemetryUnit}>m</span>
              </div>
            </div>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Desplazamiento |Δr|</span>
              <div>
                <span className={styles.telemetryValue} style={{ color: '#d97706' }}>{displacementMag.toFixed(2)}</span>
                <span className={styles.telemetryUnit}>m</span>
              </div>
            </div>
          </div>

          {/* SVG Canvas Stage */}
          <div className={styles.svgStageWrapper}>
            <svg
              style={{ width: '100%', height: '100%' }}
              viewBox="-2 -2 16 12"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <marker
                  id="arrow-disp"
                  markerWidth="8"
                  markerHeight="8"
                  refX="6"
                  refY="4"
                  orient="auto"
                >
                  <path d="M 0 1 L 7 4 L 0 7 z" fill="#d97706" />
                </marker>
              </defs>

              {/* Grid */}
              {showGrid && (
                <g opacity="0.85">
                  <line x1="-2" y1="0" x2="15" y2="0" stroke="#94a3b8" strokeWidth="0.08" />
                  <line x1="0" y1="-2" x2="0" y2="11" stroke="#94a3b8" strokeWidth="0.08" />
                  <g stroke="#e2e8f0" strokeDasharray="0.1 0.1" strokeWidth="0.04">
                    <line x1="-2" y1="2" x2="15" y2="2" />
                    <line x1="-2" y1="4" x2="15" y2="4" />
                    <line x1="-2" y1="6" x2="15" y2="6" />
                    <line x1="-2" y1="8" x2="15" y2="8" />
                    <line x1="2" y1="-2" x2="2" y2="11" />
                    <line x1="4" y1="-2" x2="4" y2="11" />
                    <line x1="6" y1="-2" x2="6" y2="11" />
                    <line x1="8" y1="-2" x2="8" y2="11" />
                    <line x1="10" y1="-2" x2="10" y2="11" />
                    <line x1="12" y1="-2" x2="12" y2="11" />
                  </g>
                </g>
              )}

              {/* Ghost track */}
              <path
                d="M 0 0 Q 2 7, 4 6 T 8 2 T 12 8"
                fill="none"
                stroke="#cbd5e1"
                strokeDasharray="0.15 0.15"
                strokeWidth="0.09"
              />

              {/* Real trajectory path */}
              {showTrajectory && (
                <path
                  d="M 0 0 Q 2 7, 4 6"
                  fill="none"
                  stroke="#24346c"
                  strokeLinecap="round"
                  strokeWidth="0.15"
                />
              )}

              {/* Displacement vector */}
              {showDisplacement && (
                <g>
                  <line
                    x1="0"
                    y1="0"
                    x2="3.96"
                    y2="6.02"
                    stroke="#d97706"
                    strokeDasharray="0.25 0.12"
                    strokeWidth="0.13"
                    markerEnd="url(#arrow-disp)"
                  />
                  <text
                    x="2.0"
                    y="2.8"
                    fill="#b45309"
                    fontFamily="JetBrains Mono, monospace"
                    fontSize="0.4"
                    fontWeight="bold"
                  >
                    Δr
                  </text>
                </g>
              )}

              {/* Waypoints */}
              <g>
                <circle cx="0" cy="0" r="0.24" fill="#24346c" />
                <circle cx="0" cy="0" r="0.09" fill="#ffffff" />
                <text x="-0.3" y="-0.4" fill="#24346c" fontFamily="Plus Jakarta Sans" fontSize="0.38" fontWeight="bold">A (0,0)</text>

                <circle cx="4" cy="6" r="0.2" fill="#94a3b8" />
                <circle cx="4" cy="6" r="0.08" fill="#ffffff" />
                <text x="4.3" y="6.3" fill="#475569" fontFamily="Plus Jakarta Sans" fontSize="0.36" fontWeight="600">B (4,6)</text>

                <circle cx="8" cy="2" r="0.2" fill="#94a3b8" />
                <circle cx="8" cy="2" r="0.08" fill="#ffffff" />
                <text x="8.3" y="1.8" fill="#475569" fontFamily="Plus Jakarta Sans" fontSize="0.36" fontWeight="600">C (8,2)</text>

                <circle cx="12" cy="8" r="0.24" fill="#24346c" />
                <circle cx="12" cy="8" r="0.09" fill="#c8a932" />
                <text x="12.3" y="8.3" fill="#24346c" fontFamily="Plus Jakarta Sans" fontSize="0.38" fontWeight="bold">D (12,8)</text>
              </g>

              {/* Particle */}
              <g transform="translate(3.96, 6.02)">
                <circle r="0.35" fill="#c8a932" opacity="0.35" />
                <circle r="0.22" fill="#24346c" />
                <circle r="0.08" fill="#ffffff" />

                {showOdometer && (
                  <g transform="translate(0, -0.65)">
                    <rect x="-1.35" y="-0.4" width="2.7" height="0.46" rx="0.1" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.03" />
                    <text x="0" y="-0.09" textAnchor="middle" fill="#24346c" fontFamily="JetBrains Mono" fontSize="0.24" fontWeight="bold">
                      s = {distance.toFixed(2)} m
                    </text>
                  </g>
                )}
              </g>
            </svg>
          </div>

          {/* Progress Bar */}
          <div className={styles.progressBarContainer}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Progreso del Recorrido (Longitud total: 22.45 m)</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--corporate)' }}>36.0%</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressBarFill} style={{ width: '36%' }} />
            </div>
          </div>

          {/* Comparative Mini-Charts */}
          <div className={styles.miniChartGrid}>
            <div className={styles.miniChartCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--corporate)', textTransform: 'uppercase' }}>
                  ● s(t) • Creciente
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>ds/dt = |v| &gt; 0</span>
              </div>
              <div style={{ height: '56px', width: '100%' }}>
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                  <path d="M 0 40 L 0 38 Q 20 32, 36 25 Q 60 14, 100 2 L 100 40 Z" fill="#24346c" fillOpacity="0.08" />
                  <path d="M 0 38 Q 20 32, 36 25 Q 60 14, 100 2" fill="none" stroke="#24346c" strokeWidth="2" />
                  <circle cx="36" cy="25" r="3" fill="#c8a932" />
                </svg>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right' }}>
                Acumula longitud sin retroceder
              </span>
            </div>

            <div className={styles.miniChartCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
                  ● |Δr(t)| • Vectorial
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>Acotado por s(t)</span>
              </div>
              <div style={{ height: '56px', width: '100%' }}>
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                  <path d="M 0 40 L 0 40 Q 20 18, 36 22 Q 55 35, 75 16 T 100 8 L 100 40 Z" fill="#d97706" fillOpacity="0.12" />
                  <path d="M 0 40 Q 20 18, 36 22 Q 55 35, 75 16 T 100 8" fill="none" stroke="#d97706" strokeDasharray="3 2" strokeWidth="2" />
                  <circle cx="36" cy="22" r="3" fill="#24346c" />
                </svg>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right' }}>
                Puede aumentar o disminuir
              </span>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Comparativa Escalar vs Vectorial */}
        <div className={styles.column}>
          {/* Card: Magnitud Escalar */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.presetLabel}>Magnitud Escalar</span>
              <span className={styles.badge}>Longitud Real</span>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
              Distancia Recorrida (s)
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span className={styles.bigValue}>{distance.toFixed(2)}</span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>metros</span>
            </div>
            <div className={styles.formulaBox}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--corporate)' }}>
                s = ∫₀ᵗ |v(t)| dt
              </span>
              <span>Depende de la geometría del camino. Odómetro acumulativo siempre creciente.</span>
            </div>
          </div>

          {/* Card: Magnitud Vectorial */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.presetLabel} style={{ color: '#b45309' }}>Magnitud Vectorial</span>
              <span className={styles.badge} style={{ color: '#b45309', background: '#fffbeb', borderColor: '#fef3c7' }}>
                Línea Recta
              </span>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
              Desplazamiento Neto (Δr)
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span className={styles.bigValue} style={{ color: '#d97706' }}>{displacementMag.toFixed(2)}</span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>metros</span>
            </div>
            <div className={styles.formulaBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Canónica:</span>
                <span style={{ fontWeight: 700, color: 'var(--corporate)' }}>3.96 î + 6.02 ĵ m</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Ángulo:</span>
                <span style={{ fontWeight: 600, color: 'var(--corporate)' }}>θ = 56.6°</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '4px', fontSize: '10px' }}>
                Definición: Δr = r_f - r_0
              </div>
            </div>
          </div>

          {/* Card: Teorema de la Trayectoria */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>balance</span>
                Teorema
              </span>
            </div>
            <div style={{ textAlign: 'center', padding: '8px', background: 'var(--surface-alt)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--corporate)' }}>
                s(t) ≥ |Δr(t)|
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                La distancia jamás puede ser menor al módulo del desplazamiento.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Eficiencia (|Δr| / s):</span>
                <span style={{ fontWeight: 700, color: 'var(--corporate)' }}>{efficiency.toFixed(1)}%</span>
              </div>
              <div className={styles.efficiencyBar}>
                <div className={styles.efficiencyFill} style={{ width: `${efficiency}%` }} />
              </div>
            </div>
          </div>

          {/* Concept Note */}
          <div className={styles.conceptCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', fontWeight: 700, fontSize: 'var(--text-xs)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>lightbulb</span>
              <span>Concepto Clave</span>
            </div>
            <div style={{ fontSize: '11px', color: '#78350f', lineHeight: 1.4 }}>
              En un circuito cerrado, el móvil regresa al origen (<strong>r_f = r_0 ⇒ Δr = 0</strong>), a pesar de haber recorrido una distancia <strong>s &gt; 0</strong>.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
