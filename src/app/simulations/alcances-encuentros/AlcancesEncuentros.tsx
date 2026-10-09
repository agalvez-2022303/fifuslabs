// TODO: Implementar lógica de simulación
import { useState } from 'react'
import styles from './AlcancesEncuentros.module.css'

type RegimeType = 'alcance' | 'encuentro'

export default function AlcancesEncuentros() {
  const [regime, setRegime] = useState<RegimeType>('alcance')
  const [x0A, setX0A] = useState<number>(0)
  const [vA, setVA] = useState<number>(25)
  const [x0B, setX0B] = useState<number>(100)
  const [vB, setVB] = useState<number>(15)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)

  // Cálculos analíticos de presentación
  const relativeSpeed = regime === 'alcance' ? vA - vB : vA + vB
  const tEncuentro = relativeSpeed > 0 ? (x0B - x0A) / relativeSpeed : 0
  const xEncuentro = x0A + vA * tEncuentro

  return (
    <div className={styles.container}>
      {/* Sub-Header / Preajustes */}
      <div className={styles.subHeader}>
        <div className={styles.presetGroup}>
          <span className={styles.presetLabel}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>tune</span>
            Preajustes:
          </span>
          <button
            className={`${styles.presetBtn} ${regime === 'alcance' && vA === 25 ? styles.presetBtnActive : ''}`}
            onClick={() => { setRegime('alcance'); setX0A(0); setVA(25); setX0B(100); setVB(15) }}
            type="button"
          >
            Alcance Clásico (vA &gt; vB)
          </button>
          <button
            className={`${styles.presetBtn} ${regime === 'encuentro' ? styles.presetBtnActive : ''}`}
            onClick={() => { setRegime('encuentro'); setX0A(0); setVA(20); setX0B(200); setVB(10) }}
            type="button"
          >
            Encuentro Frontal (±v)
          </button>
          <button
            className={`${styles.presetBtn} ${regime === 'alcance' && vA === 20 && vB === 15 ? styles.presetBtnActive : ''}`}
            onClick={() => { setRegime('alcance'); setX0A(0); setVA(20); setX0B(80); setVB(15) }}
            type="button"
          >
            Persecución Crítica (Δv = 5 m/s)
          </button>
        </div>
        <span className={styles.badge}>MÓDULO: ALCANCES Y ENCUENTROS</span>
      </div>

      {/* Grid Workbench */}
      <div className={styles.gridWorkbench}>
        {/* Columna Izquierda: Configuración Cinemática */}
        <div className={styles.column}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>tune</span>
                Configuración Cinemática
              </span>
              <span className={styles.badge}>MRU 1D</span>
            </div>

            {/* Selector de Régimen */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Régimen de Movimiento
              </span>
              <div className={styles.regimeToggle}>
                <button
                  className={`${styles.regimeBtn} ${regime === 'alcance' ? styles.regimeBtnActive : ''}`}
                  onClick={() => setRegime('alcance')}
                  type="button"
                >
                  Alcance (vA &gt; vB)
                </button>
                <button
                  className={`${styles.regimeBtn} ${regime === 'encuentro' ? styles.regimeBtnActive : ''}`}
                  onClick={() => setRegime('encuentro')}
                  type="button"
                >
                  Encuentro (Opuestos)
                </button>
              </div>
            </div>

            {/* Móvil A */}
            <div className={styles.movilCard}>
              <div className={styles.movilHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '6px', background: '#2563eb', color: '#fff', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)' }}>
                    A
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: '#2563eb' }}>Móvil A (Perseguidor)</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', background: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  x_A = {x0A} + {vA}t
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div className={styles.sliderRow}>
                  <span style={{ color: 'var(--text-muted)' }}>Posición x₀_A</span>
                  <input
                    type="number"
                    value={x0A}
                    onChange={(e) => setX0A(parseFloat(e.target.value) || 0)}
                    className={styles.numInput}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="150"
                  step="5"
                  value={x0A}
                  onChange={(e) => setX0A(parseFloat(e.target.value))}
                  className={styles.sliderBlue}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div className={styles.sliderRow}>
                  <span style={{ color: 'var(--text-muted)' }}>Velocidad v_A</span>
                  <input
                    type="number"
                    value={vA}
                    onChange={(e) => setVA(parseFloat(e.target.value) || 0)}
                    className={styles.numInput}
                  />
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={vA}
                  onChange={(e) => setVA(parseFloat(e.target.value))}
                  className={styles.sliderBlue}
                />
              </div>
            </div>

            {/* Móvil B */}
            <div className={styles.movilCard}>
              <div className={styles.movilHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '6px', background: '#b45309', color: '#fff', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)' }}>
                    B
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: '#b45309' }}>Móvil B ({regime === 'alcance' ? 'Perseguido' : 'Oponente'})</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', background: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  x_B = {x0B} {regime === 'alcance' ? '+' : '-'} {vB}t
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div className={styles.sliderRow}>
                  <span style={{ color: 'var(--text-muted)' }}>Posición x₀_B</span>
                  <input
                    type="number"
                    value={x0B}
                    onChange={(e) => setX0B(parseFloat(e.target.value) || 0)}
                    className={styles.numInput}
                  />
                </div>
                <input
                  type="range"
                  min="50"
                  max="250"
                  step="5"
                  value={x0B}
                  onChange={(e) => setX0B(parseFloat(e.target.value))}
                  className={styles.sliderGold}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div className={styles.sliderRow}>
                  <span style={{ color: 'var(--text-muted)' }}>Velocidad v_B</span>
                  <input
                    type="number"
                    value={vB}
                    onChange={(e) => setVB(parseFloat(e.target.value) || 0)}
                    className={styles.numInput}
                  />
                </div>
                <input
                  type="range"
                  min="1"
                  max="40"
                  step="1"
                  value={vB}
                  onChange={(e) => setVB(parseFloat(e.target.value))}
                  className={styles.sliderGold}
                />
              </div>
            </div>

            {/* Transport controls */}
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
                {isPlaying ? 'Pausar' : 'Simular'}
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

        {/* Columna Central: Pista 1D y Gráficas de Trayectoria */}
        <div className={styles.stageCard}>
          <div className={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--corporate)' }} />
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
                Pista Lineal 1D y Posiciones
              </span>
            </div>
            <span className={styles.badge}>Rango: 0 - 300 m</span>
          </div>

          {/* Telemetría HUD */}
          <div className={styles.telemetryGrid}>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Tiempo t</span>
              <span className={styles.telemetryValue}>{tEncuentro.toFixed(2)} <small style={{ fontSize: '10px' }}>s</small></span>
            </div>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Posición x_A</span>
              <span className={styles.telemetryValue} style={{ color: '#2563eb' }}>{xEncuentro.toFixed(1)} <small style={{ fontSize: '10px' }}>m</small></span>
            </div>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Posición x_B</span>
              <span className={styles.telemetryValue} style={{ color: '#b45309' }}>{xEncuentro.toFixed(1)} <small style={{ fontSize: '10px' }}>m</small></span>
            </div>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Distancia Δx</span>
              <span className={styles.telemetryValue} style={{ color: '#16a34a' }}>0.0 <small style={{ fontSize: '10px' }}>m</small></span>
            </div>
          </div>

          {/* Track Stage SVG */}
          <div className={styles.trackStage}>
            <svg
              style={{ width: '100%', height: '100%' }}
              viewBox="0 0 320 120"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Pista */}
              <rect x="10" y="55" width="300" height="20" rx="4" fill="#e2e8f0" />
              <line x1="10" y1="65" x2="310" y2="65" stroke="#ffffff" strokeDasharray="6 4" strokeWidth="1.5" />

              {/* Marcas de distancia */}
              {[0, 50, 100, 150, 200, 250, 300].map((val) => {
                const px = 10 + (val / 300) * 300
                return (
                  <g key={val}>
                    <line x1={px} y1="75" x2={px} y2="82" stroke="#94a3b8" strokeWidth="1" />
                    <text x={px} y="92" textAnchor="middle" fill="#94a3b8" fontFamily="JetBrains Mono" fontSize="7">
                      {val}m
                    </text>
                  </g>
                )
              })}

              {/* Móvil A */}
              <g transform={`translate(${10 + (Math.min(xEncuentro, 300) / 300) * 300 - 15}, 35)`}>
                <rect width="24" height="14" rx="3" fill="#2563eb" />
                <circle cx="5" cy="14" r="3" fill="#1e293b" />
                <circle cx="19" cy="14" r="3" fill="#1e293b" />
                <text x="12" y="9" textAnchor="middle" fill="#ffffff" fontFamily="JetBrains Mono" fontSize="6" fontWeight="bold">
                  A
                </text>
              </g>

              {/* Móvil B */}
              <g transform={`translate(${10 + (Math.min(xEncuentro, 300) / 300) * 300 + 5}, 35)`}>
                <rect width="24" height="14" rx="3" fill="#b45309" />
                <circle cx="5" cy="14" r="3" fill="#1e293b" />
                <circle cx="19" cy="14" r="3" fill="#1e293b" />
                <text x="12" y="9" textAnchor="middle" fill="#ffffff" fontFamily="JetBrains Mono" fontSize="6" fontWeight="bold">
                  B
                </text>
              </g>

              {/* Bandera de Encuentro */}
              <g transform={`translate(${10 + (Math.min(xEncuentro, 300) / 300) * 300}, 20)`}>
                <line x1="0" y1="0" x2="0" y2="35" stroke="#dc2626" strokeWidth="1.5" />
                <polygon points="0,0 12,5 0,10" fill="#dc2626" />
              </g>
            </svg>
          </div>

          {/* Dual Interactive Graphs */}
          <div className={styles.miniChartGrid}>
            <div className={styles.miniChartCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--corporate)', textTransform: 'uppercase' }}>
                  ● Posición vs Tiempo x(t)
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>Intersección</span>
              </div>
              <div style={{ height: '64px', width: '100%' }}>
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                  <line x1="0" y1="38" x2="100" y2="38" stroke="#cbd5e1" strokeWidth="1" />
                  <line x1="2" y1="0" x2="2" y2="40" stroke="#cbd5e1" strokeWidth="1" />
                  {/* Traza A */}
                  <line x1="2" y1="38" x2="80" y2="6" stroke="#2563eb" strokeWidth="2" />
                  {/* Traza B */}
                  <line x1="2" y1={regime === 'alcance' ? 24 : 6} x2="80" y2={regime === 'alcance' ? 6 : 38} stroke="#b45309" strokeWidth="2" />
                  <circle cx="80" cy="6" r="3" fill="#dc2626" />
                </svg>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right' }}>
                Punto de intersección: ({tEncuentro.toFixed(1)}s, {xEncuentro.toFixed(0)}m)
              </span>
            </div>

            <div className={styles.miniChartCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>
                  ● Separación d(t) = |xB - xA|
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>d → 0</span>
              </div>
              <div style={{ height: '64px', width: '100%' }}>
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                  <line x1="0" y1="38" x2="100" y2="38" stroke="#cbd5e1" strokeWidth="1" />
                  <line x1="2" y1="6" x2="80" y2="38" stroke="#16a34a" strokeWidth="2" />
                  <circle cx="80" cy="38" r="3" fill="#16a34a" />
                </svg>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right' }}>
                Distancia nula al momento del encuentro
              </span>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Solución Analítica */}
        <div className={styles.column}>
          {/* Card: Tiempo de Encuentro */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.presetLabel}>Solución Exacta</span>
              <span className={styles.badge}>t_encuentro</span>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
              Tiempo transcurrido (t_e)
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span className={styles.bigValue}>{tEncuentro.toFixed(2)}</span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>segundos</span>
            </div>
            <div className={styles.formulaBox}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--corporate)' }}>
                {regime === 'alcance'
                  ? 't_e = (x₀_B - x₀_A) / (v_A - v_B)'
                  : 't_e = (x₀_B - x₀_A) / (v_A + v_B)'}
              </span>
              <span>Tiempo requerido para que las posiciones espaciales coincidan.</span>
            </div>
          </div>

          {/* Card: Posición de Encuentro */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.presetLabel} style={{ color: '#2563eb' }}>Punto de Encuentro</span>
              <span className={styles.badge}>x_encuentro</span>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
              Coordenada espacial (x_e)
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span className={styles.bigValue} style={{ color: '#2563eb' }}>{xEncuentro.toFixed(1)}</span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>metros</span>
            </div>
            <div className={styles.formulaBox}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--corporate)' }}>
                x_e = x₀_A + v_A · t_e
              </span>
              <span>Posición sobre el eje respecto al origen de coordenadas (0.0 m).</span>
            </div>
          </div>

          {/* Didactic Note */}
          <div className={styles.didacticCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: 700, fontSize: 'var(--text-xs)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
              <span>Condición de Alcance</span>
            </div>
            <div style={{ fontSize: '11px', color: '#14532d', lineHeight: 1.4 }}>
              Para que exista alcance en el mismo sentido, la velocidad del perseguidor debe ser estrictamente mayor que la del móvil perseguido (<strong>v_A &gt; v_B</strong>).
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
