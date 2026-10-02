<<<<<<< HEAD
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
=======
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { InlineMath, BlockMath } from 'react-katex'
import 'katex/dist/katex.min.css'
import { useAnimationLoop } from '../../hooks/useAnimationLoop'
import { useCanvasRenderer } from '../../hooks/useCanvasRenderer'
import { useLiveChart } from '../../hooks/useLiveChart'
import {
  computeState,
  getDuration,
  getTotalLength,
  getWaypoints,
  getFullTrailPoints,
  type PresetType,
  type TrajectoryPoint,
  type CustomCoordinates,
} from './physics'
import styles from './DistanciaDesplazamiento.module.css'

// ─── Formateador de coordenadas sin duplicar paréntesis ──────────────────
function formatCoords(x: number, y: number): string {
  const fx = Number.isInteger(x) ? x.toString() : (Math.abs(x - Math.round(x)) < 1e-4 ? Math.round(x).toString() : x.toFixed(1))
  const fy = Number.isInteger(y) ? y.toString() : (Math.abs(y - Math.round(y)) < 1e-4 ? Math.round(y).toString() : y.toFixed(1))
  return `(${fx}, ${fy})`
}

// ─── Cálculo dinámico de viewport del canvas ──────────────────────────────
interface ViewportBounds {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

function computeViewport(waypoints: TrajectoryPoint[]): ViewportBounds {
  const xs = waypoints.map(w => w.x)
  const ys = waypoints.map(w => w.y)
  const minX = Math.min(...xs, 0)
  const maxX = Math.max(...xs, 10)
  const minY = Math.min(...ys, 0)
  const maxY = Math.max(...ys, 6)

  const padX = Math.max(1.5, (maxX - minX) * 0.18)
  const padY = Math.max(1.5, (maxY - minY) * 0.18)

  return {
    xMin: Math.min(-1.5, Math.floor(minX - padX)),
    xMax: Math.max(13.5, Math.ceil(maxX + padX)),
    yMin: Math.min(-5.5, Math.floor(minY - padY)),
    yMax: Math.max(9.5, Math.ceil(maxY + padY)),
  }
}

function worldToCanvas(wx: number, wy: number, W: number, H: number, bounds: ViewportBounds) {
  const px = ((wx - bounds.xMin) / (bounds.xMax - bounds.xMin)) * W
  // Y invertido (pantalla: Y crece hacia abajo)
  const py = H - ((wy - bounds.yMin) / (bounds.yMax - bounds.yMin)) * H
  return { px, py }
}

// ─── Preset labels ─────────────────────────────────────────────────────────
const PRESET_LABELS: Record<PresetType, { name: string; detail: string }> = {
  sinuous:  { name: 'Ruta Sinuosa A→D', detail: 'd > |Δr|, curva en 4 cuadrantes' },
  closed:   { name: 'Circuito Cerrado', detail: 'Δr = 0 con d > 0' },
  linear:   { name: 'Ida y Vuelta 1D', detail: 'Cambio de dirección, Δr < d' },
  parabola: { name: 'Parábola 2D', detail: 'Trayectoria curva, desplazamiento recto' },
  custom:   { name: 'Personalizada', detail: 'Entrada manual de coordenadas (X, Y) y camino' },
}

// ─── Colores del sistema ───────────────────────────────────────────────────
const C = {
  corporate: '#24346c',
  gold: '#c8a932',
  amber: '#d97706',
  green: '#059669',
  border: '#e2e8f0',
  muted: '#8494ac',
  canvasBg: '#f8fafc',
  trail: '#24346c',
  trailOpacity: 0.8,
  ghost: '#cbd5e1',
  disp: '#d97706',
  dispFill: 'rgba(217,119,6,0.10)',
  particle: '#24346c',
  origin: '#059669',
  dest: '#c8a932',
}

// ─── Sección colapsable ────────────────────────────────────────────────────
function Section({ title, icon, defaultOpen = true, children }: {
  title: string
  icon: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.sectionToggle}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{icon}</span>
        <span className={styles.sectionTitle}>{title}</span>
        <span className="material-symbols-outlined" style={{ fontSize: '16px', marginLeft: 'auto', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          expand_more
        </span>
      </button>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </div>
  )
}

export default function DistanciaDesplazamiento() {
  // ─── Estado de configuración ───────────────────────────────────────────
  const [preset, setPreset]               = useState<PresetType>('sinuous')
  const [speed, setSpeed]                 = useState<number>(2.5)
  const [speedInput, setSpeedInput]       = useState<string>('2.50')
  const [showTrajectory, setShowTrajectory] = useState(true)
  const [showDisplacement, setShowDisplacement] = useState(true)
  const [showOdometer, setShowOdometer]   = useState(true)
  const [showGrid, setShowGrid]           = useState(true)
  const [showGhost, setShowGhost]         = useState(true)

  // ─── Coordenadas personalizadas ────────────────────────────────────────
  const [customCoords, setCustomCoords]   = useState<CustomCoordinates>({
    x0: 2, y0: 3, xf: 8, yf: 6, type: 'direct',
  })
  // Inputs como strings para permitir edición fluida
  const [cx0, setCx0] = useState('2')
  const [cy0, setCy0] = useState('3')
  const [cxf, setCxf] = useState('8')
  const [cyf, setCyf] = useState('6')

  const customCoordsRef = useRef<CustomCoordinates>(customCoords)
  useEffect(() => { customCoordsRef.current = customCoords }, [customCoords])

  // ─── Estado de simulación ──────────────────────────────────────────────
  const [running, setRunning]     = useState(false)
  const [completed, setCompleted] = useState(false)

  // Snapshot de la última telemetría para la UI (actualizado por el loop)
  const [telemetry, setTelemetry] = useState({
    time: 0,
    distance: 0,
    displacementMag: 0,
    dx: 0,
    dy: 0,
    angle: 0,
    progress: 0,
    posX: 0,
    posY: 0,
  })

  // Buffer de trail (puntos recorridos)
  const trailRef = useRef<TrajectoryPoint[]>([])

  // ─── Canvas principal ──────────────────────────────────────────────────
  const { canvasRef: mainCanvas, ctx: mainCtx, size: mainSize } = useCanvasRenderer()

  // ─── Gráficas ──────────────────────────────────────────────────────────
  const { canvasRef: chartDistRef, ctx: ctxDist, size: sizeDist } = useCanvasRenderer()
  const { canvasRef: chartDispRef, ctx: ctxDisp, size: sizeDisp } = useCanvasRenderer()
  const { canvasRef: chartPosRef,  ctx: ctxPos,  size: sizePos  } = useCanvasRenderer()

  const distConfig = useMemo(() => ({
    label: 's(t)', unitX: 's', unitY: 'm',
    color: C.corporate, autoScale: true,
  }), [])
  const dispConfig = useMemo(() => ({
    label: '|Δr(t)|', unitX: 's', unitY: 'm',
    color: C.amber, autoScale: true,
  }), [])
  const posConfig = useMemo(() => ({
    label: 'x(t)', unitX: 's', unitY: 'm',
    color: C.green, autoScale: true,
  }), [])

  const chartDist = useLiveChart(distConfig)
  const chartDisp = useLiveChart(dispConfig)
  const chartPos  = useLiveChart(posConfig)

  // ─── Refs de parámetros (necesarios en el loop sin re-crear) ──────────
  const presetRef    = useRef<PresetType>(preset)
  const speedRef     = useRef<number>(speed)
  const showTrajRef  = useRef(showTrajectory)
  const showDispRef  = useRef(showDisplacement)
  const showOdoRef   = useRef(showOdometer)
  const showGridRef  = useRef(showGrid)
  const showGhostRef = useRef(showGhost)

  useEffect(() => { presetRef.current    = preset }, [preset])
  useEffect(() => { speedRef.current     = speed }, [speed])
  useEffect(() => { showTrajRef.current  = showTrajectory }, [showTrajectory])
  useEffect(() => { showDispRef.current  = showDisplacement }, [showDisplacement])
  useEffect(() => { showOdoRef.current   = showOdometer }, [showOdometer])
  useEffect(() => { showGridRef.current  = showGrid }, [showGrid])
  useEffect(() => { showGhostRef.current = showGhost }, [showGhost])

  // ─── Dibujo del canvas principal ──────────────────────────────────────
  const drawMain = useCallback((elapsed: number) => {
    const ctx = mainCtx.current
    const { width: W, height: H } = mainSize
    if (!ctx || W === 0) return

    const activeWaypoints = getWaypoints(
      presetRef.current,
      presetRef.current === 'custom' ? customCoordsRef.current : undefined
    )
    const bounds = computeViewport(activeWaypoints)
    const state = computeState(
      presetRef.current,
      elapsed,
      speedRef.current,
      trailRef.current,
      presetRef.current === 'custom' ? customCoordsRef.current : undefined
    )

    ctx.clearRect(0, 0, W, H)

    // Fondo
    ctx.fillStyle = C.canvasBg
    ctx.fillRect(0, 0, W, H)

    // Grid
    if (showGridRef.current) {
      ctx.save()
      ctx.strokeStyle = C.border
      ctx.lineWidth = 0.5

      // Líneas verticales
      for (let x = Math.ceil(bounds.xMin); x <= Math.floor(bounds.xMax); x++) {
        const { px } = worldToCanvas(x, 0, W, H, bounds)
        ctx.beginPath()
        ctx.moveTo(px, 0)
        ctx.lineTo(px, H)
        ctx.globalAlpha = x === 0 ? 1 : 0.4
        ctx.lineWidth = x === 0 ? 1.5 : 0.5
        ctx.stroke()
      }
      // Líneas horizontales
      for (let y = Math.ceil(bounds.yMin); y <= Math.floor(bounds.yMax); y++) {
        const { py } = worldToCanvas(0, y, W, H, bounds)
        ctx.beginPath()
        ctx.moveTo(0, py)
        ctx.lineTo(W, py)
        ctx.globalAlpha = y === 0 ? 1 : 0.4
        ctx.lineWidth = y === 0 ? 1.5 : 0.5
        ctx.stroke()
      }

      // Etiquetas de los ejes
      ctx.globalAlpha = 1
      ctx.fillStyle = C.muted
      ctx.font = `${Math.max(9, W * 0.018)}px JetBrains Mono, monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      const stepX = (bounds.xMax - bounds.xMin) > 16 ? 4 : 2
      for (let x = Math.ceil(bounds.xMin); x <= Math.floor(bounds.xMax); x += stepX) {
        if (x === 0) continue
        const { px, py: py0 } = worldToCanvas(x, 0, W, H, bounds)
        ctx.fillText(String(x), px, py0 + 3)
      }
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      const stepY = (bounds.yMax - bounds.yMin) > 16 ? 4 : 2
      for (let y = Math.ceil(bounds.yMin); y <= Math.floor(bounds.yMax); y += stepY) {
        if (y === 0) continue
        const { px: px0, py } = worldToCanvas(0, y, W, H, bounds)
        ctx.fillText(String(y), px0 - 3, py)
      }

      // Leyenda de ejes
      ctx.fillStyle = C.corporate
      ctx.font = `bold ${Math.max(10, W * 0.02)}px JetBrains Mono, monospace`
      ctx.textAlign = 'right'
      ctx.textBaseline = 'top'
      const { px: originPx, py: originPy } = worldToCanvas(bounds.xMax - 0.2, 0, W, H, bounds)
      ctx.fillText('x (m)', originPx, originPy + 2)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      const { px: yLabelPx, py: yLabelPy } = worldToCanvas(0, bounds.yMax - 0.3, W, H, bounds)
      ctx.fillText('y (m)', yLabelPx + 2, yLabelPy)

      ctx.restore()
    }

    // Ghost track (trayectoria completa en gris)
    if (showGhostRef.current) {
      const ghost = getFullTrailPoints(
        presetRef.current,
        200,
        presetRef.current === 'custom' ? customCoordsRef.current : undefined
      )
      ctx.save()
      ctx.setLineDash([6, 5])
      ctx.strokeStyle = C.ghost
      ctx.lineWidth = 1.5
      ctx.globalAlpha = 0.5
      ctx.beginPath()
      ghost.forEach((pt, i) => {
        const { px, py } = worldToCanvas(pt.x, pt.y, W, H, bounds)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      })
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }

    // Trail recorrido
    if (showTrajRef.current && trailRef.current.length > 1) {
      ctx.save()
      ctx.strokeStyle = C.trail
      ctx.lineWidth = 2.5
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.globalAlpha = C.trailOpacity
      ctx.beginPath()
      trailRef.current.forEach((pt, i) => {
        const { px, py } = worldToCanvas(pt.x, pt.y, W, H, bounds)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      })
      ctx.stroke()
      ctx.restore()
    }

    // Vector desplazamiento (desde origen hasta posición actual)
    if (showDispRef.current && state.displacementMag > 0.05) {
      const { px: ox, py: oy } = worldToCanvas(state.origin.x, state.origin.y, W, H, bounds)
      const { px: px, py: py } = worldToCanvas(state.pos.x, state.pos.y, W, H, bounds)

      ctx.save()
      ctx.strokeStyle = C.disp
      ctx.fillStyle = C.disp
      ctx.lineWidth = 2
      ctx.setLineDash([7, 4])

      ctx.beginPath()
      ctx.moveTo(ox, oy)
      ctx.lineTo(px, py)
      ctx.stroke()
      ctx.setLineDash([])

      // Punta de flecha
      const angle = Math.atan2(py - oy, px - ox)
      const arrowLen = 10
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(px - arrowLen * Math.cos(angle - 0.4), py - arrowLen * Math.sin(angle - 0.4))
      ctx.lineTo(px - arrowLen * Math.cos(angle + 0.4), py - arrowLen * Math.sin(angle + 0.4))
      ctx.closePath()
      ctx.fill()

      // Etiqueta Δr
      const mx = (ox + px) / 2
      const my = (oy + py) / 2
      ctx.fillStyle = C.amber
      ctx.font = `bold ${Math.max(11, W * 0.022)}px JetBrains Mono, monospace`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.globalAlpha = 1
      ctx.fillText(`Δr = ${state.displacementMag.toFixed(2)} m`, mx + 8, my)

      ctx.restore()
    }

    // ─── Waypoints ─────────────────────────────────────────────────────
    ctx.save()
    activeWaypoints.forEach((wp, i) => {
      const { px, py } = worldToCanvas(wp.x, wp.y, W, H, bounds)
      const isFirst = i === 0
      const isLast  = i === activeWaypoints.length - 1

      if (isFirst) {
        ctx.fillStyle = C.origin
        ctx.strokeStyle = '#ffffff'
      } else if (isLast) {
        ctx.fillStyle = C.dest
        ctx.strokeStyle = '#ffffff'
      } else {
        ctx.fillStyle = C.muted
        ctx.strokeStyle = '#ffffff'
      }

      const r = isFirst || isLast ? 7 : 5
      ctx.beginPath()
      ctx.arc(px, py, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.lineWidth = 2
      ctx.stroke()

      // Etiqueta
      const label = String.fromCharCode(65 + i)
      ctx.fillStyle = isFirst ? C.origin : isLast ? C.dest : C.muted
      ctx.font = `bold ${Math.max(11, W * 0.02)}px Plus Jakarta Sans, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(
        `${label} ${formatCoords(wp.x, wp.y)}`,
        px,
        py - r - 3
      )
    })
    ctx.restore()

    // ─── Partícula ─────────────────────────────────────────────────────
    const { px: partX, py: partY } = worldToCanvas(state.pos.x, state.pos.y, W, H, bounds)
    ctx.save()

    // Halo
    ctx.globalAlpha = 0.25
    ctx.fillStyle = C.gold
    ctx.beginPath()
    ctx.arc(partX, partY, 14, 0, Math.PI * 2)
    ctx.fill()

    // Cuerpo
    ctx.globalAlpha = 1
    ctx.fillStyle = C.particle
    ctx.beginPath()
    ctx.arc(partX, partY, 9, 0, Math.PI * 2)
    ctx.fill()

    // Punto central blanco
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(partX, partY, 3.5, 0, Math.PI * 2)
    ctx.fill()

    // Odómetro flotante
    if (showOdoRef.current) {
      const pad = 6
      const txt = `s = ${state.distance.toFixed(2)} m`
      ctx.font = `bold ${Math.max(10, W * 0.019)}px JetBrains Mono, monospace`
      const tw = ctx.measureText(txt).width
      const bx = partX - tw / 2 - pad
      const by = partY - 32
      const bw = tw + pad * 2
      const bh = 20

      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.strokeStyle = C.border
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(bx, by, bw, bh, 5)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = C.corporate
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(txt, partX, by + bh / 2)
    }

    ctx.restore()

    // Actualiza estado de telemetría
    setTelemetry({
      time: state.time,
      distance: state.distance,
      displacementMag: state.displacementMag,
      dx: state.dx,
      dy: state.dy,
      angle: state.angle,
      progress: state.progress,
      posX: state.pos.x,
      posY: state.pos.y,
    })

    if (state.completed) {
      setCompleted(true)
    }
  }, [mainCtx, mainSize])

  // ─── Dibujo de gráficas ─────────────────────────────────────────────────
  // PROBLEMA 1 FIX: Usamos refs para obtener siempre los tamaños actuales
  // sin depender de closures estálidas. Esto garantiza que al reiniciar
  // las gráficas se dibujen correctamente aun cuando el estado aún no se ha actualizado.
  const sizeDistRef = useRef(sizeDist)
  const sizeDispRef = useRef(sizeDisp)
  const sizePosRef  = useRef(sizePos)
  useEffect(() => { sizeDistRef.current = sizeDist }, [sizeDist])
  useEffect(() => { sizeDispRef.current = sizeDisp }, [sizeDisp])
  useEffect(() => { sizePosRef.current  = sizePos  }, [sizePos])

  const drawCharts = useCallback(() => {
    // Usar refs para obtener siempre el tamaño más actual
    const sd = sizeDistRef.current
    const sp = sizeDispRef.current
    const spo = sizePosRef.current
    if (ctxDist.current && sd.width > 0)
      chartDist.draw(ctxDist.current, sd.width, sd.height)
    if (ctxDisp.current && sp.width > 0)
      chartDisp.draw(ctxDisp.current, sp.width, sp.height)
    if (ctxPos.current && spo.width > 0)
      chartPos.draw(ctxPos.current, spo.width, spo.height)
  }, [ctxDist, ctxDisp, ctxPos, chartDist, chartDisp, chartPos])

  const stopRef = useRef<() => void>(() => {})

  // ─── Loop de animación ──────────────────────────────────────────────────
  const { start, pause, resume, reset: resetLoop } = useAnimationLoop(
    useCallback((_dt: number, elapsed: number) => {
      // Añadir punto al trail
      const state = computeState(presetRef.current, elapsed, speedRef.current, trailRef.current)

      // Muestreo adaptativo del trail
      const last = trailRef.current[trailRef.current.length - 1]
      if (!last || Math.hypot(state.pos.x - last.x, state.pos.y - last.y) > 0.05) {
        trailRef.current = [...trailRef.current, { ...state.pos }]
      }

      // Alimentar gráficas
      chartDist.push(elapsed, state.distance)
      chartDisp.push(elapsed, state.displacementMag)
      chartPos.push(elapsed, state.pos.x)

      // Dibujar
      drawMain(elapsed)
      drawCharts()

      if (state.completed) {
        stopRef.current()
        setRunning(false)
        setCompleted(true)
      }
    }, [drawMain, drawCharts, chartDist, chartDisp, chartPos])
  )
  stopRef.current = pause

  // ─── Handlers de control ────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    if (completed) return
    if (running) {
      pause()
      setRunning(false)
    } else {
      if (telemetry.time === 0) {
        start()
      } else {
        resume()
      }
      setRunning(true)
    }
  }, [running, completed, telemetry.time, start, pause, resume])

  // PROBLEMA 1 FIX: handleReset ahora dibuja los canvases con un pequeño
  // delay usando requestAnimationFrame para garantizar que los canvases
  // ya tienen sus dimensiones correctas al momento del dibujo inicial.
  const handleReset = useCallback(() => {
    resetLoop()
    setRunning(false)
    setCompleted(false)
    trailRef.current = []
    chartDist.reset()
    chartDisp.reset()
    chartPos.reset()
    const cc = presetRef.current === 'custom' ? customCoordsRef.current : undefined
    const wp = getWaypoints(presetRef.current, cc)
    const initX = wp[0].x
    const initY = wp[0].y
    setTelemetry({
      time: 0,
      distance: 0,
      displacementMag: 0,
      dx: 0,
      dy: 0,
      angle: 0,
      progress: 0,
      posX: initX,
      posY: initY,
    })
    // Dibujar estado inicial: primero intentamos inmediatamente,
    // luego en el siguiente frame para garantizar que los tamaños están disponibles
    drawMain(0)
    drawCharts()
    requestAnimationFrame(() => {
      drawMain(0)
      drawCharts()
    })
  }, [resetLoop, chartDist, chartDisp, chartPos, drawMain, drawCharts])

  // ─── Al cambiar preset, resetear ───────────────────────────────────────
  const handlePreset = useCallback((p: PresetType) => {
    setPreset(p)
    presetRef.current = p  // Actualizar ref inmediatamente
    resetLoop()
    setRunning(false)
    setCompleted(false)
    trailRef.current = []
    chartDist.reset()
    chartDisp.reset()
    chartPos.reset()
    const cc = p === 'custom' ? customCoordsRef.current : undefined
    const wp = getWaypoints(p, cc)
    setTelemetry({
      time: 0,
      distance: 0,
      displacementMag: 0,
      dx: 0,
      dy: 0,
      angle: 0,
      progress: 0,
      posX: wp[0].x,
      posY: wp[0].y,
    })
    // Redibujar inmediatamente y en el siguiente frame
    requestAnimationFrame(() => {
      drawMain(0)
      drawCharts()
    })
  }, [resetLoop, chartDist, chartDisp, chartPos, drawMain, drawCharts])

  // ─── Render inicial y reactivo del canvas y gráficas ────────────────────
  useEffect(() => {
    if (mainSize.width > 0) {
      drawMain(0)
    }
    drawCharts()
  }, [mainSize, sizeDist, sizeDisp, sizePos, drawMain, drawCharts, preset, customCoords])

  // ─── Handlers de coordenadas personalizadas ────────────────────────────
  const applyCustomCoords = useCallback(() => {
    const x0 = parseFloat(cx0)
    const y0 = parseFloat(cy0)
    const xf = parseFloat(cxf)
    const yf = parseFloat(cyf)
    if ([x0, y0, xf, yf].some(isNaN)) return
    const next: CustomCoordinates = { ...customCoords, x0, y0, xf, yf }
    setCustomCoords(next)
    customCoordsRef.current = next
    // Resetear simulación con nuevas coords
    resetLoop()
    setRunning(false)
    setCompleted(false)
    trailRef.current = []
    chartDist.reset()
    chartDisp.reset()
    chartPos.reset()
    const wp = getWaypoints('custom', next)
    setTelemetry({
      time: 0, distance: 0, displacementMag: 0, dx: 0, dy: 0, angle: 0, progress: 0,
      posX: wp[0].x, posY: wp[0].y,
    })
    requestAnimationFrame(() => { drawMain(0); drawCharts() })
  }, [cx0, cy0, cxf, cyf, customCoords, resetLoop, chartDist, chartDisp, chartPos, drawMain, drawCharts])

  // ─── Derivados para la UI ───────────────────────────────────────────────
  const activeCustom  = preset === 'custom' ? customCoords : undefined
  const totalLength   = getTotalLength(preset, activeCustom)
  const duration      = getDuration(preset, speed, activeCustom)
  const efficiency    = telemetry.distance > 0
    ? (telemetry.displacementMag / telemetry.distance) * 100
    : 0
  const waypoints     = getWaypoints(preset, activeCustom)

  return (
    <div className={styles.container}>

      {/* ═══════════════════════════════════════════════════════════════════
          SECCIÓN 1 — CONCEPTOS FUNDAMENTALES
          ═══════════════════════════════════════════════════════════════════ */}
      <Section title="Conceptos Fundamentales" icon="menu_book">
        <div className={styles.theoryGrid}>
          {/* Card: Distancia */}
          <div className={`${styles.theoryCard} ${styles.theoryCardBlue}`}>
            <div className={styles.theoryCardHeader}>
              <span className="material-symbols-outlined" style={{ color: 'var(--corporate)', fontSize: '20px' }}>
                route
              </span>
              <h3 className={styles.theoryTitle}>Distancia <span className={styles.scalarBadge}>Escalar</span></h3>
            </div>
            <p className={styles.theoryBody}>
              La <strong>distancia recorrida</strong> es la longitud total de la trayectoria seguida
              por el móvil. Depende del camino, no de los extremos.
            </p>
            <ul className={styles.theoryList}>
              <li>Siempre <strong>≥ 0</strong></li>
              <li>No tiene dirección ni sentido</li>
              <li>Solo puede <strong>aumentar</strong> o permanecer igual</li>
              <li>Depende completamente de la trayectoria recorrida</li>
            </ul>
            <div className={styles.formulaBlock}>
              <BlockMath math="s = \int_0^t \left|\vec{v}(\tau)\right|\,d\tau" />
            </div>
            <div className={styles.exampleBox}>
              <span className={styles.exampleTitle}>📌 Ejemplo clave:</span>
              <p className={styles.exampleText}>
                Un estudiante camina de <strong>(0, 0)</strong> a <strong>(4, 0)</strong> y regresa a <strong>(0, 0)</strong>.
                <br />La <strong>distancia recorrida = 8 m</strong>, porque recorrió 4 m de ida y 4 m de vuelta.
                La distancia siempre se acumula sin importar la dirección.
              </p>
            </div>
          </div>

          {/* Card: Desplazamiento */}
          <div className={`${styles.theoryCard} ${styles.theoryCardAmber}`}>
            <div className={styles.theoryCardHeader}>
              <span className="material-symbols-outlined" style={{ color: '#d97706', fontSize: '20px' }}>
                arrow_forward
              </span>
              <h3 className={styles.theoryTitle}>Desplazamiento <span className={styles.vectorBadge}>Vectorial</span></h3>
            </div>
            <p className={styles.theoryBody}>
              El <strong>desplazamiento</strong> es el vector que va desde la posición inicial
              hasta la posición final. No importa qué camino se tomó.
            </p>
            <ul className={styles.theoryList}>
              <li>Tiene magnitud, <strong>dirección y sentido</strong></li>
              <li>Puede ser <strong>cero</strong> aunque se recorrió distancia</li>
              <li>Solo depende de posición inicial y final</li>
              <li><InlineMath math="|\Delta\vec{r}| \leq s" /> siempre</li>
            </ul>
            <div className={styles.formulaBlock}>
              <BlockMath math="\Delta\vec{r} = \vec{r}_f - \vec{r}_0 = \Delta x\,\hat{\imath} + \Delta y\,\hat{\jmath}" />
            </div>
            <div className={styles.exampleBox}>
              <span className={styles.exampleTitle}>📌 Mismo ejemplo:</span>
              <p className={styles.exampleText}>
                En el mismo recorrido de <strong>(0,0) → (4,0) → (0,0)</strong>,
                el <strong>desplazamiento = 0 m</strong>, porque la posición final
                es exactamente igual a la posición inicial.
                <br /><strong>Distancia ≠ Desplazamiento</strong>
              </p>
            </div>
          </div>

          {/* Card: Diferencias clave */}
          <div className={`${styles.theoryCard} ${styles.theoryCardGreen}`}>
            <div className={styles.theoryCardHeader}>
              <span className="material-symbols-outlined" style={{ color: 'var(--vector-c)', fontSize: '20px' }}>
                compare_arrows
              </span>
              <h3 className={styles.theoryTitle}>Diferencias Clave</h3>
            </div>
            <div className={styles.comparisonTable}>
              <div className={styles.compRow}>
                <span className={styles.compHeader} style={{ color: C.corporate }}>Distancia s</span>
                <span className={styles.compHeader} style={{ color: C.amber }}>Desplazamiento Δr</span>
              </div>
              <div className={styles.compRow}>
                <span className={styles.compCell}>Escalar</span>
                <span className={styles.compCell}>Vectorial</span>
              </div>
              <div className={styles.compRow}>
                <span className={styles.compCell}>Siempre ≥ 0</span>
                <span className={styles.compCell}>Puede ser 0 o negativo</span>
              </div>
              <div className={styles.compRow}>
                <span className={styles.compCell}>Depende del camino</span>
                <span className={styles.compCell}>Solo inicial y final</span>
              </div>
              <div className={styles.compRow}>
                <span className={styles.compCell}>Odómetro de auto</span>
                <span className={styles.compCell}>Flecha en mapa</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECCIÓN 2 — TEORÍA Y ECUACIONES
          ═══════════════════════════════════════════════════════════════════ */}
      <Section title="Teoría y Ecuaciones" icon="functions" defaultOpen={false}>
        <div className={styles.theoryGrid}>
          {/* Ecuaciones clave */}
          <div className={`${styles.theoryCard} ${styles.theoryCardBlue}`}>
            <div className={styles.theoryCardHeader}>
              <span className="material-symbols-outlined" style={{ color: 'var(--corporate)', fontSize: '20px' }}>calculate</span>
              <h3 className={styles.theoryTitle}>Magnitud del Desplazamiento 2D</h3>
            </div>
            <div className={styles.formulaBlock}>
              <BlockMath math="|\Delta\vec{r}| = \sqrt{(\Delta x)^2 + (\Delta y)^2}" />
            </div>
            <div className={styles.formulaExplain}>
              <p><strong>¿Qué representa?</strong> La distancia en línea recta entre la posición inicial y la posición actual del móvil, sin importar el camino tomado.</p>
              <p><strong>Variables:</strong></p>
              <ul className={styles.theoryList}>
                <li><InlineMath math="\Delta x = x_f - x_i" /> → cambio en la componente horizontal</li>
                <li><InlineMath math="\Delta y = y_f - y_i" /> → cambio en la componente vertical</li>
                <li><InlineMath math="|\Delta\vec{r}|" /> → magnitud del desplazamiento en metros</li>
              </ul>
              <p><strong>¿Por qué se usa?</strong> Es una aplicación directa del Teorema de Pitágoras al plano cartesiano. Si el movimiento ocurre en 2 dimensiones, necesitamos combinar los cambios en X e Y para obtener la distancia real entre dos puntos.</p>
              <p><strong>Ejemplo:</strong> Si <InlineMath math="x_i = 2,\; y_i = 3,\; x_f = 8,\; y_f = 6" /> entonces:</p>
              <div className={styles.formulaBlock}>
                <BlockMath math="|\Delta\vec{r}| = \sqrt{(8-2)^2 + (6-3)^2} = \sqrt{36+9} = \sqrt{45} \approx 6.71 \text{ m}" />
              </div>
            </div>
          </div>

          <div className={`${styles.theoryCard} ${styles.theoryCardAmber}`}>
            <div className={styles.theoryCardHeader}>
              <span className="material-symbols-outlined" style={{ color: '#d97706', fontSize: '20px' }}>speed</span>
              <h3 className={styles.theoryTitle}>Rapidez Tangencial</h3>
            </div>
            <div className={styles.formulaBlock}>
              <BlockMath math="|\vec{v}| = \frac{ds}{dt} = \text{cte}" />
            </div>
            <div className={styles.formulaExplain}>
              <p><strong>¿Qué representa?</strong> La rapidez tangencial es la magnitud de la velocidad del móvil en cualquier punto de su trayectoria. Es lo que marcaría el velocímetro de un vehículo.</p>
              <p><strong>Variables:</strong></p>
              <ul className={styles.theoryList}>
                <li><InlineMath math="|\vec{v}|" /> → rapidez (m/s)</li>
                <li><InlineMath math="s" /> → distancia recorrida (m)</li>
                <li><InlineMath math="t" /> → tiempo (s)</li>
              </ul>
              <p><strong>¿Por qué se usa?</strong> En esta simulación, el móvil se desplaza con rapidez constante a lo largo de la trayectoria. Esto permite calcular la posición exacta en cualquier instante como <InlineMath math="s = |\vec{v}| \cdot t" />.</p>
              <p><strong>¿Cuándo es relevante?</strong> La rapidez tangencial determina qué tan rápido se acumula la distancia recorrida. A mayor rapidez, menor tiempo para completar el recorrido.</p>
            </div>
          </div>

          <div className={`${styles.theoryCard} ${styles.theoryCardGreen}`}>
            <div className={styles.theoryCardHeader}>
              <span className="material-symbols-outlined" style={{ color: '#059669', fontSize: '20px' }}>analytics</span>
              <h3 className={styles.theoryTitle}>Ángulo del Desplazamiento</h3>
            </div>
            <div className={styles.formulaBlock}>
              <BlockMath math="\theta = \arctan\!\left(\frac{\Delta y}{\Delta x}\right)" />
            </div>
            <div className={styles.formulaExplain}>
              <p><strong>¿Qué representa?</strong> El ángulo que forma el vector desplazamiento con el eje X positivo. Indica la <em>dirección</em> del desplazamiento.</p>
              <p><strong>Variables:</strong></p>
              <ul className={styles.theoryList}>
                <li><InlineMath math="\theta" /> → ángulo en grados (°)</li>
                <li><InlineMath math="\Delta y" /> → componente vertical del desplazamiento</li>
                <li><InlineMath math="\Delta x" /> → componente horizontal del desplazamiento</li>
              </ul>
              <p><strong>Teorema fundamental:</strong></p>
              <div className={styles.formulaBlock}>
                <BlockMath math="s(t) \;\geq\; |\Delta\vec{r}(t)| \quad \text{siempre}" />
              </div>
              <p>La distancia recorrida nunca puede ser menor que el módulo del desplazamiento. La igualdad solo ocurre en trayectoria rectilínea sin retroceso.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════
          BARRA DE PRESETS
          ═══════════════════════════════════════════════════════════════════ */}
>>>>>>> c197d6a067b97eb283a3d32bde5ab31f92eb82e1
      <div className={styles.subHeader}>
        <div className={styles.presetGroup}>
          <span className={styles.presetLabel}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>alt_route</span>
            Ejemplos:
          </span>
<<<<<<< HEAD
          {ROUTE_PRESETS.map(p => (
            <button
              key={p.id}
              className={`${styles.presetBtn} ${activePreset === p.id ? styles.presetBtnActive : ''}`}
              onClick={() => handleLoadPreset(p)}
              type="button"
              title={p.description}
            >
              {p.name}
=======
          {(['sinuous', 'closed', 'linear', 'parabola', 'custom'] as PresetType[]).map(p => (
            <button
              key={p}
              className={`${styles.presetBtn} ${preset === p ? styles.presetBtnActive : ''}`}
              onClick={() => handlePreset(p)}
              type="button"
            >
              {p === 'sinuous'  && 'Sinuosa A-D'}
              {p === 'closed'   && 'Circuito Cerrado'}
              {p === 'linear'   && 'Ida y Vuelta 1D'}
              {p === 'parabola' && 'Parábola 2D'}
              {p === 'custom'   && '✏ Personalizada'}
>>>>>>> c197d6a067b97eb283a3d32bde5ab31f92eb82e1
            </button>
          ))}
        </div>
        <span className={styles.badge}>FÍSICA FUNDAMENTAL • 4.º DIVERSIFICADO</span>
      </div>

<<<<<<< HEAD
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
=======
      {/* ═══════════════════════════════════════════════════════════════════
          ÁREA DE TRABAJO: 3 COLUMNAS
          ═══════════════════════════════════════════════════════════════════ */}
      <div className={styles.gridWorkbench}>

        {/* ── COLUMNA IZQUIERDA: Controles ──────────────────────────────── */}
        <div className={styles.column}>

          {/* Card: Parámetros de simulación */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>tune</span>
                Parámetros
              </span>
              <span className={styles.badge}>CONFIGURACIÓN</span>
            </div>

            {/* Rapidez Tangencial — siempre visible */}
            <div>
              <div className={styles.sliderRow}>
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>Rapidez Tangencial <InlineMath math="|\vec{v}|" /></span>
              </div>
              <div className={styles.speedInputGroup}>
                <input
                  type="range"
                  min="0.5"
                  max="6.0"
                  step="0.25"
                  value={speed}
                  onChange={e => {
                    const v = parseFloat(e.target.value)
                    setSpeed(v)
                    setSpeedInput(v.toFixed(2))
                    handleReset()
                  }}
                  className={styles.slider}
                  disabled={running}
                />
                <div className={styles.speedInputWrap}>
                  <input
                    type="number"
                    min="0.5"
                    max="6.0"
                    step="0.25"
                    value={speedInput}
                    disabled={running}
                    className={styles.numInput}
                    style={{ width: '52px', textAlign: 'right' }}
                    onChange={e => {
                      setSpeedInput(e.target.value)
                      const v = parseFloat(e.target.value)
                      if (!isNaN(v) && v >= 0.5 && v <= 6.0) {
                        setSpeed(v)
                      }
                    }}
                    onBlur={() => {
                      const v = parseFloat(speedInput)
                      if (isNaN(v) || v < 0.5) { setSpeed(0.5); setSpeedInput('0.50') }
                      else if (v > 6.0) { setSpeed(6.0); setSpeedInput('6.00') }
                      else { setSpeed(v); setSpeedInput(v.toFixed(2)) }
                    }}
                  />
                  <span className={styles.unitSuffix}>m/s</span>
                </div>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Duración estimada: <strong>{duration.toFixed(1)} s</strong> · Longitud: <strong>{totalLength.toFixed(2)} m</strong>
              </div>
            </div>

            {/* Coordenadas personalizadas — solo para preset custom */}
            {preset === 'custom' && (
              <div className={styles.coordsCard}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--corporate)', textTransform: 'uppercase' }}>
                  Coordenadas Personalizadas
                </span>

                <div className={styles.coordGroup}>
                  <span className={styles.coordGroupTitle}>
                    <span style={{ color: '#059669' }}>●</span> Posición inicial
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                      &nbsp;= {formatCoords(parseFloat(cx0) || 0, parseFloat(cy0) || 0)}
                    </span>
                  </span>
                  <div className={styles.coordInputs}>
                    <div className={styles.inputField}>
                      <span className={styles.inputPrefix}>X₀ =</span>
                      <input
                        type="number"
                        className={styles.numInput}
                        value={cx0}
                        step="0.5"
                        onChange={e => setCx0(e.target.value)}
                        disabled={running}
                        placeholder="0"
                      />
                      <span className={styles.unitSuffix}>m</span>
                    </div>
                    <div className={styles.inputField}>
                      <span className={styles.inputPrefix}>Y₀ =</span>
                      <input
                        type="number"
                        className={styles.numInput}
                        value={cy0}
                        step="0.5"
                        onChange={e => setCy0(e.target.value)}
                        disabled={running}
                        placeholder="0"
                      />
                      <span className={styles.unitSuffix}>m</span>
                    </div>
                  </div>
                </div>

                <div className={styles.coordGroup}>
                  <span className={styles.coordGroupTitle}>
                    <span style={{ color: '#c8a932' }}>●</span> Posición final
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                      &nbsp;= {formatCoords(parseFloat(cxf) || 0, parseFloat(cyf) || 0)}
                    </span>
                  </span>
                  <div className={styles.coordInputs}>
                    <div className={styles.inputField}>
                      <span className={styles.inputPrefix}>X_f =</span>
                      <input
                        type="number"
                        className={styles.numInput}
                        value={cxf}
                        step="0.5"
                        onChange={e => setCxf(e.target.value)}
                        disabled={running}
                        placeholder="8"
                      />
                      <span className={styles.unitSuffix}>m</span>
                    </div>
                    <div className={styles.inputField}>
                      <span className={styles.inputPrefix}>Y_f =</span>
                      <input
                        type="number"
                        className={styles.numInput}
                        value={cyf}
                        step="0.5"
                        onChange={e => setCyf(e.target.value)}
                        disabled={running}
                        placeholder="6"
                      />
                      <span className={styles.unitSuffix}>m</span>
                    </div>
                  </div>
                </div>

                {/* Tipo de trayectoria */}
                <div>
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Tipo de trayectoria
                  </span>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                    {(['direct', 'curve', 'return'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        disabled={running}
                        className={`${styles.presetBtn} ${customCoords.type === t ? styles.presetBtnActive : ''}`}
                        style={{ fontSize: '10px', padding: '3px 8px' }}
                        onClick={() => {
                          const next = { ...customCoords, type: t }
                          setCustomCoords(next)
                          customCoordsRef.current = next
                        }}
                      >
                        {t === 'direct' && 'Rectilíneo'}
                        {t === 'curve'  && 'Curvo'}
                        {t === 'return' && 'Ida y Vuelta'}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ fontSize: 'var(--text-xs)', width: '100%' }}
                  disabled={running}
                  onClick={applyCustomCoords}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>
                  Aplicar coordenadas
                </button>

                {/* Vista previa de coordenadas aplicadas */}
                <div className={styles.coordPreview}>
                  <div>
                    <span className={styles.posLabel}>Pos. inicial:</span>
                    <span className={styles.posValue} style={{ color: '#059669' }}>
                      &nbsp;{formatCoords(customCoords.x0, customCoords.y0)} m
                    </span>
                  </div>
                  <div>
                    <span className={styles.posLabel}>Pos. final:</span>
                    <span className={styles.posValue} style={{ color: '#c8a932' }}>
                      &nbsp;{formatCoords(customCoords.xf, customCoords.yf)} m
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tabla de waypoints */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {PRESET_LABELS[preset].name}
                </span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--corporate)', fontWeight: 700 }}>
                  {waypoints.length} PUNTOS
                </span>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Nodo</th>
                      <th>Coordenadas (m)</th>
                      <th style={{ textAlign: 'right' }}>Rol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waypoints.map((wp, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: i === 0 ? '#059669' : i === waypoints.length - 1 ? '#c8a932' : 'var(--corporate)' }}>
                          {String.fromCharCode(65 + i)}
                        </td>
                        <td>{formatCoords(wp.x, wp.y)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                          {i === 0 ? 'Origen' : i === waypoints.length - 1 ? 'Destino' : 'Vértice'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Capas visuales */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '6px', borderTop: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Capas Visuales
              </span>
              {([
                ['showTrajectory', showTrajectory, setShowTrajectory, 'Trayectoria real s(t)'],
                ['showDisplacement', showDisplacement, setShowDisplacement, 'Vector desplazamiento Δr'],
                ['showOdometer', showOdometer, setShowOdometer, 'Odómetro flotante'],
                ['showGrid', showGrid, setShowGrid, 'Retícula cartesiana'],
                ['showGhost', showGhost, setShowGhost, 'Trayectoria fantasma'],
              ] as [string, boolean, (v: boolean) => void, string][]).map(([key, val, setter, label]) => (
                <label key={key} className={styles.layerCheckbox}>
                  <input
                    type="checkbox"
                    checked={val}
                    onChange={e => setter(e.target.checked)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            {/* Controles de transporte */}
            <div className={styles.transportGrid}>
              <button
                className={`btn ${running ? 'btn--secondary' : 'btn--primary'}`}
                onClick={handlePlayPause}
                type="button"
                disabled={completed}
                style={{ fontSize: 'var(--text-xs)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  {running ? 'pause' : 'play_arrow'}
                </span>
                {running ? 'Pausar' : completed ? 'Fin' : 'Iniciar'}
>>>>>>> c197d6a067b97eb283a3d32bde5ab31f92eb82e1
              </button>
              <button
                className={styles.btnSecondary}
                onClick={handleReset}
                type="button"
<<<<<<< HEAD
                title="Reiniciar simulación a t = 0"
=======
                onClick={handleReset}
                style={{ fontSize: 'var(--text-xs)' }}
>>>>>>> c197d6a067b97eb283a3d32bde5ab31f92eb82e1
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>restart_alt</span>
                Reiniciar
              </button>
            </div>

            {completed && (
              <div className={styles.completedBanner}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                Recorrido completado
              </div>
            )}
          </div>
        </div>

<<<<<<< HEAD
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
=======
        {/* ── COLUMNA CENTRAL: Canvas + Gráficas ────────────────────────── */}
        <div className={styles.stageCard}>
          <div className={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: running ? '#10b981' : 'var(--corporate)' }} />
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                Simulación — Plano Cartesiano [X vs Y]
              </span>
              <span className={styles.badge}>1 DIV = 1.0 m</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                t = {telemetry.time.toFixed(2)} s
              </span>
            </div>
          </div>

          {/* Telemetría HUD */}
>>>>>>> c197d6a067b97eb283a3d32bde5ab31f92eb82e1
          <div className={styles.telemetryGrid}>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Tiempo (t)</span>
              <div>
<<<<<<< HEAD
                <span className={styles.telemetryValue}>{motion.time.toFixed(2)}</span>
=======
                <span className={styles.telemetryValue}>{telemetry.time.toFixed(2)}</span>
>>>>>>> c197d6a067b97eb283a3d32bde5ab31f92eb82e1
                <span className={styles.telemetryUnit}>s</span>
              </div>
            </div>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Distancia s(t)</span>
              <div>
<<<<<<< HEAD
                <span className={styles.telemetryValue} style={{ color: 'var(--corporate)' }}>
                  {motion.distanceCovered.toFixed(2)}
=======
                <span className={styles.telemetryValue} style={{ color: C.corporate }}>
                  {telemetry.distance.toFixed(2)}
>>>>>>> c197d6a067b97eb283a3d32bde5ab31f92eb82e1
                </span>
                <span className={styles.telemetryUnit}>m</span>
              </div>
            </div>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Desplazamiento |Δr|</span>
              <div>
<<<<<<< HEAD
                <span className={styles.telemetryValue} style={{ color: '#d97706' }}>
                  {motion.currentDisplacement.magnitude.toFixed(2)}
=======
                <span className={styles.telemetryValue} style={{ color: C.amber }}>
                  {telemetry.displacementMag.toFixed(2)}
>>>>>>> c197d6a067b97eb283a3d32bde5ab31f92eb82e1
                </span>
                <span className={styles.telemetryUnit}>m</span>
              </div>
            </div>
          </div>

<<<<<<< HEAD
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
=======
          {/* Canvas principal */}
          <div className={styles.svgStageWrapper}>
            <canvas ref={mainCanvas} style={{ width: '100%', height: '100%', display: 'block' }} />
          </div>

          {/* Barra de progreso */}
          <div className={styles.progressBarContainer}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
              <span style={{ color: 'var(--text-muted)' }}>
                Progreso del Recorrido (total: {totalLength.toFixed(2)} m)
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--corporate)' }}>
                {(telemetry.progress * 100).toFixed(1)}%
              </span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressBarFill} style={{ width: `${telemetry.progress * 100}%` }} />
            </div>
          </div>

          {/* Gráficas dinámicas — PROBLEMA 2: reducidas moderadamente */}
          <div className={styles.chartsSection}>
            <div className={styles.chartsHeader}>
              <span className="material-symbols-outlined" style={{ color: 'var(--corporate)', fontSize: '16px' }}>timeline</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Gráficas en Tiempo Real
              </span>
            </div>
            <div className={styles.chartGrid}>
              <div className={styles.chartCard}>
                <div className={styles.chartLabel} style={{ color: C.corporate }}>
                  ● s(t) — Distancia recorrida (m)
                </div>
                <div className={styles.chartCanvas}>
                  <canvas ref={chartDistRef} style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
                <div className={styles.chartNote}>Escalar · Monotónamente creciente · Acumula sin retroceder</div>
              </div>
              <div className={styles.chartCard}>
                <div className={styles.chartLabel} style={{ color: C.amber }}>
                  ● |Δr(t)| — Módulo del desplazamiento (m)
                </div>
                <div className={styles.chartCanvas}>
                  <canvas ref={chartDispRef} style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
                <div className={styles.chartNote}>Vectorial · Puede crecer o disminuir · Acotado por s(t)</div>
              </div>
              <div className={styles.chartCard}>
                <div className={styles.chartLabel} style={{ color: C.green }}>
                  ● x(t) — Posición horizontal (m)
                </div>
                <div className={styles.chartCanvas}>
                  <canvas ref={chartPosRef} style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
                <div className={styles.chartNote}>Componente X de la posición actual del móvil</div>
>>>>>>> c197d6a067b97eb283a3d32bde5ab31f92eb82e1
              </div>
            </div>
          </div>
        </div>

<<<<<<< HEAD
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
=======
        {/* ── COLUMNA DERECHA: Panel de resultados ──────────────────────── */}
        <div className={styles.column}>

          {/* Card: Posición actual */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>my_location</span>
                Posición Actual
              </span>
              <span className={styles.badge}>TIEMPO REAL</span>
            </div>
            <div className={styles.positionGrid}>
              <div className={styles.posRow}>
                <span className={styles.posLabel}>Posición inicial</span>
                <span className={styles.posValue} style={{ color: '#059669' }}>
                  {formatCoords(waypoints[0].x, waypoints[0].y)} m
                </span>
              </div>
              <div className={styles.posRow}>
                <span className={styles.posLabel}>Posición actual</span>
                <span className={styles.posValue}>
                  {formatCoords(telemetry.posX, telemetry.posY)} m
                </span>
              </div>
              <div className={styles.posRow}>
                <span className={styles.posLabel}>Posición final</span>
                <span className={styles.posValue} style={{ color: '#c8a932' }}>
                  {formatCoords(waypoints[waypoints.length - 1].x, waypoints[waypoints.length - 1].y)} m
                </span>
              </div>
              <div className={styles.posRow}>
                <span className={styles.posLabel}>Δx</span>
                <span className={styles.posValue}>{telemetry.dx.toFixed(2)} m</span>
              </div>
              <div className={styles.posRow}>
                <span className={styles.posLabel}>Δy</span>
                <span className={styles.posValue}>{telemetry.dy.toFixed(2)} m</span>
              </div>
              <div className={styles.posRow}>
                <span className={styles.posLabel}>Ángulo (θ)</span>
                <span className={styles.posValue}>{telemetry.angle.toFixed(1)}°</span>
              </div>
            </div>
          </div>

          {/* Card: Resultados — Distancia */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.presetLabel}>Distancia Recorrida s(t)</span>
              <span className={styles.badge}>ESCALAR</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span className={styles.bigValue}>{telemetry.distance.toFixed(2)}</span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>metros</span>
            </div>
            <div className={styles.formulaBox}>
              <div className={styles.formulaInline}>
                <InlineMath math="s = |\vec{v}| \cdot t" />
              </div>
              <span style={{ fontSize: '10px' }}>Odómetro acumulativo. Siempre creciente.</span>
            </div>
          </div>

          {/* Card: Resultados — Desplazamiento */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.presetLabel} style={{ color: '#b45309' }}>Desplazamiento Neto |Δr|</span>
              <span className={styles.badge} style={{ color: '#b45309', background: '#fffbeb', borderColor: '#fef3c7' }}>
                VECTORIAL
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span className={styles.bigValue} style={{ color: '#d97706' }}>{telemetry.displacementMag.toFixed(2)}</span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>metros</span>
            </div>
            <div className={styles.formulaBox}>
              <div className={styles.formulaInline}>
                <InlineMath math="|\Delta\vec{r}| = \sqrt{(\Delta x)^2 + (\Delta y)^2}" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span>Canónica:</span>
                <span style={{ fontWeight: 700, color: 'var(--corporate)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                  {telemetry.dx.toFixed(2)} î + {telemetry.dy.toFixed(2)} ĵ m
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Ángulo:</span>
                <span style={{ fontWeight: 600, color: 'var(--corporate)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                  θ = {telemetry.angle.toFixed(1)}°
                </span>
>>>>>>> c197d6a067b97eb283a3d32bde5ab31f92eb82e1
              </div>
            </div>
          </div>

<<<<<<< HEAD
          {/* Card: Teorema y Eficiencia */}
=======
          {/* Card: Teorema */}
>>>>>>> c197d6a067b97eb283a3d32bde5ab31f92eb82e1
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>balance</span>
                Teorema de la Trayectoria
              </span>
            </div>
<<<<<<< HEAD
            <div style={{ textAlign: 'center', padding: '8px', background: 'var(--canvas-bg)', borderRadius: 'var(--radius-lg)' }}>
              <div
                style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--corporate)' }}
                dangerouslySetInnerHTML={{ __html: renderLatex('s(t) \\ge |\\Delta\\vec{r}(t)|') }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                La distancia recorrida jamás puede ser menor a la magnitud del desplazamiento.
=======
            <div style={{ textAlign: 'center', padding: '10px', background: 'var(--surface-alt)', borderRadius: 'var(--radius-lg)' }}>
              <div className={styles.formulaInline}>
                <BlockMath math="s(t) \;\geq\; |\Delta\vec{r}(t)|" />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                La distancia nunca puede ser menor al módulo del desplazamiento.
>>>>>>> c197d6a067b97eb283a3d32bde5ab31f92eb82e1
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
<<<<<<< HEAD
                <div className={styles.efficiencyFill} style={{ width: `${Math.min(100, path.efficiency)}%` }} />
=======
                <div
                  className={styles.efficiencyFill}
                  style={{ width: `${Math.min(efficiency, 100)}%` }}
                />
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                100% = trayectoria rectilínea. 0% = circuito cerrado.
>>>>>>> c197d6a067b97eb283a3d32bde5ab31f92eb82e1
              </div>
            </div>
          </div>

<<<<<<< HEAD
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
=======
          {/* Card: Concepto Clave contextual */}
          {preset === 'closed' && (
            <div className={styles.conceptCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', fontWeight: 700, fontSize: 'var(--text-xs)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>lightbulb</span>
                <span>Caso Especial: Circuito Cerrado</span>
              </div>
              <div style={{ fontSize: '11px', color: '#78350f', lineHeight: 1.5 }}>
                Al completar el recorrido, el móvil regresa al origen:
                <strong> r_f = r_0 ⇒ Δr = 0</strong>, aunque ha recorrido
                una distancia <strong>s = {totalLength.toFixed(2)} m &gt; 0</strong>.
                <br />Esto demuestra que <strong>distancia ≠ desplazamiento</strong>.
              </div>
              <div className={styles.formulaInline} style={{ paddingTop: '4px' }}>
                <BlockMath math="\vec{r}_f = \vec{r}_0 \;\Rightarrow\; |\Delta\vec{r}| = 0, \quad s > 0" />
              </div>
            </div>
          )}

          {preset === 'linear' && (
            <div className={styles.conceptCard} style={{ background: '#eff6ff', borderColor: '#dbeafe' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e40af', fontWeight: 700, fontSize: 'var(--text-xs)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>info</span>
                <span>Cambio de Dirección</span>
              </div>
              <div style={{ fontSize: '11px', color: '#1e3a8a', lineHeight: 1.5 }}>
                El móvil regresa por el mismo eje X. La distancia acumula ida y vuelta
                (<strong>s = 20 m</strong>), pero el desplazamiento es <strong>Δr = 0</strong>
                al llegar al origen.
              </div>
>>>>>>> c197d6a067b97eb283a3d32bde5ab31f92eb82e1
            </div>
          )}

          {preset === 'custom' && (
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
