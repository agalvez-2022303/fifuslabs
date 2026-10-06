import { useState, useRef, useCallback, useEffect } from 'react'
import { useCanvasRenderer } from '../../hooks/useCanvasRenderer'
import {
  rectangularToPolar,
  polarToRectangular,
  polarToGeographic,
  geographicToRectangular,
  normalizeAngleDeg,
  explainRectangularToPolar,
  explainPolarToRectangular,
  type RectangularCoords,
  type PolarCoords,
  type GeographicCoords,
  type CardinalPrimary,
  type CardinalSecondary,
} from './physics'
import styles from './VectorRepresentation.module.css'

type InputMode = 'rectangular' | 'polar' | 'geographic'

interface PracticeChallenge {
  sourceMode: InputMode
  rect: RectangularCoords
  polar: PolarCoords
  geo: GeographicCoords
}

export default function VectorRepresentation() {
  const { canvasRef, ctx, size } = useCanvasRenderer()

  // Modo de edición activo
  const [activeTab, setActiveTab] = useState<InputMode | 'practice'>('rectangular')

  // Estado del vector en coordenadas rectangulares (fuente canónica interna)
  const [coords, setCoords] = useState<RectangularCoords>({ x: 4, y: 3 })

  // Opciones de visualización en canvas
  const [showProjections, setShowProjections] = useState(true)
  const [showArcs, setShowArcs] = useState(true)
  const [showCompass, setShowCompass] = useState(true)
  const [scale, setScale] = useState(26) // pixels por unidad
  const [showMath, setShowMath] = useState(false)

  // Arrastre con puntero
  const isDragging = useRef(false)

  // Coordenadas calculadas
  const polar = rectangularToPolar(coords.x, coords.y)
  const geo = polarToGeographic(polar.r, polar.thetaDeg)

  // Inputs locales para modo geográfico editable
  const [geoPrimary, setGeoPrimary] = useState<CardinalPrimary>('N')
  const [geoAngle, setGeoAngle] = useState(36.87)
  const [geoSecondary, setGeoSecondary] = useState<CardinalSecondary>('E')

  // ─── Estado del Modo Práctica ────────────────────────────────
  const [practiceScore, setPracticeScore] = useState({ correct: 0, total: 0 })
  const [currentChallenge, setCurrentChallenge] = useState<PracticeChallenge | null>(null)
  const [userAnswer, setUserAnswer] = useState({
    val1: '',
    val2: '',
    primary: 'N' as CardinalPrimary,
    secondary: 'E' as CardinalSecondary,
  })
  const [challengeFeedback, setChallengeFeedback] = useState<{
    status: 'idle' | 'success' | 'error'
    message: string
  }>({ status: 'idle', message: '' })
  const [showChallengeSolution, setShowChallengeSolution] = useState(false)

  // ─── Generador de Retos ─────────────────────────────────────
  const generateNewChallenge = useCallback(() => {
    let x = Math.floor(Math.random() * 16) - 8
    let y = Math.floor(Math.random() * 16) - 8
    if (x === 0 && y === 0) {
      x = 3
      y = 4
    }

    const modes: InputMode[] = ['rectangular', 'polar', 'geographic']
    const chosenMode = modes[Math.floor(Math.random() * modes.length)]

    const pol = rectangularToPolar(x, y)
    const g = polarToGeographic(pol.r, pol.thetaDeg)

    setCurrentChallenge({
      sourceMode: chosenMode,
      rect: { x, y },
      polar: pol,
      geo: g,
    })
    setUserAnswer({
      val1: '',
      val2: '',
      primary: 'N',
      secondary: 'E',
    })
    setChallengeFeedback({ status: 'idle', message: '' })
    setShowChallengeSolution(false)
  }, [])

  useEffect(() => {
    if (activeTab === 'practice' && !currentChallenge) {
      generateNewChallenge()
    }
  }, [activeTab, currentChallenge, generateNewChallenge])

  // ─── Handlers de Actualización ──────────────────────────────
  const handleRectChange = (newX: number, newY: number) => {
    const clampedX = parseFloat(Math.max(-15, Math.min(15, newX)).toFixed(2))
    const clampedY = parseFloat(Math.max(-15, Math.min(15, newY)).toFixed(2))
    setCoords({ x: clampedX, y: clampedY })

    const p = rectangularToPolar(clampedX, clampedY)
    const g = polarToGeographic(p.r, p.thetaDeg)
    if (g.primary) setGeoPrimary(g.primary)
    if (g.secondary) setGeoSecondary(g.secondary)
    setGeoAngle(g.angleDeg)
  }

  const handlePolarChange = (newR: number, newTheta: number) => {
    const clampedR = parseFloat(Math.max(0, Math.min(15, newR)).toFixed(2))
    const normTheta = normalizeAngleDeg(newTheta)
    const rect = polarToRectangular(clampedR, normTheta)
    setCoords(rect)

    const g = polarToGeographic(clampedR, normTheta)
    if (g.primary) setGeoPrimary(g.primary)
    if (g.secondary) setGeoSecondary(g.secondary)
    setGeoAngle(g.angleDeg)
  }

  const handleGeoChange = (r: number, prim: CardinalPrimary, angle: number, sec: CardinalSecondary) => {
    setGeoPrimary(prim)
    setGeoAngle(angle)
    setGeoSecondary(sec)
    const rect = geographicToRectangular(r, prim, angle, sec)
    setCoords(rect)
  }

  // ─── Dibujo en Canvas ────────────────────────────────────────
  const draw = useCallback(() => {
    const ct = ctx.current
    const { width: W, height: H } = size
    if (!ct || W === 0 || H === 0) return

    ct.clearRect(0, 0, W, H)

    // Fondo Canvas en tono laboratorio limpio
    ct.fillStyle = '#ffffff'
    ct.fillRect(0, 0, W, H)

    const cx = W / 2
    const cy = H / 2

    // Cuadrícula cartesiana
    ct.strokeStyle = '#e2e8f0'
    ct.lineWidth = 1
    for (let x = cx % scale; x < W; x += scale) {
      ct.beginPath()
      ct.moveTo(x, 0)
      ct.lineTo(x, H)
      ct.stroke()
    }
    for (let y = cy % scale; y < H; y += scale) {
      ct.beginPath()
      ct.moveTo(0, y)
      ct.lineTo(W, y)
      ct.stroke()
    }

    // ── Rosa de los Vientos / Compás Geográfico ───────────────
    if (showCompass) {
      ct.save()
      ct.translate(cx, cy)
      const compassRadius = Math.min(W, H) * 0.38

      ct.strokeStyle = '#cbd5e1'
      ct.lineWidth = 1.2
      ct.setLineDash([3, 3])
      ct.beginPath()
      ct.arc(0, 0, compassRadius, 0, Math.PI * 2)
      ct.stroke()
      ct.setLineDash([])

      const subRad = compassRadius * 0.95
      const diagAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]
      ct.strokeStyle = '#e2e8f0'
      diagAngles.forEach((ang) => {
        ct.beginPath()
        ct.moveTo(0, 0)
        ct.lineTo(Math.cos(ang) * subRad, Math.sin(ang) * subRad)
        ct.stroke()
      })

      ct.font = '700 12px "Plus Jakarta Sans", sans-serif'
      ct.fillStyle = '#24346c'
      ct.textAlign = 'center'
      ct.textBaseline = 'middle'

      ct.fillText('N', 0, -compassRadius - 14)
      ct.fillText('S', 0, compassRadius + 14)
      ct.fillText('E', compassRadius + 16, 0)
      ct.fillText('O', -compassRadius - 16, 0)

      ct.font = '9px "JetBrains Mono", monospace'
      ct.fillStyle = '#8494ac'
      ct.fillText('NE (I)', compassRadius * 0.7, -compassRadius * 0.7)
      ct.fillText('NO (II)', -compassRadius * 0.7, -compassRadius * 0.7)
      ct.fillText('SO (III)', -compassRadius * 0.7, compassRadius * 0.7)
      ct.fillText('SE (IV)', compassRadius * 0.7, compassRadius * 0.7)

      ct.restore()
    }

    // ── Ejes Cartesianos Principales ───────────────────────────
    ct.strokeStyle = '#64748b'
    ct.lineWidth = 1.5
    ct.beginPath()
    ct.moveTo(0, cy)
    ct.lineTo(W, cy) // Eje X
    ct.moveTo(cx, 0)
    ct.lineTo(cx, H) // Eje Y
    ct.stroke()

    // Graduaciones numéricas en los ejes
    ct.font = '9px "JetBrains Mono", monospace'
    ct.fillStyle = '#64748b'
    ct.textAlign = 'center'

    const maxUnitsX = Math.floor(cx / scale)
    for (let u = -maxUnitsX; u <= maxUnitsX; u++) {
      if (u === 0) continue
      const px = cx + u * scale
      ct.beginPath()
      ct.moveTo(px, cy - 3)
      ct.lineTo(px, cy + 3)
      ct.stroke()
      if (Math.abs(u) % 2 === 0) {
        ct.fillText(`${u}`, px, cy + 13)
      }
    }

    const maxUnitsY = Math.floor(cy / scale)
    ct.textAlign = 'right'
    for (let u = -maxUnitsY; u <= maxUnitsY; u++) {
      if (u === 0) continue
      const py = cy - u * scale
      ct.beginPath()
      ct.moveTo(cx - 3, py)
      ct.lineTo(cx + 3, py)
      ct.stroke()
      if (Math.abs(u) % 2 === 0) {
        ct.fillText(`${u}`, cx - 6, py + 3)
      }
    }

    const vx = cx + coords.x * scale
    const vy = cy - coords.y * scale

    // ── Proyecciones Ortogonales (Ax y Ay) ─────────────────────
    if (showProjections && (Math.abs(coords.x) > 0.05 || Math.abs(coords.y) > 0.05)) {
      ct.setLineDash([3, 3])
      ct.lineWidth = 1.2

      // Proyección vertical a Eje X
      ct.strokeStyle = '#2563eb'
      ct.beginPath()
      ct.moveTo(vx, vy)
      ct.lineTo(vx, cy)
      ct.stroke()

      // Proyección horizontal a Eje Y
      ct.strokeStyle = '#06b6d4'
      ct.beginPath()
      ct.moveTo(vx, vy)
      ct.lineTo(cx, vy)
      ct.stroke()
      ct.setLineDash([])

      // Resaltado de componentes en los ejes
      // Componente Ax
      ct.strokeStyle = '#2563eb'
      ct.lineWidth = 2.5
      ct.beginPath()
      ct.moveTo(cx, cy)
      ct.lineTo(vx, cy)
      ct.stroke()

      // Componente Ay
      ct.strokeStyle = '#06b6d4'
      ct.lineWidth = 2.5
      ct.beginPath()
      ct.moveTo(cx, cy)
      ct.lineTo(cx, vy)
      ct.stroke()

      // Etiquetas de componentes
      ct.font = '700 10px "JetBrains Mono", monospace'
      ct.fillStyle = '#1e40af'
      ct.textAlign = 'center'
      ct.fillText(`Ax = ${coords.x.toFixed(2)}`, (cx + vx) / 2, cy + (coords.y >= 0 ? 18 : -10))

      ct.fillStyle = '#0e7490'
      ct.textAlign = coords.x >= 0 ? 'right' : 'left'
      ct.fillText(`Ay = ${coords.y.toFixed(2)}`, cx + (coords.x >= 0 ? -8 : 8), (cy + vy) / 2)
    }

    // ── Arcos de Ángulo (Polar y Geográfico) ───────────────────
    if (showArcs && polar.r > 0.4) {
      const arcRadius = Math.min(48, polar.r * scale * 0.45)
      const radTheta = (polar.thetaDeg * Math.PI) / 180
      ct.strokeStyle = '#c8a932'
      ct.lineWidth = 2
      ct.beginPath()
      ct.arc(cx, cy, arcRadius, 0, -radTheta, true)
      ct.stroke()

      const midAngle = -radTheta / 2
      const textX = cx + Math.cos(midAngle) * (arcRadius + 14)
      const textY = cy + Math.sin(midAngle) * (arcRadius + 14)
      ct.font = '700 10px "JetBrains Mono", monospace'
      ct.fillStyle = '#92400e'
      ct.textAlign = 'center'
      ct.textBaseline = 'middle'
      ct.fillText(`θ = ${polar.thetaDeg.toFixed(1)}°`, textX, textY)
    }

    // ── Vector Principal ──────────────────────────────────────
    if (polar.r > 0.05) {
      drawArrow(ct, cx, cy, vx, vy, '#24346c', 3)

      const midVx = (cx + vx) / 2
      const midVy = (cy + vy) / 2
      const offsetDist = 14
      const len = Math.hypot(coords.x, coords.y)
      const nx = -coords.y / len
      const ny = coords.x / len

      ct.font = '700 11px "JetBrains Mono", monospace'
      ct.fillStyle = '#172554'
      ct.textAlign = 'center'
      ct.fillText(`|A⃗| = ${polar.r.toFixed(2)} u`, midVx + nx * offsetDist, midVy - ny * offsetDist)
    }

    // Asa de arrastre en la punta
    ct.fillStyle = isDragging.current ? '#c8a932' : '#ffffff'
    ct.beginPath()
    ct.arc(vx, vy, isDragging.current ? 7 : 5.5, 0, Math.PI * 2)
    ct.fill()
    ct.strokeStyle = '#24346c'
    ct.lineWidth = 2.5
    ct.stroke()
  }, [ctx, size, coords, polar, scale, showCompass, showProjections, showArcs])

  useEffect(() => {
    draw()
  }, [draw])

  // ── Interacción Canvas (Pointer / Drag) ──────────────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (size.width / rect.width)
    const py = (e.clientY - rect.top) * (size.height / rect.height)

    const cx = size.width / 2
    const cy = size.height / 2
    const vx = cx + coords.x * scale
    const vy = cy - coords.y * scale

    if (Math.hypot(px - vx, py - vy) < 28 || e.buttons === 1) {
      isDragging.current = true
      canvas.setPointerCapture(e.pointerId)
      updateFromPointer(px, py, cx, cy)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (size.width / rect.width)
    const py = (e.clientY - rect.top) * (size.height / rect.height)

    const cx = size.width / 2
    const cy = size.height / 2
    updateFromPointer(px, py, cx, cy)
  }

  const handlePointerUp = () => {
    isDragging.current = false
  }

  const updateFromPointer = (px: number, py: number, cx: number, cy: number) => {
    const newX = (px - cx) / scale
    const newY = -(py - cy) / scale
    handleRectChange(newX, newY)
  }

  // ── Validación de Reto en Modo Práctica ──────────────────────
  const verifyChallengeAnswer = () => {
    if (!currentChallenge) return

    const v1 = parseFloat(userAnswer.val1)
    const v2 = parseFloat(userAnswer.val2)

    if (isNaN(v1) || isNaN(v2)) {
      setChallengeFeedback({
        status: 'error',
        message: 'Por favor ingresa valores numéricos válidos en los campos de respuesta.',
      })
      return
    }

    let isCorrect = false

    if (currentChallenge.sourceMode === 'rectangular') {
      const expectedR = currentChallenge.polar.r
      const expectedTheta = currentChallenge.polar.thetaDeg
      const diffR = Math.abs(v1 - expectedR)
      const diffTheta = Math.abs(normalizeAngleDeg(v2) - expectedTheta)
      isCorrect = diffR <= 0.25 && (diffTheta <= 1.5 || Math.abs(diffTheta - 360) <= 1.5)
    } else if (currentChallenge.sourceMode === 'polar') {
      const expectedX = currentChallenge.rect.x
      const expectedY = currentChallenge.rect.y
      isCorrect = Math.abs(v1 - expectedX) <= 0.25 && Math.abs(v2 - expectedY) <= 0.25
    } else {
      const expectedR = currentChallenge.polar.r
      const expectedTheta = currentChallenge.polar.thetaDeg
      const diffR = Math.abs(v1 - expectedR)
      const diffTheta = Math.abs(normalizeAngleDeg(v2) - expectedTheta)
      isCorrect = diffR <= 0.25 && (diffTheta <= 1.5 || Math.abs(diffTheta - 360) <= 1.5)
    }

    if (isCorrect) {
      setPracticeScore((prev) => ({ correct: prev.correct + 1, total: prev.total + 1 }))
      setChallengeFeedback({
        status: 'success',
        message: '¡Excelente! Tu respuesta es matemáticamente correcta.',
      })
    } else {
      setPracticeScore((prev) => ({ correct: prev.correct, total: prev.total + 1 }))
      setChallengeFeedback({
        status: 'error',
        message: 'Respuesta incorrecta. Revisa los signos y la orientación en el cuadrante.',
      })
    }
  }

  const rectToPolExplanation = explainRectangularToPolar(coords.x, coords.y)
  const polToRectExplanation = explainPolarToRectangular(polar.r, polar.thetaDeg)

  return (
    <div className={styles.sim}>
      {/* ── Canvas Interactivo 2D ────────────────────────────── */}
      <div className={styles.canvasWrap}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {/* HUD Telemetry Overlay */}
        <div className={styles.canvasOverlay}>
          <span className={styles.overlayTitle}>Telemetría Vectorial</span>
          <span className={styles.overlayValue}>
            A⃗ = ({coords.x.toFixed(2)}, {coords.y.toFixed(2)}) u
          </span>
          <span className={styles.overlaySub}>
            |A⃗| = {polar.r.toFixed(2)} u &nbsp;|&nbsp; θ = {polar.thetaDeg.toFixed(1)}° &nbsp;|&nbsp; {geo.canonicalText}
          </span>
        </div>

        {/* Canvas Toolbar Buttons */}
        <div className={styles.canvasControls}>
          <button
            className={styles.canvasBtn}
            onClick={() => setScale((s) => Math.min(45, s + 4))}
            title="Aumentar zoom"
          >
            + Zoom
          </button>
          <button
            className={styles.canvasBtn}
            onClick={() => setScale((s) => Math.max(14, s - 4))}
            title="Disminuir zoom"
          >
            - Zoom
          </button>
          <button
            className={`${styles.canvasBtn} ${showProjections ? styles.canvasBtnActive : ''}`}
            onClick={() => setShowProjections((v) => !v)}
            title="Alternar proyecciones ortogonales"
          >
            Proyecciones
          </button>
          <button
            className={`${styles.canvasBtn} ${showArcs ? styles.canvasBtnActive : ''}`}
            onClick={() => setShowArcs((v) => !v)}
            title="Alternar arcos de ángulo"
          >
            Ángulo θ
          </button>
          <button
            className={`${styles.canvasBtn} ${showCompass ? styles.canvasBtnActive : ''}`}
            onClick={() => setShowCompass((v) => !v)}
            title="Alternar rosa de los vientos"
          >
            Brújula
          </button>
        </div>
      </div>

      {/* ── Mode Selection Navigation Tabs ───────────────────── */}
      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'rectangular' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('rectangular')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>grid_view</span>
          Rectangular (x, y)
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'polar' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('polar')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>adjust</span>
          Polar (r, θ)
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'geographic' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('geographic')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>explore</span>
          Geográfico (Rumbo)
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'practice' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('practice')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>quiz</span>
          Modo Práctica
          <span className={styles.practiceBadge}>EVAL</span>
        </button>
      </div>

      {/* ── Main Parameter & Conversion Panels ───────────────── */}
      {activeTab !== 'practice' ? (
        <div className={styles.panelGrid}>
          {/* Left Panel: Active Input Controls */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>
                {activeTab === 'rectangular' && 'Control de Coordenadas Rectangulares'}
                {activeTab === 'polar' && 'Control de Coordenadas Polares'}
                {activeTab === 'geographic' && 'Control de Coordenadas Geográficas'}
              </span>
              <span className={styles.cardHint}>
                Arrastra el vector o ajusta los parámetros
              </span>
            </div>

            {/* MODO RECTANGULAR */}
            {activeTab === 'rectangular' && (
              <div className={styles.inputGroup}>
                <div className={styles.inputRow}>
                  <div className={styles.labelRow}>
                    <span className={styles.paramName}>Componente Ax (horizontal / i)</span>
                    <span className={styles.paramVal}>{coords.x.toFixed(2)} u</span>
                  </div>
                  <div className={styles.sliderRow}>
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="0.1"
                      value={coords.x}
                      className={styles.slider}
                      onChange={(e) => handleRectChange(parseFloat(e.target.value), coords.y)}
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={coords.x}
                      className={styles.numInput}
                      onChange={(e) => handleRectChange(parseFloat(e.target.value) || 0, coords.y)}
                    />
                  </div>
                </div>

                <div className={styles.inputRow}>
                  <div className={styles.labelRow}>
                    <span className={styles.paramName}>Componente Ay (vertical / j)</span>
                    <span className={styles.paramVal}>{coords.y.toFixed(2)} u</span>
                  </div>
                  <div className={styles.sliderRow}>
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="0.1"
                      value={coords.y}
                      className={styles.slider}
                      onChange={(e) => handleRectChange(coords.x, parseFloat(e.target.value))}
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={coords.y}
                      className={styles.numInput}
                      onChange={(e) => handleRectChange(coords.x, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* MODO POLAR */}
            {activeTab === 'polar' && (
              <div className={styles.inputGroup}>
                <div className={styles.inputRow}>
                  <div className={styles.labelRow}>
                    <span className={styles.paramName}>Módulo / Magnitud (r)</span>
                    <span className={styles.paramVal}>{polar.r.toFixed(2)} u</span>
                  </div>
                  <div className={styles.sliderRow}>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      step="0.1"
                      value={polar.r}
                      className={styles.slider}
                      onChange={(e) => handlePolarChange(parseFloat(e.target.value), polar.thetaDeg)}
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={polar.r}
                      className={styles.numInput}
                      onChange={(e) => handlePolarChange(parseFloat(e.target.value) || 0, polar.thetaDeg)}
                    />
                  </div>
                </div>

                <div className={styles.inputRow}>
                  <div className={styles.labelRow}>
                    <span className={styles.paramName}>Ángulo polar (θ respecto a +X)</span>
                    <span className={styles.paramVal}>{polar.thetaDeg.toFixed(1)}°</span>
                  </div>
                  <div className={styles.sliderRow}>
                    <input
                      type="range"
                      min="0"
                      max="359.9"
                      step="0.5"
                      value={polar.thetaDeg}
                      className={styles.slider}
                      onChange={(e) => handlePolarChange(polar.r, parseFloat(e.target.value))}
                    />
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="360"
                      value={polar.thetaDeg}
                      className={styles.numInput}
                      onChange={(e) => handlePolarChange(polar.r, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* MODO GEOGRÁFICO */}
            {activeTab === 'geographic' && (
              <div className={styles.inputGroup}>
                <div className={styles.inputRow}>
                  <div className={styles.labelRow}>
                    <span className={styles.paramName}>Magnitud del Vector (r)</span>
                    <span className={styles.paramVal}>{polar.r.toFixed(2)} u</span>
                  </div>
                  <div className={styles.sliderRow}>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      step="0.1"
                      value={polar.r}
                      className={styles.slider}
                      onChange={(e) =>
                        handleGeoChange(parseFloat(e.target.value), geoPrimary, geoAngle, geoSecondary)
                      }
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={polar.r}
                      className={styles.numInput}
                      onChange={(e) =>
                        handleGeoChange(parseFloat(e.target.value) || 0, geoPrimary, geoAngle, geoSecondary)
                      }
                    />
                  </div>
                </div>

                <div className={styles.inputRow}>
                  <div className={styles.labelRow}>
                    <span className={styles.paramName}>Rumbo Geográfico</span>
                    <span className={styles.paramVal}>
                      {geoPrimary} {geoAngle.toFixed(1)}° {geoSecondary}
                    </span>
                  </div>
                  <div className={styles.geoSelectRow}>
                    <select
                      className={styles.selectInput}
                      value={geoPrimary}
                      onChange={(e) =>
                        handleGeoChange(polar.r, e.target.value as CardinalPrimary, geoAngle, geoSecondary)
                      }
                    >
                      <option value="N">Norte (N)</option>
                      <option value="S">Sur (S)</option>
                    </select>

                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="90"
                      value={geoAngle}
                      className={styles.numInput}
                      style={{ width: '100%' }}
                      onChange={(e) =>
                        handleGeoChange(polar.r, geoPrimary, parseFloat(e.target.value) || 0, geoSecondary)
                      }
                    />

                    <select
                      className={styles.selectInput}
                      value={geoSecondary}
                      onChange={(e) =>
                        handleGeoChange(polar.r, geoPrimary, geoAngle, e.target.value as CardinalSecondary)
                      }
                    >
                      <option value="E">Este (E)</option>
                      <option value="O">Oeste (O)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Presets Rápidos */}
            <div className={styles.presetsRow}>
              <span className={styles.presetsTitle}>Vectores de Referencia:</span>
              <button className={styles.presetBtn} onClick={() => handleRectChange(3, 4)}>
                (3, 4) — 5 u
              </button>
              <button className={styles.presetBtn} onClick={() => handleRectChange(-4, 3)}>
                (-4, 3) — Cuad. II
              </button>
              <button className={styles.presetBtn} onClick={() => handleRectChange(-5, -5)}>
                (-5, -5) — Cuad. III
              </button>
              <button className={styles.presetBtn} onClick={() => handleRectChange(6, -8)}>
                (6, -8) — Cuad. IV
              </button>
              <button className={styles.presetBtn} onClick={() => handleRectChange(10, 0)}>
                10 u Este
              </button>
              <button className={styles.presetBtn} onClick={() => handleRectChange(0, 10)}>
                10 u Norte
              </button>
            </div>
          </div>

          {/* Right Panel: Simultaneous Coordinate Forms */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Conversión Simultánea de Coordenadas</span>
              <span className={styles.cuadranteBadge}>
                {geo.quadrant}
              </span>
            </div>

            <div className={styles.readoutsGrid}>
              {/* Tarjeta Rectangular */}
              <div
                className={`${styles.readoutCard} ${activeTab === 'rectangular' ? styles.readoutActive : ''}`}
              >
                <div className={styles.readoutHeader}>
                  <span className={styles.readoutType}>Forma Rectangular</span>
                  {activeTab === 'rectangular' && <span className={styles.readoutBadge}>EDITANDO</span>}
                </div>
                <div className={styles.readoutMain}>
                  A⃗ = ({coords.x.toFixed(2)}, {coords.y.toFixed(2)})
                </div>
                <div className={styles.readoutDetails}>
                  <span>Ax = {coords.x.toFixed(2)} u (î)</span>
                  <span>Ay = {coords.y.toFixed(2)} u (ĵ)</span>
                </div>
              </div>

              {/* Tarjeta Polar */}
              <div className={`${styles.readoutCard} ${activeTab === 'polar' ? styles.readoutActive : ''}`}>
                <div className={styles.readoutHeader}>
                  <span className={styles.readoutType}>Forma Polar</span>
                  {activeTab === 'polar' && <span className={styles.readoutBadge}>EDITANDO</span>}
                </div>
                <div className={styles.readoutMain}>
                  A⃗ = ({polar.r.toFixed(2)} u ; {polar.thetaDeg.toFixed(1)}°)
                </div>
                <div className={styles.readoutDetails}>
                  <span>Módulo (r) = {polar.r.toFixed(2)} u</span>
                  <span>Ángulo (θ) = {polar.thetaDeg.toFixed(1)}°</span>
                </div>
              </div>

              {/* Tarjeta Geográfica */}
              <div
                className={`${styles.readoutCard} ${activeTab === 'geographic' ? styles.readoutActive : ''}`}
              >
                <div className={styles.readoutHeader}>
                  <span className={styles.readoutType}>Forma Geográfica</span>
                  {activeTab === 'geographic' && <span className={styles.readoutBadge}>EDITANDO</span>}
                </div>
                <div className={styles.readoutMain}>
                  {geo.canonicalText}
                </div>
                <div className={styles.readoutDetails}>
                  <span>Alt: {geo.alternativeText}</span>
                  <span>Azimut: {geo.azimuthDeg.toFixed(1)}°</span>
                </div>
              </div>
            </div>

            {/* Toggle de Desglose Matemático */}
            <button className={styles.toggleMathBtn} onClick={() => setShowMath((v) => !v)}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {showMath ? 'expand_less' : 'expand_more'}
              </span>
              <span>Desglose analítico paso a paso</span>
            </button>

            {showMath && (
              <div className={styles.mathPanel}>
                <div className={styles.mathStep}>
                  <span className={styles.mathStepTitle}>1. Teorema de Pitágoras (Módulo):</span>
                  <code className={styles.mathFormula}>{rectToPolExplanation.magnitudeStep}</code>
                </div>
                <div className={styles.mathStep}>
                  <span className={styles.mathStepTitle}>2. Trigonometría (Ángulo Polar):</span>
                  <span className={styles.mathStepDesc}>{rectToPolExplanation.quadrantStep}</span>
                  <code className={styles.mathFormula}>{rectToPolExplanation.angleStep}</code>
                </div>
                <div className={styles.mathStep}>
                  <span className={styles.mathStepTitle}>3. Componentes Cartesianas Inversas:</span>
                  <code className={styles.mathFormula}>{polToRectExplanation.xStep}</code>
                  <code className={styles.mathFormula}>{polToRectExplanation.yStep}</code>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── MODO PRÁCTICA Y RETOS INTERACTIVOS ─────────────── */
        <div className={styles.practiceCard}>
          <div className={styles.scoreBanner}>
            <div className={styles.scoreTitleRow}>
              <span className="material-symbols-outlined" style={{ color: 'var(--corporate)' }}>
                military_tech
              </span>
              <span className={styles.scoreTitle}>EVALUACIÓN INTERACTIVA DE CONVERSIÓN VECTORIAL</span>
            </div>
            <div className={styles.scoreStats}>
              <span>
                Puntaje: <strong>{practiceScore.correct}</strong> / <strong>{practiceScore.total}</strong>
              </span>
              <span className={styles.scorePercent}>
                ({practiceScore.total > 0
                  ? Math.round((practiceScore.correct / practiceScore.total) * 100)
                  : 0}
                %)
              </span>
            </div>
          </div>

          {currentChallenge && (
            <>
              <div className={styles.challengePrompt}>
                <span className={styles.promptTitle}>
                  Vector de Prueba (Forma{' '}
                  {currentChallenge.sourceMode === 'rectangular' && 'RECTANGULAR'}
                  {currentChallenge.sourceMode === 'polar' && 'POLAR'}
                  {currentChallenge.sourceMode === 'geographic' && 'GEOGRÁFICA'}):
                </span>
                <div className={styles.promptGiven}>
                  {currentChallenge.sourceMode === 'rectangular' &&
                    `A⃗ = (${currentChallenge.rect.x.toFixed(2)}, ${currentChallenge.rect.y.toFixed(2)}) u`}
                  {currentChallenge.sourceMode === 'polar' &&
                    `A⃗ = (${currentChallenge.polar.r.toFixed(2)} u ; ${currentChallenge.polar.thetaDeg.toFixed(1)}°)`}
                  {currentChallenge.sourceMode === 'geographic' &&
                    `A⃗ = ${currentChallenge.geo.canonicalText}`}
                </div>
                <p className={styles.promptInstruction}>
                  {currentChallenge.sourceMode === 'rectangular' &&
                    'Calcula y escribe las coordenadas POLARES (Magnitud r y Ángulo θ en grados):'}
                  {currentChallenge.sourceMode === 'polar' &&
                    'Calcula y escribe las componentes RECTANGULARES (Ax horizontal y Ay vertical):'}
                  {currentChallenge.sourceMode === 'geographic' &&
                    'Calcula y escribe las coordenadas POLARES (Magnitud r y Ángulo θ en grados):'}
                </p>
              </div>

              <div className={styles.practiceInputs}>
                <div className={styles.inputRow}>
                  <label className={styles.labelRow}>
                    <span className={styles.paramName}>
                      {currentChallenge.sourceMode === 'polar' ? 'Componente Ax (u)' : 'Módulo r (u)'}
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej. 5.00"
                    className={styles.numInput}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px' }}
                    value={userAnswer.val1}
                    onChange={(e) => setUserAnswer((prev) => ({ ...prev, val1: e.target.value }))}
                  />
                </div>

                <div className={styles.inputRow}>
                  <label className={styles.labelRow}>
                    <span className={styles.paramName}>
                      {currentChallenge.sourceMode === 'polar' ? 'Componente Ay (u)' : 'Ángulo θ (°)'}
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej. 53.13"
                    className={styles.numInput}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px' }}
                    value={userAnswer.val2}
                    onChange={(e) => setUserAnswer((prev) => ({ ...prev, val2: e.target.value }))}
                  />
                </div>
              </div>

              <div className={styles.practiceActions}>
                <button className="btn btn--primary" onClick={verifyChallengeAnswer}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                  Verificar Respuesta
                </button>
                <button className="btn btn--secondary" onClick={generateNewChallenge}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>shuffle</span>
                  Siguiente Reto
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() => setShowChallengeSolution((v) => !v)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
                  {showChallengeSolution ? 'Ocultar Solución' : 'Ver Solución'}
                </button>
              </div>

              {challengeFeedback.status !== 'idle' && (
                <div
                  className={`${styles.feedbackBox} ${
                    challengeFeedback.status === 'success'
                      ? styles.feedbackSuccess
                      : styles.feedbackError
                  }`}
                >
                  <strong>
                    {challengeFeedback.status === 'success' ? '✓ ¡Correcto!' : '✗ Intenta nuevamente'}
                  </strong>
                  <span>{challengeFeedback.message}</span>
                </div>
              )}

              {showChallengeSolution && (
                <div className={styles.mathPanel}>
                  <span className={styles.solutionHeader}>Solución Completa del Reto:</span>
                  <div className={styles.mathStep}>
                    <span className={styles.mathStepTitle}>Forma Rectangular:</span>
                    <code className={styles.mathFormula}>
                      Ax = {currentChallenge.rect.x.toFixed(2)} u &nbsp;|&nbsp; Ay ={' '}
                      {currentChallenge.rect.y.toFixed(2)} u
                    </code>
                  </div>
                  <div className={styles.mathStep}>
                    <span className={styles.mathStepTitle}>Forma Polar:</span>
                    <code className={styles.mathFormula}>
                      r = {currentChallenge.polar.r.toFixed(2)} u &nbsp;|&nbsp; θ ={' '}
                      {currentChallenge.polar.thetaDeg.toFixed(2)}°
                    </code>
                  </div>
                  <div className={styles.mathStep}>
                    <span className={styles.mathStepTitle}>Forma Geográfica:</span>
                    <code className={styles.mathFormula}>{currentChallenge.geo.canonicalText}</code>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function drawArrow(
  ct: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  lineWidth: number
) {
  const headLen = 12
  const angle = Math.atan2(toY - fromY, toX - fromX)

  ct.strokeStyle = color
  ct.fillStyle = color
  ct.lineWidth = lineWidth
  ct.lineCap = 'round'

  ct.beginPath()
  ct.moveTo(fromX, fromY)
  ct.lineTo(toX, toY)
  ct.stroke()

  ct.beginPath()
  ct.moveTo(toX, toY)
  ct.lineTo(
    toX - headLen * Math.cos(angle - Math.PI / 7),
    toY - headLen * Math.sin(angle - Math.PI / 7)
  )
  ct.lineTo(
    toX - headLen * Math.cos(angle + Math.PI / 7),
    toY - headLen * Math.sin(angle + Math.PI / 7)
  )
  ct.closePath()
  ct.fill()
}
