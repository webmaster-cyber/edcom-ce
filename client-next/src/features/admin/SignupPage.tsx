import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { Save, Copy, ExternalLink, Eye } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Checkbox } from '../../components/ui/Checkbox'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { Badge } from '../../components/ui/Badge'
import type { Frontend } from '../../types/admin'
import type { Plan } from '../../types/billing'

interface SignupSettingsData {
  id?: string
  rawText: string
  frontend: string
  subject: string
  requireconfirm: boolean
  require_approval: boolean
  default_plan?: string
}

export function SignupPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<SignupSettingsData>({
    rawText: '',
    frontend: '',
    subject: 'Confirm Sign-up',
    requireconfirm: false,
    require_approval: true,
    default_plan: '',
  })
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [frontends, setFrontends] = useState<Frontend[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [showPreview, setShowPreview] = useState(false)

  const reload = useCallback(async () => {
    setIsLoading(true)
    try {
      const [settingsRes, frontendsRes, plansRes] = await Promise.all([
        api.get<SignupSettingsData>('/api/signupsettings'),
        api.get<Frontend[]>('/api/frontends'),
        api.get<Plan[]>('/api/plans'),
      ])

      if (settingsRes.data.id) {
        setSettingsId(settingsRes.data.id)
        setSettings({
          rawText: settingsRes.data.rawText || '',
          frontend: settingsRes.data.frontend || '',
          subject: settingsRes.data.subject || 'Confirm Sign-up',
          requireconfirm: settingsRes.data.requireconfirm || false,
          require_approval: settingsRes.data.require_approval !== false,
          default_plan: settingsRes.data.default_plan || '',
        })
      }

      setFrontends(frontendsRes.data)
      setPlans(plansRes.data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const handleSave = async () => {
    if (!settings.frontend) {
      toast.error('Please select a frontend')
      return
    }
    setIsSaving(true)
    try {
      await api.patch('/api/signupsettings', settings)
      toast.success('Sign-up settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const signupUrl = settingsId
    ? `${window.location.origin}/signup/${settingsId}`
    : null

  const signupUrlWithPlan = (slug: string) =>
    signupUrl ? `${signupUrl}?plan=${slug}` : ''

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success('Copied to clipboard')
  }

  const frontendOptions = [
    { value: '', label: 'Select a frontend...' },
    ...frontends.map((f) => ({ value: f.id, label: f.name })),
  ]

  const planOptions = [
    { value: '', label: 'No default plan' },
    ...plans.filter((p) => p.active).map((p) => ({ value: p.id, label: p.name })),
  ]

  const activePlans = plans.filter((p) => p.active)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Sign-up Page</h1>
        <div className="flex gap-2">
          {signupUrl && (
            <Button
              variant="secondary"
              icon={<Eye className="h-4 w-4" />}
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'Hide Preview' : 'Preview'}
            </Button>
          )}
          <Button icon={<Save className="h-4 w-4" />} onClick={handleSave} loading={isSaving}>
            Save Settings
          </Button>
        </div>
      </div>

      <LoadingOverlay loading={isLoading}>
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Preview */}
          {showPreview && signupUrl && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b px-4 py-2">
                <span className="text-sm font-medium text-text-secondary">Sign-up Page Preview</span>
                <a href={signupUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" icon={<ExternalLink className="h-3.5 w-3.5" />}>
                    Open
                  </Button>
                </a>
              </div>
              <iframe
                src={signupUrl}
                className="h-[600px] w-full"
                title="Signup Preview"
              />
            </div>
          )}

          {/* Signup URLs */}
          {signupUrl && (
            <div className="card p-6">
              <h2 className="mb-3 text-lg font-medium">Sign-up URLs</h2>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">
                    Main sign-up page (shows all plans)
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-gray-100 px-3 py-2 text-sm">{signupUrl}</code>
                    <Button variant="ghost" size="sm" onClick={() => copyUrl(signupUrl)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {activePlans.length > 0 && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-secondary">
                      Plan-specific links (pre-selects a plan)
                    </label>
                    <div className="space-y-1.5">
                      {activePlans.map((plan) => (
                        <div key={plan.id} className="flex items-center gap-2">
                          <Badge variant={plan.is_free ? 'default' : 'success'} className="w-24 justify-center">
                            {plan.name}
                          </Badge>
                          <code className="flex-1 truncate rounded bg-gray-50 px-2 py-1 text-xs">
                            {signupUrlWithPlan(plan.slug)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyUrl(signupUrlWithPlan(plan.slug))}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activePlans.length === 0 && (
                  <p className="text-sm text-text-muted">
                    No active plans. Create plans in the Plans page to show them on the sign-up page.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="card space-y-4 p-6">
            <h2 className="text-lg font-medium">Settings</h2>
            <Select
              label="Frontend / Branding"
              value={settings.frontend}
              onChange={(e) => setSettings((s) => ({ ...s, frontend: e.target.value }))}
              options={frontendOptions}
            />
            <p className="text-xs text-text-muted">
              Determines branding (logo, name) on the sign-up page and which company new signups are created under.
            </p>
            <Select
              label="Default Plan"
              value={settings.default_plan || ''}
              onChange={(e) => setSettings((s) => ({ ...s, default_plan: e.target.value }))}
              options={planOptions}
            />
            <p className="text-xs text-text-muted">
              Pre-selected plan when no ?plan= parameter is in the URL.
            </p>
            <Checkbox
              label="Require admin approval before account is active"
              checked={settings.require_approval}
              onChange={(checked) => setSettings((s) => ({ ...s, require_approval: checked }))}
            />
            <p className="text-xs text-text-muted">
              When enabled, new sign-ups are placed in review. You must approve them before they can send.
            </p>
            <Checkbox
              label="Require email confirmation"
              checked={settings.requireconfirm}
              onChange={(checked) => setSettings((s) => ({ ...s, requireconfirm: checked }))}
            />
            {settings.requireconfirm && (
              <Input
                label="Confirmation Email Subject"
                value={settings.subject}
                onChange={(e) => setSettings((s) => ({ ...s, subject: e.target.value }))}
              />
            )}
          </div>
        </div>
      </LoadingOverlay>
    </div>
  )
}
