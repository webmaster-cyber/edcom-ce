import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Save, Plus, Trash2, Upload } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Checkbox } from '../../components/ui/Checkbox'
import { Tabs } from '../../components/ui/Tabs'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import type { Frontend, ApiConnection } from '../../types/admin'

interface DomainRate {
  domain: string
  bouncerate: number
  complaintrate: number
}

interface FrontendFormData {
  name: string
  // Profile
  useforlogin: boolean
  image: string
  favicon: string
  // Custom CSS
  customcss: string
  // Broadcast Alert Thresholds
  bouncerate: number
  complaintrate: number
  domainrates: DomainRate[]
  // Default Send Limits
  useapprove: boolean
  usetrial: boolean
  trialdays: number
  minlimit: number
  hourlimit: number
  daylimit: number
  monthlimit: number
  bouncethreshold: number
  unsubthreshold: number
  complaintthreshold: number
  // Header Template
  headers: string
  fromencoding: 'none' | 'b64' | 'qp'
  subjectencoding: 'none' | 'b64' | 'qp'
  // Password Reset & Signup Emails
  invitename: string
  inviteemail: string
  txnaccount: string
}

const DEFAULT_HEADERS = `X-Mailer: {{companyName}}
List-Unsubscribe: <{{unsubscribe}}>
List-Unsubscribe-Post: List-Unsubscribe=One-Click`

const DEFAULT_FORM: FrontendFormData = {
  name: '',
  useforlogin: false,
  image: '',
  favicon: '',
  customcss: '',
  bouncerate: 3.0,
  complaintrate: 0.2,
  domainrates: [],
  useapprove: false,
  usetrial: false,
  trialdays: 14,
  minlimit: 999999999,
  hourlimit: 1000,
  daylimit: 5000,
  monthlimit: 50000,
  bouncethreshold: 5,
  unsubthreshold: 5,
  complaintthreshold: 0.5,
  headers: DEFAULT_HEADERS,
  fromencoding: 'none',
  subjectencoding: 'none',
  invitename: '',
  inviteemail: '',
  txnaccount: '',
}

const ENCODING_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'b64', label: 'Base64' },
  { value: 'qp', label: 'Quoted-Printable' },
]

export function FrontendEditPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || 'new'
  const isNew = id === 'new'

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<FrontendFormData>(DEFAULT_FORM)
  const [apiConnections, setApiConnections] = useState<ApiConnection[]>([])
  const [activeTab, setActiveTab] = useState('profile')

  const reload = useCallback(async () => {
    setIsLoading(true)
    try {
      // Load API connections for the email settings dropdown
      const [mailgunRes, sesRes, sparkpostRes] = await Promise.all([
        api.get<ApiConnection[]>('/api/mailgun').catch(() => ({ data: [] })),
        api.get<ApiConnection[]>('/api/ses').catch(() => ({ data: [] })),
        api.get<ApiConnection[]>('/api/sparkpost').catch(() => ({ data: [] })),
      ])

      const connections: ApiConnection[] = [
        ...mailgunRes.data.map((c) => ({ ...c, type: 'mailgun' as const })),
        ...sesRes.data.map((c) => ({ ...c, type: 'ses' as const })),
        ...sparkpostRes.data.map((c) => ({ ...c, type: 'sparkpost' as const })),
      ]
      setApiConnections(connections)

      if (!isNew) {
        const { data } = await api.get<Frontend>(`/api/frontends/${id}`)
        setFormData({
          name: data.name || '',
          useforlogin: data.useforlogin ?? false,
          image: data.image || '',
          favicon: data.favicon || '',
          customcss: data.customcss || '',
          bouncerate: data.bouncerate ?? 3.0,
          complaintrate: data.complaintrate ?? 0.2,
          domainrates: data.domainrates || [],
          useapprove: data.useapprove ?? false,
          usetrial: data.usetrial ?? false,
          trialdays: data.trialdays ?? 14,
          minlimit: data.minlimit ?? 999999999,
          hourlimit: data.hourlimit ?? 1000,
          daylimit: data.daylimit ?? 5000,
          monthlimit: data.monthlimit ?? 50000,
          bouncethreshold: data.bouncethreshold ?? 5,
          unsubthreshold: data.unsubthreshold ?? 5,
          complaintthreshold: data.complaintthreshold ?? 0.5,
          headers: data.headers || DEFAULT_HEADERS,
          fromencoding: data.fromencoding || 'none',
          subjectencoding: data.subjectencoding || 'none',
          invitename: data.invitename || '',
          inviteemail: data.inviteemail || '',
          txnaccount: data.txnaccount || '',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [id, isNew])

  useEffect(() => {
    reload()
  }, [reload])

  const handleChange = <K extends keyof FrontendFormData>(field: K, value: FrontendFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileUpload = (field: 'image' | 'favicon', file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      handleChange(field, base64)
    }
    reader.readAsDataURL(file)
  }

  const handleAddDomainRate = () => {
    setFormData((prev) => ({
      ...prev,
      domainrates: [...prev.domainrates, { domain: '', bouncerate: 3.0, complaintrate: 0.2 }],
    }))
  }

  const handleRemoveDomainRate = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      domainrates: prev.domainrates.filter((_, i) => i !== index),
    }))
  }

  const handleDomainRateChange = (index: number, field: keyof DomainRate, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      domainrates: prev.domainrates.map((dr, i) =>
        i === index ? { ...dr, [field]: value } : dr
      ),
    }))
  }

  const validateForm = (): boolean => {
    if (!formData.name) return false
    if (formData.usetrial && !formData.trialdays) return false
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        ...formData,
        // Convert empty strings to null for optional fields
        image: formData.image || null,
        favicon: formData.favicon || null,
        customcss: formData.customcss || null,
        txnaccount: formData.txnaccount || null,
      }

      if (isNew) {
        await api.post('/api/frontends', payload)
        toast.success('Frontend created')
      } else {
        await api.patch(`/api/frontends/${id}`, payload)
        toast.success('Frontend updated')
      }
      navigate('/admin/frontends')
    } catch {
      toast.error('Failed to save frontend')
    } finally {
      setIsSaving(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'css', label: 'Custom CSS' },
    { id: 'alerts', label: 'Alert Thresholds' },
    { id: 'limits', label: 'Send Limits' },
    { id: 'headers', label: 'Header Template' },
    { id: 'email', label: 'Email Settings' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/frontends')}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <h1 className="text-xl font-semibold text-text-primary">
            {isNew ? 'Create Frontend' : 'Edit Frontend'}
          </h1>
        </div>
        <Button
          onClick={handleSubmit}
          loading={isSaving}
          disabled={!validateForm()}
          icon={<Save className="h-4 w-4" />}
        >
          {isNew ? 'Create Frontend' : 'Save Changes'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <LoadingOverlay loading={isLoading}>
        <div className="card p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="max-w-xl space-y-6">
              <Input
                label="Configuration Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="My Frontend"
                required
              />

              {/* Brand Image */}
              <div>
                <label className="mb-2 block text-sm font-medium text-text-primary">
                  Brand Image
                </label>
                <div className="flex items-start gap-4">
                  {formData.image && (
                    <img
                      src={formData.image}
                      alt="Brand"
                      className="h-18 w-18 rounded-lg border border-border object-contain"
                    />
                  )}
                  <div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm hover:bg-gray-50">
                      <Upload className="h-4 w-4" />
                      Upload Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileUpload('image', file)
                        }}
                      />
                    </label>
                    <p className="mt-1 text-xs text-text-muted">
                      Recommended size: 72x72 pixels
                    </p>
                    {formData.image && (
                      <button
                        type="button"
                        onClick={() => handleChange('image', '')}
                        className="mt-1 text-xs text-danger hover:underline"
                      >
                        Remove image
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Favicon */}
              <div>
                <label className="mb-2 block text-sm font-medium text-text-primary">
                  Favicon
                </label>
                <div className="flex items-start gap-4">
                  {formData.favicon && (
                    <img
                      src={formData.favicon}
                      alt="Favicon"
                      className="h-8 w-8 rounded border border-border object-contain"
                    />
                  )}
                  <div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm hover:bg-gray-50">
                      <Upload className="h-4 w-4" />
                      Upload Favicon
                      <input
                        type="file"
                        accept=".ico,image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileUpload('favicon', file)
                        }}
                      />
                    </label>
                    <p className="mt-1 text-xs text-text-muted">.ico file recommended</p>
                    {formData.favicon && (
                      <button
                        type="button"
                        onClick={() => handleChange('favicon', '')}
                        className="mt-1 text-xs text-danger hover:underline"
                      >
                        Remove favicon
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <Checkbox
                label="Use Brand Image on Login Screen"
                checked={formData.useforlogin}
                onChange={(checked) => handleChange('useforlogin', checked)}
              />
            </div>
          )}

          {/* Custom CSS Tab */}
          {activeTab === 'css' && (
            <div className="space-y-4">
              <Input
                label="Custom CSS"
                value={formData.customcss}
                onChange={(e) => handleChange('customcss', e.target.value)}
                placeholder=".my-class { color: blue; }"
                multiline
                rows={15}
                hint="Add custom CSS rules to style the frontend"
              />
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-medium text-text-primary">Example CSS:</p>
                <pre className="mt-2 text-xs text-text-muted">
{`:root {
  --primary-color: #3B82F6;
  --header-bg: #1F2937;
}

.login-logo {
  max-width: 200px;
}`}
                </pre>
              </div>
            </div>
          )}

          {/* Alert Thresholds Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-4 text-sm font-medium text-text-primary">
                  Global Broadcast Alert Thresholds
                </h3>
                <div className="grid max-w-xl gap-4 sm:grid-cols-2">
                  <Input
                    label="Bounce Rate Alert (%)"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={formData.bouncerate}
                    onChange={(e) => handleChange('bouncerate', parseFloat(e.target.value) || 0)}
                    hint="Show alert when bounce rate exceeds this"
                  />
                  <Input
                    label="Complaint Rate Alert (%)"
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={formData.complaintrate}
                    onChange={(e) => handleChange('complaintrate', parseFloat(e.target.value) || 0)}
                    hint="Show alert when complaint rate exceeds this"
                  />
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-text-primary">
                    Per-Domain Thresholds
                  </h3>
                  {formData.domainrates.length < 5 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleAddDomainRate}
                      icon={<Plus className="h-4 w-4" />}
                    >
                      Add Domain
                    </Button>
                  )}
                </div>

                {formData.domainrates.length === 0 ? (
                  <p className="text-sm text-text-muted">
                    No per-domain thresholds configured. Click "Add Domain" to set custom
                    thresholds for specific domains.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {formData.domainrates.map((dr, index) => (
                      <div
                        key={index}
                        className="flex items-end gap-3 rounded-lg border border-border p-3"
                      >
                        <div className="flex-1">
                          <Input
                            label="Domain"
                            value={dr.domain}
                            onChange={(e) =>
                              handleDomainRateChange(index, 'domain', e.target.value)
                            }
                            placeholder="gmail.com"
                          />
                        </div>
                        <div className="w-32">
                          <Input
                            label="Bounce %"
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            value={dr.bouncerate}
                            onChange={(e) =>
                              handleDomainRateChange(
                                index,
                                'bouncerate',
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                        <div className="w-32">
                          <Input
                            label="Complaint %"
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            value={dr.complaintrate}
                            onChange={(e) =>
                              handleDomainRateChange(
                                index,
                                'complaintrate',
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveDomainRate(index)}
                          icon={<Trash2 className="h-4 w-4 text-danger" />}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Send Limits Tab */}
          {activeTab === 'limits' && (
            <div className="space-y-6">
              <div className="max-w-xl space-y-4">
                <Checkbox
                  label="Require Approval Before Activating Accounts"
                  checked={formData.useapprove}
                  onChange={(checked) => handleChange('useapprove', checked)}
                  description="New accounts will need admin approval before they can send emails"
                />

                <Checkbox
                  label="Enable Time-Limited Free Trial"
                  checked={formData.usetrial}
                  onChange={(checked) => handleChange('usetrial', checked)}
                  description="New accounts will have limited access until trial expires"
                />

                {formData.usetrial && (
                  <Input
                    label="Trial Days"
                    type="number"
                    min={1}
                    value={formData.trialdays}
                    onChange={(e) => handleChange('trialdays', parseInt(e.target.value) || 14)}
                    required
                  />
                )}
              </div>

              <div>
                <h3 className="mb-4 text-sm font-medium text-text-primary">
                  Default Send Limits for New Customers
                </h3>
                <div className="grid max-w-2xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Input
                    label="Per Minute"
                    type="number"
                    min={0}
                    value={formData.minlimit}
                    onChange={(e) => handleChange('minlimit', parseInt(e.target.value) || 0)}
                  />
                  <Input
                    label="Per Hour"
                    type="number"
                    min={0}
                    value={formData.hourlimit}
                    onChange={(e) => handleChange('hourlimit', parseInt(e.target.value) || 0)}
                  />
                  <Input
                    label="Per Day"
                    type="number"
                    min={0}
                    value={formData.daylimit}
                    onChange={(e) => handleChange('daylimit', parseInt(e.target.value) || 0)}
                  />
                  <Input
                    label="Per Month"
                    type="number"
                    min={0}
                    value={formData.monthlimit}
                    onChange={(e) => handleChange('monthlimit', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-sm font-medium text-text-primary">
                  Auto-Pause Thresholds
                </h3>
                <p className="mb-4 text-sm text-text-muted">
                  Automatically pause sending for customers who exceed these thresholds
                </p>
                <div className="grid max-w-xl gap-4 sm:grid-cols-3">
                  <Input
                    label="Bounce Rate (%)"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={formData.bouncethreshold}
                    onChange={(e) =>
                      handleChange('bouncethreshold', parseFloat(e.target.value) || 0)
                    }
                  />
                  <Input
                    label="Unsubscribe Rate (%)"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={formData.unsubthreshold}
                    onChange={(e) =>
                      handleChange('unsubthreshold', parseFloat(e.target.value) || 0)
                    }
                  />
                  <Input
                    label="Complaint Rate (%)"
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={formData.complaintthreshold}
                    onChange={(e) =>
                      handleChange('complaintthreshold', parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Header Template Tab */}
          {activeTab === 'headers' && (
            <div className="space-y-6">
              <Input
                label="Email Header Template"
                value={formData.headers}
                onChange={(e) => handleChange('headers', e.target.value)}
                multiline
                rows={10}
                hint="Custom headers to include in outgoing emails. Use {{variables}} for dynamic values."
              />

              <div className="grid max-w-xl gap-4 sm:grid-cols-2">
                <Select
                  label="From Name Encoding"
                  value={formData.fromencoding}
                  onChange={(e) =>
                    handleChange('fromencoding', e.target.value as 'none' | 'b64' | 'qp')
                  }
                  options={ENCODING_OPTIONS}
                />
                <Select
                  label="Subject Encoding"
                  value={formData.subjectencoding}
                  onChange={(e) =>
                    handleChange('subjectencoding', e.target.value as 'none' | 'b64' | 'qp')
                  }
                  options={ENCODING_OPTIONS}
                />
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-medium text-text-primary">Available Variables:</p>
                <ul className="mt-2 list-inside list-disc text-xs text-text-muted">
                  <li>
                    <code>{'{{companyName}}'}</code> - Customer company name
                  </li>
                  <li>
                    <code>{'{{unsubscribe}}'}</code> - Unsubscribe URL
                  </li>
                  <li>
                    <code>{'{{messageId}}'}</code> - Unique message identifier
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Email Settings Tab */}
          {activeTab === 'email' && (
            <div className="max-w-xl space-y-6">
              <p className="text-sm text-text-muted">
                Configure the sender details for password reset and signup confirmation emails.
              </p>

              <Input
                label="From Name"
                value={formData.invitename}
                onChange={(e) => handleChange('invitename', e.target.value)}
                placeholder="My App"
              />

              <Input
                label="From Email"
                type="email"
                value={formData.inviteemail}
                onChange={(e) => handleChange('inviteemail', e.target.value)}
                placeholder="noreply@example.com"
              />

              <Select
                label="API Connection"
                value={formData.txnaccount}
                onChange={(e) => handleChange('txnaccount', e.target.value)}
                options={[
                  { value: '', label: 'Select an API connection...' },
                  ...apiConnections.map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.type})`,
                  })),
                ]}
                hint="Select the email service to use for sending system emails"
              />

              {apiConnections.length === 0 && (
                <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
                  No API connections configured. You'll need to set up a Mailgun, SES, or
                  SparkPost connection to send password reset and signup emails.
                </div>
              )}
            </div>
          )}
        </div>
      </LoadingOverlay>
    </div>
  )
}
