import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import TemaDashboard from './pages/TemaDashboard'
import SimulationShell from './components/SimulationShell'

// Code-split por simulación — cada chunk se carga solo cuando se necesita
const ConstantAcceleration = lazy(
  () => import('./simulations/constant-acceleration/ConstantAcceleration')
)
const ThreeForcesEquilibrium = lazy(
  () => import('./simulations/three-forces/ThreeForcesEquilibrium')
)
const ForceComposition = lazy(
  () => import('./simulations/force-composition/ForceComposition')
)
const VectorRepresentation = lazy(
  () => import('./simulations/vector-representation/VectorRepresentation')
)
const DistanciaDesplazamiento = lazy(
  () => import('./simulations/distancia-desplazamiento/DistanciaDesplazamiento')
)
const VelocidadRapidez = lazy(
  () => import('./simulations/velocidad-rapidez/VelocidadRapidez')
)
const AlcancesMRU = lazy(
  () => import('./simulations/alcances-mru/alcancesMRU')
)
const MRUSimulation = lazy(
  () => import('./simulations/mru/MRU')
)

function SimulationLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div className="spinner" />
      <span style={{ color: 'var(--gray-400)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}>
        Cargando simulación...
      </span>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      {/* Dashboard por Tema y sus 4 pestañas (Simulación, Fórmulas, Glosario, Teoría) */}
      <Route path="/tema/:id" element={<TemaDashboard />} />
      <Route path="/tema/:id/:seccion" element={<TemaDashboard />} />

      {/* Redirecciones amigables */}
      <Route path="/alcances-mru" element={<Navigate to="/tema/alcances-mru" replace />} />
      <Route path="/alcances-encuentros" element={<Navigate to="/tema/alcances-mru" replace />} />

      {/* Rutas directas de simulación para compatibilidad */}
      <Route
        path="/sim/movimiento-aceleracion-constante"
        element={
          <SimulationShell slug="movimiento-aceleracion-constante">
            <Suspense fallback={<SimulationLoader />}>
              <ConstantAcceleration />
            </Suspense>
          </SimulationShell>
        }
      />
      <Route
        path="/sim/tres-fuerzas-equilibrio"
        element={
          <SimulationShell slug="tres-fuerzas-equilibrio">
            <Suspense fallback={<SimulationLoader />}>
              <ThreeForcesEquilibrium />
            </Suspense>
          </SimulationShell>
        }
      />
      <Route
        path="/sim/suma-vectores"
        element={
          <SimulationShell slug="suma-vectores">
            <Suspense fallback={<SimulationLoader />}>
              <ForceComposition />
            </Suspense>
          </SimulationShell>
        }
      />
      <Route
        path="/sim/composicion-fuerzas"
        element={
          <SimulationShell slug="suma-vectores">
            <Suspense fallback={<SimulationLoader />}>
              <ForceComposition />
            </Suspense>
          </SimulationShell>
        }
      />
      <Route
        path="/sim/vectores"
        element={
          <SimulationShell slug="vectores">
            <Suspense fallback={<SimulationLoader />}>
              <VectorRepresentation />
            </Suspense>
          </SimulationShell>
        }
      />
      <Route
        path="/sim/distancia-desplazamiento"
        element={
          <SimulationShell slug="distancia-desplazamiento">
            <Suspense fallback={<SimulationLoader />}>
              <DistanciaDesplazamiento />
            </Suspense>
          </SimulationShell>
        }
      />
      <Route
        path="/sim/velocidad-rapidez"
        element={
          <SimulationShell slug="velocidad-rapidez">
            <Suspense fallback={<SimulationLoader />}>
              <VelocidadRapidez />
            </Suspense>
          </SimulationShell>
        }
      />
      <Route
        path="/sim/alcances-encuentros"
        element={
          <SimulationShell slug="alcances-mru">
            <Suspense fallback={<SimulationLoader />}>
              <AlcancesMRU />
            </Suspense>
          </SimulationShell>
        }
      />
      <Route
        path="/sim/alcances-mru"
        element={
          <SimulationShell slug="alcances-mru">
            <Suspense fallback={<SimulationLoader />}>
              <AlcancesMRU />
            </Suspense>
          </SimulationShell>
        }
      />

      <Route
        path="/sim/mru"
        element={
          <SimulationShell slug="mru">
            <Suspense fallback={<SimulationLoader />}>
              <MRUSimulation />
            </Suspense>
          </SimulationShell>
        }
      />
      <Route
        path="/sim/movimiento-rectilineo-uniforme"
        element={
          <SimulationShell slug="mru">
            <Suspense fallback={<SimulationLoader />}>
              <MRUSimulation />
            </Suspense>
          </SimulationShell>
        }
      />

      {/* Fallback 404 */}
      <Route path="*" element={<HomePage />} />
    </Routes>
  )
}
