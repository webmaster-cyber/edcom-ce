import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import {
  User,
  Building2,
  Server,
  Route,
  FileText,
  Globe,
  Settings,
  Palette,
  Activity,
} from 'lucide-react'
import api from '../../config/api'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'

interface UserLog {
  id: string
  ts: string
  user_name: string
  icon: string
  pre_msg?: string
  link_msg?: string
  post_msg?: string
  link_type?: string
  link_id?: string
}

const LINK_TYPE_CONFIG: Record<string, { icon: React.ReactNode; path: string }> = {
  frontend: { icon: <Palette className="h-4 w-4" />, path: '/admin/frontends/edit?id=' },
  route: { icon: <Route className="h-4 w-4" />, path: '/admin/routes/edit?id=' },
  policy: { icon: <FileText className="h-4 w-4" />, path: '/admin/policies/edit?id=' },
  domaingroup: { icon: <Globe className="h-4 w-4" />, path: '/admin/domaingroups/edit?id=' },
  sink: { icon: <Server className="h-4 w-4" />, path: '/admin/servers/edit?id=' },
  server: { icon: <Server className="h-4 w-4" />, path: '/admin/servers/edit?id=' },
  customer: { icon: <Building2 className="h-4 w-4" />, path: '/admin/customers/edit?id=' },
  user: { icon: <User className="h-4 w-4" />, path: '/admin/users/edit?id=' },
  gallerytemplate: { icon: <Palette className="h-4 w-4" />, path: '/admin/templates/edit?id=' },
}

export function AdminLogPage() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<UserLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const reload = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get<UserLog[]>('/api/userlogs')
      // Sort by timestamp descending (newest first)
      const sorted = data.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
      setLogs(sorted)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts)
    return {
      full: date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      relative: formatDistanceToNow(date, { addSuffix: true }),
    }
  }

  const getIcon = (log: UserLog) => {
    if (log.link_type && LINK_TYPE_CONFIG[log.link_type]) {
      return LINK_TYPE_CONFIG[log.link_type].icon
    }
    return <Settings className="h-4 w-4" />
  }

  const handleLinkClick = (log: UserLog) => {
    if (log.link_type && log.link_id && LINK_TYPE_CONFIG[log.link_type]) {
      navigate(`${LINK_TYPE_CONFIG[log.link_type].path}${log.link_id}`)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-text-primary">Admin Activity Log</h1>
        <p className="text-sm text-text-secondary">Recent administrative actions</p>
      </div>

      <LoadingOverlay loading={isLoading}>
        {logs.length === 0 ? (
          <EmptyState
            icon={<Activity className="h-10 w-10" />}
            title="No activity logged"
            description="Administrative actions will appear here."
          />
        ) : (
          <div className="card">
            <div className="divide-y divide-border">
              {logs.map((log) => {
                const time = formatTimestamp(log.ts)
                return (
                  <div key={log.id} className="flex gap-4 p-4">
                    {/* Icon */}
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {getIcon(log)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">{log.user_name}</span>
                        <span className="text-xs text-text-muted" title={time.full}>
                          {time.relative}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">
                        {log.pre_msg}
                        {log.link_msg && log.link_type && log.link_id ? (
                          <button
                            onClick={() => handleLinkClick(log)}
                            className="mx-1 text-primary hover:underline"
                          >
                            {log.link_msg}
                          </button>
                        ) : log.link_msg ? (
                          <span className="mx-1 font-medium">{log.link_msg}</span>
                        ) : null}
                        {log.post_msg}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </LoadingOverlay>
    </div>
  )
}
