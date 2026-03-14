import { Outlet } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar-bg items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-sidebar-foreground">ChatApp</h1>
          </div>
          <p className="text-sidebar-foreground/70 text-lg leading-relaxed">
            Connect with your team in real-time. Share messages, files, and collaborate seamlessly.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-sidebar-foreground/60">
            <div>
              <div className="text-3xl font-bold text-primary">10k+</div>
              <div className="text-sm">Active Users</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">50k+</div>
              <div className="text-sm">Messages/Day</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">99.9%</div>
              <div className="text-sm">Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
