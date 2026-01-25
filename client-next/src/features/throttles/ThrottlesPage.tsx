import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Gauge, MoreHorizontal, Trash2, Settings, Check, X } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'

interface DomainThrottle {
  id: string
  route?: string
  domains: string
  hourlimit?: number
  daylimit?: number
  active: boolean
}

interface Route {
  id: string
  name: string
}

export function ThrottlesPage() {
  const navigate = useNavigate()
  const [throttles, setThrottles] = useState<DomainThrottle[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
    confirmLabel: string
  }>({ open: false, title: '', message: '', onConfirm: async () => {}, confirmLabel: '' })
  const [confirmLoading, setConfirmLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [throttlesRes, routesRes] = await Promise.all([
        api.get<DomainThrottle[]>('/api/domainthrottles'),
        api.get<Route[]>('/api/userroutes').catch(() => ({ data: [] })),
      ])
      setThrottles(throttlesRes.data)
      setRoutes(routesRes.data)
    } catch (err) {
      console.error('Failed to load throttles:', err)
      toast.error('Failed to load throttles')
    } finally {
      setIsLoading(false)
    }
  }

  const getRouteName = (routeId?: string): string => {
    if (!routeId) return 'All Routes'
    const route = routes.find((r) => r.id === routeId)
    return route?.name || routeId
  }

  const handleToggleActive = async (throttle: DomainThrottle) => {
    try {
      await api.patch(`/api/domainthrottles/${throttle.id}`, {
        active: !throttle.active,
      })
      setThrottles(
        throttles.map((t) =>
          t.id === throttle.id ? { ...t, active: !t.active } : t
        )
      )
      toast.success(throttle.active ? 'Throttle deactivated' : 'Throttle activated')
    } catch {
      toast.error('Failed to update throttle')
    }
    setOpenMenu(null)
  }

  const handleDelete = (throttle: DomainThrottle) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Throttle',
      message: `Are you sure you want to delete this throttle for "${throttle.domains}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await api.delete(`/api/domainthrottles/${throttle.id}`)
          toast.success('Throttle deleted')
          setThrottles(throttles.filter((t) => t.id !== throttle.id))
        } catch {
          toast.error('Failed to delete throttle')
        }
      },
    })
    setOpenMenu(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Domain Throttles</h1>
          <p className="mt-1 text-sm text-text-muted">
            Limit sending rates to specific receiving domains
          </p>
        </div>
        <Button
          icon={<Plus className="h-4 w-4" />}
          onClick={() => navigate('/domainthrottles/edit?id=new')}
        >
          Add Throttle
        </Button>
      </div>

      <LoadingOverlay loading={isLoading}>
        {throttles.length === 0 ? (
          <EmptyState
            icon={<Gauge className="h-12 w-12" />}
            title="No domain throttles"
            description="Create throttles to limit sending rates to specific domains like gmail.com or yahoo.*"
            action={
              <Button
                icon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/domainthrottles/edit?id=new')}
              >
                Add Throttle
              </Button>
            }
          />
        ) : (
          <div className="card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50 text-left text-sm font-medium text-text-secondary">
                  {routes.length > 1 && <th className="px-4 py-3">Route</th>}
                  <th className="px-4 py-3">Domains</th>
                  <th className="px-4 py-3 text-right">Hourly Limit</th>
                  <th className="px-4 py-3 text-right">Daily Limit</th>
                  <th className="px-4 py-3 text-center">Active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {throttles.map((throttle) => (
                  <tr
                    key={throttle.id}
                    className="border-b border-border last:border-0 hover:bg-gray-50"
                  >
                    {routes.length > 1 && (
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {getRouteName(throttle.route)}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <code className="rounded bg-gray-100 px-2 py-0.5 text-sm text-text-primary">
                        {throttle.domains}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-text-muted">
                      {throttle.hourlimit?.toLocaleString() || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-text-muted">
                      {throttle.daylimit?.toLocaleString() || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {throttle.active ? (
                        <Check className="mx-auto h-5 w-5 text-success" />
                      ) : (
                        <X className="mx-auto h-5 w-5 text-text-muted" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() =>
                            setOpenMenu(openMenu === throttle.id ? null : throttle.id)
                          }
                          className="rounded-md p-1 text-text-muted hover:bg-gray-100 hover:text-text-primary"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>

                        {openMenu === throttle.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenu(null)}
                            />
                            <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-border bg-white py-1 shadow-lg">
                              <button
                                onClick={() => {
                                  navigate(`/domainthrottles/edit?id=${throttle.id}`)
                                  setOpenMenu(null)
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary hover:bg-gray-50"
                              >
                                <Settings className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleToggleActive(throttle)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary hover:bg-gray-50"
                              >
                                {throttle.active ? (
                                  <>
                                    <X className="h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleDelete(throttle)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </LoadingOverlay>

      {/* Info */}
      <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <h4 className="text-sm font-medium text-yellow-800">Note</h4>
        <p className="mt-1 text-sm text-yellow-700">
          Throttle counters reset daily at 7:00 AM in the server's timezone. Use wildcards like{' '}
          <code className="rounded bg-yellow-100 px-1">yahoo.*</code> to match multiple domains.
        </p>
      </div>

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        confirmVariant="danger"
        loading={confirmLoading}
        onConfirm={async () => {
          setConfirmLoading(true)
          try {
            await confirmDialog.onConfirm()
          } finally {
            setConfirmLoading(false)
            setConfirmDialog((prev) => ({ ...prev, open: false }))
          }
        }}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      />
    </div>
  )
}
