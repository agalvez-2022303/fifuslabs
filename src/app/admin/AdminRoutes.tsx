import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import AdminLayout from './AdminLayout'
import AdminLoginPage from './AdminLoginPage'
import DashboardPage from './DashboardPage'
import AdminCrudPage from './AdminCrudPage'

function RequireAdmin() {
  const { user } = useAuth()
  return user ? <Outlet /> : <Navigate to="/admin/login" replace />
}

function AdminRouter() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route
        path="login"
        element={user ? <Navigate to="/admin/dashboard" replace /> : <AdminLoginPage />}
      />
      <Route element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="areas" element={<AdminCrudPage />} />
          <Route path="temas" element={<AdminCrudPage />} />
          <Route path="teoria" element={<AdminCrudPage />} />
          <Route path="formulas" element={<AdminCrudPage />} />
          <Route path="glosario" element={<AdminCrudPage />} />
          <Route path="ejercicios" element={<AdminCrudPage />} />
          <Route path="*" element={<AdminCrudPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default function AdminRoutes() {
  return (
    <AuthProvider>
      <AdminRouter />
    </AuthProvider>
  )
}
