/**
 * useCanvasRenderer.ts
 *
 * Hook que gestiona el ciclo de vida del canvas:
 * - Redimensionado automático con ResizeObserver (responsive)
 * - DPI correcto en pantallas retina/HDPI
 * - Referencia al contexto 2D limpia y lista
 *
 * Uso:
 *   const { canvasRef, ctx, size } = useCanvasRenderer()
 */

import { useRef, useState, useEffect } from 'react'

export interface CanvasSize { width: number; height: number; dpr: number }

export function useCanvasRenderer() {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const ctxRef       = useRef<CanvasRenderingContext2D | null>(null)
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0, dpr: 1 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2) // máximo 2x para móviles
    ctxRef.current = canvas.getContext('2d')

    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      const { width, height } = entry.contentRect

      if (width <= 0 || height <= 0) return

      const targetW = Math.round(width * dpr)
      const targetH = Math.round(height * dpr)

      // Solo asignar dimensiones y resetear buffer si el tamaño en píxeles realmente cambió
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width  = targetW
        canvas.height = targetH
        const ctx = ctxRef.current
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        }
      }

      canvas.style.width  = `${width}px`
      canvas.style.height = `${height}px`

      setSize(prev => {
        if (prev.width === width && prev.height === height && prev.dpr === dpr) return prev
        return { width, height, dpr }
      })
    })

    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  return { canvasRef, ctx: ctxRef, size }
}
