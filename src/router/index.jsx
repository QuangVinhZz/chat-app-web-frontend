import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import MainLayout from '../layouts/MainLayout'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import VerifyEmailPage from '../pages/VerifyEmailPage'
import ForgotPasswordPage from '../pages/ForgotPasswordPage'
import ResetPasswordPage from '../pages/ResetPasswordPage'
import ChatPage from '../pages/ChatPage'
import ProfilePage from '../pages/ProfilePage'
import FriendsPage from '../pages/FriendsPage'
import DashboardPage from '../pages/DashboardPage'
import AiPage from '../pages/AiPage'
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

function PublicOnlyRoute() {
  const isAuthed = authService.isAuthenticated()
  if (isAuthed) {
    // Allow authenticated-but-unverified users through to /verify-email
    const user = tokenStorage.getUser()
    if (user && !user.verifiedAt) return <Outlet />
    return <Navigate to="/chat" replace />
  }
  return <Outlet />
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
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
        element: <MainLayout />,
        children: [
          { path: '/chat', element: <ChatPage /> },
          // Draft chat with a user — no conversation exists server-side
          // yet; one is created when the first message is sent.
          { path: '/chat/new/:userId', element: <ChatPage /> },
          { path: '/chat/:conversationId', element: <ChatPage /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '/friends', element: <FriendsPage /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/ai', element: <AiPage /> },
        ],
      },
    ],
  },
])

export default router
