import { useNavigate, useLocation } from 'react-router-dom'
import { Tag, FileText, List, Settings } from 'lucide-react'

export function TransactionalNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const tabs = [
    { label: 'Dashboard', href: '/transactional', icon: <Tag className="h-4 w-4" /> },
    { label: 'Templates', href: '/transactional/templates', icon: <FileText className="h-4 w-4" /> },
    { label: 'Activity Log', href: '/transactional/log', icon: <List className="h-4 w-4" /> },
    { label: 'Settings', href: '/transactional/settings', icon: <Settings className="h-4 w-4" /> },
  ]

  return (
    <div className="mb-6 flex items-center gap-1 border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.href}
          onClick={() => navigate(tab.href)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            location.pathname === tab.href
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}
