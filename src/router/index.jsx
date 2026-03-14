import { createBrowserRouter, Navigate } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import MainLayout from '../layouts/MainLayout'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import ChatPage from '../pages/ChatPage'
import ProfilePage from '../pages/ProfilePage'
import GroupsPage from '../pages/GroupsPage'
import DashboardPage from '../pages/DashboardPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/register',
        element: <RegisterPage />,
      },
    ],
  },
  {
    element: <MainLayout />,
    children: [
      {
        path: '/chat',
        element: <ChatPage />,
      },
      {
        path: '/chat/:conversationId',
        element: <ChatPage />,
      },
      {
        path: '/profile',
        element: <ProfilePage />,
      },
      {
        path: '/groups',
        element: <GroupsPage />,
      },
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
    ],
  },
])

export default router
