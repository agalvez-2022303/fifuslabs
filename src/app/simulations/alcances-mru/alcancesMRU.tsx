import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  calcularEncuentro,
  calcularRangoPista,
  generarMarcasEscala,
  formatDistance,
  formatNumberCompact,
  type ResultadoCalculoMRU,
} from './alcancesMRU.utils'
import styles from './AlcancesMRU.module.css'

interface Preset {
  nombre: string
  xA0: number
  vA: number
  xB0: number
  vB: number
}

const PRESETS: Preset[] = [
  {
    nombre: 'Alcance clásico',
    xA0: 0,
    vA: 20,
    xB0: 100,
    vB: 10,
  },
  {
    nombre: 'Encuentro frontal (5 km)',
    xA0: 0,
    vA: 300,
    xB0: 5000,
    vB: -200,
  },
  {
    nombre: 'Paralelos (sin encuentro)',
    xA0: 0,
    vA: 10,
    xB0: 100,
    vB: 10,
  },
  {
    nombre: 'Móviles que se alejan',
    xA0: 0,
    vA: 5,
    xB0: 100,
    vB: 10,
  },
  {
    nombre: 'Persecución x₀ negativo',
    xA0: -200,
    vA: 40,
    xB0: 100,
    vB: 10,
  },
]

export default function AlcancesMRU(): JSX.Element {
  // Entradas como string
  const [strXA0, setStrXA0] = useState<string>('0')
  const [strVA, setStrVA] = useState<string>('20')
  const [strXB0, setStrXB0] = useState<string>('100')
  const [strVB, setStrVB] = useState<string>('10')

  // Errores de validación
  const [errXA0, setErrXA0] = useState<string | null>(null)
  const [errVA, setErrVA] = useState<string | null>(null)
  const [errXB0, setErrXB0] = useState<string | null>(null)
  const [errVB, setErrVB] = useState<string | null>(null)

  // Valores numéricos parseados
  const [numXA0, setNumXA0] = useState<number>(0)
  const [numVA, setNumVA] = useState<number>(20)
  const [numXB0, setNumXB0] = useState<number>(100)
  const [numVB, setNumVB] = useState<number>(10)

  // Control de simulación
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState<number>(0)
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1)

  // Estado del acordeón de configuración en móvil
  const [configOpen, setConfigOpen] = useState<boolean>(true)

  // Referencias para requestAnimationFrame con Delta Time
  const animFrameRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)

  // Preset seleccionado actual
  const [selectedPreset, setSelectedPreset] = useState<string>('Alcance clásico')

  // Validación y parseo de entradas
  const validateAndParse = useCallback((value: string, setterNum: (v: number) => void, setterErr: (e: string | null) => void) => {
    const trimmed = value.trim()
    if (trimmed === '' || trimmed === '-' || trimmed === '+' || trimmed === '.' || trimmed === '-.' || trimmed === '+.') {
      setterErr('Ingresa un número válido')
      return false
    }
    const parsed = Number(trimmed)
    if (isNaN(parsed) || !Number.isFinite(parsed)) {
      setterErr('Número inválido')
      return false
    }
    setterErr(null)
    setterNum(parsed)
    return true
  }, [])

  // Handlers para cambios de inputs
  const handleXA0Change = (val: string) => {
    setStrXA0(val)
    validateAndParse(val, setNumXA0, setErrXA0)
    resetSimulacion()
    setSelectedPreset('')
  }
  const handleVAChange = (val: string) => {
    setStrVA(val)
    validateAndParse(val, setNumVA, setErrVA)
    resetSimulacion()
    setSelectedPreset('')
  }
  const handleXB0Change = (val: string) => {
    setStrXB0(val)
    validateAndParse(val, setNumXB0, setErrXB0)
    resetSimulacion()
    setSelectedPreset('')
  }
  const handleVBChange = (val: string) => {
    setStrVB(val)
    validateAndParse(val, setNumVB, setErrVB)
    resetSimulacion()
    setSelectedPreset('')
  }

  // Cargar preset
  const aplicarPreset = (preset: Preset) => {
    setSelectedPreset(preset.nombre)
    setStrXA0(preset.xA0.toString())
    setStrVA(preset.vA.toString())
    setStrXB0(preset.xB0.toString())
    setStrVB(preset.vB.toString())

    setNumXA0(preset.xA0)
    setNumVA(preset.vA)
    setNumXB0(preset.xB0)
    setNumVB(preset.vB)

    setErrXA0(null)
    setErrVA(null)
    setErrXB0(null)
    setErrVB(null)

    resetSimulacion()
  }

  // Cálculo analítico del encuentro
  const resultado: ResultadoCalculoMRU = useMemo(() => {
    return calcularEncuentro(numXA0, numVA, numXB0, numVB)
  }, [numXA0, numVA, numXB0, numVB])

  // Cálculo del rango dinámico de la pista
  const rangoPista = useMemo(() => {
    return calcularRangoPista(numXA0, numVA, numXB0, numVB, resultado, 15)
  }, [numXA0, numVA, numXB0, numVB, resultado])

  // Marcas de la escala de la regla (5 marcas en móvil para no saturar)
  const marcasEscala = useMemo(() => {
    return generarMarcasEscala(rangoPista.min, rangoPista.max, 5)
  }, [rangoPista])

  // Posiciones actuales en tiempo real
  const currentPosA = numXA0 + numVA * tiempoTranscurrido
  const currentPosB = numXB0 + numVB * tiempoTranscurrido

  // Mapear posición (metros) a porcentaje en la pista (0% a 100%)
  const posToPercent = useCallback((x: number): number => {
    if (rangoPista.span <= 0) return 50
    const pct = ((x - rangoPista.min) / rangoPista.span) * 100
    return Math.max(0, Math.min(100, pct))
  }, [rangoPista])

  // Detección de proximidad visual para evitar superposición de etiquetas A y B
  const pctA = posToPercent(currentPosA)
  const pctB = posToPercent(currentPosB)
  const estanMuyCercanos = Math.abs(pctA - pctB) < 7

  // Arrastre por puntero de vehículos sobre la pista antes de dar Play
  const draggingVehicleRef = useRef<'A' | 'B' | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  const handleVehiclePointerDown = (vehicle: 'A' | 'B', e: React.PointerEvent) => {
    if (isPlaying || tiempoTranscurrido > 0) return
    draggingVehicleRef.current = vehicle
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handleTrackPointerMove = (e: React.PointerEvent) => {
    if (!draggingVehicleRef.current || !trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const padding = 24
    const usableWidth = rect.width - 2 * padding
    if (usableWidth <= 0) return
    const clientX = e.clientX - rect.left - padding
    const pct = Math.max(0, Math.min(1, clientX / usableWidth))
    const newX = Math.round(rangoPista.min + pct * rangoPista.span)

    if (draggingVehicleRef.current === 'A') {
      setNumXA0(newX)
      setStrXA0(newX.toString())
      setErrXA0(null)
    } else if (draggingVehicleRef.current === 'B') {
      setNumXB0(newX)
      setStrXB0(newX.toString())
      setErrXB0(null)
    }
  }

  const handleTrackPointerUp = () => {
    draggingVehicleRef.current = null
  }

  // Reiniciar simulación
  const resetSimulacion = useCallback(() => {
    setIsPlaying(false)
    setIsPaused(false)
    setTiempoTranscurrido(0)
    lastTimeRef.current = null
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
  }, [])

  // Loop de animación con requestAnimationFrame y Delta Time
  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
      return
    }

    const tFin = resultado.hayEncuentro && resultado.tiempo !== null && resultado.tiempo > 0
      ? resultado.tiempo
      : 30

    const loop = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp
      }

      const deltaSec = ((timestamp - lastTimeRef.current) / 1000) * speedMultiplier
      lastTimeRef.current = timestamp

      setTiempoTranscurrido((prevT) => {
        const nextT = prevT + deltaSec

        // Verificar si se alcanzó el tiempo de encuentro
        if (resultado.hayEncuentro && resultado.tiempo !== null && resultado.tiempo > 0) {
          if (nextT >= resultado.tiempo) {
            setIsPlaying(false)
            setIsPaused(false)
            return resultado.tiempo
          }
        }

        // Verificar si ambos móviles salieron del rango visible si no hay encuentro
        const posA = numXA0 + numVA * nextT
        const posB = numXB0 + numVB * nextT
        const margenFuera = rangoPista.span * 0.15
        const aFuera = posA < rangoPista.min - margenFuera || posA > rangoPista.max + margenFuera
        const bFuera = posB < rangoPista.min - margenFuera || posB > rangoPista.max + margenFuera

        if (aFuera && bFuera) {
          setIsPlaying(false)
          setIsPaused(false)
          return nextT
        }

        if (nextT >= tFin) {
          setIsPlaying(false)
          setIsPaused(false)
          return tFin
        }

        return nextT
      })

      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
      }
      animFrameRef.current = null
      lastTimeRef.current = null
    }
  }, [isPlaying, speedMultiplier, resultado, numXA0, numVA, numXB0, numVB, rangoPista])

  // Determinar estado actual de la simulación
  const statusLabel = useMemo(() => {
    if (resultado.hayEncuentro && resultado.tiempo !== null && resultado.tiempo > 0 && Math.abs(tiempoTranscurrido - resultado.tiempo) < 0.05) {
      return resultado.esSentidosOpuestos ? '¡Encuentro!' : '¡Alcance!'
    }
    if (isPlaying) return 'Corriendo'
    if (isPaused) return 'Pausado'
    return 'Listo'
  }, [isPlaying, isPaused, tiempoTranscurrido, resultado])

  // Datos para la gráfica x-t
  const graphDuration = useMemo(() => {
    if (resultado.hayEncuentro && resultado.tiempo !== null && resultado.tiempo > 0) {
      return Math.max(resultado.tiempo * 1.3, 5)
    }
    return 15
  }, [resultado])

  const graphWidth = 500
  const graphHeight = 150
  const graphPadX = 38
  const graphPadY = 16

  const getGraphCoords = useCallback((t: number, x: number) => {
    const normT = Math.max(0, Math.min(1, t / graphDuration))
    const normX = Math.max(0, Math.min(1, (x - rangoPista.min) / (rangoPista.span || 1)))
    const gx = graphPadX + normT * (graphWidth - graphPadX - 12)
    const gy = graphHeight - graphPadY - normX * (graphHeight - graphPadY * 2)
    return { gx, gy }
  }, [graphDuration, rangoPista])

  const pathA = useMemo(() => {
    const p0 = getGraphCoords(0, numXA0)
    const p1 = getGraphCoords(graphDuration, numXA0 + numVA * graphDuration)
    return `M ${p0.gx} ${p0.gy} L ${p1.gx} ${p1.gy}`
  }, [getGraphCoords, numXA0, numVA, graphDuration])

  const pathB = useMemo(() => {
    const p0 = getGraphCoords(0, numXB0)
    const p1 = getGraphCoords(graphDuration, numXB0 + numVB * graphDuration)
    return `M ${p0.gx} ${p0.gy} L ${p1.gx} ${p1.gy}`
  }, [getGraphCoords, numXB0, numVB, graphDuration])

  const encPointGraph = useMemo(() => {
    if (resultado.hayEncuentro && resultado.tiempo !== null && resultado.puntoEncuentro !== null && resultado.tiempo > 0) {
      return getGraphCoords(resultado.tiempo, resultado.puntoEncuentro)
    }
    return null
  }, [resultado, getGraphCoords])

  const curPointA = getGraphCoords(tiempoTranscurrido, currentPosA)
  const curPointB = getGraphCoords(tiempoTranscurrido, currentPosB)

  const hasAnyInputError = Boolean(errXA0 || errVA || errXB0 || errVB)

  return (
    <div className={styles.container}>
      {/* Barra de Preajustes Táctiles */}
      <div className={styles.presetsBar} aria-label="Preajustes rápidos">
        <div className={styles.presetGroup}>
          <span className={styles.presetLabel}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>tune</span>
            Preajustes:
          </span>
          {PRESETS.map((p) => (
            <button
              key={p.nombre}
              type="button"
              className={`${styles.presetBtn} ${selectedPreset === p.nombre ? styles.presetBtnActive : ''}`}
              onClick={() => aplicarPreset(p)}
            >
              {p.nombre}
            </button>
          ))}
        </div>
        <span className={styles.headerBadge}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>compare_arrows</span>
          MRU 1D
        </span>
      </div>

      {/* Main Layout: Mobile Stack (Telemetría -> Pista -> Controles -> Config colapsable -> Gráfica) */}
      <div className={styles.mainLayout}>
        {/* Panel de Información y Telemetría */}
        <section className={styles.panel} aria-label="Telemetría de la simulación">
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>
              <span className="material-symbols-outlined" style={{ color: 'var(--corporate)', fontSize: '18px' }}>speed</span>
              Telemetría
            </h2>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'var(--sub-card-bg)',
                border: '1px solid var(--border-neutral)',
                borderRadius: '999px',
                padding: '3px 8px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: isPlaying ? 'var(--success)' : isPaused ? 'var(--warning)' : 'var(--text-secondary)',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '999px',
                  background: isPlaying ? 'var(--success)' : isPaused ? 'var(--warning)' : 'var(--slate-sub)',
                  display: 'inline-block',
                }}
              />
              {statusLabel}
            </div>
          </div>

          {/* Métricas numéricas */}
          <div className={styles.telemetryGrid}>
            <div className={styles.telemetryCard}>
              <span className={styles.telemetryLabel}>Tiempo</span>
              <span className={styles.telemetryValue}>{tiempoTranscurrido.toFixed(2)} s</span>
            </div>
            <div className={styles.telemetryCard} style={{ borderColor: 'rgba(37, 99, 235, 0.35)', background: 'rgba(37, 99, 235, 0.04)' }}>
              <span className={styles.telemetryLabel} style={{ color: 'var(--vector-a)' }}>Posición A</span>
              <span className={styles.telemetryValue} style={{ color: 'var(--vector-a)' }}>
                {formatDistance(currentPosA, 1)}
              </span>
            </div>
            <div className={styles.telemetryCard} style={{ borderColor: 'rgba(200, 169, 50, 0.4)', background: 'rgba(200, 169, 50, 0.04)' }}>
              <span className={styles.telemetryLabel} style={{ color: 'var(--gold)' }}>Posición B</span>
              <span className={styles.telemetryValue} style={{ color: 'var(--gold)' }}>
                {formatDistance(currentPosB, 1)}
              </span>
            </div>
          </div>

          {/* Resultado analítico */}
          <div
            className={`${styles.resultBox} ${
              resultado.hayEncuentro
                ? styles.resultSuccess
                : resultado.regimen === 'paralelos'
                ? styles.resultWarning
                : styles.resultNeutral
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '20px',
                color: resultado.hayEncuentro ? 'var(--success)' : resultado.regimen === 'paralelos' ? 'var(--warning)' : 'var(--text-muted)',
                flexShrink: 0,
              }}
            >
              {resultado.hayEncuentro ? 'check_circle' : 'info'}
            </span>
            <div>
              <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                Resolución Analítica
              </div>
              <div style={{ marginTop: '2px', fontSize: 'var(--text-xs)', fontWeight: 600, lineHeight: 1.4 }}>
                {resultado.mensaje}
              </div>
            </div>
          </div>
        </section>

        {/* Pista Visual Dinámica */}
        <section className={styles.panel} aria-label="Pista visual de movimiento">
          <div
            ref={trackRef}
            className={styles.trackArea}
            onPointerMove={handleTrackPointerMove}
            onPointerUp={handleTrackPointerUp}
            onPointerCancel={handleTrackPointerUp}
          >
            {/* Carril */}
            <div className={styles.trackRail}>
              <div className={styles.trackCenterLine} />
            </div>

            {/* Marca Posición Inicial A */}
            <div
              className={styles.markerInitialA}
              style={{ left: `calc(24px + (100% - 48px) * ${posToPercent(numXA0) / 100})` }}
              title={`Posición inicial A: ${formatDistance(numXA0, 2)}`}
            />

            {/* Marca Posición Inicial B */}
            <div
              className={styles.markerInitialB}
              style={{ left: `calc(24px + (100% - 48px) * ${posToPercent(numXB0) / 100})` }}
              title={`Posición inicial B: ${formatDistance(numXB0, 2)}`}
            />

            {/* Marca Punto de Encuentro */}
            {resultado.hayEncuentro && resultado.puntoEncuentro !== null && resultado.tiempo !== null && resultado.tiempo > 0 && (
              <div
                className={styles.markerEncounter}
                style={{ left: `calc(24px + (100% - 48px) * ${posToPercent(resultado.puntoEncuentro) / 100})` }}
              >
                <span className={styles.markerEncounterBadge}>
                  ★ {resultado.esSentidosOpuestos ? 'Cruce' : 'Alcance'} ({formatDistance(resultado.puntoEncuentro, 1)})
                </span>
              </div>
            )}

            {/* Vehículo A */}
            <div
              className={styles.movilVehicle}
              style={{
                left: `calc(24px + (100% - 48px) * ${pctA / 100})`,
                top: estanMuyCercanos ? '30px' : '48px',
                cursor: !isPlaying && tiempoTranscurrido === 0 ? 'grab' : 'default',
              }}
              onPointerDown={(e) => handleVehiclePointerDown('A', e)}
              title={!isPlaying && tiempoTranscurrido === 0 ? 'Arrastra para cambiar x₀A' : ''}
            >
              <div className={styles.movilAvatarA}>
                A
                {numVA !== 0 && (
                  <span className={styles.directionArrow}>
                    {numVA > 0 ? '→' : '←'}
                  </span>
                )}
              </div>
              <div className={styles.movilTag} style={{ background: 'var(--vector-a)' }}>
                {formatDistance(currentPosA, 1)}
              </div>
            </div>

            {/* Vehículo B */}
            <div
              className={styles.movilVehicle}
              style={{
                left: `calc(24px + (100% - 48px) * ${pctB / 100})`,
                top: estanMuyCercanos ? '68px' : '48px',
                cursor: !isPlaying && tiempoTranscurrido === 0 ? 'grab' : 'default',
              }}
              onPointerDown={(e) => handleVehiclePointerDown('B', e)}
              title={!isPlaying && tiempoTranscurrido === 0 ? 'Arrastra para cambiar x₀B' : ''}
            >
              <div className={styles.movilAvatarB}>
                B
                {numVB !== 0 && (
                  <span className={styles.directionArrow}>
                    {numVB > 0 ? '→' : '←'}
                  </span>
                )}
              </div>
              <div className={styles.movilTag} style={{ background: '#b45309' }}>
                {formatDistance(currentPosB, 1)}
              </div>
            </div>

            {/* Regla dinámica */}
            <div className={styles.rulerTrack}>
              {marcasEscala.map((m) => (
                <React.Fragment key={m.valor}>
                  <div className={styles.rulerTick} style={{ left: `${m.posicionPorcentaje}%` }} />
                  <span className={styles.rulerLabel} style={{ left: `${m.posicionPorcentaje}%` }}>
                    {m.label}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Barra de Controles Táctiles y Velocidad */}
          <div className={styles.controlsBar}>
            <div className={styles.btnGroup}>
              {!isPlaying ? (
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => {
                    if (hasAnyInputError) return
                    setIsPlaying(true)
                    setIsPaused(false)
                  }}
                  disabled={hasAnyInputError}
                  aria-label="Iniciar simulación"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>play_arrow</span>
                  {isPaused ? 'Reanudar' : 'Iniciar'}
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => {
                    setIsPlaying(false)
                    setIsPaused(true)
                  }}
                  aria-label="Pausar simulación"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>pause</span>
                  Pausar
                </button>
              )}

              <button
                type="button"
                className={styles.btnReset}
                onClick={resetSimulacion}
                aria-label="Reiniciar simulación"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>replay</span>
                Reiniciar
              </button>
            </div>

            {/* Multiplicadores de velocidad táctiles */}
            <div className={styles.speedGroup} role="group" aria-label="Velocidad de simulación">
              <span className={styles.speedLabel}>Velocidad:</span>
              {[0.5, 1, 2, 5, 10].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  className={`${styles.speedBtn} ${speedMultiplier === spd ? styles.speedBtnActive : ''}`}
                  onClick={() => setSpeedMultiplier(spd)}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Panel Colapsable de Configuración de Móviles */}
        <section className={styles.panel} aria-label="Configuración de móviles">
          <div className={styles.panelHeader}>
            <button
              type="button"
              className={styles.accordionToggle}
              onClick={() => setConfigOpen((prev) => !prev)}
              aria-expanded={configOpen}
            >
              <h2 className={styles.panelTitle}>
                <span className="material-symbols-outlined" style={{ color: 'var(--corporate)', fontSize: '18px' }}>tune</span>
                Configuración de Móviles
              </h2>
              <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)' }}>
                {configOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>

          {configOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Móvil A */}
              <div className={`${styles.movilCard} ${styles.movilCardA}`}>
                <div className={styles.movilHeader}>
                  <div className={styles.movilTitleGroup}>
                    <span className={styles.movilBadgeA}>A</span>
                    <strong style={{ color: 'var(--vector-a)', fontSize: 'var(--text-xs)' }}>Móvil A (Azul)</strong>
                  </div>
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {numVA >= 0 ? 'Dirección +' : 'Dirección −'}
                  </span>
                </div>

                <div className={styles.inputGrid}>
                  <div className={styles.inputGroup}>
                    <label htmlFor="input-xa0" className={styles.inputLabel}>
                      <span>x₀ (m)</span>
                    </label>
                    <input
                      id="input-xa0"
                      type="text"
                      inputMode="decimal"
                      value={strXA0}
                      onChange={(e) => handleXA0Change(e.target.value)}
                      className={`${styles.inputField} ${errXA0 ? styles.inputFieldError : ''}`}
                      placeholder="0"
                    />
                    {errXA0 && <span className={styles.errorText}>{errXA0}</span>}
                  </div>

                  <div className={styles.inputGroup}>
                    <label htmlFor="input-va" className={styles.inputLabel}>
                      <span>v (m/s)</span>
                    </label>
                    <input
                      id="input-va"
                      type="text"
                      inputMode="decimal"
                      value={strVA}
                      onChange={(e) => handleVAChange(e.target.value)}
                      className={`${styles.inputField} ${errVA ? styles.inputFieldError : ''}`}
                      placeholder="20"
                    />
                    {errVA && <span className={styles.errorText}>{errVA}</span>}
                  </div>
                </div>
              </div>

              {/* Móvil B */}
              <div className={`${styles.movilCard} ${styles.movilCardB}`}>
                <div className={styles.movilHeader}>
                  <div className={styles.movilTitleGroup}>
                    <span className={styles.movilBadgeB}>B</span>
                    <strong style={{ color: 'var(--gold)', fontSize: 'var(--text-xs)' }}>Móvil B (Dorado)</strong>
                  </div>
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {numVB >= 0 ? 'Dirección +' : 'Dirección −'}
                  </span>
                </div>

                <div className={styles.inputGrid}>
                  <div className={styles.inputGroup}>
                    <label htmlFor="input-xb0" className={styles.inputLabel}>
                      <span>x₀ (m)</span>
                    </label>
                    <input
                      id="input-xb0"
                      type="text"
                      inputMode="decimal"
                      value={strXB0}
                      onChange={(e) => handleXB0Change(e.target.value)}
                      className={`${styles.inputField} ${errXB0 ? styles.inputFieldError : ''}`}
                      placeholder="100"
                    />
                    {errXB0 && <span className={styles.errorText}>{errXB0}</span>}
                  </div>

                  <div className={styles.inputGroup}>
                    <label htmlFor="input-vb" className={styles.inputLabel}>
                      <span>v (m/s)</span>
                    </label>
                    <input
                      id="input-vb"
                      type="text"
                      inputMode="decimal"
                      value={strVB}
                      onChange={(e) => handleVBChange(e.target.value)}
                      className={`${styles.inputField} ${errVB ? styles.inputFieldError : ''}`}
                      placeholder="10"
                    />
                    {errVB && <span className={styles.errorText}>{errVB}</span>}
                  </div>
                </div>
              </div>

              {/* Ecuaciones en tiempo real */}
              <div
                style={{
                  background: 'var(--sub-card-bg)',
                  border: '1px solid var(--border-neutral)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 10px',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ color: 'var(--vector-a)' }}>
                  x_A(t) = {formatNumberCompact(numXA0)} + ({formatNumberCompact(numVA)})·t
                </div>
                <div style={{ color: 'var(--gold)' }}>
                  x_B(t) = {formatNumberCompact(numXB0)} + ({formatNumberCompact(numVB)})·t
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Gráfica Real-time x-t */}
        <section className={styles.panel} aria-label="Diagrama posición contra tiempo">
          <div className={styles.graphContainer}>
            <div className={styles.graphHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: 'var(--corporate-dark)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>show_chart</span>
                Gráfica Posición - Tiempo (x vs t)
              </div>
              <div className={styles.graphLegend}>
                <div className={styles.legendItem}>
                  <span className={styles.legendColorA} />
                  <span>x_A</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendColorB} />
                  <span>x_B</span>
                </div>
              </div>
            </div>

            <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <svg
                viewBox={`0 0 ${graphWidth} ${graphHeight}`}
                style={{ width: '100%', height: 'auto', display: 'block', background: '#ffffff', borderRadius: '6px', border: '1px solid var(--border-light)' }}
                aria-label="Gráfica x-t interactiva"
              >
                {/* Grid lines */}
                <line x1={graphPadX} y1={graphPadY} x2={graphPadX} y2={graphHeight - graphPadY} stroke="#cbd5e1" strokeWidth="1.5" />
                <line x1={graphPadX} y1={graphHeight - graphPadY} x2={graphWidth - 12} y2={graphHeight - graphPadY} stroke="#cbd5e1" strokeWidth="1.5" />

                {/* Etiquetas */}
                <text x={graphPadX - 4} y={graphPadY + 10} fill="var(--text-muted)" fontSize="9" textAnchor="end" fontFamily="var(--font-mono)">
                  {formatDistance(rangoPista.max, 1)}
                </text>
                <text x={graphPadX - 4} y={graphHeight - graphPadY} fill="var(--text-muted)" fontSize="9" textAnchor="end" fontFamily="var(--font-mono)">
                  {formatDistance(rangoPista.min, 1)}
                </text>
                <text x={graphWidth - 12} y={graphHeight - 3} fill="var(--text-muted)" fontSize="9" textAnchor="end" fontFamily="var(--font-mono)">
                  {graphDuration.toFixed(0)} s
                </text>
                <text x={graphPadX} y={graphHeight - 3} fill="var(--text-muted)" fontSize="9" textAnchor="start" fontFamily="var(--font-mono)">
                  0 s
                </text>

                {/* Trayectoria A */}
                <path d={pathA} fill="none" stroke="var(--vector-a)" strokeWidth="2.5" strokeLinecap="round" />

                {/* Trayectoria B */}
                <path d={pathB} fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" />

                {/* Punto de Encuentro Intersección */}
                {encPointGraph && (
                  <g>
                    <circle cx={encPointGraph.gx} cy={encPointGraph.gy} r="4.5" fill="var(--success)" stroke="#ffffff" strokeWidth="2" />
                    <text x={encPointGraph.gx + 6} y={encPointGraph.gy - 4} fill="var(--success)" fontSize="9" fontWeight="bold" fontFamily="var(--font-mono)">
                      ({resultado.tiempo?.toFixed(1)}s, {formatDistance(resultado.puntoEncuentro || 0, 1)})
                    </text>
                  </g>
                )}

                {/* Puntos Actuales Móviles */}
                <circle cx={curPointA.gx} cy={curPointA.gy} r="4" fill="var(--vector-a)" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx={curPointB.gx} cy={curPointB.gy} r="4" fill="var(--gold)" stroke="#ffffff" strokeWidth="1.5" />

                {/* Línea vertical de tiempo actual */}
                <line
                  x1={curPointA.gx}
                  y1={graphPadY}
                  x2={curPointA.gx}
                  y2={graphHeight - graphPadY}
                  stroke="rgba(11,28,48,0.25)"
                  strokeDasharray="3 3"
                />
              </svg>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export { AlcancesMRU as SimuladorMRU }