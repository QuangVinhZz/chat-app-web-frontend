import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import MainLayout from '../layouts/MainLayout'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import VerifyEmailPage from '../pages/VerifyEmailPage'
import ForgotPasswordPage from '../pages/ForgotPasswordPage'
import ResetPasswordPage from '../pages/ResetPasswordPage'
import AdminPage from '../pages/AdminPage'
import AdminUsersPage from '../pages/AdminUsersPage'
import AdminReportsPage from '../pages/AdminReportsPage'
import { authService } from '../services/authService'
import { tokenStorage } from '../services/apiClient'

function ProtectedRoute() {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  // If the user is logged in but their email is not verified, send them
  // to the verification page so they can't access the main app.
  const user = tokenStorage.getUser()
  if (user && !user.verifiedAt) {
    return <Navigate to={`/verify-email?email=${encodeURIComponent(user.email)}`} replace />
  }
  return <Outlet />
}

function AdminRoute() {
  const user = tokenStorage.getUser()
  if (!user?.isAdmin) {
    authService.logout()
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

function PublicOnlyRoute() {
  const isAuthed = authService.isAuthenticated()
  if (isAuthed) {
    // Allow authenticated-but-unverified users through to /verify-email
    const user = tokenStorage.getUser()
    if (user && !user.verifiedAt) return <Outlet />
    return <Navigate to="/admin" replace />
  }
  return <Outlet />
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/admin" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/admin" replace />,
  },
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
          { path: '/verify-email', element: <VerifyEmailPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
          { path: '/reset-password', element: <ResetPasswordPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminRoute />,
        children: [
          {
            element: <MainLayout />,
            children: [
              { path: '/admin', element: <AdminPage /> },
              { path: '/admin/users', element: <AdminUsersPage /> },
              { path: '/admin/reports', element: <AdminReportsPage /> },
            ],
          },
        ],
      },
    ],
  },
])

export default router
