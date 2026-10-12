import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { renderLatex } from '../../utils/latex'
import { computeParticlePosition, computeVelocityVsSpeed, type Point2D } from './physics'
import styles from './VelocidadRapidez.module.css'

interface RouteExample {
  id: string
  title: string
  description: string
  points: Point2D[]
  times: number[]
}

const ROUTE_EXAMPLES: RouteExample[] = [
  {
    id: 'roundtrip',
    title: 'Ida y vuelta',
    description: 'Camina 10 m y regresa al punto de partida en 4 s.',
    points: [
      { x: 0, y: 0, label: 'Inicio' },
      { x: 10, y: 0, label: 'Giro' },
      { x: 0, y: 0, label: 'Final' },
    ],
    times: [2, 2],
  },
  {
    id: 'straight',
    title: 'Línea recta',
    description: 'Avanza 12 m en la misma dirección en 3 s.',
    points: [
      { x: 0, y: 0, label: 'Inicio' },
      { x: 12, y: 0, label: 'Final' },
    ],
    times: [3],
  },
  {
    id: 'corner',
    title: 'Recorrido en L',
    description: 'Avanza 3 m y luego 4 m hacia el Norte en 3.5 s.',
    points: [
      { x: 0, y: 0, label: 'Inicio' },
      { x: 3, y: 0, label: 'Giro' },
      { x: 3, y: 4, label: 'Final' },
    ],
    times: [1.5, 2],
  },
]

export default function VelocidadRapidez() {
  const [activeRouteId, setActiveRouteId] = useState(ROUTE_EXAMPLES[0].id)
  const [isPlaying, setIsPlaying] = useState(false)
  const [simTime, setSimTime] = useState(0)
  const animationFrame = useRef<number>(0)
  const previousFrameTime = useRef(0)

  const activeRoute = ROUTE_EXAMPLES.find((route) => route.id === activeRouteId) ?? ROUTE_EXAMPLES[0]
  const result = useMemo(
    () => computeVelocityVsSpeed(activeRoute.points, activeRoute.times),
    [activeRoute]
  )
  const particle = useMemo(
    () => computeParticlePosition(simTime, activeRoute.points, activeRoute.times),
    [simTime, activeRoute]
  )

  const resetSimulation = useCallback(() => {
    setIsPlaying(false)
    setSimTime(0)
    previousFrameTime.current = 0
  }, [])

  const selectRoute = (route: RouteExample) => {
    resetSimulation()
    setActiveRouteId(route.id)
  }

  const toggleSimulation = () => {
    if (particle.isComplete && simTime > 0) {
      setSimTime(0)
      setIsPlaying(true)
      return
    }
    setIsPlaying((playing) => !playing)
  }

  const animationLoop = useCallback(
    (timestamp: number) => {
      if (previousFrameTime.current === 0) previousFrameTime.current = timestamp
      const elapsedSeconds = Math.min((timestamp - previousFrameTime.current) / 1000, 0.1)
      previousFrameTime.current = timestamp

      setSimTime((currentTime) => {
        const nextTime = currentTime + elapsedSeconds
        if (nextTime >= result.totalTime) {
          setIsPlaying(false)
          return result.totalTime
        }
        return nextTime
      })
      animationFrame.current = requestAnimationFrame(animationLoop)
    },
    [result.totalTime]
  )

  useEffect(() => {
    if (isPlaying) {
      previousFrameTime.current = 0
      animationFrame.current = requestAnimationFrame(animationLoop)
    } else {
      cancelAnimationFrame(animationFrame.current)
      previousFrameTime.current = 0
    }
    return () => cancelAnimationFrame(animationFrame.current)
  }, [isPlaying, animationLoop])

  const svgWidth = 640
  const svgHeight = 300
  const padding = 64
  const minX = Math.min(...activeRoute.points.map((point) => point.x), 0) - 2
  const maxX = Math.max(...activeRoute.points.map((point) => point.x), 10) + 2
  const minY = Math.min(...activeRoute.points.map((point) => point.y), 0) - 2
  const maxY = Math.max(...activeRoute.points.map((point) => point.y), 0) + 2
  const toSvgX = (x: number) =>
    padding + ((x - minX) / (maxX - minX)) * (svgWidth - padding * 2)
  const toSvgY = (y: number) =>
    svgHeight - padding - ((y - minY) / (maxY - minY)) * (svgHeight - padding * 2)
  const routePoints = activeRoute.points
    .map((point) => `${toSvgX(point.x)},${toSvgY(point.y)}`)
    .join(' ')
  const start = activeRoute.points[0]
  const end = activeRoute.points[activeRoute.points.length - 1]

  return (
    <div className={styles.simulation}>
      <section className={styles.intro}>
        <h2>¿Rapidez o velocidad?</h2>
        <p>Elige un recorrido y compara cuánto camino se recorrió con cuánto cambió la posición.</p>
      </section>

      <section className={styles.routePicker} aria-label="Elige un recorrido">
        {ROUTE_EXAMPLES.map((route) => (
          <button
            key={route.id}
            type="button"
            className={`${styles.routeButton} ${route.id === activeRouteId ? styles.routeButtonActive : ''}`}
            onClick={() => selectRoute(route)}
            aria-pressed={route.id === activeRouteId}
          >
            <strong>{route.title}</strong>
            <span>{route.description}</span>
          </button>
        ))}
      </section>

      <section className={styles.visualCard}>
        <div className={styles.sectionHeading}>
          <div>
            <h3>Observa el recorrido</h3>
            <p>La línea muestra el camino; la flecha dorada une el inicio con el final.</p>
          </div>
          <span className={styles.timeLabel}>
            Tiempo: {particle.time.toFixed(1)} / {result.totalTime.toFixed(1)} s
          </span>
        </div>

        <div className={styles.routeCanvas}>
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            role="img"
            aria-label={`Trayectoria: ${activeRoute.title}`}
          >
            <defs>
              <marker id="displacement-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#d97706" />
              </marker>
            </defs>
            <line
              x1={padding}
              y1={toSvgY(0)}
              x2={svgWidth - padding}
              y2={toSvgY(0)}
              className={styles.axis}
            />
            <polyline points={routePoints} className={styles.pathLine} />
            {result.displacementMagnitude > 0 && (
              <line
                x1={toSvgX(start.x)}
                y1={toSvgY(start.y)}
                x2={toSvgX(end.x)}
                y2={toSvgY(end.y)}
                className={styles.displacementLine}
                markerEnd="url(#displacement-arrow)"
              />
            )}
            {activeRoute.points.map((point, index) => (
              <g key={`${point.label}-${index}`}>
                <circle cx={toSvgX(point.x)} cy={toSvgY(point.y)} r="6" className={styles.routePoint} />
                <text
                  x={toSvgX(point.x)}
                  y={
                    index === activeRoute.points.length - 1 &&
                    point.x === start.x &&
                    point.y === start.y
                      ? toSvgY(point.y) + 28
                      : toSvgY(point.y) - 16
                  }
                  className={styles.pointLabel}
                >
                  {point.label}
                </text>
              </g>
            ))}
            <circle cx={toSvgX(particle.currentPos.x)} cy={toSvgY(particle.currentPos.y)} r="10" className={styles.movingHalo} />
            <circle cx={toSvgX(particle.currentPos.x)} cy={toSvgY(particle.currentPos.y)} r="5" className={styles.movingPoint} />
          </svg>
        </div>

        <div className={styles.playback}>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label="Avance del recorrido"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(particle.progressPercent)}
          >
            <div className={styles.progressFill} style={{ width: `${particle.progressPercent}%` }} />
          </div>
          <div className={styles.playbackActions}>
            <span>Distancia recorrida: <strong>{particle.distanceCovered.toFixed(1)} m</strong></span>
            <div>
              <button type="button" className="btn btn--primary" onClick={toggleSimulation}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
                {isPlaying ? 'Pausar' : particle.isComplete ? 'Repetir' : 'Iniciar recorrido'}
              </button>
              <button type="button" className="btn btn--secondary" onClick={resetSimulation}>
                Reiniciar
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.results} aria-label="Resultados del recorrido">
        <article className={`${styles.resultCard} ${styles.speedCard}`}>
          <span className={styles.resultTag}>Rapidez media · solo importa cuánto camino recorrió</span>
          <div className={styles.resultValue}>
            {result.avgSpeed.toFixed(2)} <small>m/s</small>
          </div>
          <div className={styles.formula} dangerouslySetInnerHTML={{
            __html: renderLatex(
              `\\text{Rapidez media} = \\frac{\\text{distancia total}}{\\text{tiempo total}} = \\frac{${result.totalDistance.toFixed(1)}\\text{ m}}{${result.totalTime.toFixed(1)}\\text{ s}} = ${result.avgSpeed.toFixed(2)}\\text{ m/s}`
            ),
          }} />
          <p>La rapidez no lleva dirección.</p>
        </article>

        <article className={`${styles.resultCard} ${styles.velocityCard}`}>
          <span className={styles.resultTag}>Velocidad media · importa dónde terminó</span>
          <div className={styles.resultValue}>
            {result.avgVelocityMag.toFixed(2)} <small>m/s</small>
          </div>
          <div className={styles.formula} dangerouslySetInnerHTML={{
            __html: renderLatex(
              `\\text{Velocidad media} = \\frac{\\text{desplazamiento}}{\\text{tiempo total}} = \\frac{${result.displacementMagnitude.toFixed(1)}\\text{ m}}{${result.totalTime.toFixed(1)}\\text{ s}} = ${result.avgVelocityMag.toFixed(2)}\\text{ m/s}`
            ),
          }} />
          <p>{result.avgVelocityMag > 0 ? `Dirección: ${result.geographicRumbo}` : 'Dirección: no hay, porque terminó donde empezó.'}</p>
        </article>
      </section>

      <aside className={styles.takeaway}>
        <span className="material-symbols-outlined" aria-hidden="true">lightbulb</span>
        <p>{result.explanation}</p>
      </aside>
    </div>
  )
}
