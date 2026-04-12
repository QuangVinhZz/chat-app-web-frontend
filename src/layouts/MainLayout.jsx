import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { cn } from '../utils/cn'
import Sidebar from '../components/Sidebar'

/**
 * Responsive shell.
 *
 * - Desktop (md+): sidebar is a persistent column on the left.
 * - Mobile: sidebar becomes an off-canvas drawer toggled by a
 *   floating hamburger button, dismissed by backdrop tap or
 *   navigating to a different route.
 */
export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Auto-close the mobile drawer whenever the route changes so the
  // user lands on the new screen without it sitting on top.
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-72 transform transition-transform duration-200',
          'md:static md:translate-x-0 md:transform-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="relative h-full">
          <Sidebar />
          {/* Close button inside the drawer — mobile only */}
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden absolute top-3 right-3 w-8 h-8 rounded-full bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground flex items-center justify-center"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Outlet />
      </main>

      {/* Floating hamburger — only visible on mobile when drawer is closed */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="md:hidden fixed top-3 left-3 z-30 w-10 h-10 rounded-full bg-card border shadow-md flex items-center justify-center hover:bg-muted"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}
