import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import {
  type Point2D,
  computeVelocityVsSpeed,
  computeParticlePosition,
} from './physics'
import styles from './VelocidadRapidez.module.css'

interface PointNode {
  id: string
  label: string
  x: number
  y: number
}

interface PresetPath {
  id: string
  name: string
  description: string
  points: { x: number; y: number; label: string }[]
  times: number[]
}

const PRESET_PATHS: PresetPath[] = [
  {
    id: 'roundtrip',
    name: 'Ida y Vuelta 1D (vm = 0)',
    description: 'La partícula viaja 10m al Este y regresa 10m al Oeste.',
    points: [
      { x: 0, y: 0, label: 'A' },
      { x: 10, y: 0, label: 'B' },
      { x: 0, y: 0, label: 'A' },
    ],
    times: [2, 2],
  },
  {
    id: 'l-shape',
    name: 'Trayectoria L (3-4-5)',
    description: '3m al Este y 4m al Norte. Compara distancia (7m) vs desplazamiento (5m).',
    points: [
      { x: 0, y: 0, label: 'A' },
      { x: 3, y: 0, label: 'B' },
      { x: 3, y: 4, label: 'C' },
    ],
    times: [1.5, 2],
  },
  {
    id: 'closed-square',
    name: 'Circuito Cuadrado Cerrado',
    description: '4 tramos que forman un cuadrado regresando al origen.',
    points: [
      { x: 0, y: 0, label: 'A' },
      { x: 6, y: 0, label: 'B' },
      { x: 6, y: 6, label: 'C' },
      { x: 0, y: 6, label: 'D' },
      { x: 0, y: 0, label: 'A' },
    ],
    times: [2, 2, 2, 2],
  },
  {
    id: 'straight',
    name: 'Movimiento Rectilíneo (rm = |vm|)',
    description: 'Un solo sentido: rapidez y magnitud de velocidad son exactamente iguales.',
    points: [
      { x: 0, y: 0, label: 'A' },
      { x: 12, y: 0, label: 'B' },
    ],
    times: [3],
  },
]

export default function VelocidadRapidez() {
  // Puntos de la trayectoria
  const [points, setPoints] = useState<PointNode[]>(() => {
    const p = PRESET_PATHS[0]
    return p.points.map((pt, i) => ({
      id: `pt-${i}-${Date.now()}`,
      label: pt.label,
      x: pt.x,
      y: pt.y,
    }))
  })

  // Tiempos por tramo (en segundos)
  const [segmentTimes, setSegmentTimes] = useState<number[]>([2, 2])
  const [activePreset, setActivePreset] = useState<string>('roundtrip')

  // Controles de simulación
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [simTime, setSimTime] = useState<number>(0)
  const [simSpeed, setSimSpeed] = useState<number>(1.0)

  const rafRef = useRef<number>(0)
  const lastTsRef = useRef<number>(0)

  // Capas visuales
  const [showVectorVm, setShowVectorVm] = useState<boolean>(true)
  const [showDisplacement, setShowDisplacement] = useState<boolean>(true)

  // Conversión a Point2D puro
  const points2D: Point2D[] = useMemo(() => {
    return points.map((p) => ({ x: p.x, y: p.y, label: p.label }))
  }, [points])

  // Cálculo físico global
  const result = useMemo(() => {
    return computeVelocityVsSpeed(points2D, segmentTimes)
  }, [points2D, segmentTimes])

  // Estado de la partícula instantánea
  const particleState = useMemo(() => {
    return computeParticlePosition(simTime, points2D, segmentTimes)
  }, [simTime, points2D, segmentTimes])

  // Animación requestAnimationFrame
  const loop = useCallback(
    (timestamp: number) => {
      if (lastTsRef.current === 0) {
        lastTsRef.current = timestamp
      }
      const dt = Math.min((timestamp - lastTsRef.current) / 1000, 0.1) * simSpeed
      lastTsRef.current = timestamp

      setSimTime((prev) => {
        const next = prev + dt
        if (result.totalTime > 0 && next >= result.totalTime) {
          setIsPlaying(false)
          return result.totalTime
        }
        return next
      })

      rafRef.current = requestAnimationFrame(loop)
    },
    [simSpeed, result.totalTime]
  )

  useEffect(() => {
    if (isPlaying) {
      lastTsRef.current = 0
      rafRef.current = requestAnimationFrame(loop)
    } else {
      cancelAnimationFrame(rafRef.current)
      lastTsRef.current = 0
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying, loop])

  // Cargar preset
  const handleLoadPreset = (preset: PresetPath) => {
    setIsPlaying(false)
    setSimTime(0)
    setActivePreset(preset.id)
    setPoints(
      preset.points.map((pt, i) => ({
        id: `pt-${i}-${Date.now()}`,
        label: pt.label,
        x: pt.x,
        y: pt.y,
      }))
    )
    setSegmentTimes([...preset.times])
  }

  // Modificar tiempo de tramo
  const handleSegmentTimeChange = (index: number, valStr: string) => {
    setActivePreset('')
    const num = parseFloat(valStr)
    setSegmentTimes((prev) => {
      const copy = [...prev]
      copy[index] = isNaN(num) || num <= 0 ? 0.1 : num
      return copy
    })
  }

  const handleReset = () => {
    setIsPlaying(false)
    setSimTime(0)
    lastTsRef.current = 0
  }

  const handleTogglePlay = () => {
    if (particleState.isComplete && simTime > 0) {
      setSimTime(0)
      setIsPlaying(true)
      return
    }
    setIsPlaying((p) => !p)
  }

  // Bounding box SVG dinámico
  const minX = Math.min(-2, ...points.map((p) => p.x)) - 2
  const maxX = Math.max(12, ...points.map((p) => p.x)) + 2
  const minY = Math.min(-2, ...points.map((p) => p.y)) - 2
  const maxY = Math.max(10, ...points.map((p) => p.y)) + 2

  const svgW = 600
  const svgH = 360
  const pad = 40

  const toSvgX = (x: number) => pad + ((x - minX) / (maxX - minX)) * (svgW - 2 * pad)
  const toSvgY = (y: number) => svgH - pad - ((y - minY) / (maxY - minY)) * (svgH - 2 * pad)

  return (
    <div className={styles.container}>
      {/* Sub-Header Presets */}
      <div className={styles.subHeader}>
        <div className={styles.presetGroup}>
          <span className={styles.presetLabel}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>alt_route</span>
            Ejemplos didácticos:
          </span>
          {PRESET_PATHS.map((p) => (
            <button
              key={p.id}
              className={`${styles.presetBtn} ${activePreset === p.id ? styles.presetBtnActive : ''}`}
              onClick={() => handleLoadPreset(p)}
              type="button"
            >
              {p.name}
            </button>
          ))}
        </div>
        <span className={styles.badge}>MÓDULO 4: VELOCIDAD VS RAPIDEZ MEDIA</span>
      </div>

      {/* Grid Principal Workbench */}
      <div className={styles.gridWorkbench}>
        {/* Columna 1: Tramos, Tiempos y Controles */}
        <div className={styles.column}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>timer</span>
                Tramos y Tiempos de Recorrido
              </span>
              <span className={styles.badge}>{segmentTimes.length} TRAMOS</span>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Ajusta el tiempo de duración <span dangerouslySetInnerHTML={{ __html: '$$\\Delta t$$' }} /> de cada tramo:
            </p>

            <div className={styles.segmentList}>
              {segmentTimes.map((tVal, idx) => {
                const pStart = points[idx]
                const pEnd = points[idx + 1]
                if (!pStart || !pEnd) return null
                const dist = Math.hypot(pEnd.x - pStart.x, pEnd.y - pStart.y)

                return (
                  <div key={idx} className={styles.segmentCard}>
                    <div className={styles.segmentHeader}>
                      <span className={styles.segmentBadge}>
                        Tramo {idx + 1}: {pStart.label} → {pEnd.label}
                      </span>
                      <span className={styles.segmentDist}>{dist.toFixed(2)} m</span>
                    </div>

                    <div className={styles.segmentInputsRow}>
                      <label className={styles.segmentLabel}>Duración Δt (s):</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        min="0.1"
                        value={tVal}
                        className={styles.timeInput}
                        onChange={(e) => handleSegmentTimeChange(idx, e.target.value)}
                      />
                      <span className={styles.speedHint}>
                        v_tramo = {(dist / Math.max(0.1, tVal)).toFixed(2)} m/s
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Capas visuales */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Capas Visuales
              </span>
              <label className={styles.layerCheckbox}>
                <input
                  type="checkbox"
                  checked={showVectorVm}
                  onChange={(e) => setShowVectorVm(e.target.checked)}
                />
                <span>Vector Velocidad Media <strong>v⃗_m</strong> (Azul)</span>
              </label>
              <label className={styles.layerCheckbox}>
                <input
                  type="checkbox"
                  checked={showDisplacement}
                  onChange={(e) => setShowDisplacement(e.target.checked)}
                />
                <span>Vector Desplazamiento <strong>Δr⃗</strong> (Dorado)</span>
              </label>
            </div>

            {/* Velocidad de Reproducción */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid var(--border-light)', fontSize: 'var(--text-xs)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Velocidad:</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[0.5, 1.0, 2.0].map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setSimSpeed(sp)}
                    className={`btn btn--secondary ${simSpeed === sp ? styles.presetBtnActive : ''}`}
                    style={{ padding: '2px 8px', fontSize: '11px' }}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
            </div>

            {/* Controles de Simulación */}
            <div className={styles.transportGrid}>
              <button
                className={`btn ${isPlaying ? 'btn--secondary' : 'btn--primary'}`}
                onClick={handleTogglePlay}
                type="button"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
                {isPlaying ? 'Pausar' : particleState.isComplete && simTime > 0 ? 'Repetir' : 'Iniciar'}
              </button>
              <button
                className="btn btn--secondary"
                onClick={handleReset}
                type="button"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>restart_alt</span>
                Reiniciar
              </button>
            </div>
          </div>
        </div>

        {/* Columna 2: Escenario Visual SVG y Telemetría */}
        <div className={styles.stageCard}>
          <div className={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--corporate)' }} />
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
                Visualizador de Trayectoria y Vectores
              </span>
              <span className={styles.badge}>Tiempo t = {particleState.time.toFixed(2)} / {result.totalTime.toFixed(2)} s</span>
            </div>
          </div>

          {/* Telemetría comparativa */}
          <div className={styles.telemetryGrid}>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Distancia Total (d)</span>
              <span className={styles.telemetryValue}>{result.totalDistance.toFixed(2)} <small style={{ fontSize: '10px' }}>m</small></span>
            </div>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Rapidez Media (rm)</span>
              <span className={styles.telemetryValue} style={{ color: 'var(--corporate)' }}>
                {result.avgSpeed.toFixed(2)} <small style={{ fontSize: '10px' }}>m/s</small>
              </span>
            </div>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Desplazamiento (|Δr|)</span>
              <span className={styles.telemetryValue} style={{ color: '#d97706' }}>
                {result.displacementMagnitude.toFixed(2)} <small style={{ fontSize: '10px' }}>m</small>
              </span>
            </div>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Velocidad Media (|vm|)</span>
              <span className={styles.telemetryValue} style={{ color: '#2563eb' }}>
                {result.avgVelocityMag.toFixed(2)} <small style={{ fontSize: '10px' }}>m/s</small>
              </span>
            </div>
          </div>

          {/* SVG Canvas */}
          <div className={styles.svgStageWrapper}>
            <svg viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}>
              <defs>
                <marker id="arrow-disp" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <path d="M 0 1 L 7 4 L 0 7 z" fill="#d97706" />
                </marker>
                <marker id="arrow-vm" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <path d="M 0 1 L 7 4 L 0 7 z" fill="#2563eb" />
                </marker>
              </defs>

              {/* Grid axes */}
              <line x1={pad} y1={toSvgY(0)} x2={svgW - pad} y2={toSvgY(0)} stroke="#e2e8f0" strokeWidth="1" />
              <line x1={toSvgX(0)} y1={pad} x2={toSvgX(0)} y2={svgH - pad} stroke="#e2e8f0" strokeWidth="1" />

              {/* Trayectoria Completa */}
              {points.map((p, idx) => {
                if (idx === points.length - 1) return null
                const pNext = points[idx + 1]
                return (
                  <line
                    key={idx}
                    x1={toSvgX(p.x)}
                    y1={toSvgY(p.y)}
                    x2={toSvgX(pNext.x)}
                    y2={toSvgY(pNext.y)}
                    stroke="#94a3b8"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                )
              })}

              {/* Vector Desplazamiento Δr */}
              {showDisplacement && points.length >= 2 && result.displacementMagnitude > 0.1 && (
                <line
                  x1={toSvgX(points[0].x)}
                  y1={toSvgY(points[0].y)}
                  x2={toSvgX(points[points.length - 1].x)}
                  y2={toSvgY(points[points.length - 1].y)}
                  stroke="#d97706"
                  strokeWidth="2.5"
                  markerEnd="url(#arrow-disp)"
                />
              )}

              {/* Vector Velocidad Media vm (desde el origen del primer punto) */}
              {showVectorVm && points.length >= 2 && result.avgVelocityMag > 0.05 && (
                <line
                  x1={toSvgX(points[0].x)}
                  y1={toSvgY(points[0].y)}
                  x2={toSvgX(points[0].x + result.avgVelocityX * 2)}
                  y2={toSvgY(points[0].y + result.avgVelocityY * 2)}
                  stroke="#2563eb"
                  strokeWidth="3"
                  markerEnd="url(#arrow-vm)"
                />
              )}

              {/* Nodos de la trayectoria */}
              {points.map((p) => (
                <g key={p.id} transform={`translate(${toSvgX(p.x)}, ${toSvgY(p.y)})`}>
                  <circle r="6" fill="#ffffff" stroke="#24346c" strokeWidth="2" />
                  <text y="-10" textAnchor="middle" fill="#172554" fontFamily="JetBrains Mono" fontSize="11" fontWeight="bold">
                    {p.label} ({p.x}, {p.y})
                  </text>
                </g>
              ))}

              {/* Partícula animada */}
              <g transform={`translate(${toSvgX(particleState.currentPos.x)}, ${toSvgY(particleState.currentPos.y)})`}>
                <circle r="9" fill="#c8a932" opacity="0.3" />
                <circle r="5" fill="#24346c" />
                <circle r="2" fill="#ffffff" />
              </g>
            </svg>
          </div>
        </div>

        {/* Columna 3: Análisis y Comparativa Explicativa */}
        <div className={styles.column}>
          {/* Card: Rapidez Media (Escalar) */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Rapidez Media (rm)</span>
              <span className={styles.badge}>ESCALAR</span>
            </div>
            <div className={styles.bigValueRow}>
              <span className={styles.bigValue}>{result.avgSpeed.toFixed(2)}</span>
              <span className={styles.bigUnit}>m/s</span>
            </div>
            <div className={styles.formulaBox}>
              <code className={styles.formulaCode}>{`r_m = \\frac{d}{\\Delta t} = \\frac{${result.totalDistance.toFixed(2)}\\text{ m}}{${result.totalTime.toFixed(2)}\\text{ s}} = ${result.avgSpeed.toFixed(2)}\\text{ m/s}`}</code>
              <span>Cuenta toda la longitud de trayectoria recorrida. Siempre es $\ge 0$.</span>
            </div>
          </div>

          {/* Card: Velocidad Media (Vectorial) */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle} style={{ color: '#2563eb' }}>Velocidad Media (v⃗_m)</span>
              <span className={styles.badge} style={{ color: '#2563eb', backgroundColor: '#eff6ff' }}>VECTORIAL</span>
            </div>
            <div className={styles.bigValueRow}>
              <span className={styles.bigValue} style={{ color: '#2563eb' }}>{result.avgVelocityMag.toFixed(2)}</span>
              <span className={styles.bigUnit}>m/s</span>
            </div>
            <div className={styles.formulaBox}>
              <code className={styles.formulaCode}>{`\\vec{v}_m = \\frac{\\Delta\\vec{r}}{\\Delta t} = ${result.geographicRumbo}`}</code>
              <span>Forma cartesiana: ({result.avgVelocityX.toFixed(2)}î + {result.avgVelocityY.toFixed(2)}ĵ) m/s</span>
            </div>
          </div>

          {/* Card: Explicación Didáctica */}
          <div className={styles.explanationCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e40af', fontWeight: 700, fontSize: 'var(--text-xs)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>school</span>
              <span>Conclusión Física</span>
            </div>
            <p style={{ fontSize: '11px', color: '#1e3a8a', lineHeight: 1.4, margin: 0 }}>
              {result.explanation}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
