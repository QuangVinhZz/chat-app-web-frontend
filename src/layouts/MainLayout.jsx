import { Outlet } from 'react-router-dom'

/**
 * Responsive shell.
 * Now purely an admin portal shell.
 */
export default function MainLayout() {
  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
