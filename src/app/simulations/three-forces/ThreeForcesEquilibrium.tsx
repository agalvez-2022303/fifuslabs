import { useState, useRef, useCallback, useEffect } from 'react'
import { useCanvasRenderer } from '../../hooks/useCanvasRenderer'
import { computeEquilibrium, type ForceSystem } from './physics'
import styles from './ThreeForcesEquilibrium.module.css'

const RAD = Math.PI / 180

export default function ThreeForcesEquilibrium() {
  const { canvasRef, ctx, size } = useCanvasRenderer()

  const [F1mag, setF1mag] = useState(5)
  const [F2mag, setF2mag] = useState(5)

  const [pulley1Angle, setPulley1Angle] = useState(-50 * RAD)
  const [pulley2Angle, setPulley2Angle] = useState(50 * RAD)

  const [showParallelogram, setShowParallelogram] = useState(false)
  const dragging = useRef<'p1' | 'p2' | null>(null)

  const system: ForceSystem = {
    F1: { magnitude: F1mag, angle: pulley1Angle + Math.PI },
    F2: { magnitude: F2mag, angle: pulley2Angle + Math.PI },
  }
  const result = computeEquilibrium(system)

  // ─── Dibujo ────────────────────────────────────────────────
  const PULLEY_RADIUS = 30
  const ROPE_LEN      = 100

  const draw = useCallback(() => {
    const ct = ctx.current
    const { width: W, height: H } = size
    if (!ct || W === 0) return

    ct.clearRect(0, 0, W, H)

    // Fondo limpio de laboratorio
    ct.fillStyle = '#ffffff'
    ct.fillRect(0, 0, W, H)

    // Cuadrícula sutil
    ct.strokeStyle = '#f1f5f9'
    ct.lineWidth = 1
    const step = 40
    for (let x = 0; x < W; x += step) {
      ct.beginPath()
      ct.moveTo(x, 0)
      ct.lineTo(x, H)
      ct.stroke()
    }
    for (let y = 0; y < H; y += step) {
      ct.beginPath()
      ct.moveTo(0, y)
      ct.lineTo(W, y)
      ct.stroke()
    }

    const kx = W / 2
    const ky = H * 0.42

    const pulleyR = Math.min(W, H) * 0.28
    const p1x = kx + Math.sin(pulley1Angle) * pulleyR
    const p1y = ky + Math.cos(pulley1Angle) * pulleyR * (-0.7) - 20
    const p2x = kx + Math.sin(pulley2Angle) * pulleyR
    const p2y = ky + Math.cos(pulley2Angle) * pulleyR * (-0.7) - 20

    // Viga superior / Soporte
    ct.fillStyle = '#1e293b'
    ct.fillRect(0, 0, W, 18)
    ct.strokeStyle = '#c8a932'
    ct.lineWidth = 2
    ct.beginPath()
    ct.moveTo(0, 18)
    ct.lineTo(W, 18)
    ct.stroke()

    // Postes de soporte
    ct.strokeStyle = '#94a3b8'
    ct.lineWidth = 2
    ct.setLineDash([4, 4])
    ct.beginPath()
    ct.moveTo(p1x, 18)
    ct.lineTo(p1x, p1y)
    ct.moveTo(p2x, 18)
    ct.lineTo(p2x, p2y)
    ct.stroke()
    ct.setLineDash([])

    // Cuerdas
    const rope1dx = p1x - kx
    const rope1dy = p1y - ky
    const rope1len = Math.sqrt(rope1dx * rope1dx + rope1dy * rope1dy)
    const rope1ux = rope1dx / rope1len
    const rope1uy = rope1dy / rope1len

    ct.strokeStyle = '#334155'
    ct.lineWidth = 2
    ct.beginPath()
    ct.moveTo(kx, ky)
    ct.lineTo(p1x, p1y)
    ct.stroke()

    ct.beginPath()
    ct.moveTo(p1x, p1y)
    ct.lineTo(p1x, p1y + ROPE_LEN)
    ct.stroke()

    ct.beginPath()
    ct.moveTo(kx, ky)
    ct.lineTo(p2x, p2y)
    ct.stroke()

    ct.beginPath()
    ct.moveTo(p2x, p2y)
    ct.lineTo(p2x, p2y + ROPE_LEN)
    ct.stroke()

    // Cuerda F3
    const scale = 14
    const f3x = result.F3vec.x * scale
    const f3y = result.F3vec.y * scale
    if (result.valid) {
      ct.strokeStyle = '#7c3aed'
      ct.lineWidth = 2.5
      ct.beginPath()
      ct.moveTo(kx, ky)
      ct.lineTo(kx + f3x * 2, ky + f3y * 2)
      ct.stroke()

      const fpx = kx + f3x * 2
      const fpy = ky + f3y * 2
      drawWeight(ct, fpx, fpy, result.F3mag, '#7c3aed')
    }

    // Poleas
    drawPulley(ct, p1x, p1y, PULLEY_RADIUS, pulley1Angle, '#2563eb')
    drawPulley(ct, p2x, p2y, PULLEY_RADIUS, pulley2Angle, '#c8a932')

    // Pesas en los extremos
    drawWeight(ct, p1x, p1y + ROPE_LEN, F1mag, '#2563eb')
    drawWeight(ct, p2x, p2y + ROPE_LEN, F2mag, '#c8a932')

    // Nudo central
    const grd = ct.createRadialGradient(kx - 3, ky - 3, 2, kx, ky, 10)
    grd.addColorStop(0, '#172554')
    grd.addColorStop(1, '#0b1c30')
    ct.fillStyle = grd
    ct.beginPath()
    ct.arc(kx, ky, 10, 0, Math.PI * 2)
    ct.fill()

    // Vectores de fuerza
    const arrowScale = 6
    drawForceArrow(ct, kx, ky, rope1ux * F1mag * arrowScale, rope1uy * F1mag * arrowScale, '#2563eb', 'F⃗₁')
    drawForceArrow(ct, kx, ky, (p2x - kx) / rope1len * F2mag * arrowScale, (p2y - ky) / rope1len * F2mag * arrowScale, '#c8a932', 'F⃗₂')

    if (result.valid) {
      const f3n = Math.sqrt(f3x * f3x + f3y * f3y)
      const f3ux = f3x / f3n, f3uy = f3y / f3n
      drawForceArrow(ct, kx, ky, f3ux * result.F3mag * arrowScale, f3uy * result.F3mag * arrowScale, '#7c3aed', 'F⃗₃')
    }

    // Paralelogramo
    if (showParallelogram && result.valid) {
      const s = 14
      const v1x = rope1ux * F1mag * s, v1y = rope1uy * F1mag * s
      const v2x = (p2x - kx) / rope1len * F2mag * s
      const v2y = (p2y - ky) / rope1len * F2mag * s
      const diagX = v1x + v2x, diagY = v1y + v2y

      ct.fillStyle = 'rgba(37, 99, 235, 0.05)'
      ct.strokeStyle = '#94a3b8'
      ct.lineWidth = 1.2
      ct.setLineDash([4, 4])
      ct.beginPath()
      ct.moveTo(kx, ky)
      ct.lineTo(kx + v1x, ky + v1y)
      ct.lineTo(kx + diagX, ky + diagY)
      ct.lineTo(kx + v2x, ky + v2y)
      ct.closePath()
      ct.fill()
      ct.stroke()
      ct.setLineDash([])

      ct.strokeStyle = '#24346c'
      ct.lineWidth = 2
      drawArrowLine(ct, kx, ky, kx + diagX, ky + diagY)
    }

    // Telemetría en canvas
    const ang1 = (Math.atan2(p1x - kx, ky - p1y) * 180) / Math.PI
    const ang2 = (Math.atan2(p2x - kx, ky - p2y) * 180) / Math.PI

    ct.font = '700 10px "JetBrains Mono", monospace'
    ct.fillStyle = '#475569'
    ct.textAlign = 'left'
    ct.fillText(`α₁ = ${Math.abs(ang1).toFixed(1)}°`, 14, H - 36)
    ct.fillText(`α₂ = ${Math.abs(ang2).toFixed(1)}°`, 14, H - 20)

    if (!result.valid) {
      ct.font = '700 12px "JetBrains Mono", monospace'
      ct.fillStyle = '#ef4444'
      ct.textAlign = 'center'
      ct.fillText('⚠ Fuera de rango de equilibrio estático', W / 2, H - 16)
    }

    ct.textAlign = 'right'
    ct.fillStyle = '#2563eb'
    ct.fillText(`F₁ = ${F1mag.toFixed(1)} N`, W - 14, H - 36)
    ct.fillStyle = '#c8a932'
    ct.fillText(`F₂ = ${F2mag.toFixed(1)} N`, W - 14, H - 20)
    if (result.valid) {
      ct.fillStyle = '#7c3aed'
      ct.fillText(`F₃ = ${result.F3mag.toFixed(2)} N`, W - 14, H - 6)
    }
  }, [ctx, size, F1mag, F2mag, pulley1Angle, pulley2Angle, showParallelogram, result])

  useEffect(() => { draw() }, [draw])

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (size.width / rect.width)
    const py = (e.clientY - rect.top) * (size.height / rect.height)

    const kx = size.width / 2
    const ky = size.height * 0.42
    const pulleyR = Math.min(size.width, size.height) * 0.28

    const p1x = kx + Math.sin(pulley1Angle) * pulleyR
    const p1y = ky + Math.cos(pulley1Angle) * pulleyR * (-0.7) - 20
    const p2x = kx + Math.sin(pulley2Angle) * pulleyR
    const p2y = ky + Math.cos(pulley2Angle) * pulleyR * (-0.7) - 20

    const d1 = Math.hypot(px - p1x, py - p1y)
    const d2 = Math.hypot(px - p2x, py - p2y)

    if (d1 < 36) {
      dragging.current = 'p1'
      canvas.setPointerCapture(e.pointerId)
    } else if (d2 < 36) {
      dragging.current = 'p2'
      canvas.setPointerCapture(e.pointerId)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragging.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (size.width / rect.width)
    const py = (e.clientY - rect.top) * (size.height / rect.height)

    const kx = size.width / 2
    const ky = size.height * 0.42
    const angle = Math.atan2(px - kx, ky - py)

    const clamped = Math.max(-80 * RAD, Math.min(80 * RAD, angle))
    if (dragging.current === 'p1') setPulley1Angle(clamped)
    else setPulley2Angle(clamped)
  }

  const handlePointerUp = () => { dragging.current = null }

  return (
    <div className={styles.sim}>
      <div className={styles.canvasWrap}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          aria-label="Simulación de tres fuerzas en equilibrio"
        />

        <div className={styles.pulleyHint}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>drag_indicator</span>
          <span>Arrastra las poleas circulares para variar la geometría</span>
        </div>
      </div>

      <div className={styles.panel}>
        {/* Card 1: Magnitudes */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className="material-symbols-outlined" style={{ color: 'var(--corporate)', fontSize: '18px' }}>
              fitness_center
            </span>
            <span className={styles.cardTitle}>Magnitudes de Fuerza</span>
          </div>

          <label className={styles.sliderField}>
            <div className={styles.sliderRow}>
              <span className={styles.fieldLabel} style={{ color: '#2563eb', fontWeight: 700 }}>Fuerza F₁</span>
              <span className={styles.sliderVal}>{F1mag.toFixed(1)} N</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="0.1"
              value={F1mag}
              onChange={(e) => setF1mag(parseFloat(e.target.value))}
              className={styles.sliderBlue}
            />
          </label>

          <label className={styles.sliderField}>
            <div className={styles.sliderRow}>
              <span className={styles.fieldLabel} style={{ color: '#b45309', fontWeight: 700 }}>Fuerza F₂</span>
              <span className={styles.sliderVal}>{F2mag.toFixed(1)} N</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="0.1"
              value={F2mag}
              onChange={(e) => setF2mag(parseFloat(e.target.value))}
              className={styles.sliderGold}
            />
          </label>
        </div>

        {/* Card 2: Ángulos */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className="material-symbols-outlined" style={{ color: 'var(--corporate)', fontSize: '18px' }}>
              explore
            </span>
            <span className={styles.cardTitle}>Ángulos de Desviación</span>
          </div>
          <div className={styles.dataRow}>
            <span className={styles.dataLabel}>α₁ (desde vertical)</span>
            <span className={styles.dataVal}>{Math.abs((pulley1Angle * 180) / Math.PI).toFixed(1)}°</span>
          </div>
          <div className={styles.dataRow}>
            <span className={styles.dataLabel}>α₂ (desde vertical)</span>
            <span className={styles.dataVal}>{Math.abs((pulley2Angle * 180) / Math.PI).toFixed(1)}°</span>
          </div>
          <p className={styles.hint}>Arrastra las poleas en el canvas para ajustar</p>
        </div>

        {/* Card 3: Fuerza Equilibrante F3 */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className="material-symbols-outlined" style={{ color: '#7c3aed', fontSize: '18px' }}>
              balance
            </span>
            <span className={styles.cardTitle}>Equilibrio Estático</span>
          </div>
          {result.valid ? (
            <>
              <div className={styles.dataRow}>
                <span className={styles.dataLabel}>Fuerza F₃ (|F⃗₁ + F⃗₂|)</span>
                <span className={styles.resultF3}>{result.F3mag.toFixed(3)} N</span>
              </div>
              <div className={styles.validTag}>✓ Condición ΣF⃗ = 0 satisfecha</div>
            </>
          ) : (
            <div className={styles.errorTag}>⚠ {result.error}</div>
          )}
        </div>

        {/* Card 4: Visualización */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className="material-symbols-outlined" style={{ color: 'var(--corporate)', fontSize: '18px' }}>
              visibility
            </span>
            <span className={styles.cardTitle}>Construcción Gráfica</span>
          </div>
          <button
            className={`btn ${showParallelogram ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setShowParallelogram((p) => !p)}
            style={{ width: '100%' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>crop_square</span>
            {showParallelogram ? 'Ocultar Paralelogramo' : 'Ver Paralelogramo'}
          </button>
        </div>
      </div>
    </div>
  )
}

function drawPulley(
  ct: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  angle: number,
  color: string
) {
  ct.strokeStyle = color
  ct.lineWidth = 2.5
  ct.beginPath()
  ct.arc(cx, cy, r, 0, Math.PI * 2)
  ct.stroke()

  ct.fillStyle = '#f8fafc'
  ct.fill()

  ct.strokeStyle = '#cbd5e1'
  ct.lineWidth = 1.5
  ct.beginPath()
  ct.arc(cx, cy, r * 0.65, 0, Math.PI * 2)
  ct.stroke()

  const spokes = 6
  ct.strokeStyle = '#94a3b8'
  ct.lineWidth = 1
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 + angle
    ct.beginPath()
    ct.moveTo(cx, cy)
    ct.lineTo(cx + Math.cos(a) * r * 0.65, cy + Math.sin(a) * r * 0.65)
    ct.stroke()
  }

  ct.fillStyle = color
  ct.beginPath()
  ct.arc(cx, cy, 4.5, 0, Math.PI * 2)
  ct.fill()
}

function drawWeight(
  ct: CanvasRenderingContext2D,
  x: number,
  y: number,
  force: number,
  color: string
) {
  const size = 20 + force * 2
  const halfW = size / 2
  const h = size * 0.7

  ct.fillStyle = color
  ct.strokeStyle = '#ffffff'
  ct.lineWidth = 1.5
  ct.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6
    const px = x + Math.cos(a) * halfW
    const py = y + Math.sin(a) * h * 0.7 + h / 2
    if (i === 0) ct.moveTo(px, py)
    else ct.lineTo(px, py)
  }
  ct.closePath()
  ct.fill()
  ct.stroke()

  ct.font = `700 ${Math.max(9, force * 0.8 + 7)}px "JetBrains Mono", monospace`
  ct.fillStyle = '#ffffff'
  ct.textAlign = 'center'
  ct.textBaseline = 'middle'
  ct.fillText(`${force.toFixed(1)}N`, x, y + h / 2)
  ct.textBaseline = 'alphabetic'
}

function drawForceArrow(
  ct: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string,
  label: string
) {
  ct.strokeStyle = color
  ct.fillStyle   = color
  ct.lineWidth   = 2.5

  const angle = Math.atan2(dy, dx)
  const headLen = 10

  ct.beginPath()
  ct.moveTo(x, y)
  ct.lineTo(x + dx, y + dy)
  ct.stroke()

  ct.beginPath()
  ct.moveTo(x + dx, y + dy)
  ct.lineTo(x + dx - headLen * Math.cos(angle - Math.PI / 6), y + dy - headLen * Math.sin(angle - Math.PI / 6))
  ct.lineTo(x + dx - headLen * Math.cos(angle + Math.PI / 6), y + dy - headLen * Math.sin(angle + Math.PI / 6))
  ct.closePath()
  ct.fill()

  ct.font = '700 11px "JetBrains Mono", monospace'
  ct.textAlign = 'center'
  ct.fillText(label, x + dx * 1.18, y + dy * 1.18)
}

function drawArrowLine(
  ct: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const headLen = 10
  ct.beginPath()
  ct.moveTo(x1, y1)
  ct.lineTo(x2, y2)
  ct.stroke()
  ct.beginPath()
  ct.moveTo(x2, y2)
  ct.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6))
  ct.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6))
  ct.closePath()
  ct.fill()
}
