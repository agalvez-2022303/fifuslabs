import { useState, useRef, useCallback, useEffect } from 'react'
import { useCanvasRenderer } from '../../hooks/useCanvasRenderer'
import {
  createVector,
  computeAnalytical,
  polarToRect,
  rectToPolar,
  type Vector2D,
} from './physics'
import styles from './ForceComposition.module.css'

type GraphicalMethod = 'paralelogramo' | 'triangulo' | 'poligono'

const STITCH_VECTOR_COLORS = [
  '#2563eb', // V1 Royal Blue
  '#c8a932', // V2 Gold
  '#06b6d4', // V3 Cyan
  '#059669', // V4 Emerald
  '#64748b', // V5 Slate
  '#172554', // V6 Navy
]

export default function ForceComposition() {
  const { canvasRef, ctx, size } = useCanvasRenderer()

  // Lista de vectores editables
  const [vectors, setVectors] = useState<Vector2D[]>([
    createVector('v1', 'V₁', { magnitude: 6, angleDeg: 30 }, STITCH_VECTOR_COLORS[0], 'polar'),
    createVector('v2', 'V₂', { magnitude: 5, angleDeg: 120 }, STITCH_VECTOR_COLORS[1], 'polar'),
  ])

  // Método gráfico activo
  const [method, setMethod] = useState<GraphicalMethod>('paralelogramo')

  // Zoom de escala (px por unidad)
  const [scale, setScale] = useState(24)
  const [showFormulas, setShowFormulas] = useState(false)

  // Arrastre en Canvas
  const draggingId = useRef<string | null>(null)

  // Estado analítico calculado
  const analytical = computeAnalytical(vectors)
  const resultant = analytical.resultant

  // Si vectors.length >= 3 el método pasa automáticamente a polígono
  useEffect(() => {
    if (vectors.length >= 3) {
      setMethod('poligono')
    } else if (method === 'poligono') {
      setMethod('paralelogramo')
    }
  }, [vectors.length, method])

  // ─── Manipulación de Vectores ────────────────────────────────
  const addVector = () => {
    if (vectors.length >= 6) return
    const nextIdx = vectors.length + 1
    const newVec = createVector(
      `v${Date.now()}`,
      `V${nextIdx}`,
      { magnitude: 4, angleDeg: 45 * nextIdx },
      STITCH_VECTOR_COLORS[(nextIdx - 1) % STITCH_VECTOR_COLORS.length],
      'polar'
    )
    setVectors((prev) => [...prev, newVec])
  }

  const removeVector = (id: string) => {
    if (vectors.length <= 2) return
    setVectors((prev) => prev.filter((v) => v.id !== id))
  }

  const updateVectorPolar = (id: string, magnitude: number, angleDeg: number) => {
    const clampedMag = Math.max(0, Math.min(15, magnitude))
    const { x, y } = polarToRect(clampedMag, angleDeg)
    setVectors((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              magnitude: parseFloat(clampedMag.toFixed(2)),
              angleDeg: parseFloat((angleDeg % 360).toFixed(2)),
              x,
              y,
            }
          : v
      )
    )
  }

  const updateVectorRect = (id: string, x: number, y: number) => {
    const clampedX = Math.max(-15, Math.min(15, x))
    const clampedY = Math.max(-15, Math.min(15, y))
    const { magnitude, angleDeg } = rectToPolar(clampedX, clampedY)
    setVectors((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              x: parseFloat(clampedX.toFixed(2)),
              y: parseFloat(clampedY.toFixed(2)),
              magnitude,
              angleDeg,
            }
          : v
      )
    )
  }

  const toggleInputMode = (id: string) => {
    setVectors((prev) =>
      prev.map((v) =>
        v.id === id
          ? { ...v, inputMode: v.inputMode === 'rectangular' ? 'polar' : 'rectangular' }
          : v
      )
    )
  }

  // ─── Dibujo en Canvas ────────────────────────────────────────
  const draw = useCallback(() => {
    const ct = ctx.current
    const { width: W, height: H } = size
    if (!ct || W === 0 || H === 0) return

    ct.clearRect(0, 0, W, H)

    // Fondo blanco limpio de laboratorio
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

    // Ejes cartesianos
    ct.strokeStyle = '#64748b'
    ct.lineWidth = 1.5
    ct.beginPath()
    ct.moveTo(0, cy)
    ct.lineTo(W, cy)
    ct.moveTo(cx, 0)
    ct.lineTo(cx, H)
    ct.stroke()

    // Graduaciones numéricas
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
      if (Math.abs(u) % 2 === 0) ct.fillText(`${u}`, px, cy + 13)
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
      if (Math.abs(u) % 2 === 0) ct.fillText(`${u}`, cx - 6, py + 3)
    }

    // ─── Construcción Gráfica según el Método ──────────────────
    if (method === 'paralelogramo' && vectors.length === 2) {
      const v1 = vectors[0]
      const v2 = vectors[1]

      const dx1 = v1.x * scale, dy1 = -v1.y * scale
      const dx2 = v2.x * scale, dy2 = -v2.y * scale

      ct.strokeStyle = '#94a3b8'
      ct.lineWidth = 1.3
      ct.setLineDash([4, 4])

      // V1 desplazado en la punta de V2
      ct.beginPath()
      ct.moveTo(cx + dx2, cy + dy2)
      ct.lineTo(cx + dx1 + dx2, cy + dy1 + dy2)
      ct.stroke()

      // V2 desplazado en la punta de V1
      ct.beginPath()
      ct.moveTo(cx + dx1, cy + dy1)
      ct.lineTo(cx + dx1 + dx2, cy + dy1 + dy2)
      ct.stroke()

      ct.setLineDash([])
    } else if (method === 'triangulo' && vectors.length === 2) {
      const v1 = vectors[0]
      const v2 = vectors[1]

      const p1x = cx + v1.x * scale
      const p1y = cy - v1.y * scale
      const p2x = p1x + v2.x * scale
      const p2y = p1y - v2.y * scale

      drawArrow(ct, p1x, p1y, p2x, p2y, '#94a3b8', 2, `${v2.label}'`, [4, 4])
    } else if (method === 'poligono') {
      // ── Método del Polígono: Cadena Punta-Cola en colores propios ─────
      // Se encadenan TODOS los vectores consecutivamente (incluyendo V1 desde el origen).
      // La resultante R cierra el polígono desde el origen hasta el extremo final.
      let currX = cx
      let currY = cy

      vectors.forEach((v) => {
        const nextX = currX + v.x * scale
        const nextY = currY - v.y * scale
        // Dibujamos con el color propio del vector (sólido, con etiqueta prima)
        drawArrow(ct, currX, currY, nextX, nextY, v.color ?? '#2563eb', 2.5, `${v.label}'`)
        // Círculo articulación en la punta de cada vector de la cadena
        ct.fillStyle = '#ffffff'
        ct.strokeStyle = v.color ?? '#2563eb'
        ct.lineWidth = 1.8
        ct.beginPath()
        ct.arc(nextX, nextY, 4, 0, Math.PI * 2)
        ct.fill()
        ct.stroke()
        currX = nextX
        currY = nextY
      })

      // Línea de cierre del polígono (desde el extremo final hacia el origen) en gris punteado
      // para mostrar visualmente que la resultante cierra la figura
      if (vectors.length >= 2) {
        ct.strokeStyle = '#c4b5fd'
        ct.lineWidth = 1.2
        ct.setLineDash([4, 4])
        ct.beginPath()
        ct.moveTo(currX, currY)
        ct.lineTo(cx, cy)
        ct.stroke()
        ct.setLineDash([])
      }
    }

    // ─── Vectores Concurrentes desde el Origen ────────────────
    // En el método polígono NO se superponen (ya se dibujan en la cadena).
    if (method !== 'poligono') {
      vectors.forEach((v) => {
        const ex = cx + v.x * scale
        const ey = cy - v.y * scale
        const isDraggingThis = draggingId.current === v.id
        const color = isDraggingThis ? '#24346c' : (v.color || '#2563eb')

        drawArrow(ct, cx, cy, ex, ey, color, 2.5, v.label)

        // Círculo interactivo en la punta
        ct.fillStyle = isDraggingThis ? '#c8a932' : '#ffffff'
        ct.beginPath()
        ct.arc(ex, ey, isDraggingThis ? 7 : 5, 0, Math.PI * 2)
        ct.fill()
        ct.strokeStyle = color
        ct.lineWidth = 2
        ct.stroke()
      })
    } else {
      // En modo polígono sí permitimos arrastrar las puntas del polígono (hit-test sobre los extremos acumulados)
      // Marcamos el origen como punto de arrastre disponible para V1
      let accX = cx
      let accY = cy
      vectors.forEach((v) => {
        const ex = accX + v.x * scale
        const ey = accY - v.y * scale
        const isDraggingThis = draggingId.current === v.id
        if (isDraggingThis) {
          ct.fillStyle = '#c8a932'
          ct.beginPath()
          ct.arc(ex, ey, 7, 0, Math.PI * 2)
          ct.fill()
        }
        accX = ex
        accY = ey
      })
    }

    // ─── Vector Resultante R ──────────────────────────────────
    if (vectors.length > 0 && resultant.magnitude > 0.05) {
      const rx = cx + resultant.x * scale
      const ry = cy - resultant.y * scale

      // Resultante en color Violeta / Púrpura de Stitch (#7C3AED)
      drawArrow(ct, cx, cy, rx, ry, '#7c3aed', 3.5, 'R⃗ (Resultante)')

      ct.strokeStyle = '#c4b5fd'
      ct.lineWidth = 1.2
      ct.setLineDash([3, 3])
      ct.beginPath()
      ct.moveTo(rx, ry)
      ct.lineTo(rx, cy)
      ct.stroke()
      ct.beginPath()
      ct.moveTo(rx, ry)
      ct.lineTo(cx, ry)
      ct.stroke()
      ct.setLineDash([])
    }
  }, [ctx, size, vectors, method, resultant, scale])

  useEffect(() => {
    draw()
  }, [draw])

  // ─── Interacción Canvas (Drag & Drop) ───────────────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (size.width / rect.width)
    const py = (e.clientY - rect.top) * (size.height / rect.height)

    const cx = size.width / 2
    const cy = size.height / 2

    if (method === 'poligono') {
      // En modo polígono el handle de cada vector está en su punta acumulada
      let accX = cx
      let accY = cy
      for (const v of vectors) {
        const tipX = accX + v.x * scale
        const tipY = accY - v.y * scale
        if (Math.hypot(px - tipX, py - tipY) < 26) {
          draggingId.current = v.id
          canvas.setPointerCapture(e.pointerId)
          break
        }
        accX = tipX
        accY = tipY
      }
    } else {
      // Modo paralelogramo / triángulo: handles en los extremos desde el origen
      for (const v of vectors) {
        const ex = cx + v.x * scale
        const ey = cy - v.y * scale
        if (Math.hypot(px - ex, py - ey) < 26) {
          draggingId.current = v.id
          canvas.setPointerCapture(e.pointerId)
          break
        }
      }
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingId.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (size.width / rect.width)
    const py = (e.clientY - rect.top) * (size.height / rect.height)

    const cx = size.width / 2
    const cy = size.height / 2

    if (method === 'poligono') {
      // La punta de arrastre está en coordenadas absolutas del canvas.
      // El delta respecto a la BASE acumulada de ese vector determina el nuevo (x, y).
      const dragIdx = vectors.findIndex((v) => v.id === draggingId.current)
      if (dragIdx < 0) return
      // Calcular la base acumulada (punta del vector anterior en la cadena)
      let baseX = cx
      let baseY = cy
      for (let i = 0; i < dragIdx; i++) {
        baseX += vectors[i].x * scale
        baseY -= vectors[i].y * scale
      }
      // El nuevo vector va desde esa base hasta el puntero
      const newVx = (px - baseX) / scale
      const newVy = -(py - baseY) / scale
      updateVectorRect(draggingId.current, newVx, newVy)
    } else {
      // Modo concurrente: el vector va desde el origen al puntero
      const vx = (px - cx) / scale
      const vy = -(py - cy) / scale
      updateVectorRect(draggingId.current, vx, vy)
    }
  }

  const handlePointerUp = () => {
    draggingId.current = null
  }

  return (
    <div className={styles.sim}>
      {/* ── Canvas 2D Interactivo ────────────────────────────── */}
      <div className={styles.canvasWrap}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {/* HUD Resultante */}
        <div className={styles.canvasOverlay}>
          <span className={styles.overlayTitle}>Vector Resultante (R⃗)</span>
          <span className={styles.overlayValue}>
            |R⃗| = {resultant.magnitude.toFixed(2)} u &nbsp;|&nbsp; θ = {resultant.angleDeg.toFixed(1)}°
          </span>
          <span className={styles.overlaySub}>
            Rx = {resultant.x.toFixed(2)} u &nbsp;|&nbsp; Ry = {resultant.y.toFixed(2)} u &nbsp;({analytical.quadrant})
          </span>
        </div>

        {/* Controles de Zoom */}
        <div className={styles.canvasControls}>
          <button className={styles.canvasBtn} onClick={() => setScale((s) => Math.min(42, s + 4))}>
            + Zoom
          </button>
          <button className={styles.canvasBtn} onClick={() => setScale((s) => Math.max(14, s - 4))}>
            - Zoom
          </button>
        </div>

        {/* Pista de arrastre (contextual por método) */}
        <div style={{
          position: 'absolute', bottom: '10px', left: '10px',
          display: 'flex', alignItems: 'center', gap: '5px',
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
          padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0',
          fontSize: '11px', color: '#475569', fontFamily: 'var(--font-display)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>drag_indicator</span>
          {method === 'poligono'
            ? 'Arrastra la punta de cada flecha de la cadena'
            : 'Arrastra las puntas de los vectores desde el origen'}
        </div>
      </div>

      {/* ── Barra de Métodos y Pestañas ──────────────────────── */}
      <div className={styles.methodBar}>
        <div className={styles.methodButtons}>
          <button
            className={`${styles.methodBtn} ${method === 'paralelogramo' ? styles.methodActive : ''}`}
            onClick={() => setMethod('paralelogramo')}
            disabled={vectors.length >= 3}
            title={vectors.length >= 3 ? 'Exclusivo para 2 vectores' : 'Método del paralelogramo'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>crop_square</span>
            Paralelogramo (2 vectores)
          </button>

          <button
            className={`${styles.methodBtn} ${method === 'triangulo' ? styles.methodActive : ''}`}
            onClick={() => setMethod('triangulo')}
            disabled={vectors.length >= 3}
            title={vectors.length >= 3 ? 'Exclusivo para 2 vectores' : 'Método del triángulo'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>change_history</span>
            Triángulo (2 vectores)
          </button>

          <button
            className={`${styles.methodBtn} ${method === 'poligono' ? styles.methodActive : ''}`}
            onClick={() => setMethod('poligono')}
            title="Método del polígono (cabeza-cola)"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>polyline</span>
            Polígono ({vectors.length >= 3 ? `${vectors.length} vectores` : 'Punta-Cola'})
          </button>

        </div>

        {vectors.length >= 3 && (
          <span className={styles.methodNotice}>
            ℹ Con 3 o más vectores se aplica automáticamente el método del polígono.
          </span>
        )}
      </div>

      <>
          {/* ── MÉTODO ANALÍTICO: Tabla de Descomposición ───────── */}
          <div className={styles.tableCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleGroup}>
                <span className="material-symbols-outlined" style={{ color: 'var(--corporate)' }}>
                  table_chart
                </span>
                <span className={styles.cardTitle}>
                  Método Analítico: Descomposición de Componentes
                </span>
              </div>
              <button
                className="btn btn--primary btn--sm"
                onClick={addVector}
                disabled={vectors.length >= 6}
              >
                + Agregar Vector ({vectors.length}/6)
              </button>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.analytTable}>
                <thead>
                  <tr>
                    <th>Vector</th>
                    <th>Modo Entrada</th>
                    <th>Módulo (|V|)</th>
                    <th>Ángulo (θ)</th>
                    <th>Comp. X (Vx = |V|·cos θ)</th>
                    <th>Comp. Y (Vy = |V|·sen θ)</th>
                    <th style={{ textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {analytical.rows.map((row, idx) => {
                    const vec = vectors[idx]
                    const isRect = vec.inputMode === 'rectangular'

                    return (
                      <tr key={row.id}>
                        <td>
                          <span className={styles.vecBadge}>
                            <span
                              className={styles.vecColorDot}
                              style={{ background: vec.color || '#2563eb' }}
                            />
                            {row.label}
                          </span>
                        </td>
                        <td>
                          <button
                            className={styles.modeToggleBtn}
                            onClick={() => toggleInputMode(vec.id)}
                            title="Cambiar entre modo Polar y Rectangular"
                          >
                            {isRect ? 'Rectangular [X, Y]' : 'Polar [r, θ]'} ⇄
                          </button>
                        </td>
                        <td>
                          {isRect ? (
                            <span className={styles.compCell}>{row.magnitude.toFixed(2)} u</span>
                          ) : (
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              min="0"
                              max="15"
                              value={row.magnitude}
                              className={styles.tableInput}
                              onChange={(e) =>
                                updateVectorPolar(vec.id, parseFloat(e.target.value) || 0, row.angleDeg)
                              }
                            />
                          )}
                        </td>
                        <td>
                          {isRect ? (
                            <span className={styles.compCell}>{row.angleDeg.toFixed(1)}°</span>
                          ) : (
                            <input
                              type="number"
                              inputMode="decimal"
                              step="1"
                              min="0"
                              max="360"
                              value={row.angleDeg}
                              className={styles.tableInput}
                              onChange={(e) =>
                                updateVectorPolar(vec.id, row.magnitude, parseFloat(e.target.value) || 0)
                              }
                            />
                          )}
                        </td>
                        <td>
                          {isRect ? (
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              value={row.x}
                              className={styles.tableInput}
                              onChange={(e) =>
                                updateVectorRect(vec.id, parseFloat(e.target.value) || 0, row.y)
                              }
                            />
                          ) : (
                            <span className={styles.compCell}>{row.x.toFixed(2)} u</span>
                          )}
                        </td>
                        <td>
                          {isRect ? (
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              value={row.y}
                              className={styles.tableInput}
                              onChange={(e) =>
                                updateVectorRect(vec.id, row.x, parseFloat(e.target.value) || 0)
                              }
                            />
                          ) : (
                            <span className={styles.compCell}>{row.y.toFixed(2)} u</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => removeVector(vec.id)}
                            disabled={vectors.length <= 2}
                            title={vectors.length <= 2 ? 'Mínimo 2 vectores requeridos' : 'Eliminar vector'}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    )
                  })}

                  {/* Summary Row */}
                  <tr className={styles.summaryRow}>
                    <td colSpan={4}>
                      <strong>SUMATORIA TOTAL (RESULTANTE R⃗)</strong>
                    </td>
                    <td>
                      <strong>Rx = ∑ Vx = {analytical.sumX.toFixed(2)} u</strong>
                    </td>
                    <td>
                      <strong>Ry = ∑ Vy = {analytical.sumY.toFixed(2)} u</strong>
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Panel Inferior: Resumen y Desglose Matemático ──── */}
          <div className={styles.bottomGrid}>
            <div className={styles.resultCard}>
              <span className={styles.cardTitle}>Vector Resultante Analítico</span>
              <div className={styles.resultHighlight}>
                |R⃗| = {resultant.magnitude.toFixed(2)} u
              </div>
              <div className={styles.resultSubtext}>
                Dirección angular: <strong>θ = {resultant.angleDeg.toFixed(2)}°</strong> ({analytical.quadrant})
              </div>
              <div className={styles.resultSubtext}>
                Rumbo geográfico: <strong>{analytical.geographicText}</strong>
              </div>
              <div className={styles.resultSubtext}>
                Forma cartesiana: <strong>R⃗ = ({resultant.x.toFixed(2)}î + {resultant.y.toFixed(2)}ĵ) u</strong>
              </div>

              <button
                className="btn btn--ghost btn--sm"
                onClick={() => setShowFormulas((v) => !v)}
                style={{ alignSelf: 'flex-start', marginTop: '6px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  {showFormulas ? 'expand_less' : 'expand_more'}
                </span>
                {showFormulas ? 'Ocultar Derivación' : 'Ver Derivación Paso a Paso'}
              </button>

              {showFormulas && (
                <div className={styles.formulaBox}>
                  <div className={styles.formulaStep}>
                    <span className={styles.formulaStepTitle}>1. Módulo Resultante (Teorema de Pitágoras):</span>
                    <code className={styles.formulaCode}>{analytical.magnitudeDerivation}</code>
                  </div>
                  <div className={styles.formulaStep}>
                    <span className={styles.formulaStepTitle}>2. Ángulo y Cuadrante:</span>
                    <code className={styles.formulaCode}>{analytical.angleDerivation}</code>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.resultCard}>
              <span className={styles.cardTitle}>Guía de Métodos Gráficos</span>
              <div className={styles.guideList}>
                <p>
                  <strong>Paralelogramo (2 vectores):</strong> Se sitúan ambos vectores en el origen común. Se trazan paralelas por sus extremos. La diagonal principal representa la resultante R⃗.
                </p>
                <p>
                  <strong>Triángulo (2 vectores):</strong> Se sitúa el vector V₂ trasladado con su origen en el extremo de V₁. El vector que une el origen inicial con el extremo de V₂ es la resultante R⃗.
                </p>
                <p>
                  <strong>Polígono (≥3 vectores):</strong> Se encadenan todos los vectores consecutivamente (punta con cola). La resultante R⃗ cierra el polígono desde el origen hasta el extremo final.
                </p>
              </div>
            </div>
          </div>
        </>
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
  lineWidth: number,
  label?: string,
  dash: number[] = []
) {
  const headLen = 12
  const angle = Math.atan2(toY - fromY, toX - fromX)

  ct.save()
  ct.strokeStyle = color
  ct.fillStyle = color
  ct.lineWidth = lineWidth
  ct.lineCap = 'round'
  ct.setLineDash(dash)

  ct.beginPath()
  ct.moveTo(fromX, fromY)
  ct.lineTo(toX, toY)
  ct.stroke()

  ct.setLineDash([])

  ct.beginPath()
  ct.moveTo(toX, toY)
  ct.lineTo(toX - headLen * Math.cos(angle - Math.PI / 7), toY - headLen * Math.sin(angle - Math.PI / 7))
  ct.lineTo(toX - headLen * Math.cos(angle + Math.PI / 7), toY - headLen * Math.sin(angle + Math.PI / 7))
  ct.closePath()
  ct.fill()

  if (label) {
    const midX = (fromX + toX) / 2
    const midY = (fromY + toY) / 2
    const dist = Math.hypot(toX - fromX, toY - fromY)
    if (dist > 10) {
      const nx = -(toY - fromY) / dist
      const ny = (toX - fromX) / dist
      ct.font = '700 10px "JetBrains Mono", monospace'
      ct.fillText(label, midX + nx * 10, midY + ny * 10)
    }
  }

  ct.restore()
}
