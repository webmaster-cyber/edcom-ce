import { useState } from 'react'
import { TopBar } from '../navigation/TopBar'
import { Sidebar } from '../navigation/Sidebar'
import { useAuth } from '../../contexts/AuthContext'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, impersonate } = useAuth()
  const isAdmin = !!user?.admin && !impersonate

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-[var(--sidebar-width)] transform transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar isAdmin={isAdmin} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          {impersonate && user && (
            <ImpersonationBanner />
          )}
          {children}
        </main>
      </div>
    </div>
  )
}

function ImpersonationBanner() {
  const { user, clearImpersonation } = useAuth()

  return (
    <div className="mb-4 flex items-center justify-between rounded-md bg-warning/10 px-4 py-2 text-sm text-warning">
      <span>
        Viewing as: <strong>{user?.fullname}</strong> ({user?.companyname})
      </span>
      <button
        onClick={clearImpersonation}
        className="rounded-md px-3 py-1 text-xs font-medium text-warning hover:bg-warning/20"
      >
        Exit Impersonation
      </button>
    </div>
  )
}
