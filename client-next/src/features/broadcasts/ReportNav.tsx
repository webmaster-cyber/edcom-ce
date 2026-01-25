import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

interface ReportNavProps {
  id: string
  activeTab: 'summary' | 'heatmap' | 'domains' | 'settings'
  title?: string
}

const tabs = [
  { key: 'summary', label: 'Summary', path: '/broadcasts/summary' },
  { key: 'heatmap', label: 'Heatmap', path: '/broadcasts/heatmap' },
  { key: 'domains', label: 'Domains', path: '/broadcasts/domains' },
  { key: 'settings', label: 'Settings', path: '/broadcasts/summarysettings' },
] as const

export function ReportNav({ id, activeTab, title }: ReportNavProps) {
  const navigate = useNavigate()

  return (
    <div className="mb-6 card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/broadcasts')}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-text-muted hover:bg-gray-100 hover:text-text-primary transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Broadcasts</span>
          </button>
          {title && (
            <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
          )}
        </div>
      </div>
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => navigate(`${tab.path}?id=${id}`)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-primary'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
