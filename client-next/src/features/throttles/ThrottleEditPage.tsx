import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'

interface DomainThrottle {
  id: string
  route?: string
  domains: string
  minlimit?: number
  hourlimit?: number
  daylimit?: number
  active: boolean
}

interface Route {
  id: string
  name: string
}

export function ThrottleEditPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const throttleId = searchParams.get('id') || ''
  const isNew = throttleId === 'new' || !throttleId

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [routes, setRoutes] = useState<Route[]>([])

  // Form fields
  const [route, setRoute] = useState('')
  const [domains, setDomains] = useState('')
  const [hourlimit, setHourlimit] = useState('')
  const [daylimit, setDaylimit] = useState('')
  const [active, setActive] = useState(true)

  useEffect(() => {
    loadData()
  }, [throttleId, isNew])

  const loadData = async () => {
    try {
      const routesRes = await api.get<Route[]>('/api/userroutes').catch(() => ({ data: [] }))
      setRoutes(routesRes.data)

      if (!isNew) {
        const { data } = await api.get<DomainThrottle>(`/api/domainthrottles/${throttleId}`)
        setRoute(data.route || '')
        setDomains(data.domains)
        setHourlimit(data.hourlimit?.toString() || '')
        setDaylimit(data.daylimit?.toString() || '')
        setActive(data.active)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
      toast.error('Failed to load throttle')
      navigate('/domainthrottles')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!domains.trim()) {
      toast.error('Domains field is required')
      return
    }

    if (!hourlimit && !daylimit) {
      toast.error('Please set at least an hourly or daily limit')
      return
    }

    setIsSaving(true)
    try {
      const payload: Record<string, unknown> = {
        domains: domains.trim(),
        active,
      }

      if (route) payload.route = route
      if (hourlimit) payload.hourlimit = parseInt(hourlimit, 10)
      if (daylimit) payload.daylimit = parseInt(daylimit, 10)

      if (isNew) {
        await api.post('/api/domainthrottles', payload)
        toast.success('Throttle created')
      } else {
        await api.patch(`/api/domainthrottles/${throttleId}`, payload)
        toast.success('Throttle saved')
      }
      navigate('/domainthrottles')
    } catch (err: unknown) {
      console.error('Failed to save throttle:', err)
      const axiosErr = err as { response?: { data?: { title?: string; description?: string } } }
      const message =
        axiosErr.response?.data?.description ||
        axiosErr.response?.data?.title ||
        'Failed to save throttle'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const routeOptions = [
    { value: '', label: 'All Routes' },
    ...routes.map((r) => ({ value: r.id, label: r.name })),
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/domainthrottles')}
            className="rounded-md p-1.5 text-text-muted hover:bg-gray-100 hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">
              {isNew ? 'New Throttle' : 'Edit Throttle'}
            </h1>
          </div>
        </div>
        <Button onClick={handleSave} loading={isSaving}>
          {isNew ? 'Create Throttle' : 'Save Changes'}
        </Button>
      </div>

      <LoadingOverlay loading={isLoading}>
        <div className="mx-auto max-w-xl space-y-6">
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-medium text-text-primary">Throttle Settings</h2>

            <div className="space-y-4">
              {routes.length > 0 && (
                <Select
                  label="Route"
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  options={routeOptions}
                />
              )}

              <Input
                label="Receiving Domains"
                value={domains}
                onChange={(e) => setDomains(e.target.value)}
                placeholder="e.g., gmail.com yahoo.* hotmail.com"
                hint="Space-separated list of domains. Use * as wildcard."
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Hourly Limit"
                  type="number"
                  value={hourlimit}
                  onChange={(e) => setHourlimit(e.target.value)}
                  placeholder="e.g., 1000"
                  min="0"
                />
                <Input
                  label="Daily Limit"
                  type="number"
                  value={daylimit}
                  onChange={(e) => setDaylimit(e.target.value)}
                  placeholder="e.g., 10000"
                  min="0"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-text-primary">Throttle is active</span>
                </label>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 className="text-sm font-medium text-blue-800">Domain Wildcards</h4>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-700">
              <li>
                <code className="rounded bg-blue-100 px-1">gmail.com</code> - Exact match
              </li>
              <li>
                <code className="rounded bg-blue-100 px-1">yahoo.*</code> - Matches yahoo.com,
                yahoo.co.uk, etc.
              </li>
              <li>
                <code className="rounded bg-blue-100 px-1">*.edu</code> - Matches all .edu domains
              </li>
            </ul>
          </div>
        </div>
      </LoadingOverlay>
    </div>
  )
}
