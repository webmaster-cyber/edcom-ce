import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Checkbox } from '../../components/ui/Checkbox'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import type { SMTPRelayConnection } from '../../types/admin'

interface FormData {
  name: string
  hostname: string
  ehlohostname: string
  useauth: boolean
  username: string
  password: string
  ssltype: 'none' | 'ssl' | 'starttls'
  port: number
  msgsperconn: string
  headers: string
  linkdomain: string
}

const DEFAULT_FORM: FormData = {
  name: '',
  hostname: '',
  ehlohostname: '',
  useauth: false,
  username: '',
  password: '',
  ssltype: 'none',
  port: 25,
  msgsperconn: '',
  headers: '',
  linkdomain: '',
}

export function SMTPRelayEditPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || 'new'
  const isNew = id === 'new'

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM)

  const reload = useCallback(async () => {
    if (isNew) return
    setIsLoading(true)
    try {
      const { data } = await api.get<SMTPRelayConnection>(`/api/smtprelays/${id}`)
      setFormData({
        name: data.name || '',
        hostname: data.hostname || '',
        ehlohostname: data.ehlohostname || '',
        useauth: data.useauth ?? false,
        username: data.username || '',
        password: data.password || '',
        ssltype: data.ssltype || 'none',
        port: data.port || 25,
        msgsperconn: data.msgsperconn?.toString() || '',
        headers: data.headers || '',
        linkdomain: data.linkdomain || '',
      })
    } finally {
      setIsLoading(false)
    }
  }, [id, isNew])

  useEffect(() => {
    reload()
  }, [reload])

  const handleChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }

      // Auto-adjust port when SSL type changes
      if (field === 'ssltype') {
        if (value === 'ssl' && prev.port === 25) {
          updated.port = 465
        } else if ((value === 'none' || value === 'starttls') && prev.port === 465) {
          updated.port = 25
        }
      }

      return updated
    })
  }

  const validateForm = (): boolean => {
    if (!formData.name.trim() || !formData.hostname.trim() || !formData.ehlohostname.trim()) {
      return false
    }
    if (formData.useauth && (!formData.username.trim() || !formData.password.trim())) {
      return false
    }
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
        msgsperconn: formData.msgsperconn ? parseInt(formData.msgsperconn) : undefined,
      }

      if (isNew) {
        await api.post('/api/smtprelays', payload)
        toast.success('SMTP relay created')
      } else {
        await api.patch(`/api/smtprelays/${id}`, payload)
        toast.success('SMTP relay updated')
      }
      navigate('/admin/smtprelays')
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { description?: string } } }).response?.data?.description
        : 'Unknown error'
      toast.error(`Failed to save: ${message}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/smtprelays')}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <h1 className="text-xl font-semibold text-text-primary">
            {isNew ? 'Add SMTP Relay' : `Edit SMTP Relay`}
          </h1>
        </div>
        <Button
          onClick={handleSubmit}
          loading={isSaving}
          disabled={!validateForm()}
          icon={<Save className="h-4 w-4" />}
        >
          Save
        </Button>
      </div>

      <LoadingOverlay loading={isLoading}>
        <div className="card p-6">
          <div className="max-w-lg space-y-4">
            <Input
              label="Account Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., My SMTP Server"
              required
            />
            <Input
              label="SMTP Hostname"
              value={formData.hostname}
              onChange={(e) => handleChange('hostname', e.target.value)}
              placeholder="e.g., smtp.example.com"
              required
            />
            <Input
              label="HELO/EHLO Local Hostname"
              value={formData.ehlohostname}
              onChange={(e) => handleChange('ehlohostname', e.target.value)}
              placeholder="e.g., mail.example.com"
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="SSL Type"
                value={formData.ssltype}
                onChange={(e) => handleChange('ssltype', e.target.value as 'none' | 'ssl' | 'starttls')}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'ssl', label: 'SSL' },
                  { value: 'starttls', label: 'STARTTLS' },
                ]}
              />
              <Input
                label="Port"
                type="number"
                value={formData.port}
                onChange={(e) => handleChange('port', parseInt(e.target.value) || 25)}
                required
              />
            </div>

            <Checkbox
              label="Use Authentication"
              checked={formData.useauth}
              onChange={(checked) => handleChange('useauth', checked)}
            />

            {formData.useauth && (
              <>
                <Input
                  label="Username"
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  placeholder="SMTP username"
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="SMTP password"
                  required
                />
              </>
            )}

            <Input
              label="Max Messages Per Connection"
              type="number"
              value={formData.msgsperconn}
              onChange={(e) => handleChange('msgsperconn', e.target.value)}
              placeholder="Optional"
            />

            <Input
              label="Additional Headers"
              value={formData.headers}
              onChange={(e) => handleChange('headers', e.target.value)}
              placeholder="Optional custom headers"
              multiline
              rows={3}
            />

            <Input
              label="White Label Tracking Links Domain"
              value={formData.linkdomain}
              onChange={(e) => handleChange('linkdomain', e.target.value)}
              placeholder="e.g., links.example.com"
              hint="Optional - domain for tracking links"
            />
          </div>
        </div>
      </LoadingOverlay>
    </div>
  )
}
