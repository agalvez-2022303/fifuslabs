import { useEffect, useRef } from 'react'
import styles from './HeroCanvas.module.css'

/**
 * HeroCanvas — escena animada en canvas 2D con visualización de vectores, péndulo y proyectil
 */
export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef  = useRef({ x: 0, y: 0 })
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let W = 0, H = 0

    function resize() {
      if (!canvas || !ctx) return
      W = canvas.offsetWidth
      H = canvas.offsetHeight
      canvas.width  = W * dpr
      canvas.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    function onMouseMove(e: MouseEvent) {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth  - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches[0]) {
        mouseRef.current = {
          x: (e.touches[0].clientX / window.innerWidth  - 0.5) * 2,
          y: (e.touches[0].clientY / window.innerHeight - 0.5) * 2,
        }
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('touchmove', onTouchMove, { passive: true })

    let t = 0
    const FPS_TARGET = 1000 / 60
    let lastFrame = 0

    function draw(timestamp: number) {
      rafRef.current = requestAnimationFrame(draw)

      if (timestamp - lastFrame < FPS_TARGET * 0.8) return
      lastFrame = timestamp

      if (!ctx) return
      ctx.clearRect(0, 0, W, H)
      t += 0.016

      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      drawFieldLines(ctx, W, H, t, mx, my)
      drawPendulum(ctx, W, H, t, mx, my)
      drawProjectile(ctx, W, H, t, mx, my)
      drawForceVectors(ctx, W, H, t, mx, my)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
}

function drawFieldLines(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  t: number, mx: number, my: number
) {
  const spacing = 70
  ctx.strokeStyle = 'rgba(36, 52, 108, 0.06)'
  ctx.lineWidth = 1
  for (let x = 0; x < W + spacing; x += spacing) {
    for (let y = 0; y < H + spacing; y += spacing) {
      const angle = Math.sin(x * 0.01 + t * 0.3) * 0.5 + Math.cos(y * 0.01 + t * 0.2) * 0.5
      const len = 18
      const cx = x + mx * 6
      const cy = y + my * 6
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len)
      ctx.stroke()
    }
  }
}

function drawPendulum(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  t: number, mx: number, my: number
) {
  const pivotX = W * 0.20 + mx * 6
  const pivotY = H * 0.18 + my * 3
  const L = Math.min(H * 0.32, 130)
  const angle = Math.sin(t * 1.8) * 0.5

  const bobX = pivotX + Math.sin(angle) * L
  const bobY = pivotY + Math.cos(angle) * L

  ctx.strokeStyle = 'rgba(36, 52, 108, 0.3)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(pivotX - 24, pivotY)
  ctx.lineTo(pivotX + 24, pivotY)
  ctx.stroke()

  ctx.fillStyle = '#24346C'
  ctx.beginPath()
  ctx.arc(pivotX, pivotY, 3.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = 'rgba(36, 52, 108, 0.45)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(pivotX, pivotY)
  ctx.lineTo(bobX, bobY)
  ctx.stroke()

  // Bob
  const bobR = 14
  const grd = ctx.createRadialGradient(bobX - 3, bobY - 3, 1, bobX, bobY, bobR)
  grd.addColorStop(0, '#38bdf8')
  grd.addColorStop(0.7, '#0284c7')
  grd.addColorStop(1, '#0369a1')
  ctx.fillStyle = grd
  ctx.beginPath()
  ctx.arc(bobX, bobY, bobR, 0, Math.PI * 2)
  ctx.fill()

  ctx.font = '10px JetBrains Mono, monospace'
  ctx.fillStyle = '#64748B'
  ctx.textAlign = 'center'
  ctx.fillText('Péndulo θ(t)', pivotX, pivotY - 10)
}

function drawProjectile(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  t: number, mx: number, my: number
) {
  const originX = W * 0.35 + mx * 4
  const originY = H * 0.72 + my * 2
  const maxH = H * 0.22
  const range = W * 0.28

  ctx.strokeStyle = 'rgba(37, 99, 235, 0.25)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  for (let i = 0; i <= 60; i++) {
    const tau = i / 60
    const px = originX + tau * range
    const py = originY - 4 * maxH * tau * (1 - tau)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.stroke()
  ctx.setLineDash([])

  const loopT = (t * 0.5) % 1
  const px = originX + loopT * range
  const py = originY - 4 * maxH * loopT * (1 - loopT)

  const pr = 9
  const grd2 = ctx.createRadialGradient(px - 2, py - 2, 1, px, py, pr)
  grd2.addColorStop(0, '#fbbf24')
  grd2.addColorStop(0.8, '#d97706')
  grd2.addColorStop(1, '#b45309')
  ctx.fillStyle = grd2
  ctx.beginPath()
  ctx.arc(px, py, pr, 0, Math.PI * 2)
  ctx.fill()

  const vx = range / 100 * 50
  const vy = (-4 * maxH * (1 - 2 * loopT)) / 100 * 50
  drawArrow(ctx, px, py, px + vx * 0.16, py + vy * 0.16, '#0891b2', 1.5)

  ctx.font = '10px JetBrains Mono, monospace'
  ctx.fillStyle = '#64748B'
  ctx.textAlign = 'center'
  ctx.fillText('Trayectoria MRUV', originX + range / 2, originY + 16)
}

function drawForceVectors(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  t: number, mx: number, my: number
) {
  const cx = W * 0.76 + mx * 5
  const cy = H * 0.42 + my * 3
  const len = Math.min(W * 0.09, 64)

  const colors = ['#2563EB', '#06B6D4', '#7C3AED']
  const angles = [
    t * 0.2 + Math.PI * 0.5,
    t * 0.2 + Math.PI * (0.5 + 2/3),
    t * 0.2 + Math.PI * (0.5 + 4/3),
  ]

  angles.forEach((angle, i) => {
    const ex = cx + Math.cos(angle) * len
    const ey = cy + Math.sin(angle) * len
    drawArrow(ctx, cx, cy, ex, ey, colors[i], 2)

    const labelX = cx + Math.cos(angle) * (len + 14)
    const labelY = cy + Math.sin(angle) * (len + 14)
    ctx.font = '10px JetBrains Mono, monospace'
    ctx.fillStyle = colors[i]
    ctx.textAlign = 'center'
    ctx.fillText(`F⃗${i+1}`, labelX, labelY)
  })

  ctx.fillStyle = '#172554'
  ctx.beginPath()
  ctx.arc(cx, cy, 6, 0, Math.PI * 2)
  ctx.fill()

  ctx.font = '10px JetBrains Mono, monospace'
  ctx.fillStyle = '#64748B'
  ctx.textAlign = 'center'
  ctx.fillText('ΣF⃗ = 0 (Estática)', cx, cy + len + 24)
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  color: string,
  lineWidth = 2
) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const headLen = 8

  ctx.strokeStyle = color
  ctx.fillStyle   = color
  ctx.lineWidth   = lineWidth

  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(
    x2 - headLen * Math.cos(angle - Math.PI / 6),
    y2 - headLen * Math.sin(angle - Math.PI / 6)
  )
  ctx.lineTo(
    x2 - headLen * Math.cos(angle + Math.PI / 6),
    y2 - headLen * Math.sin(angle + Math.PI / 6)
  )
  ctx.closePath()
  ctx.fill()
}
