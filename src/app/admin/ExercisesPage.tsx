import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  createEjercicioSchema,
  patchEjercicioSchema,
  SIM_COMPONENT_SLUGS,
  type Ejercicio,
  type TemaConfig,
} from '@physicslab/shared-types'
import { adminApi } from './api'
import { useContent } from './ContentContext'
import {
  Confirm,
  Empty,
  Field,
  Icon,
  Loading,
  Message,
  PageHeading,
  Pagination,
  dateLabel,
} from './ui'

interface CustomParam {
  id: string
  key: string
  value: string
  unit: string
}

interface SpecificParams {
  // Vectores
  vectorMagnitud: string
  vectorAngulo: string
  vectorTipo: 'polar' | 'rectangular' | 'geografico'
  vectorVx: string
  vectorVy: string

  // Suma de Vectores
  sumaMagA: string
  sumaAngA: string
  sumaMagB: string
  sumaAngB: string

  // MRU
  mruX0: string
  mruV: string
  mruTiempo: string

  // MRUA (movimiento-aceleracion-constante)
  mruaX0: string
  mruaV0: string
  mruaA: string
  mruaTiempo: string

  // Alcances y Encuentros MRU
  alcanceVA: string
  alcanceVB: string
  alcanceDistancia: string
  alcanceSentido: 'alcance' | 'encuentro'

  // Tres Fuerzas en Equilibrio
  fuerzasF1: string
  fuerzasF2: string
  fuerzasAngulo: string
  fuerzasF3: string

  // Distancia vs Desplazamiento
  distTrayectoria: 'rectilinea' | 'circular' | 'ida-y-vuelta'
  distTramo1: string
  distTramo2: string
  distTiempo: string

  // Velocidad vs Rapidez
  velDistancia: string
  velDesplazamiento: string
  velTiempo: string

  // Variables personalizadas
  customParams: CustomParam[]
}

interface EjercicioFormState {
  temaSlug: string
  titulo: string
  dificultad: 'basico' | 'intermedio' | 'avanzado'
  enunciado: string
  respuesta: string
  solucionDetallada: string
  pistas: string
  estado: 'draft' | 'published'
  params: SpecificParams
}

const defaultSpecificParams = (slug = ''): SpecificParams => ({
  vectorMagnitud: slug === 'vectores' ? '15' : '',
  vectorAngulo: slug === 'vectores' ? '45' : '',
  vectorTipo: 'polar',
  vectorVx: '',
  vectorVy: '',

  sumaMagA: slug === 'suma-vectores' ? '15' : '',
  sumaAngA: slug === 'suma-vectores' ? '30' : '',
  sumaMagB: slug === 'suma-vectores' ? '20' : '',
  sumaAngB: slug === 'suma-vectores' ? '120' : '',

  mruX0: slug === 'mru' ? '0' : '',
  mruV: slug === 'mru' ? '25' : '',
  mruTiempo: '',

  mruaX0: slug === 'movimiento-aceleracion-constante' ? '0' : '',
  mruaV0: slug === 'movimiento-aceleracion-constante' ? '5' : '',
  mruaA: slug === 'movimiento-aceleracion-constante' ? '2' : '',
  mruaTiempo: '',

  alcanceVA: slug === 'alcances-mru' || slug === 'alcances-encuentros' ? '30' : '',
  alcanceVB: slug === 'alcances-mru' || slug === 'alcances-encuentros' ? '20' : '',
  alcanceDistancia: slug === 'alcances-mru' || slug === 'alcances-encuentros' ? '500' : '',
  alcanceSentido: 'alcance',

  fuerzasF1: slug === 'tres-fuerzas-equilibrio' ? '50' : '',
  fuerzasF2: slug === 'tres-fuerzas-equilibrio' ? '70' : '',
  fuerzasAngulo: slug === 'tres-fuerzas-equilibrio' ? '60' : '',
  fuerzasF3: '',

  distTrayectoria: 'rectilinea',
  distTramo1: slug === 'distancia-desplazamiento' ? '10' : '',
  distTramo2: slug === 'distancia-desplazamiento' ? '5' : '',
  distTiempo: slug === 'distancia-desplazamiento' ? '4' : '',

  velDistancia: slug === 'velocidad-rapidez' ? '100' : '',
  velDesplazamiento: slug === 'velocidad-rapidez' ? '60' : '',
  velTiempo: slug === 'velocidad-rapidez' ? '10' : '',

  customParams: [],
})

function buildParametros(slug: string, p: SpecificParams): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const toNum = (val: string) => {
    const trimmed = val.trim()
    if (!trimmed) return undefined
    const n = Number(trimmed)
    return isNaN(n) ? trimmed : n
  }

  if (slug === 'vectores') {
    if (p.vectorMagnitud) result['magnitud'] = toNum(p.vectorMagnitud)
    if (p.vectorAngulo) result['angulo'] = toNum(p.vectorAngulo)
    result['tipoCoordenadas'] = p.vectorTipo
    if (p.vectorVx) result['vx'] = toNum(p.vectorVx)
    if (p.vectorVy) result['vy'] = toNum(p.vectorVy)
  } else if (slug === 'suma-vectores') {
    if (p.sumaMagA) result['magnitudA'] = toNum(p.sumaMagA)
    if (p.sumaAngA) result['anguloA'] = toNum(p.sumaAngA)
    if (p.sumaMagB) result['magnitudB'] = toNum(p.sumaMagB)
    if (p.sumaAngB) result['anguloB'] = toNum(p.sumaAngB)
  } else if (slug === 'mru') {
    if (p.mruX0 !== '') result['x0'] = toNum(p.mruX0)
    if (p.mruV) result['v'] = toNum(p.mruV)
    if (p.mruTiempo) result['t'] = toNum(p.mruTiempo)
  } else if (slug === 'movimiento-aceleracion-constante') {
    if (p.mruaX0 !== '') result['x0'] = toNum(p.mruaX0)
    if (p.mruaV0 !== '') result['v0'] = toNum(p.mruaV0)
    if (p.mruaA !== '') result['a'] = toNum(p.mruaA)
    if (p.mruaTiempo) result['t'] = toNum(p.mruaTiempo)
  } else if (slug === 'alcances-mru' || slug === 'alcances-encuentros') {
    if (p.alcanceVA) result['vA'] = toNum(p.alcanceVA)
    if (p.alcanceVB) result['vB'] = toNum(p.alcanceVB)
    if (p.alcanceDistancia) result['distanciaInicial'] = toNum(p.alcanceDistancia)
    result['modalidad'] = p.alcanceSentido
  } else if (slug === 'tres-fuerzas-equilibrio') {
    if (p.fuerzasF1) result['f1'] = toNum(p.fuerzasF1)
    if (p.fuerzasF2) result['f2'] = toNum(p.fuerzasF2)
    if (p.fuerzasAngulo) result['anguloEntreFuerzas'] = toNum(p.fuerzasAngulo)
    if (p.fuerzasF3) result['f3'] = toNum(p.fuerzasF3)
  } else if (slug === 'distancia-desplazamiento') {
    result['trayectoria'] = p.distTrayectoria
    if (p.distTramo1) result['tramo1'] = toNum(p.distTramo1)
    if (p.distTramo2) result['tramo2'] = toNum(p.distTramo2)
    if (p.distTiempo) result['tiempo'] = toNum(p.distTiempo)
  } else if (slug === 'velocidad-rapidez') {
    if (p.velDistancia) result['distanciaTotal'] = toNum(p.velDistancia)
    if (p.velDesplazamiento) result['desplazamiento'] = toNum(p.velDesplazamiento)
    if (p.velTiempo) result['tiempo'] = toNum(p.velTiempo)
  }

  p.customParams.forEach(cp => {
    const k = cp.key.trim()
    if (k) {
      const v = cp.value.trim()
      const n = Number(v)
      result[k] = !isNaN(n) && v !== '' ? n : v
      if (cp.unit?.trim()) {
        result[`unidad_${k}`] = cp.unit.trim()
      }
    }
  })

  return result
}

function extractSpecificParams(slug: string, raw: Record<string, unknown> | null | undefined): SpecificParams {
  const base = defaultSpecificParams(slug)
  if (!raw || typeof raw !== 'object') return base

  const usedKeys = new Set<string>()
  const getStr = (k: string) => {
    if (raw[k] !== undefined && raw[k] !== null) {
      usedKeys.add(k)
      return String(raw[k])
    }
    return ''
  }

  if (slug === 'vectores') {
    if (raw['magnitud'] !== undefined) base.vectorMagnitud = getStr('magnitud')
    if (raw['angulo'] !== undefined) base.vectorAngulo = getStr('angulo')
    if (raw['tipoCoordenadas'] !== undefined) {
      base.vectorTipo = raw['tipoCoordenadas'] as 'polar' | 'rectangular' | 'geografico'
      usedKeys.add('tipoCoordenadas')
    }
    if (raw['vx'] !== undefined) base.vectorVx = getStr('vx')
    if (raw['vy'] !== undefined) base.vectorVy = getStr('vy')
  } else if (slug === 'suma-vectores') {
    if (raw['magnitudA'] !== undefined) base.sumaMagA = getStr('magnitudA')
    if (raw['anguloA'] !== undefined) base.sumaAngA = getStr('anguloA')
    if (raw['magnitudB'] !== undefined) base.sumaMagB = getStr('magnitudB')
    if (raw['anguloB'] !== undefined) base.sumaAngB = getStr('anguloB')
  } else if (slug === 'mru') {
    if (raw['x0'] !== undefined) base.mruX0 = getStr('x0')
    if (raw['v'] !== undefined) base.mruV = getStr('v')
    if (raw['t'] !== undefined) base.mruTiempo = getStr('t')
  } else if (slug === 'movimiento-aceleracion-constante') {
    if (raw['x0'] !== undefined) base.mruaX0 = getStr('x0')
    if (raw['v0'] !== undefined) base.mruaV0 = getStr('v0')
    if (raw['a'] !== undefined) base.mruaA = getStr('a')
    if (raw['t'] !== undefined) base.mruaTiempo = getStr('t')
  } else if (slug === 'alcances-mru' || slug === 'alcances-encuentros') {
    if (raw['vA'] !== undefined) base.alcanceVA = getStr('vA')
    if (raw['vB'] !== undefined) base.alcanceVB = getStr('vB')
    if (raw['distanciaInicial'] !== undefined) base.alcanceDistancia = getStr('distanciaInicial')
    else if (raw['distancia'] !== undefined) base.alcanceDistancia = getStr('distancia')
    if (raw['modalidad'] !== undefined) {
      base.alcanceSentido = raw['modalidad'] as 'alcance' | 'encuentro'
      usedKeys.add('modalidad')
    }
  } else if (slug === 'tres-fuerzas-equilibrio') {
    if (raw['f1'] !== undefined) base.fuerzasF1 = getStr('f1')
    if (raw['f2'] !== undefined) base.fuerzasF2 = getStr('f2')
    if (raw['anguloEntreFuerzas'] !== undefined) base.fuerzasAngulo = getStr('anguloEntreFuerzas')
    if (raw['f3'] !== undefined) base.fuerzasF3 = getStr('f3')
  } else if (slug === 'distancia-desplazamiento') {
    if (raw['trayectoria'] !== undefined) {
      base.distTrayectoria = raw['trayectoria'] as 'rectilinea' | 'circular' | 'ida-y-vuelta'
      usedKeys.add('trayectoria')
    }
    if (raw['tramo1'] !== undefined) base.distTramo1 = getStr('tramo1')
    if (raw['tramo2'] !== undefined) base.distTramo2 = getStr('tramo2')
    if (raw['tiempo'] !== undefined) base.distTiempo = getStr('tiempo')
  } else if (slug === 'velocidad-rapidez') {
    if (raw['distanciaTotal'] !== undefined) base.velDistancia = getStr('distanciaTotal')
    if (raw['desplazamiento'] !== undefined) base.velDesplazamiento = getStr('desplazamiento')
    if (raw['tiempo'] !== undefined) base.velTiempo = getStr('tiempo')
  }

  const customs: CustomParam[] = []
  for (const [k, v] of Object.entries(raw)) {
    if (!usedKeys.has(k) && !k.startsWith('unidad_')) {
      const unitKey = `unidad_${k}`
      const unit = typeof raw[unitKey] === 'string' ? (raw[unitKey] as string) : ''
      customs.push({
        id: Math.random().toString(36).slice(2, 9),
        key: k,
        value: String(v ?? ''),
        unit,
      })
    }
  }
  base.customParams = customs
  return base
}

const initialForm = (defaultTema = ''): EjercicioFormState => ({
  temaSlug: defaultTema,
  titulo: '',
  dificultad: 'basico',
  enunciado: '',
  respuesta: '',
  solucionDetallada: '',
  pistas: '',
  estado: 'published',
  params: defaultSpecificParams(defaultTema),
})

function ModuleParametersSection({
  slug,
  temaTitulo,
  params,
  onChange,
}: {
  slug: string
  temaTitulo?: string
  params: SpecificParams
  onChange: React.Dispatch<React.SetStateAction<EjercicioFormState>>
}) {
  const updateParams = (updater: (prev: SpecificParams) => SpecificParams) => {
    onChange(c => ({ ...c, params: updater(c.params) }))
  }

  const preview = useMemo(() => {
    return Object.entries(buildParametros(slug, params))
  }, [slug, params])

  return (
    <div
      style={{
        background: 'var(--s-low)',
        border: '1px solid var(--s-outline-2)',
        borderRadius: 8,
        padding: 16,
        display: 'grid',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="tune" />
          <div>
            <strong style={{ fontSize: 13, display: 'block' }}>
              Parámetros didácticos del simulador
            </strong>
            <small style={{ color: 'var(--s-ink-2)', fontSize: 11 }}>
              {temaTitulo ? `Valores iniciales para: ${temaTitulo}` : 'Configura las variables numéricas asociadas'}
            </small>
          </div>
        </div>
        <button
          type="button"
          className="studio-button"
          style={{ fontSize: 11, padding: '4px 8px' }}
          onClick={() =>
            updateParams(prev => ({
              ...defaultSpecificParams(slug),
              customParams: prev.customParams,
            }))
          }
        >
          <Icon name="restart_alt" />
          Restablecer
        </button>
      </div>

      {/* Inputs específicos según el módulo seleccionado */}
      {slug === 'vectores' && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Magnitud (|v|)" hint="Longitud del vector">
              <input
                type="number"
                step="any"
                placeholder="Ej. 15"
                value={params.vectorMagnitud}
                onChange={e => updateParams(p => ({ ...p, vectorMagnitud: e.target.value }))}
              />
            </Field>
            <Field label="Ángulo (θ en °)" hint="En grados sexagesimales">
              <input
                type="number"
                step="any"
                placeholder="Ej. 45"
                value={params.vectorAngulo}
                onChange={e => updateParams(p => ({ ...p, vectorAngulo: e.target.value }))}
              />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Field label="Tipo de coordenadas">
              <select
                value={params.vectorTipo}
                onChange={e =>
                  updateParams(p => ({
                    ...p,
                    vectorTipo: e.target.value as 'polar' | 'rectangular' | 'geografico',
                  }))
                }
              >
                <option value="polar">Polar (r, θ)</option>
                <option value="rectangular">Rectangular (x, y)</option>
                <option value="geografico">Geográfico (rumbo)</option>
              </select>
            </Field>
            <Field label="Componente X (vx) [Opcional]">
              <input
                type="number"
                step="any"
                placeholder="Calculado / opcional"
                value={params.vectorVx}
                onChange={e => updateParams(p => ({ ...p, vectorVx: e.target.value }))}
              />
            </Field>
            <Field label="Componente Y (vy) [Opcional]">
              <input
                type="number"
                step="any"
                placeholder="Calculado / opcional"
                value={params.vectorVy}
                onChange={e => updateParams(p => ({ ...p, vectorVy: e.target.value }))}
              />
            </Field>
          </div>
        </div>
      )}

      {slug === 'suma-vectores' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div
            style={{
              background: 'var(--s-card)',
              padding: 10,
              borderRadius: 6,
              border: '1px solid var(--s-outline-2)',
            }}
          >
            <strong style={{ fontSize: 12, color: 'var(--s-primary-1)', display: 'block', marginBottom: 6 }}>
              Vector A
            </strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Field label="Magnitud |A|">
                <input
                  type="number"
                  step="any"
                  placeholder="Ej. 15"
                  value={params.sumaMagA}
                  onChange={e => updateParams(p => ({ ...p, sumaMagA: e.target.value }))}
                />
              </Field>
              <Field label="Ángulo θA (°)">
                <input
                  type="number"
                  step="any"
                  placeholder="Ej. 30"
                  value={params.sumaAngA}
                  onChange={e => updateParams(p => ({ ...p, sumaAngA: e.target.value }))}
                />
              </Field>
            </div>
          </div>
          <div
            style={{
              background: 'var(--s-card)',
              padding: 10,
              borderRadius: 6,
              border: '1px solid var(--s-outline-2)',
            }}
          >
            <strong style={{ fontSize: 12, color: 'var(--s-primary-1)', display: 'block', marginBottom: 6 }}>
              Vector B
            </strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Field label="Magnitud |B|">
                <input
                  type="number"
                  step="any"
                  placeholder="Ej. 20"
                  value={params.sumaMagB}
                  onChange={e => updateParams(p => ({ ...p, sumaMagB: e.target.value }))}
                />
              </Field>
              <Field label="Ángulo θB (°)">
                <input
                  type="number"
                  step="any"
                  placeholder="Ej. 120"
                  value={params.sumaAngB}
                  onChange={e => updateParams(p => ({ ...p, sumaAngB: e.target.value }))}
                />
              </Field>
            </div>
          </div>
        </div>
      )}

      {slug === 'mru' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <Field label="Posición inicial (x₀)" hint="En metros (m)">
            <input
              type="number"
              step="any"
              placeholder="Ej. 0"
              value={params.mruX0}
              onChange={e => updateParams(p => ({ ...p, mruX0: e.target.value }))}
            />
          </Field>
          <Field label="Velocidad (v)" hint="En metros/segundo (m/s)">
            <input
              type="number"
              step="any"
              placeholder="Ej. 25"
              value={params.mruV}
              onChange={e => updateParams(p => ({ ...p, mruV: e.target.value }))}
            />
          </Field>
          <Field label="Tiempo t [Opcional]" hint="En segundos (s)">
            <input
              type="number"
              step="any"
              placeholder="Ej. 10"
              value={params.mruTiempo}
              onChange={e => updateParams(p => ({ ...p, mruTiempo: e.target.value }))}
            />
          </Field>
        </div>
      )}

      {slug === 'movimiento-aceleracion-constante' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
          <Field label="Posición x₀ (m)">
            <input
              type="number"
              step="any"
              placeholder="Ej. 0"
              value={params.mruaX0}
              onChange={e => updateParams(p => ({ ...p, mruaX0: e.target.value }))}
            />
          </Field>
          <Field label="Velocidad v₀ (m/s)">
            <input
              type="number"
              step="any"
              placeholder="Ej. 5"
              value={params.mruaV0}
              onChange={e => updateParams(p => ({ ...p, mruaV0: e.target.value }))}
            />
          </Field>
          <Field label="Aceleración a (m/s²)">
            <input
              type="number"
              step="any"
              placeholder="Ej. 2"
              value={params.mruaA}
              onChange={e => updateParams(p => ({ ...p, mruaA: e.target.value }))}
            />
          </Field>
          <Field label="Tiempo t (s) [Opcional]">
            <input
              type="number"
              step="any"
              placeholder="Ej. 8"
              value={params.mruaTiempo}
              onChange={e => updateParams(p => ({ ...p, mruaTiempo: e.target.value }))}
            />
          </Field>
        </div>
      )}

      {(slug === 'alcances-mru' || slug === 'alcances-encuentros') && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div
              style={{
                background: 'var(--s-card)',
                padding: 10,
                borderRadius: 6,
                border: '1px solid var(--s-outline-2)',
              }}
            >
              <strong style={{ fontSize: 12, color: 'var(--s-primary-1)', display: 'block', marginBottom: 6 }}>
                Móvil A (Perseguidor / Móvil 1)
              </strong>
              <Field label="Velocidad vA (m/s)">
                <input
                  type="number"
                  step="any"
                  placeholder="Ej. 30"
                  value={params.alcanceVA}
                  onChange={e => updateParams(p => ({ ...p, alcanceVA: e.target.value }))}
                />
              </Field>
            </div>
            <div
              style={{
                background: 'var(--s-card)',
                padding: 10,
                borderRadius: 6,
                border: '1px solid var(--s-outline-2)',
              }}
            >
              <strong style={{ fontSize: 12, color: 'var(--s-primary-1)', display: 'block', marginBottom: 6 }}>
                Móvil B (Objetivo / Móvil 2)
              </strong>
              <Field label="Velocidad vB (m/s)">
                <input
                  type="number"
                  step="any"
                  placeholder="Ej. 20"
                  value={params.alcanceVB}
                  onChange={e => updateParams(p => ({ ...p, alcanceVB: e.target.value }))}
                />
              </Field>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Distancia de separación inicial (m)">
              <input
                type="number"
                step="any"
                placeholder="Ej. 500"
                value={params.alcanceDistancia}
                onChange={e => updateParams(p => ({ ...p, alcanceDistancia: e.target.value }))}
              />
            </Field>
            <Field label="Modalidad cinemática">
              <select
                value={params.alcanceSentido}
                onChange={e =>
                  updateParams(p => ({
                    ...p,
                    alcanceSentido: e.target.value as 'alcance' | 'encuentro',
                  }))
                }
              >
                <option value="alcance">Alcance (móviles en el mismo sentido)</option>
                <option value="encuentro">Encuentro frontal (sentidos opuestos)</option>
              </select>
            </Field>
          </div>
        </div>
      )}

      {slug === 'tres-fuerzas-equilibrio' && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Field label="Fuerza 1 (F₁) en Newtons (N)">
              <input
                type="number"
                step="any"
                placeholder="Ej. 50"
                value={params.fuerzasF1}
                onChange={e => updateParams(p => ({ ...p, fuerzasF1: e.target.value }))}
              />
            </Field>
            <Field label="Fuerza 2 (F₂) en Newtons (N)">
              <input
                type="number"
                step="any"
                placeholder="Ej. 70"
                value={params.fuerzasF2}
                onChange={e => updateParams(p => ({ ...p, fuerzasF2: e.target.value }))}
              />
            </Field>
            <Field label="Ángulo entre fuerzas (θ en °)">
              <input
                type="number"
                step="any"
                placeholder="Ej. 60"
                value={params.fuerzasAngulo}
                onChange={e => updateParams(p => ({ ...p, fuerzasAngulo: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Fuerza equilibrante F₃ (N) [Opcional]">
            <input
              type="number"
              step="any"
              placeholder="Ej. 100"
              value={params.fuerzasF3}
              onChange={e => updateParams(p => ({ ...p, fuerzasF3: e.target.value }))}
            />
          </Field>
        </div>
      )}

      {slug === 'distancia-desplazamiento' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
          <Field label="Trayectoria">
            <select
              value={params.distTrayectoria}
              onChange={e =>
                updateParams(p => ({
                  ...p,
                  distTrayectoria: e.target.value as 'rectilinea' | 'circular' | 'ida-y-vuelta',
                }))
              }
            >
              <option value="rectilinea">Rectilínea</option>
              <option value="circular">Circular</option>
              <option value="ida-y-vuelta">Ida y vuelta</option>
            </select>
          </Field>
          <Field label="Tramo 1 (m)">
            <input
              type="number"
              step="any"
              placeholder="Ej. 10"
              value={params.distTramo1}
              onChange={e => updateParams(p => ({ ...p, distTramo1: e.target.value }))}
            />
          </Field>
          <Field label="Tramo 2 (m)">
            <input
              type="number"
              step="any"
              placeholder="Ej. 5"
              value={params.distTramo2}
              onChange={e => updateParams(p => ({ ...p, distTramo2: e.target.value }))}
            />
          </Field>
          <Field label="Tiempo (s) [Opcional]">
            <input
              type="number"
              step="any"
              placeholder="Ej. 4"
              value={params.distTiempo}
              onChange={e => updateParams(p => ({ ...p, distTiempo: e.target.value }))}
            />
          </Field>
        </div>
      )}

      {slug === 'velocidad-rapidez' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <Field label="Distancia recorrida d (m)">
            <input
              type="number"
              step="any"
              placeholder="Ej. 100"
              value={params.velDistancia}
              onChange={e => updateParams(p => ({ ...p, velDistancia: e.target.value }))}
            />
          </Field>
          <Field label="Desplazamiento Δx (m)">
            <input
              type="number"
              step="any"
              placeholder="Ej. 60"
              value={params.velDesplazamiento}
              onChange={e => updateParams(p => ({ ...p, velDesplazamiento: e.target.value }))}
            />
          </Field>
          <Field label="Tiempo total Δt (s)">
            <input
              type="number"
              step="any"
              placeholder="Ej. 10"
              value={params.velTiempo}
              onChange={e => updateParams(p => ({ ...p, velTiempo: e.target.value }))}
            />
          </Field>
        </div>
      )}

      {/* Variables o Parámetros Adicionales */}
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--s-outline-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--s-ink-1)' }}>
            Variables adicionales (opcionales)
          </span>
          <button
            type="button"
            className="studio-button"
            style={{ fontSize: 11, padding: '4px 10px' }}
            onClick={() =>
              updateParams(p => ({
                ...p,
                customParams: [
                  ...p.customParams,
                  { id: Math.random().toString(36).slice(2, 9), key: '', value: '', unit: '' },
                ],
              }))
            }
          >
            <Icon name="add" />
            Agregar variable
          </button>
        </div>

        {params.customParams.length > 0 && (
          <div style={{ display: 'grid', gap: 8, marginBottom: 8 }}>
            {params.customParams.map((cp, idx) => (
              <div
                key={cp.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr 0.8fr auto',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  placeholder="Nombre (ej. masa)"
                  value={cp.key}
                  onChange={e => {
                    const val = e.target.value
                    updateParams(p => ({
                      ...p,
                      customParams: p.customParams.map((item, i) =>
                        i === idx ? { ...item, key: val } : item
                      ),
                    }))
                  }}
                  style={{ fontSize: 12 }}
                />
                <input
                  type="text"
                  placeholder="Valor (ej. 10)"
                  value={cp.value}
                  onChange={e => {
                    const val = e.target.value
                    updateParams(p => ({
                      ...p,
                      customParams: p.customParams.map((item, i) =>
                        i === idx ? { ...item, value: val } : item
                      ),
                    }))
                  }}
                  style={{ fontSize: 12 }}
                />
                <input
                  type="text"
                  placeholder="Unidad (ej. kg)"
                  value={cp.unit}
                  onChange={e => {
                    const val = e.target.value
                    updateParams(p => ({
                      ...p,
                      customParams: p.customParams.map((item, i) =>
                        i === idx ? { ...item, unit: val } : item
                      ),
                    }))
                  }}
                  style={{ fontSize: 12 }}
                />
                <button
                  type="button"
                  className="studio-icon-button"
                  title="Eliminar variable"
                  style={{ color: 'var(--s-red, #ef4444)' }}
                  onClick={() =>
                    updateParams(p => ({
                      ...p,
                      customParams: p.customParams.filter((_, i) => i !== idx),
                    }))
                  }
                >
                  <Icon name="delete" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Previsualización en tiempo real */}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--s-outline-2)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--s-ink-2)', marginBottom: 6 }}>
          Valores que se enviarán al simulador:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {preview.length === 0 ? (
            <span style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--s-ink-2)' }}>
              Sin parámetros numéricos configurados aún.
            </span>
          ) : (
            preview.map(([k, v]) => (
              <span
                key={k}
                className="studio-chip"
                style={{ fontSize: 11, fontFamily: 'var(--s-mono)', background: 'var(--s-card)' }}
              >
                <strong>{k}</strong> = {String(v)}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function ExercisesPage() {
  const { temas, loading: loadingContent, error: contentError, reload: reloadContent } = useContent()
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Filters
  const [selectedModule, setSelectedModule] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Editor Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Ejercicio | null>(null)
  const [form, setForm] = useState<EjercicioFormState>(initialForm())

  // Delete Confirmation
  const [pendingDelete, setPendingDelete] = useState<Ejercicio | null>(null)

  // Simulator modules (topics that have an interactive simulation)
  const simModules = useMemo(() => {
    return temas.filter(
      tema =>
        tema.simComponentSlug ||
        SIM_COMPONENT_SLUGS.includes(tema.slug as (typeof SIM_COMPONENT_SLUGS)[number])
    )
  }, [temas])

  const defaultSlug = simModules[0]?.slug || temas[0]?.slug || ''

  const fetchEjercicios = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminApi.ejercicios()
      setEjercicios(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los ejercicios')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchEjercicios()
  }, [fetchEjercicios])

  // Filtered exercises
  const filtered = useMemo(() => {
    return ejercicios.filter(item => {
      if (selectedModule && item.temaSlug !== selectedModule) return false
      if (selectedDifficulty && item.dificultad !== selectedDifficulty) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = item.titulo.toLowerCase().includes(q)
        const matchesStatement = item.enunciado.toLowerCase().includes(q)
        const matchesResponse = item.respuesta.toLowerCase().includes(q)
        if (!matchesTitle && !matchesStatement && !matchesResponse) return false
      }
      return true
    })
  }, [ejercicios, selectedModule, selectedDifficulty, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const findTema = (slug: string): TemaConfig | undefined => {
    return temas.find(t => t.slug === slug)
  }

  function openCreate() {
    const slug = selectedModule || defaultSlug
    setEditingItem(null)
    setForm(initialForm(slug))
    setError('')
    setNotice('')
    setModalOpen(true)
  }

  function openEdit(item: Ejercicio) {
    setEditingItem(item)
    setForm({
      temaSlug: item.temaSlug,
      titulo: item.titulo,
      dificultad: item.dificultad,
      enunciado: item.enunciado,
      respuesta: item.respuesta,
      solucionDetallada: item.solucionDetallada ?? '',
      pistas: item.pistas ?? '',
      estado: item.estado,
      params: extractSpecificParams(item.temaSlug, item.parametros as Record<string, unknown>),
    })
    setError('')
    setNotice('')
    setModalOpen(true)
  }

  function handleModuleChange(slug: string) {
    setForm(current => ({
      ...current,
      temaSlug: slug,
      params: {
        ...defaultSpecificParams(slug),
        customParams: current.params.customParams,
      },
    }))
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setError('')
    setNotice('')

    const parsedParametros = buildParametros(form.temaSlug, form.params)

    const payload = {
      temaSlug: form.temaSlug,
      titulo: form.titulo.trim(),
      dificultad: form.dificultad,
      enunciado: form.enunciado.trim(),
      respuesta: form.respuesta.trim(),
      solucionDetallada: form.solucionDetallada.trim() || null,
      pistas: form.pistas.trim() || null,
      estado: form.estado,
      parametros: parsedParametros,
    }

    if (editingItem) {
      const check = patchEjercicioSchema.safeParse(payload)
      if (!check.success) {
        setError(check.error.issues.map(i => i.message).join(' · '))
        return
      }
      setBusy(true)
      try {
        const updated = await adminApi.patchEjercicio(editingItem.id, check.data)
        setEjercicios(prev => prev.map(item => (item.id === updated.id ? updated : item)))
        setNotice(`Ejercicio "${updated.titulo}" actualizado correctamente.`)
        setModalOpen(false)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'No se pudo actualizar el ejercicio')
      } finally {
        setBusy(false)
      }
    } else {
      const check = createEjercicioSchema.safeParse(payload)
      if (!check.success) {
        setError(check.error.issues.map(i => i.message).join(' · '))
        return
      }
      setBusy(true)
      try {
        const created = await adminApi.createEjercicio(check.data)
        setEjercicios(prev => [created, ...prev])
        setNotice(`Ejercicio "${created.titulo}" creado con éxito.`)
        setModalOpen(false)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'No se pudo guardar el ejercicio')
      } finally {
        setBusy(false)
      }
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return
    setBusy(true)
    setError('')
    try {
      await adminApi.removeEjercicio(pendingDelete.id)
      setEjercicios(prev => prev.filter(item => item.id !== pendingDelete.id))
      setNotice(`Ejercicio "${pendingDelete.titulo}" eliminado correctamente.`)
      setPendingDelete(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el ejercicio')
    } finally {
      setBusy(false)
    }
  }

  if (loadingContent && !temas.length) {
    return <Loading text="Cargando catálogo de módulos..." />
  }

  return (
    <div className="studio-page">
      <PageHeading
        title="Gestión de Ejercicios"
        description="Crea, organiza y administra problemas prácticos asignados a los módulos de simulación interactiva."
        eyebrow="EVALUACIÓN Y PRÁCTICA"
      >
        <button
          className="studio-button"
          onClick={() => {
            void reloadContent()
            void fetchEjercicios()
          }}
          disabled={loading || busy}
        >
          <Icon name="refresh" />
          Actualizar
        </button>
        <button className="studio-button primary" onClick={openCreate} disabled={busy}>
          <Icon name="add" />
          Nuevo ejercicio
        </button>
      </PageHeading>

      {notice && <Message success>{notice}</Message>}
      {error && <Message>{error}</Message>}
      {contentError && <Message>{contentError}</Message>}

      {/* Filter toolbar */}
      <section className="studio-card" style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <Field label="Filtrar por Módulo del Simulador">
            <select
              value={selectedModule}
              onChange={e => {
                setSelectedModule(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Todos los módulos ({simModules.length})</option>
              <optgroup label="Simuladores activos">
                {simModules.map(m => (
                  <option key={m.slug} value={m.slug}>
                    {m.titulo}
                  </option>
                ))}
              </optgroup>
              {temas.some(t => !simModules.includes(t)) && (
                <optgroup label="Otros temas">
                  {temas
                    .filter(t => !simModules.includes(t))
                    .map(t => (
                      <option key={t.slug} value={t.slug}>
                        {t.titulo}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </Field>

          <Field label="Nivel de Dificultad">
            <select
              value={selectedDifficulty}
              onChange={e => {
                setSelectedDifficulty(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Todas las dificultades</option>
              <option value="basico">Básico</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzado">Avanzado</option>
            </select>
          </Field>

          <Field label="Buscar ejercicio">
            <label className="studio-search-input" style={{ width: '100%' }}>
              <Icon name="search" />
              <input
                type="search"
                placeholder="Buscar por título o enunciado…"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
              />
            </label>
          </Field>
        </div>
      </section>

      {/* Exercises Table */}
      <section className="studio-card studio-table-card">
        <header className="studio-panel-heading">
          <div>
            <h2>
              <Icon name="quiz" />
              Ejercicios registrados
            </h2>
            <p>Problemas asignados a simuladores y temas didácticos</p>
          </div>
          <span className="studio-count">
            Total: {filtered.length} ejercicio{filtered.length !== 1 ? 's' : ''}
          </span>
        </header>

        {loading ? (
          <Loading text="Cargando ejercicios..." />
        ) : filtered.length === 0 ? (
          <Empty title="No hay ejercicios encontrados">
            <p>
              {ejercicios.length === 0
                ? 'Aún no se han creado ejercicios. Haz clic en "Nuevo ejercicio" para agregar el primero.'
                : 'No hay ejercicios que coincidan con los filtros seleccionados.'}
            </p>
            {ejercicios.length === 0 && (
              <button
                className="studio-button primary"
                style={{ marginTop: 12 }}
                onClick={openCreate}
              >
                <Icon name="add" />
                Crear primer ejercicio
              </button>
            )}
          </Empty>
        ) : (
          <>
            <div className="studio-table-scroll">
              <table className="studio-table">
                <thead>
                  <tr>
                    <th>Título y módulo</th>
                    <th>Dificultad</th>
                    <th>Enunciado</th>
                    <th>Respuesta esperada</th>
                    <th>Actualización</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(item => {
                    const tema = findTema(item.temaSlug)
                    const diffTone =
                      item.dificultad === 'basico'
                        ? 'tone-0'
                        : item.dificultad === 'intermedio'
                          ? 'tone-1'
                          : 'tone-3'
                    return (
                      <tr key={item.id}>
                        <td style={{ maxWidth: 240 }}>
                          <strong>{item.titulo}</strong>
                          <div style={{ marginTop: 4 }}>
                            <span className="studio-chip" title={tema?.descripcionCorta}>
                              <Icon name="science" />
                              {tema?.titulo || item.temaSlug}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`studio-chip ${diffTone}`} style={{ textTransform: 'capitalize' }}>
                            {item.dificultad}
                          </span>
                        </td>
                        <td style={{ maxWidth: 300, fontSize: 12 }}>
                          <span
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              color: 'var(--s-ink-2)',
                            }}
                            title={item.enunciado}
                          >
                            {item.enunciado}
                          </span>
                        </td>
                        <td style={{ maxWidth: 200, fontFamily: 'var(--s-mono)', fontSize: 12 }}>
                          <code style={{ background: 'var(--s-low)', padding: '2px 6px', borderRadius: 4 }}>
                            {item.respuesta}
                          </code>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--s-ink-2)' }}>
                          {dateLabel(item.updatedAt)}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="studio-icon-button"
                            title="Editar ejercicio"
                            onClick={() => openEdit(item)}
                          >
                            <Icon name="edit" />
                          </button>
                          <button
                            type="button"
                            className="studio-icon-button"
                            title="Eliminar ejercicio"
                            style={{ color: 'var(--s-red, #ef4444)' }}
                            onClick={() => setPendingDelete(item)}
                          >
                            <Icon name="delete" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <Pagination
                page={currentPage}
                pages={totalPages}
                total={filtered.length}
                pageSize={pageSize}
                onPage={setPage}
                onSize={s => {
                  setPageSize(s)
                  setPage(1)
                }}
              />
            )}
          </>
        )}
      </section>

      {/* Creation / Edit Modal */}
      {modalOpen && (
        <div className="studio-modal-backdrop" role="dialog" aria-modal="true">
          <div className="studio-modal" style={{ maxWidth: 760, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 id="studio-confirm-title">
              <Icon name={editingItem ? 'edit' : 'add_circle'} />
              {editingItem ? 'Editar ejercicio' : 'Crear nuevo ejercicio'}
            </h2>
            <p>
              Completa la información del problema y asígnalo al módulo correspondiente del simulador.
            </p>

            <form onSubmit={handleSave} style={{ display: 'grid', gap: 14, marginTop: 12 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)',
                  gap: 12,
                }}
              >
                <Field
                  label="Módulo del Simulador *"
                  hint="Selecciona el módulo interactivo que resuelve este ejercicio"
                >
                  <select
                    value={form.temaSlug}
                    onChange={e => handleModuleChange(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      -- Seleccionar módulo --
                    </option>
                    <optgroup label="Simuladores interactivos">
                      {simModules.map(m => (
                        <option key={m.slug} value={m.slug}>
                          {m.titulo} ({m.slug})
                        </option>
                      ))}
                    </optgroup>
                    {temas.some(t => !simModules.includes(t)) && (
                      <optgroup label="Otros temas didácticos">
                        {temas
                          .filter(t => !simModules.includes(t))
                          .map(t => (
                            <option key={t.slug} value={t.slug}>
                              {t.titulo}
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                </Field>

                <Field label="Nivel de dificultad *">
                  <select
                    value={form.dificultad}
                    onChange={e =>
                      setForm(c => ({
                        ...c,
                        dificultad: e.target.value as 'basico' | 'intermedio' | 'avanzado',
                      }))
                    }
                    required
                  >
                    <option value="basico">Básico</option>
                    <option value="intermedio">Intermedio</option>
                    <option value="avanzado">Avanzado</option>
                  </select>
                </Field>
              </div>

              <Field label="Título del ejercicio *">
                <input
                  type="text"
                  placeholder="Ej. Tiempo de alcance entre dos vehículos"
                  value={form.titulo}
                  onChange={e => setForm(c => ({ ...c, titulo: e.target.value }))}
                  required
                />
              </Field>

              <Field
                label="Enunciado / Descripción del problema *"
                hint="Describe detalladamente las condiciones iniciales y lo que se solicita calcular"
              >
                <textarea
                  rows={4}
                  placeholder="Ej. Un automóvil A parte del reposo con velocidad constante de 20 m/s desde el origen..."
                  value={form.enunciado}
                  onChange={e => setForm(c => ({ ...c, enunciado: e.target.value }))}
                  required
                />
              </Field>

              {/* Parámetros Específicos del Simulador (sin JSON) */}
              <ModuleParametersSection
                slug={form.temaSlug}
                temaTitulo={findTema(form.temaSlug)?.titulo}
                params={form.params}
                onChange={setForm}
              />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)',
                  gap: 12,
                }}
              >
                <Field
                  label="Respuesta o solución esperada *"
                  hint="Valor o expresión final esperada"
                >
                  <input
                    type="text"
                    placeholder="Ej. t = 12.5 s; x = 250 m"
                    value={form.respuesta}
                    onChange={e => setForm(c => ({ ...c, respuesta: e.target.value }))}
                    required
                  />
                </Field>

                <Field label="Estado de publicación">
                  <select
                    value={form.estado}
                    onChange={e =>
                      setForm(c => ({
                        ...c,
                        estado: e.target.value as 'draft' | 'published',
                      }))
                    }
                  >
                    <option value="published">Publicado</option>
                    <option value="draft">Borrador</option>
                  </select>
                </Field>
              </div>

              <Field
                label="Solución explicada paso a paso (Opcional)"
                hint="Desarrollo analítico o metodológico para la verificación del profesor"
              >
                <textarea
                  rows={3}
                  placeholder="Ej. 1) Plantear las ecuaciones de posición xA = vA * t y xB = d - vB * t..."
                  value={form.solucionDetallada}
                  onChange={e => setForm(c => ({ ...c, solucionDetallada: e.target.value }))}
                />
              </Field>

              <Field
                label="Pistas o sugerencias didácticas (Opcional)"
                hint="Orientación pedagógica para guiar la resolución"
              >
                <input
                  type="text"
                  placeholder="Ej. Recuerda considerar el sentido del vector velocidad del móvil B como negativo."
                  value={form.pistas}
                  onChange={e => setForm(c => ({ ...c, pistas: e.target.value }))}
                />
              </Field>

              <footer>
                <button
                  type="button"
                  className="studio-button"
                  onClick={() => setModalOpen(false)}
                  disabled={busy}
                >
                  Cancelar
                </button>
                <button type="submit" className="studio-button primary" disabled={busy}>
                  {busy ? 'Guardando…' : editingItem ? 'Actualizar ejercicio' : 'Crear ejercicio'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {pendingDelete && (
        <Confirm
          title="¿Eliminar ejercicio?"
          busy={busy}
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        >
          <p>
            ¿Estás seguro de que deseas eliminar permanentemente el ejercicio{' '}
            <strong>"{pendingDelete.titulo}"</strong>?
          </p>
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--s-ink-2)' }}>
            Esta acción no se puede deshacer y desvinculará este ejercicio del módulo{' '}
            <strong>{pendingDelete.temaSlug}</strong>.
          </p>
        </Confirm>
      )}
    </div>
  )
}

