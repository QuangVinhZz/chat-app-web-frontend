import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

export default function MainLayout() {
  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
