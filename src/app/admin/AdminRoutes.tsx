import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import AdminLayout from './AdminLayout'
import AdminLoginPage, { ResetPasswordPage } from './AdminLoginPage'
import DashboardPage from './DashboardPage'
import AdminCrudPage from './AdminCrudPage'
import { ContentProvider } from './ContentContext'
import FormulaListPage from './FormulaListPage'
import FormulaEditorPage from './FormulaEditorPage'
import { TopicEditorPage, TopicListPage } from './TopicPages'
import TextEditorPage from './TextEditorPage'
import UsersPage from './UsersPage'
import RevisionPage from './RevisionPage'
import ExercisesPage from './ExercisesPage'
import { Loading } from './ui'
import './Studio.css'

function RequireAdmin() {
  const { user } = useAuth()
  return user?.active && user.role === 'teacher' ? (
    <ContentProvider>
      <Outlet />
    </ContentProvider>
  ) : (
    <Navigate to="/admin/login" replace />
  )
}

function AdminRouter() {
  const { user, loading, recovering } = useAuth()
  if (loading) return <Loading text="Verificando sesión…" />
  if (recovering && user) return <ResetPasswordPage />

  return (
    <Routes>
      <Route
        path="login"
        element={
          user?.active && user.role === 'teacher' ? (
            <Navigate to="/admin/dashboard" replace />
          ) : (
            <AdminLoginPage />
          )
        }
      />
      <Route element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="areas" element={<AdminCrudPage />} />
          <Route path="temas" element={<TopicListPage />} />
          <Route path="temas/nuevo" element={<TopicEditorPage />} />
          <Route path="temas/:slug" element={<TopicEditorPage />} />
          <Route path="temas/:slug/revisiones" element={<RevisionPage />} />
          <Route path="teoria" element={<TextEditorPage />} />
          <Route path="formulas" element={<FormulaListPage />} />
          <Route path="formulas/nueva" element={<FormulaEditorPage />} />
          <Route path="formulas/:slug/:id" element={<FormulaEditorPage />} />
          <Route path="glosario" element={<TextEditorPage glossary />} />
          <Route path="ejercicios" element={<ExercisesPage />} />
          <Route path="usuarios" element={<UsersPage />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default function AdminRoutes() {
  return (
    <div className="studio">
      <AuthProvider>
        <AdminRouter />
      </AuthProvider>
    </div>
  )
}
