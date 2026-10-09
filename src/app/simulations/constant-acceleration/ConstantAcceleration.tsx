import { useState, useRef, useCallback, useEffect } from 'react'
import { useCanvasRenderer } from '../../hooks/useCanvasRenderer'
import { useLiveChart } from '../../hooks/useLiveChart'
import { computeKinematics, timeAtPosition, type KinematicsParams } from './physics'
import styles from './ConstantAcceleration.module.css'

const WORLD_MIN = -20   // m — límite izquierdo del mundo
const WORLD_MAX = 120   // m — límite derecho del mundo
const SLOW_FACTOR = 10  // factor de tiempo lento

export default function ConstantAcceleration() {
  // ─── Parámetros editables ───────────────────────────────────
  const [params, setParams] = useState<KinematicsParams>({ x0: 0, v0: 5, a: 2 })
  const [draft,  setDraft]  = useState({ x0: '0', v0: '5', a: '2' })

  // ─── Estado de simulación ───────────────────────────────────
  const [running,    setRunning]    = useState(false)
  const [slowMode,   setSlowMode]   = useState(false)
  const [elapsed,    setElapsed]    = useState(0)
  const [timeGreen,  setTimeGreen]  = useState<number | null>(null)
  const [timeRed,    setTimeRed]    = useState<number | null>(null)
  const [hitGreen,   setHitGreen]   = useState(false)
  const [hitRed,     setHitRed]     = useState(false)

  // Barreras (posición en metros del mundo)
  const [barrierGreen, setBarrierGreen] = useState(40)
  const [barrierRed,   setBarrierRed]   = useState(80)

  // ─── Refs de simulación ─────────────────────────────────────
  const rafRef        = useRef<number>(0)
  const pauseAccRef   = useRef<number>(0)
  const lastTsRef     = useRef<number>(0)
  const runningRef    = useRef(false)

  // ─── Canvas principal ───────────────────────────────────────
  const { canvasRef: mainCanvas, ctx: mainCtx, size: mainSize } = useCanvasRenderer()

  // ─── Gráficas ───────────────────────────────────────────────
  const { canvasRef: chartXRef, ctx: ctxXT, size: sizeXT } = useCanvasRenderer()
  const { canvasRef: chartVRef, ctx: ctxVT, size: sizeVT } = useCanvasRenderer()
  const { canvasRef: chartARef, ctx: ctxAT, size: sizeAT } = useCanvasRenderer()

  const chartX = useLiveChart({ label: 'x', unitX: 's', unitY: 'm',   autoScale: true })
  const chartV = useLiveChart({ label: 'v', unitX: 's', unitY: 'm/s', autoScale: true })
  const chartA = useLiveChart({
    label: 'a', unitX: 's', unitY: 'm/s²',
    autoScale: false, yMin: params.a - 2, yMax: params.a + 2
  })

  // ─── Barreras arrastrables (en canvas) ──────────────────────
  const draggingBarrier = useRef<'green' | 'red' | null>(null)

  const worldToCanvas = useCallback(
    (xWorld: number, canvasW: number): number => {
      const worldRange = WORLD_MAX - WORLD_MIN
      return ((xWorld - WORLD_MIN) / worldRange) * canvasW
    },
    []
  )
  const canvasToWorld = useCallback(
    (px: number, canvasW: number): number => {
      const worldRange = WORLD_MAX - WORLD_MIN
      return WORLD_MIN + (px / canvasW) * worldRange
    },
    []
  )

  // ─── Dibujo del canvas principal ────────────────────────────
  const drawMain = useCallback(
    (t: number) => {
      const ctx = mainCtx.current
      const { width: W, height: H } = mainSize
      if (!ctx || W === 0) return

      ctx.clearRect(0, 0, W, H)

      const state = computeKinematics(params, t)
      const carX  = worldToCanvas(state.x, W)
      const baseY = H * 0.60

      // Fondo del Laboratorio / Cielo
      const sky = ctx.createLinearGradient(0, 0, 0, H)
      sky.addColorStop(0, '#f8fafc')
      sky.addColorStop(0.6, '#e2e8f0')
      sky.addColorStop(1, '#cbd5e1')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, W, H)

      // Pista de Experimentación
      const roadH  = H * 0.24
      const roadY  = baseY - 4
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(0, roadY, W, roadH)

      // Líneas punteadas de la pista
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.setLineDash([24, 18])
      ctx.lineDashOffset = -(state.x * 4) % 42
      ctx.beginPath()
      ctx.moveTo(0, roadY + roadH / 2)
      ctx.lineTo(W, roadY + roadH / 2)
      ctx.stroke()
      ctx.setLineDash([])

      // Bordes de la pista
      ctx.strokeStyle = '#c8a932'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(0, roadY)
      ctx.lineTo(W, roadY)
      ctx.stroke()

      ctx.strokeStyle = '#64748b'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, roadY + roadH)
      ctx.lineTo(W, roadY + roadH)
      ctx.stroke()

      // Escala numérica métrica
      const tickStep = 10
      ctx.font = '700 9px "JetBrains Mono", monospace'
      ctx.fillStyle = '#475569'
      ctx.textAlign = 'center'
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 1

      for (let m = Math.ceil(WORLD_MIN / tickStep) * tickStep; m <= WORLD_MAX; m += tickStep) {
        const tx = worldToCanvas(m, W)
        ctx.beginPath()
        ctx.moveTo(tx, roadY + roadH)
        ctx.lineTo(tx, roadY + roadH + 6)
        ctx.stroke()
        ctx.fillText(`${m}m`, tx, roadY + roadH + 18)
      }

      // ── Barrera Verde (Sensor 1) ──────────────────────────────
      const gx = worldToCanvas(barrierGreen, W)
      ctx.strokeStyle = hitGreen ? '#10b981' : 'rgba(16, 185, 129, 0.7)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(gx, roadY - 14)
      ctx.lineTo(gx, roadY + roadH + 8)
      ctx.stroke()
      drawSensorFlag(ctx, gx, roadY - 14, '#10b981', 'S₁')

      // ── Barrera Roja (Sensor 2) ───────────────────────────────
      const rx = worldToCanvas(barrierRed, W)
      ctx.strokeStyle = hitRed ? '#ef4444' : 'rgba(239, 68, 68, 0.7)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(rx, roadY - 14)
      ctx.lineTo(rx, roadY + roadH + 8)
      ctx.stroke()
      drawSensorFlag(ctx, rx, roadY - 14, '#ef4444', 'S₂')

      // ── Móvil / Vehículo Experimental ────────────────────────
      if (carX >= -80 && carX <= W + 80) {
        drawCar(ctx, carX, baseY, state.v)
      }

      // ── HUD Telemetría Superior ──────────────────────────────
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 1
      roundRect(ctx, 12, 10, 260, 68, 8)
      ctx.fill()
      ctx.stroke()

      ctx.font = '700 11px "JetBrains Mono", monospace'
      ctx.textAlign = 'left'
      ctx.fillStyle = '#059669'
      ctx.fillText(`x(t) = ${state.x.toFixed(2)} m`, 22, 28)
      ctx.fillStyle = '#0891b2'
      ctx.fillText(`v(t) = ${state.v.toFixed(2)} m/s`, 22, 44)
      ctx.fillStyle = '#7c3aed'
      ctx.fillText(`a(t) = ${state.a.toFixed(2)} m/s²`, 22, 60)
      ctx.fillStyle = '#24346c'
      ctx.fillText(`t = ${t.toFixed(2)} s`, 160, 60)
    },
    [params, mainCtx, mainSize, worldToCanvas, barrierGreen, barrierRed, hitGreen, hitRed]
  )

  // ─── Loop de animación ───────────────────────────────────────
  const loop = useCallback(
    (timestamp: number) => {
      if (!runningRef.current) return
      if (lastTsRef.current === 0) lastTsRef.current = timestamp

      const rawDt = (timestamp - lastTsRef.current) / 1000
      lastTsRef.current = timestamp

      const dt = slowMode ? rawDt / SLOW_FACTOR : rawDt
      pauseAccRef.current += dt

      const t = pauseAccRef.current
      const state = computeKinematics(params, t)

      // Detección de barreras / sensores
      if (!hitGreen) {
        const prevX = computeKinematics(params, Math.max(0, t - dt)).x
        if ((prevX < barrierGreen && state.x >= barrierGreen) ||
            (prevX > barrierGreen && state.x <= barrierGreen)) {
          const exactT = timeAtPosition(params, barrierGreen)
          setTimeGreen(exactT ?? t)
          setHitGreen(true)
        }
      }

      if (!hitRed) {
        const prevX = computeKinematics(params, Math.max(0, t - dt)).x
        if ((prevX < barrierRed && state.x >= barrierRed) ||
            (prevX > barrierRed && state.x <= barrierRed)) {
          const exactT = timeAtPosition(params, barrierRed)
          setTimeRed(exactT ?? t)
          setHitRed(true)
        }
      }

      setElapsed(t)
      drawMain(t)

      chartX.push(t, state.x)
      chartV.push(t, state.v)
      chartA.push(t, state.a)

      const cxT = ctxXT.current
      const cvT = ctxVT.current
      const caT = ctxAT.current
      if (cxT) chartX.draw(cxT, sizeXT.width, sizeXT.height)
      if (cvT) chartV.draw(cvT, sizeVT.width, sizeVT.height)
      if (caT) chartA.draw(caT, sizeAT.width, sizeAT.height)

      rafRef.current = requestAnimationFrame(loop)
    },
    [params, slowMode, hitGreen, hitRed, barrierGreen, barrierRed,
     drawMain, chartX, chartV, chartA, ctxXT, ctxVT, ctxAT, sizeXT, sizeVT, sizeAT]
  )

  const startLoop = useCallback(() => {
    lastTsRef.current = 0
    runningRef.current = true
    rafRef.current = requestAnimationFrame(loop)
  }, [loop])

  // ─── Controles ───────────────────────────────────────────────
  const handleApply = () => {
    const x0 = parseFloat(draft.x0) || 0
    const v0 = parseFloat(draft.v0) || 0
    const a  = parseFloat(draft.a)  || 0
    setParams({ x0, v0, a })
    handleReset()
  }

  const applyPreset = (x0: number, v0: number, a: number) => {
    setDraft({ x0: String(x0), v0: String(v0), a: String(a) })
    setParams({ x0, v0, a })
    handleReset()
  }

  const handleReset = useCallback(() => {
    runningRef.current = false
    cancelAnimationFrame(rafRef.current)
    lastTsRef.current   = 0
    pauseAccRef.current = 0
    setRunning(false)
    setElapsed(0)
    setTimeGreen(null)
    setTimeRed(null)
    setHitGreen(false)
    setHitRed(false)
    chartX.reset()
    chartV.reset()
    chartA.reset()
    drawMain(0)
  }, [drawMain, chartX, chartV, chartA])

  const handlePlay = () => {
    if (running) {
      runningRef.current = false
      cancelAnimationFrame(rafRef.current)
      setRunning(false)
    } else {
      setRunning(true)
      startLoop()
    }
  }

  useEffect(() => { drawMain(0) }, [drawMain])
  useEffect(() => () => { cancelAnimationFrame(rafRef.current) }, [])

  // ─── Arrastre de barreras sobre canvas ───────────────────────
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!mainCanvas.current) return
    const rect = mainCanvas.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (mainSize.width / rect.width)

    const gxW = worldToCanvas(barrierGreen, mainSize.width)
    const rxW = worldToCanvas(barrierRed,   mainSize.width)

    if (Math.abs(px - gxW) < 22) {
      draggingBarrier.current = 'green'
      mainCanvas.current.setPointerCapture(e.pointerId)
    } else if (Math.abs(px - rxW) < 22) {
      draggingBarrier.current = 'red'
      mainCanvas.current.setPointerCapture(e.pointerId)
    }
  }

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingBarrier.current || !mainCanvas.current) return
    const rect  = mainCanvas.current.getBoundingClientRect()
    const px    = (e.clientX - rect.left) * (mainSize.width / rect.width)
    const wx    = Math.round(canvasToWorld(px, mainSize.width))
    const clamped = Math.min(WORLD_MAX - 5, Math.max(WORLD_MIN + 5, wx))

    if (draggingBarrier.current === 'green') setBarrierGreen(clamped)
    else setBarrierRed(clamped)
  }

  const handleCanvasPointerUp = () => { draggingBarrier.current = null }

  const formatTime = (t: number | null, running_: boolean) => {
    if (t === null && !running_) return '——:——'
    if (t === null) return '00:00.00'
    const mins = Math.floor(t / 60)
    const secs = t % 60
    return `${String(mins).padStart(2, '0')}:${secs.toFixed(2).padStart(5, '0')}`
  }

  const deltaT = timeGreen !== null && timeRed !== null ? Math.abs(timeRed - timeGreen) : null

  return (
    <div className={styles.sim}>
      {/* ── Canvas Principal ──────────────────────────────────── */}
      <div className={styles.canvasWrap}>
        <canvas
          ref={mainCanvas}
          className={styles.canvas}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          aria-label="Escena cinemática interactiva"
        />

        <div className={styles.barrierHint}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>drag_indicator</span>
          <span>Arrastra los sensores S₁ y S₂ en la pista</span>
        </div>
      </div>

      {/* ── Transport Bar / Controles de Ejecución ─────────────── */}
      <div className={styles.transportBar}>
        <div className={styles.transportButtons}>
          <button
            className={`btn ${running ? 'btn--secondary' : 'btn--primary'}`}
            onClick={handlePlay}
            id="btn-play-pause"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              {running ? 'pause' : 'play_arrow'}
            </span>
            {running ? 'Pausar Simulación' : 'Iniciar Simulación'}
          </button>

          <button className="btn btn--secondary" onClick={handleReset} id="btn-reset">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>restart_alt</span>
            Reiniciar
          </button>

          <button
            className={`btn ${slowMode ? 'btn--gold' : 'btn--ghost'}`}
            onClick={() => setSlowMode((s) => !s)}
            id="btn-slow-motion"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>slow_motion_video</span>
            Cámara Lenta (0.1x)
          </button>
        </div>

        {/* Presets Rápidos */}
        <div className={styles.presetsRow}>
          <span className={styles.presetsLabel}>Preajustes:</span>
          <button className={styles.presetChip} onClick={() => applyPreset(0, 10, 0)}>
            MRU (a = 0)
          </button>
          <button className={styles.presetChip} onClick={() => applyPreset(0, 0, 2)}>
            MRUV (a = 2 m/s²)
          </button>
          <button className={styles.presetChip} onClick={() => applyPreset(0, 15, -1.5)}>
            Frenado (a = -1.5)
          </button>
        </div>
      </div>

      {/* ── Panel de Parámetros y Sensores Fotopuerta ──────────── */}
      <div className={styles.panelGrid}>
        {/* Card 1: Parámetros Cinemáticos */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <span className="material-symbols-outlined" style={{ color: 'var(--corporate)' }}>tune</span>
              <span className={styles.cardTitle}>Condiciones Iniciales</span>
            </div>
            <button className="btn btn--primary btn--sm" onClick={handleApply} disabled={running}>
              Aplicar Cambios
            </button>
          </div>

          <div className={styles.fieldsGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Posición Inicial x₀ (m)</span>
              <input
                className="input"
                type="number"
                step="1"
                value={draft.x0}
                onChange={(e) => setDraft((d) => ({ ...d, x0: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                disabled={running}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Velocidad Inicial v₀ (m/s)</span>
              <input
                className="input"
                type="number"
                step="0.5"
                value={draft.v0}
                onChange={(e) => setDraft((d) => ({ ...d, v0: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                disabled={running}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Aceleración a (m/s²)</span>
              <input
                className="input"
                type="number"
                step="0.5"
                value={draft.a}
                onChange={(e) => setDraft((d) => ({ ...d, a: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                disabled={running}
              />
            </label>
          </div>
        </div>

        {/* Card 2: Sensores de Tiempo (Fotopuertas) */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <span className="material-symbols-outlined" style={{ color: 'var(--gold)' }}>timer</span>
              <span className={styles.cardTitle}>Cronometría y Fotopuertas</span>
            </div>
            {deltaT !== null && (
              <span className={styles.deltaBadge}>
                Δt = {deltaT.toFixed(2)} s
              </span>
            )}
          </div>

          <div className={styles.clocksGrid}>
            <div className={styles.clockCard}>
              <span className={styles.clockLabel}>Tiempo General (t)</span>
              <span className={styles.clockValue}>{formatTime(elapsed, running)}</span>
            </div>

            <div className={`${styles.clockCard} ${hitGreen ? styles.clockGreenActive : ''}`}>
              <div className={styles.clockHeader}>
                <span className={styles.dotGreen} />
                <span className={styles.clockLabel}>Sensor S₁ ({barrierGreen} m)</span>
              </div>
              <span className={styles.clockValue}>
                {timeGreen !== null ? `${timeGreen.toFixed(2)} s` : 'Esperando...'}
              </span>
            </div>

            <div className={`${styles.clockCard} ${hitRed ? styles.clockRedActive : ''}`}>
              <div className={styles.clockHeader}>
                <span className={styles.dotRed} />
                <span className={styles.clockLabel}>Sensor S₂ ({barrierRed} m)</span>
              </div>
              <span className={styles.clockValue}>
                {timeRed !== null ? `${timeRed.toFixed(2)} s` : 'Esperando...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Gráficas Sincrónicas de Telemetría ─────────────────── */}
      <div className={styles.chartsSection}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <span className={styles.chartBadgeX}>x-t</span>
            <span className={styles.chartTitle}>Posición vs Tiempo</span>
          </div>
          <canvas ref={chartXRef} className={styles.chartCanvas} />
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <span className={styles.chartBadgeV}>v-t</span>
            <span className={styles.chartTitle}>Velocidad vs Tiempo</span>
          </div>
          <canvas ref={chartVRef} className={styles.chartCanvas} />
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <span className={styles.chartBadgeA}>a-t</span>
            <span className={styles.chartTitle}>Aceleración vs Tiempo</span>
          </div>
          <canvas ref={chartARef} className={styles.chartCanvas} />
        </div>
      </div>
    </div>
  )
}

function drawCar(ctx: CanvasRenderingContext2D, cx: number, baseY: number, v: number) {
  const w = 76
  const h = 26
  const x = cx - w / 2

  // Sombra del vehículo
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(cx, baseY + 6, w * 0.44, 5, 0, 0, Math.PI * 2)
  ctx.fill()

  // Chasis principal (Azul Real #2563EB)
  ctx.fillStyle = '#2563eb'
  ctx.beginPath()
  roundRect(ctx, x, baseY - h, w, h, 6)
  ctx.fill()

  // Franja corporativa dorada (#C8A932)
  ctx.fillStyle = '#c8a932'
  ctx.fillRect(x + 4, baseY - h + 14, w - 8, 3)

  // Cabina del vehículo
  ctx.fillStyle = '#1e293b'
  ctx.beginPath()
  roundRect(ctx, x + 16, baseY - h - 14, w - 32, 16, [4, 4, 0, 0])
  ctx.fill()

  // Cristales
  ctx.fillStyle = '#93c5fd'
  ctx.beginPath()
  roundRect(ctx, x + 18, baseY - h - 12, 16, 12, 2)
  ctx.fill()
  ctx.beginPath()
  roundRect(ctx, x + 38, baseY - h - 12, 18, 12, 2)
  ctx.fill()

  // Faros
  ctx.fillStyle = '#fef08a'
  if (v >= 0) {
    ctx.beginPath()
    ctx.ellipse(x + w - 3, baseY - h + 8, 3, 4, 0, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.ellipse(x + 3, baseY - h + 8, 3, 4, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Ruedas
  drawWheel(ctx, x + 16, baseY + 1, v)
  drawWheel(ctx, x + w - 16, baseY + 1, v)
}

function drawWheel(ctx: CanvasRenderingContext2D, cx: number, cy: number, v: number) {
  const r = 9
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2)
  ctx.stroke()

  const angle = (Date.now() / 100 * v * 0.1) % (Math.PI * 2)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.2
  for (let i = 0; i < 4; i++) {
    const a = angle + (i * Math.PI) / 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2))
    ctx.stroke()
  }
}

function drawSensorFlag(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, label: string) {
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - 22)
  ctx.stroke()

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, y - 22)
  ctx.lineTo(x + 16, y - 16)
  ctx.lineTo(x, y - 10)
  ctx.closePath()
  ctx.fill()

  ctx.font = '700 8px "JetBrains Mono", monospace'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.fillText(label, x + 7, y - 14)
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  radii: number | number[]
) {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, radii as number)
  } else {
    const r = Array.isArray(radii) ? radii[0] : radii
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }
}
