import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { TransactionalNav } from './TransactionalNav'
import type { TransactionalSettings } from '../../types/transactional'

interface Route {
  id: string
  name: string
}

export function TransactionalSettingsPage() {
  const [settings, setSettings] = useState<TransactionalSettings>({})
  const [routes, setRoutes] = useState<Route[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [settingsRes, routesRes] = await Promise.all([
        api.get<TransactionalSettings>('/api/transactional/settings'),
        api.get<Route[]>('/api/userroutes'),
      ])

      setSettings(settingsRes.data)
      setRoutes(routesRes.data)
    } catch (err) {
      console.error('Failed to load:', err)
      toast.error('Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await api.patch('/api/transactional/settings', settings)
      toast.success('Settings saved')
    } catch (err) {
      console.error('Failed to save:', err)
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Transactional</h1>
        <p className="text-sm text-text-muted">Configure default settings for transactional emails</p>
      </div>

      <TransactionalNav />

      <LoadingOverlay loading={isLoading}>
        <div className="card max-w-2xl p-6">
          <div className="space-y-6">
            {/* Default Route */}
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                Default Sending Route
              </label>
              <select
                value={settings.route || ''}
                onChange={(e) => setSettings({ ...settings, route: e.target.value || undefined })}
                className="input w-full"
              >
                <option value="">System default</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-text-muted">
                Select which mail server to use for transactional emails by default.
                This can be overridden per-email via the API.
              </p>
            </div>

            {/* Open Tracking */}
            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.disableopens || false}
                  onChange={(e) => setSettings({ ...settings, disableopens: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-medium text-text-primary">
                    Disable open tracking
                  </span>
                  <p className="text-xs text-text-muted">
                    When enabled, open tracking pixels will not be inserted into transactional emails.
                    This may be required for privacy compliance.
                  </p>
                </div>
              </label>
            </div>

            {/* Info box */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h4 className="text-sm font-medium text-blue-800">API Integration</h4>
              <p className="mt-1 text-sm text-blue-700">
                Transactional emails are sent via the API. Each email can include:
              </p>
              <ul className="mt-2 list-inside list-disc text-sm text-blue-700 space-y-1">
                <li>
                  <code className="rounded bg-blue-100 px-1 text-xs">template</code> - Template ID to use
                </li>
                <li>
                  <code className="rounded bg-blue-100 px-1 text-xs">variables</code> - Data for {'{{variable}}'} substitution
                </li>
                <li>
                  <code className="rounded bg-blue-100 px-1 text-xs">tag</code> - Tag for analytics grouping
                </li>
                <li>
                  <code className="rounded bg-blue-100 px-1 text-xs">route</code> - Override default sending route
                </li>
              </ul>
            </div>

            {/* Save Button */}
            <div className="flex justify-end border-t border-border pt-4">
              <Button onClick={handleSave} loading={isSaving}>
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      </LoadingOverlay>
    </div>
  )
}
