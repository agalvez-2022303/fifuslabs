import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {
  type Point2D,
  type RoutePreset,
  ROUTE_PRESETS,
  computePath,
  computeMotionState,
  computeBoundingBox,
  computeTotalDuration,
} from './physics'
import styles from './DistanciaDesplazamiento.module.css'

interface NodeItem {
  id: string
  label: string
  x: number
  y: number
  draftX: string
  draftY: string
}

function getLabelForIndex(index: number): string {
  if (index < 26) {
    return String.fromCharCode(65 + index)
  }
  const prefix = String.fromCharCode(65 + Math.floor(index / 26) - 1)
  const suffix = String.fromCharCode(65 + (index % 26))
  return `${prefix}${suffix}`
}

function renderLatex(expr: string, displayMode = false): string {
  try {
    return katex.renderToString(expr, { throwOnError: false, displayMode })
  } catch {
    return expr
  }
}

export default function DistanciaDesplazamiento() {
  // ─── 1. Estado de Nodos Clave ──────────────────────────────────
  const [nodes, setNodes] = useState<NodeItem[]>(() => {
    const defaultPreset = ROUTE_PRESETS[0] // Ruta sinuosa
    return defaultPreset.nodes.map((n, i) => ({
      id: `node-${i}-${Date.now()}`,
      label: n.label,
      x: n.x,
      y: n.y,
      draftX: n.x.toString(),
      draftY: n.y.toString(),
    }))
  })

  const [activePreset, setActivePreset] = useState<string>('sinuous')

  // ─── 2. Estado de Cinemática & Aceleración ──────────────────────
  const [acceleration, setAcceleration] = useState<number>(2.5) // m/s²
  const [draftAcc, setDraftAcc] = useState<string>('2.5')
  const [simSpeed, setSimSpeed] = useState<number>(1.0) // 0.5x, 1x, 2x

  // ─── 3. Capas Visuales ─────────────────────────────────────────
  const [showTrajectory, setShowTrajectory] = useState<boolean>(true)
  const [showDisplacement, setShowDisplacement] = useState<boolean>(true)
  const [showOdometer, setShowOdometer] = useState<boolean>(true)
  const [showGrid, setShowGrid] = useState<boolean>(true)

  // ─── 4. Zoom y Encuadre ─────────────────────────────────────────
  const [zoomFactor, setZoomFactor] = useState<number>(1.0)

  // ─── 5. Simulación (Play, Pause, Reset, Loop) ──────────────────
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [simTime, setSimTime] = useState<number>(0)
  const rafRef = useRef<number>(0)
  const lastTsRef = useRef<number>(0)

  // ─── Cálculos Físicos Derivados ────────────────────────────────
  const points2D: Point2D[] = useMemo(() => {
    return nodes.map(n => ({ x: n.x, y: n.y, label: n.label }))
  }, [nodes])

  const path = useMemo(() => {
    return computePath(points2D)
  }, [points2D])

  const kinParams = useMemo(() => {
    return { acceleration: Math.max(0, acceleration), v0: 0 }
  }, [acceleration])

  const totalDuration = useMemo(() => {
    return computeTotalDuration(path.totalDistance, kinParams)
  }, [path.totalDistance, kinParams])

  const motion = useMemo(() => {
    return computeMotionState(simTime, path, kinParams)
  }, [simTime, path, kinParams])

  // ─── Bucle de Animación ────────────────────────────────────────
  const loop = useCallback(
    (timestamp: number) => {
      if (lastTsRef.current === 0) {
        lastTsRef.current = timestamp
      }

      const dt = Math.min((timestamp - lastTsRef.current) / 1000, 0.1) * simSpeed
      lastTsRef.current = timestamp

      setSimTime(prevTime => {
        const nextTime = prevTime + dt
        if (totalDuration > 0 && nextTime >= totalDuration) {
          setIsPlaying(false)
          return totalDuration
        }
        return nextTime
      })

      rafRef.current = requestAnimationFrame(loop)
    },
    [simSpeed, totalDuration]
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

  // ─── Manejadores de Simulación ──────────────────────────────────
  const handleTogglePlay = () => {
    if (nodes.length < 2) return
    if (motion.isComplete && simTime > 0) {
      setSimTime(0)
      setIsPlaying(true)
      return
    }
    setIsPlaying(prev => !prev)
  }

  const handleReset = () => {
    setIsPlaying(false)
    setSimTime(0)
    lastTsRef.current = 0
  }

  const handleStep = () => {
    if (nodes.length < 2) return
    setIsPlaying(false)
    setSimTime(prev => {
      const step = 0.1
      const nextTime = prev + step
      return totalDuration > 0 ? Math.min(nextTime, totalDuration) : nextTime
    })
  }

  // ─── Manejadores de Nodos Clave ────────────────────────────────
  const handleAddNode = () => {
    setIsPlaying(false)
    setActivePreset('')
    setNodes(prev => {
      const nextIdx = prev.length
      const lastNode = prev[nextIdx - 1]
      const newX = lastNode ? lastNode.x + 3 : 0
      const newY = lastNode ? lastNode.y + 2 : 0
      const newNode: NodeItem = {
        id: `node-${nextIdx}-${Date.now()}`,
        label: getLabelForIndex(nextIdx),
        x: newX,
        y: newY,
        draftX: newX.toString(),
        draftY: newY.toString(),
      }
      return [...prev, newNode]
    })
  }

  const handleRemoveNode = (id: string) => {
    setIsPlaying(false)
    setActivePreset('')
    setNodes(prev => {
      if (prev.length <= 1) return prev
      const filtered = prev.filter(n => n.id !== id)
      // Re-asignar etiquetas secuenciales A, B, C...
      return filtered.map((item, idx) => ({
        ...item,
        label: getLabelForIndex(idx),
      }))
    })
  }

  const handleCoordChange = (id: string, field: 'x' | 'y', val: string) => {
    setActivePreset('')
    setNodes(prev =>
      prev.map(item => {
        if (item.id !== id) return item
        const updated = { ...item }
        if (field === 'x') {
          updated.draftX = val
          const parsed = parseFloat(val)
          if (!isNaN(parsed) && isFinite(parsed)) {
            updated.x = parsed
          }
        } else {
          updated.draftY = val
          const parsed = parseFloat(val)
          if (!isNaN(parsed) && isFinite(parsed)) {
            updated.y = parsed
          }
        }
        return updated
      })
    )
  }

  const handleCoordBlur = (id: string, field: 'x' | 'y') => {
    setNodes(prev =>
      prev.map(item => {
        if (item.id !== id) return item
        const updated = { ...item }
        if (field === 'x') {
          const parsed = parseFloat(updated.draftX)
          const valid = !isNaN(parsed) && isFinite(parsed) ? parsed : updated.x
          updated.x = valid
          updated.draftX = valid.toString()
        } else {
          const parsed = parseFloat(updated.draftY)
          const valid = !isNaN(parsed) && isFinite(parsed) ? parsed : updated.y
          updated.y = valid
          updated.draftY = valid.toString()
        }
        return updated
      })
    )
  }

  const handleLoadPreset = (preset: RoutePreset) => {
    setIsPlaying(false)
    setSimTime(0)
    setActivePreset(preset.id)
    setNodes(
      preset.nodes.map((n, i) => ({
        id: `node-${i}-${Date.now()}`,
        label: n.label,
        x: n.x,
        y: n.y,
        draftX: n.x.toString(),
        draftY: n.y.toString(),
      }))
    )
  }

  // ─── Manejador de Aceleración ──────────────────────────────────
  const handleAccChange = (valStr: string) => {
    setDraftAcc(valStr)
    const parsed = parseFloat(valStr)
    if (!isNaN(parsed) && parsed >= 0 && isFinite(parsed)) {
      setAcceleration(parsed)
    }
  }

  const handleAccBlur = () => {
    const parsed = parseFloat(draftAcc)
    const valid = !isNaN(parsed) && parsed >= 0 && isFinite(parsed) ? parsed : 2.5
    setAcceleration(valid)
    setDraftAcc(valid.toString())
  }

  // ─── Gráfica Cartesiana SVG & Ejes Dinámicos ────────────────────
  const bbox = useMemo(() => {
    return computeBoundingBox(points2D)
  }, [points2D])

  // Dimensiones internas del viewBox SVG
  const svgWidth = 800
  const svgHeight = 480
  const pad = 50

  // Margen efectivo con zoom
  const effectiveWidth = (bbox.maxX - bbox.minX) / zoomFactor
  const effectiveHeight = (bbox.maxY - bbox.minY) / zoomFactor
  const midX = (bbox.minX + bbox.maxX) / 2
  const midY = (bbox.minY + bbox.maxY) / 2

  const viewMinX = midX - effectiveWidth / 2
  const viewMaxX = midX + effectiveWidth / 2
  const viewMinY = midY - effectiveHeight / 2
  const viewMaxY = midY + effectiveHeight / 2

  // Mapeador matemático cartesiano (origen abajo, Y hacia arriba) a SVG (Y hacia abajo)
  const toSvgX = useCallback(
    (x: number) => {
      const span = viewMaxX - viewMinX || 1
      return pad + ((x - viewMinX) / span) * (svgWidth - 2 * pad)
    },
    [viewMinX, viewMaxX]
  )

  const toSvgY = useCallback(
    (y: number) => {
      const span = viewMaxY - viewMinY || 1
      return svgHeight - pad - ((y - viewMinY) / span) * (svgHeight - 2 * pad)
    },
    [viewMinY, viewMaxY]
  )

  // Generador de líneas de cuadrícula inteligentes (ticks)
  const gridTicks = useMemo(() => {
    const spanX = viewMaxX - viewMinX
    let step = 1
    if (spanX > 40) step = 10
    else if (spanX > 20) step = 5
    else if (spanX > 10) step = 2

    const xTicks: number[] = []
    const yTicks: number[] = []

    const startX = Math.floor(viewMinX / step) * step
    for (let x = startX; x <= viewMaxX; x += step) {
      xTicks.push(x)
    }

    const startY = Math.floor(viewMinY / step) * step
    for (let y = startY; y <= viewMaxY; y += step) {
      yTicks.push(y)
    }

    return { xTicks, yTicks, step }
  }, [viewMinX, viewMaxX, viewMinY, viewMaxY])

  // Puntos ya recorridos por el móvil hasta el instante actual
  const completedPathPoints = useMemo(() => {
    if (nodes.length < 2 || !path.initialPoint) return []
    const pts: { x: number; y: number }[] = [{ x: path.initialPoint.x, y: path.initialPoint.y }]

    for (let i = 0; i < motion.activeSegmentIndex; i++) {
      if (path.segments[i]) {
        pts.push({ x: path.segments[i].p2.x, y: path.segments[i].p2.y })
      }
    }
    pts.push({ x: motion.currentPosition.x, y: motion.currentPosition.y })
    return pts
  }, [nodes.length, path, motion])

  const completedPathD = useMemo(() => {
    if (completedPathPoints.length < 2) return ''
    return completedPathPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(p.x).toFixed(1)} ${toSvgY(p.y).toFixed(1)}`)
      .join(' ')
  }, [completedPathPoints, toSvgX, toSvgY])

  const fullPathD = useMemo(() => {
    if (nodes.length < 2) return ''
    return nodes
      .map((n, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(n.x).toFixed(1)} ${toSvgY(n.y).toFixed(1)}`)
      .join(' ')
  }, [nodes, toSvgX, toSvgY])

  // Mini-curvas teóricas para s(t) vs |Δr(t)|
  const miniChartData = useMemo(() => {
    if (nodes.length < 2 || totalDuration <= 0) {
      return { sPoints: '', dispPoints: '', currentTPercent: 0 }
    }
    const samples = 30
    const sPts: string[] = []
    const dPts: string[] = []
    const maxS = Math.max(path.totalDistance, 0.01)

    for (let i = 0; i <= samples; i++) {
      const tSample = (i / samples) * totalDuration
      const state = computeMotionState(tSample, path, kinParams)
      const px = (i / samples) * 100
      const pyS = 40 - (state.distanceCovered / maxS) * 36
      const pyD = 40 - (state.currentDisplacement.magnitude / maxS) * 36
      sPts.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${pyS.toFixed(1)}`)
      dPts.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${pyD.toFixed(1)}`)
    }

    const currentTPercent = Math.min(100, (simTime / totalDuration) * 100)

    return {
      sPoints: sPts.join(' '),
      dispPoints: dPts.join(' '),
      currentTPercent,
    }
  }, [nodes.length, totalDuration, path, kinParams, simTime])

  return (
    <div className={styles.container}>
      {/* ─── Sub-Header / Preajustes Rápidos ─── */}
      <div className={styles.subHeader}>
        <div className={styles.presetGroup}>
          <span className={styles.presetLabel}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>alt_route</span>
            Ejemplos:
          </span>
          {ROUTE_PRESETS.map(p => (
            <button
              key={p.id}
              className={`${styles.presetBtn} ${activePreset === p.id ? styles.presetBtnActive : ''}`}
              onClick={() => handleLoadPreset(p)}
              type="button"
              title={p.description}
            >
              {p.name}
            </button>
          ))}
        </div>
        <span className={styles.badge}>FÍSICA FUNDAMENTAL • 4.º DIVERSIFICADO</span>
      </div>

      {/* ─── Grid Principal Workbench ─── */}
      <div className={styles.gridWorkbench}>
        {/* ═══════════ COLUMNA 1: CONFIGURACIÓN DE NODOS Y ACELERACIÓN ═══════════ */}
        <div className={styles.column}>
          {/* Card: Nodos Clave (Ingreso Directo) */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>pin_drop</span>
                Nodos Clave (Coordenadas)
              </span>
              <span className={styles.badge}>{nodes.length} PUNTOS</span>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Introduce directamente las coordenadas <code>(X, Y)</code> en metros para cada nodo de la trayectoria:
            </p>

            <div className={styles.nodeList}>
              {nodes.map((node, index) => {
                const isStart = index === 0
                const isEnd = index === nodes.length - 1 && nodes.length > 1
                return (
                  <div key={node.id} className={styles.nodeRow}>
                    <div
                      className={`${styles.nodeBadge} ${
                        isStart ? styles.nodeBadgeStart : isEnd ? styles.nodeBadgeEnd : ''
                      }`}
                      title={isStart ? 'Punto de partida inicial (r_i)' : isEnd ? 'Punto de llegada final (r_f)' : `Nodo intermedio ${node.label}`}
                    >
                      {node.label}
                    </div>

                    <div className={styles.coordInputGroup}>
                      <span className={styles.coordPrefix}>X:</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={node.draftX}
                        onChange={e => handleCoordChange(node.id, 'x', e.target.value)}
                        onBlur={() => handleCoordBlur(node.id, 'x')}
                        className={styles.coordInput}
                        placeholder="0.0"
                        title={`Coordenada X del nodo ${node.label}`}
                      />
                    </div>

                    <div className={styles.coordInputGroup}>
                      <span className={styles.coordPrefix}>Y:</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={node.draftY}
                        onChange={e => handleCoordChange(node.id, 'y', e.target.value)}
                        onBlur={() => handleCoordBlur(node.id, 'y')}
                        className={styles.coordInput}
                        placeholder="0.0"
                        title={`Coordenada Y del nodo ${node.label}`}
                      />
                    </div>

                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleRemoveNode(node.id)}
                      disabled={nodes.length <= 2}
                      type="button"
                      title={nodes.length <= 2 ? 'Se requieren mínimo 2 nodos para trazar una trayectoria' : `Eliminar nodo ${node.label}`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                    </button>
                  </div>
                )
              })}
            </div>

            <button className={styles.addNodeBtn} onClick={handleAddNode} type="button">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span>
              Agregar Nuevo Nodo
            </button>
          </div>

          {/* Card: Aceleración y Cinemática de la Simulación */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>speed</span>
                Aceleración de la Simulación
              </span>
              <span className={styles.badge}>a = {acceleration.toFixed(2)} m/s²</span>
            </div>

            <div className={styles.accInputCard}>
              <div className={styles.accHeader}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Aceleración Tangencial:</span>
                <div className={styles.accInputRow}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={draftAcc}
                    onChange={e => handleAccChange(e.target.value)}
                    onBlur={handleAccBlur}
                    className={styles.accNumberInput}
                    title="Aceleración de la simulación en m/s²"
                  />
                  <span className={styles.accUnit}>m/s²</span>
                </div>
              </div>

              <input
                type="range"
                min="0.1"
                max="10.0"
                step="0.1"
                value={acceleration}
                onChange={e => {
                  const val = parseFloat(e.target.value)
                  setAcceleration(val)
                  setDraftAcc(val.toString())
                }}
                className={styles.slider}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                <span>0.1 m/s² (Suave)</span>
                <span>Duración: {totalDuration.toFixed(2)} s</span>
                <span>10.0 m/s² (Rápida)</span>
              </div>
            </div>

            {/* Capas Visuales */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px', borderTop: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Capas Visuales
              </span>
              <label className={styles.layerCheckbox}>
                <input
                  type="checkbox"
                  checked={showTrajectory}
                  onChange={e => setShowTrajectory(e.target.checked)}
                />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Trazo de trayectoria real <span dangerouslySetInnerHTML={{ __html: renderLatex('s(t)') }} /> (Azul)
                </span>
              </label>
              <label className={styles.layerCheckbox}>
                <input
                  type="checkbox"
                  checked={showDisplacement}
                  onChange={e => setShowDisplacement(e.target.checked)}
                />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Vector desplazamiento <span dangerouslySetInnerHTML={{ __html: renderLatex('\\Delta\\vec{r}(t)') }} /> (Dorado)
                </span>
              </label>
              <label className={styles.layerCheckbox}>
                <input
                  type="checkbox"
                  checked={showOdometer}
                  onChange={e => setShowOdometer(e.target.checked)}
                />
                <span>Odómetro dinámico flotante</span>
              </label>
              <label className={styles.layerCheckbox}>
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={e => setShowGrid(e.target.checked)}
                />
                <span>Retícula ortogonal y ejes</span>
              </label>
            </div>

            {/* Velocidad de Reproducción */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--border-light)', fontSize: 'var(--text-xs)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Velocidad:</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[0.5, 1.0, 2.0].map(sp => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setSimSpeed(sp)}
                    className={`${styles.btnSecondary} ${simSpeed === sp ? styles.presetBtnActive : ''}`}
                    style={{ padding: '2px 8px', fontSize: '11px' }}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
            </div>

            {/* Botones de Control de Simulación */}
            <div className={styles.transportGrid}>
              <button
                className={styles.btnPrimary}
                onClick={handleTogglePlay}
                type="button"
                disabled={nodes.length < 2}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
                {isPlaying ? 'Pausar' : motion.isComplete && simTime > 0 ? 'Repetir' : 'Iniciar'}
              </button>
              <button
                className={styles.btnSecondary}
                onClick={handleStep}
                type="button"
                disabled={nodes.length < 2 || isPlaying}
                title="Avanzar 0.1 segundos"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>skip_next</span>
                Paso
              </button>
              <button
                className={styles.btnSecondary}
                onClick={handleReset}
                type="button"
                title="Reiniciar simulación a t = 0"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>restart_alt</span>
                Reiniciar
              </button>
            </div>

            {motion.isComplete && (
              <div className={styles.completedBanner}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                Recorrido completado
              </div>
            )}
          </div>
        </div>

        {/* ═══════════ COLUMNA 2: LIENZO CARTESIANO Y TELEMETRÍA ═══════════ */}
        <div className={styles.stageCard}>
          <div className={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--corporate)' }} />
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
                Plano Cartesiano [X vs Y]
              </span>
              <span className={styles.badge}>Escala Métrica (m)</span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                className={styles.btnSecondary}
                style={{ padding: '4px 8px' }}
                onClick={() => setZoomFactor(z => Math.min(2.5, z * 1.25))}
                title="Acercar plano"
                type="button"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>zoom_in</span>
              </button>
              <button
                className={styles.btnSecondary}
                style={{ padding: '4px 8px' }}
                onClick={() => setZoomFactor(z => Math.max(0.5, z / 1.25))}
                title="Alejar plano"
                type="button"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>zoom_out</span>
              </button>
              <button
                className={styles.btnSecondary}
                style={{ padding: '4px 8px' }}
                onClick={() => setZoomFactor(1.0)}
                title="Restablecer encuadre original"
                type="button"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>fit_screen</span>
              </button>
            </div>
          </div>

          {/* Telemetría HUD Dinámica */}
          <div className={styles.telemetryGrid}>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Tiempo (t)</span>
              <div>
                <span className={styles.telemetryValue}>{motion.time.toFixed(2)}</span>
                <span className={styles.telemetryUnit}>s</span>
              </div>
            </div>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Distancia s(t)</span>
              <div>
                <span className={styles.telemetryValue} style={{ color: 'var(--corporate)' }}>
                  {motion.distanceCovered.toFixed(2)}
                </span>
                <span className={styles.telemetryUnit}>m</span>
              </div>
            </div>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Desplazamiento |Δr|</span>
              <div>
                <span className={styles.telemetryValue} style={{ color: '#d97706' }}>
                  {motion.currentDisplacement.magnitude.toFixed(2)}
                </span>
                <span className={styles.telemetryUnit}>m</span>
              </div>
            </div>
          </div>

          {/* Lienzo SVG Reactivo */}
          <div className={styles.svgStageWrapper}>
            {nodes.length < 2 ? (
              <div className={styles.canvasEmptyState}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--corporate)' }}>
                  timeline
                </span>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  Se requieren al menos 2 nodos para trazar la trayectoria
                </p>
                <p style={{ fontSize: 'var(--text-xs)' }}>
                  Agrega un nuevo nodo en la sección izquierda o pulsa un ejemplo de arriba.
                </p>
                <button
                  className={styles.btnPrimary}
                  onClick={() => handleLoadPreset(ROUTE_PRESETS[0])}
                  type="button"
                >
                  Cargar Ejemplo Inicial
                </button>
              </div>
            ) : (
              <svg
                className={styles.svgElement}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  {/* Flecha para el Vector Desplazamiento */}
                  <marker
                    id="arrow-displacement"
                    markerWidth="10"
                    markerHeight="10"
                    refX="8"
                    refY="5"
                    orient="auto"
                  >
                    <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#d97706" />
                  </marker>
                  {/* Flechas para Ejes Cartesianos */}
                  <marker
                    id="arrow-axis"
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="4"
                    orient="auto"
                  >
                    <path d="M 0 1 L 7 4 L 0 7 z" fill="#94a3b8" />
                  </marker>
                </defs>

                {/* Retícula ortogonal y ejes */}
                {showGrid && (
                  <g opacity="0.85">
                    {/* Ticks y líneas verticales X */}
                    {gridTicks.xTicks.map(xVal => {
                      const sx = toSvgX(xVal)
                      return (
                        <g key={`x-${xVal}`}>
                          <line
                            x1={sx}
                            y1={pad - 10}
                            x2={sx}
                            y2={svgHeight - pad + 10}
                            stroke={xVal === 0 ? '#64748b' : '#e2e8f0'}
                            strokeWidth={xVal === 0 ? 1.5 : 0.8}
                            strokeDasharray={xVal === 0 ? '' : '3 3'}
                          />
                          <text
                            x={sx}
                            y={svgHeight - pad + 24}
                            textAnchor="middle"
                            fill="#64748b"
                            fontFamily="JetBrains Mono, monospace"
                            fontSize="11"
                            fontWeight={xVal === 0 ? 'bold' : 'normal'}
                          >
                            {xVal}
                          </text>
                        </g>
                      )
                    })}

                    {/* Ticks y líneas horizontales Y */}
                    {gridTicks.yTicks.map(yVal => {
                      const sy = toSvgY(yVal)
                      return (
                        <g key={`y-${yVal}`}>
                          <line
                            x1={pad - 10}
                            y1={sy}
                            x2={svgWidth - pad + 10}
                            y2={sy}
                            stroke={yVal === 0 ? '#64748b' : '#e2e8f0'}
                            strokeWidth={yVal === 0 ? 1.5 : 0.8}
                            strokeDasharray={yVal === 0 ? '' : '3 3'}
                          />
                          <text
                            x={pad - 12}
                            y={sy + 4}
                            textAnchor="end"
                            fill="#64748b"
                            fontFamily="JetBrains Mono, monospace"
                            fontSize="11"
                            fontWeight={yVal === 0 ? 'bold' : 'normal'}
                          >
                            {yVal}
                          </text>
                        </g>
                      )
                    })}

                    {/* Ejes principales con etiquetas */}
                    <text
                      x={svgWidth - pad + 20}
                      y={toSvgY(0) + 4}
                      fill="#334155"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="12"
                      fontWeight="bold"
                    >
                      +X (m)
                    </text>
                    <text
                      x={toSvgX(0)}
                      y={pad - 18}
                      textAnchor="middle"
                      fill="#334155"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="12"
                      fontWeight="bold"
                    >
                      +Y (m)
                    </text>
                  </g>
                )}

                {/* Trayectoria Completa Teórica (Guía de camino) */}
                <path
                  d={fullPathD}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeDasharray="6 4"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Trayectoria Recorrida Real s(t) */}
                {showTrajectory && completedPathD && (
                  <path
                    d={completedPathD}
                    fill="none"
                    stroke="#24346c"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Vector Desplazamiento Instantáneo Δr(t) */}
                {showDisplacement && path.initialPoint && (
                  <g>
                    <line
                      x1={toSvgX(path.initialPoint.x)}
                      y1={toSvgY(path.initialPoint.y)}
                      x2={toSvgX(motion.currentPosition.x)}
                      y2={toSvgY(motion.currentPosition.y)}
                      stroke="#d97706"
                      strokeDasharray="5 3"
                      strokeWidth="2.8"
                      markerEnd="url(#arrow-displacement)"
                    />
                    {/* Etiqueta flotante Δr */}
                    {motion.currentDisplacement.magnitude > 0.4 && (
                      <text
                        x={(toSvgX(path.initialPoint.x) + toSvgX(motion.currentPosition.x)) / 2 + 10}
                        y={(toSvgY(path.initialPoint.y) + toSvgY(motion.currentPosition.y)) / 2 - 8}
                        fill="#b45309"
                        fontFamily="JetBrains Mono, monospace"
                        fontSize="13"
                        fontWeight="bold"
                      >
                        Δr
                      </text>
                    )}
                  </g>
                )}

                {/* Nodos de la trayectoria */}
                {nodes.map((node, idx) => {
                  const sx = toSvgX(node.x)
                  const sy = toSvgY(node.y)
                  const isStart = idx === 0
                  const isEnd = idx === nodes.length - 1

                  return (
                    <g key={node.id}>
                      {/* Halo decorativo para inicio o fin */}
                      {isStart && (
                        <circle cx={sx} cy={sy} r="15" fill="#059669" opacity="0.2" />
                      )}
                      {isEnd && (
                        <circle cx={sx} cy={sy} r="15" fill="#d97706" opacity="0.2" />
                      )}

                      <circle
                        cx={sx}
                        cy={sy}
                        r={isStart || isEnd ? 9 : 7}
                        fill={isStart ? '#059669' : isEnd ? '#d97706' : '#64748b'}
                        stroke="#ffffff"
                        strokeWidth="2.5"
                      />

                      {/* Texto del Nodo */}
                      <text
                        x={sx}
                        y={sy - 12}
                        textAnchor="middle"
                        fill={isStart ? '#059669' : isEnd ? '#d97706' : '#1e293b'}
                        fontFamily="Plus Jakarta Sans, sans-serif"
                        fontSize="12"
                        fontWeight="bold"
                      >
                        {node.label} ({node.x}, {node.y})
                      </text>
                    </g>
                  )
                })}

                {/* Partícula Móvil */}
                {path.initialPoint && (
                  <g transform={`translate(${toSvgX(motion.currentPosition.x)}, ${toSvgY(motion.currentPosition.y)})`}>
                    <circle r="16" fill="#c8a932" opacity="0.3" />
                    <circle r="9" fill="#24346c" stroke="#ffffff" strokeWidth="2.5" />
                    <circle r="3" fill="#ffffff" />

                    {/* Odómetro flotante */}
                    {showOdometer && (
                      <g transform="translate(0, -28)">
                        <rect
                          x="-45"
                          y="-14"
                          width="90"
                          height="22"
                          rx="4"
                          fill="#ffffff"
                          stroke="#cbd5e1"
                          strokeWidth="1.2"
                          filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.1))"
                        />
                        <text
                          x="0"
                          y="1"
                          textAnchor="middle"
                          fill="#24346c"
                          fontFamily="JetBrains Mono, monospace"
                          fontSize="11"
                          fontWeight="bold"
                        >
                          s = {motion.distanceCovered.toFixed(2)} m
                        </text>
                      </g>
                    )}
                  </g>
                )}
              </svg>
            )}
          </div>

          {/* Barra de Progreso del Recorrido */}
          <div className={styles.progressBarContainer}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
              <span style={{ color: 'var(--text-muted)' }}>
                Progreso del Recorrido (Longitud total: {path.totalDistance.toFixed(2)} m)
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--corporate)' }}>
                {motion.progressPercent.toFixed(1)}%
              </span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressBarFill} style={{ width: `${motion.progressPercent}%` }} />
            </div>
          </div>

          {/* Mini-Gráficas Comparativas Temporales */}
          <div className={styles.miniChartGrid}>
            <div className={styles.miniChartCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--corporate)', textTransform: 'uppercase' }}>
                  ● s(t) • Distancia (Escalar)
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                  Siempre creciente
                </span>
              </div>
              <div style={{ height: '56px', width: '100%' }}>
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                  <path d="M 0 40 L 0 40 L 100 40 Z" fill="#24346c" fillOpacity="0.08" />
                  {miniChartData.sPoints && (
                    <path d={miniChartData.sPoints} fill="none" stroke="#24346c" strokeWidth="2.5" />
                  )}
                  {/* Marcador actual */}
                  <circle
                    cx={miniChartData.currentTPercent}
                    cy={40 - (path.totalDistance > 0 ? (motion.distanceCovered / path.totalDistance) * 36 : 0)}
                    r="4"
                    fill="#c8a932"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right' }}>
                Acumula toda la longitud
              </span>
            </div>

            <div className={styles.miniChartCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
                  ● |Δr(t)| • Desplazamiento (Vectorial)
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                  Acotado por s(t)
                </span>
              </div>
              <div style={{ height: '56px', width: '100%' }}>
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                  {miniChartData.dispPoints && (
                    <path
                      d={miniChartData.dispPoints}
                      fill="none"
                      stroke="#d97706"
                      strokeDasharray="3 2"
                      strokeWidth="2.5"
                    />
                  )}
                  {/* Marcador actual */}
                  <circle
                    cx={miniChartData.currentTPercent}
                    cy={40 - (path.totalDistance > 0 ? (motion.currentDisplacement.magnitude / path.totalDistance) * 36 : 0)}
                    r="4"
                    fill="#24346c"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ COLUMNA 3: MAGNITUDES Y DESGLOSE MATEMÁTICO ═══════════ */}
        <div className={styles.column}>
          {/* Card: Distancia Recorrida (Escalar) */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.presetLabel} style={{ color: 'var(--corporate)' }}>
                Magnitud Escalar
              </span>
              <span className={styles.badge}>Longitud Real</span>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
              Distancia Total (d_total)
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span className={styles.bigValue}>{path.totalDistance.toFixed(2)}</span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>metros</span>
            </div>
            <div className={styles.formulaBox}>
              <div
                dangerouslySetInnerHTML={{
                  __html: renderLatex('d_{\\text{total}} = \\sum d_i = d_1 + d_2 + \\dots'),
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Suma la longitud de cada segmento individual sin importar la orientación.
              </span>
            </div>
          </div>

          {/* Card: Desplazamiento Neto (Vectorial) */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.presetLabel} style={{ color: '#b45309' }}>
                Magnitud Vectorial
              </span>
              <span
                className={styles.badge}
                style={{ color: '#b45309', background: '#fffbeb', borderColor: '#fef3c7' }}
              >
                Línea Recta
              </span>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
              Desplazamiento Neto (|Δr|)
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span className={styles.bigValue} style={{ color: '#d97706' }}>
                {path.displacement.magnitude.toFixed(2)}
              </span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>metros</span>
            </div>
            <div className={styles.formulaBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)' }}>
                <span>Forma Canónica:</span>
                <span style={{ fontWeight: 700, color: 'var(--corporate)' }}>
                  {path.displacement.canonicalString}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)' }}>
                <span>Ángulo Polar θ:</span>
                <span style={{ fontWeight: 700, color: 'var(--corporate)' }}>
                  {path.displacement.angleDeg.toFixed(1)}°
                </span>
              </div>
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '4px', fontSize: '11px' }}>
                Δx = {path.displacement.dx >= 0 ? `+${path.displacement.dx.toFixed(2)}` : path.displacement.dx.toFixed(2)} m, Δy = {path.displacement.dy >= 0 ? `+${path.displacement.dy.toFixed(2)}` : path.displacement.dy.toFixed(2)} m
              </div>
            </div>
          </div>

          {/* Card: Teorema y Eficiencia */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>balance</span>
                Teorema de la Trayectoria
              </span>
            </div>
            <div style={{ textAlign: 'center', padding: '8px', background: 'var(--canvas-bg)', borderRadius: 'var(--radius-lg)' }}>
              <div
                style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--corporate)' }}
                dangerouslySetInnerHTML={{ __html: renderLatex('s(t) \\ge |\\Delta\\vec{r}(t)|') }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                La distancia recorrida jamás puede ser menor a la magnitud del desplazamiento.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Eficiencia de Ruta (|Δr| / d):</span>
                <span style={{ fontWeight: 700, color: 'var(--corporate)' }}>
                  {path.efficiency.toFixed(1)}%
                </span>
              </div>
              <div className={styles.efficiencyBar}>
                <div className={styles.efficiencyFill} style={{ width: `${Math.min(100, path.efficiency)}%` }} />
              </div>
            </div>
          </div>

          {/* Concepto Clave Educativo */}
          <div className={styles.conceptCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', fontWeight: 700, fontSize: 'var(--text-xs)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>lightbulb</span>
              <span>Nota para 4.º Diversificado</span>
            </div>
            <div style={{ fontSize: '11px', color: '#78350f', lineHeight: 1.4 }}>
              {path.displacement.magnitude < 0.01 && path.totalDistance > 0 ? (
                <>
                  ¡Excelente observación! El móvil regresó al punto de partida inicial (<span dangerouslySetInnerHTML={{ __html: renderLatex('\\vec{r}_f = \\vec{r}_i') }} />). Por ello, el <strong>desplazamiento neto es nulo</strong> (<span dangerouslySetInnerHTML={{ __html: renderLatex('\\Delta\\vec{r} = \\vec{0}') }} />), pero la <strong>distancia recorrida es {path.totalDistance.toFixed(2)} m</strong>.
                </>
              ) : path.efficiency >= 99.9 ? (
                <>
                  La trayectoria es una <strong>línea recta unidireccional</strong>. En este caso único, la distancia coincide exactamente con el módulo del desplazamiento: <span dangerouslySetInnerHTML={{ __html: renderLatex('d = |\\Delta\\vec{r}|') }} />.
                </>
              ) : (
                <>
                  Como el camino tiene curvas o quiebres, la distancia <strong>d = {path.totalDistance.toFixed(2)} m</strong> es mayor al desplazamiento en línea recta <span dangerouslySetInnerHTML={{ __html: renderLatex('|\\Delta\\vec{r}| = ' + path.displacement.magnitude.toFixed(2) + '\\text{ m}') }} />.
                </>
              )}
            </div>
          </div>

          {activePreset === 'custom' && (
            <div className={styles.conceptCard} style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', fontWeight: 700, fontSize: 'var(--text-xs)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit_note</span>
                <span>Modo Personalizado</span>
              </div>
              <div style={{ fontSize: '11px', color: '#14532d', lineHeight: 1.5 }}>
                Ingresa tus propias coordenadas para explorar cómo cambia la relación entre distancia y desplazamiento.
                Prueba con <strong>Ida y Vuelta</strong> para ver cómo el desplazamiento puede ser 0.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ FILA INFERIOR: DESGLOSE MATEMÁTICO PASO A PASO (KaTeX) ═══════════ */}
      {path.initialPoint && path.finalPoint && (
        <div className={styles.mathBreakdownCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calculate</span>
              Desglose Matemático Paso a Paso (Para Cuaderno de Física)
            </span>
            <span className={styles.badge}>RESOLUCIÓN ANALÍTICA</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--sp-3)' }}>
            {/* Paso 1: Vector Desplazamiento */}
            <div className={styles.mathStep}>
              <span className={styles.mathStepTitle}>1. Vector Desplazamiento (Definición)</span>
              <div
                className={styles.mathKatexRender}
                dangerouslySetInnerHTML={{
                  __html: renderLatex('\\Delta \\vec{r} = \\vec{r}_f - \\vec{r}_i'),
                }}
              />
              <div
                className={styles.mathKatexRender}
                dangerouslySetInnerHTML={{
                  __html: renderLatex(
                    `\\Delta \\vec{r} = (${path.finalPoint.x} - ${path.initialPoint.x})\\hat{i} + (${path.finalPoint.y} - ${path.initialPoint.y})\\hat{j}`
                  ),
                }}
              />
              <div
                className={styles.mathKatexRender}
                dangerouslySetInnerHTML={{
                  __html: renderLatex(
                    `\\Delta \\vec{r} = ${path.displacement.dx >= 0 ? path.displacement.dx.toFixed(2) : `(${path.displacement.dx.toFixed(2)})`}\\hat{i} + ${path.displacement.dy >= 0 ? path.displacement.dy.toFixed(2) : `(${path.displacement.dy.toFixed(2)})`}\\hat{j} \\text{ m}`
                  ),
                }}
              />
            </div>

            {/* Paso 2: Módulo por Pitágoras */}
            <div className={styles.mathStep}>
              <span className={styles.mathStepTitle}>2. Magnitud / Módulo del Desplazamiento</span>
              <div
                className={styles.mathKatexRender}
                dangerouslySetInnerHTML={{
                  __html: renderLatex('|\\Delta \\vec{r}| = \\sqrt{(\\Delta x)^2 + (\\Delta y)^2}'),
                }}
              />
              <div
                className={styles.mathKatexRender}
                dangerouslySetInnerHTML={{
                  __html: renderLatex(
                    `|\\Delta \\vec{r}| = \\sqrt{(${path.displacement.dx.toFixed(2)})^2 + (${path.displacement.dy.toFixed(2)})^2} = ${path.displacement.magnitude.toFixed(2)} \\text{ m}`
                  ),
                }}
              />
            </div>

            {/* Paso 3: Distancia Recorrida */}
            <div className={styles.mathStep}>
              <span className={styles.mathStepTitle}>3. Distancia Total (Suma de Tramos)</span>
              <div
                className={styles.mathKatexRender}
                dangerouslySetInnerHTML={{
                  __html: renderLatex(
                    path.segments.length > 0
                      ? `d_{\\text{total}} = ${path.segments
                          .slice(0, 4)
                          .map(s => s.length.toFixed(2))
                          .join(' + ')}${path.segments.length > 4 ? ' + \\dots' : ''} = ${path.totalDistance.toFixed(2)} \\text{ m}`
                      : 'd_{\\text{total}} = 0.00 \\text{ m}'
                  ),
                }}
              />
              <div
                className={styles.mathKatexRender}
                dangerouslySetInnerHTML={{
                  __html: renderLatex(
                    `\\text{Eficiencia } \\eta = \\frac{|\\Delta \\vec{r}|}{d_{\\text{total}}} \\times 100\\% = ${path.efficiency.toFixed(1)}\\%`
                  ),
                }}
              />
            </div>

            {/* Paso 4: Cinemática con Aceleración */}
            <div className={styles.mathStep}>
              <span className={styles.mathStepTitle}>4. Ecuación Horaria con Aceleración a</span>
              <div
                className={styles.mathKatexRender}
                dangerouslySetInnerHTML={{
                  __html: renderLatex(
                    `s(t) = \\frac{1}{2} a t^2 = \\frac{1}{2}(${acceleration.toFixed(2)}) t^2 = ${(0.5 * acceleration).toFixed(2)} t^2`
                  ),
                }}
              />
              <div
                className={styles.mathKatexRender}
                dangerouslySetInnerHTML={{
                  __html: renderLatex(
                    `t_{\\text{total}} = \\sqrt{\\frac{2 d_{\\text{total}}}{a}} = ${totalDuration.toFixed(2)} \\text{ s}`
                  ),
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
