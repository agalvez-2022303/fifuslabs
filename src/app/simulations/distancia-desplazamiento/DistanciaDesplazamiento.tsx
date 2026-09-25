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
      <div className={styles.subHeader}>
        <div className={styles.presetGroup}>
          <span className={styles.presetLabel}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>alt_route</span>
            Topología:
          </span>
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
            </button>
          ))}
        </div>
        <span className={styles.badge}>MÓDULO 3: CINEMÁTICA</span>
      </div>

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
              </button>
              <button
                className="btn btn--secondary"
                type="button"
                onClick={handleReset}
                style={{ fontSize: 'var(--text-xs)' }}
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
          <div className={styles.telemetryGrid}>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Tiempo (t)</span>
              <div>
                <span className={styles.telemetryValue}>{telemetry.time.toFixed(2)}</span>
                <span className={styles.telemetryUnit}>s</span>
              </div>
            </div>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Distancia s(t)</span>
              <div>
                <span className={styles.telemetryValue} style={{ color: C.corporate }}>
                  {telemetry.distance.toFixed(2)}
                </span>
                <span className={styles.telemetryUnit}>m</span>
              </div>
            </div>
            <div className={styles.telemetryCol}>
              <span className={styles.telemetryLabel}>Desplazamiento |Δr|</span>
              <div>
                <span className={styles.telemetryValue} style={{ color: C.amber }}>
                  {telemetry.displacementMag.toFixed(2)}
                </span>
                <span className={styles.telemetryUnit}>m</span>
              </div>
            </div>
          </div>

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
              </div>
            </div>
          </div>
        </div>

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
              </div>
            </div>
          </div>

          {/* Card: Teorema */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>balance</span>
                Teorema
              </span>
            </div>
            <div style={{ textAlign: 'center', padding: '10px', background: 'var(--surface-alt)', borderRadius: 'var(--radius-lg)' }}>
              <div className={styles.formulaInline}>
                <BlockMath math="s(t) \;\geq\; |\Delta\vec{r}(t)|" />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                La distancia nunca puede ser menor al módulo del desplazamiento.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Eficiencia (|Δr| / s):</span>
                <span style={{ fontWeight: 700, color: 'var(--corporate)' }}>{efficiency.toFixed(1)}%</span>
              </div>
              <div className={styles.efficiencyBar}>
                <div
                  className={styles.efficiencyFill}
                  style={{ width: `${Math.min(efficiency, 100)}%` }}
                />
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                100% = trayectoria rectilínea. 0% = circuito cerrado.
              </div>
            </div>
          </div>

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
    </div>
  )
}
