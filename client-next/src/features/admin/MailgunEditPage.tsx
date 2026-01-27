import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import type { MailgunConnection } from '../../types/admin'

interface FormData {
  name: string
  apikey: string
  domain: string
  region: 'us' | 'eu'
  linkdomain: string
}

const DEFAULT_FORM: FormData = {
  name: '',
  apikey: '',
  domain: '',
  region: 'us',
  linkdomain: '',
}

export function MailgunEditPage() {
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
      const { data } = await api.get<MailgunConnection>(`/api/mailgun/${id}`)
      setFormData({
        name: data.name || '',
        apikey: data.apikey || '',
        domain: data.domain || '',
        region: data.region || 'us',
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
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const validateForm = (): boolean => {
    return !!(formData.name.trim() && formData.apikey.trim() && formData.domain.trim())
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSaving(true)
    try {
      if (isNew) {
        await api.post('/api/mailgun', formData)
        toast.success('Mailgun account created')
      } else {
        await api.patch(`/api/mailgun/${id}`, formData)
        toast.success('Mailgun account updated')
      }
      navigate('/admin/mailgun')
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
            onClick={() => navigate('/admin/mailgun')}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <h1 className="text-xl font-semibold text-text-primary">
            {isNew ? 'Add Mailgun Account' : `Edit Mailgun Account`}
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
              placeholder="e.g., My Mailgun Account"
              required
            />
            <Input
              label="Mailgun API Key"
              type="password"
              value={formData.apikey}
              onChange={(e) => handleChange('apikey', e.target.value)}
              placeholder="Enter your Mailgun API key"
              required
            />
            <Input
              label="Authenticated Sending Domain"
              value={formData.domain}
              onChange={(e) => handleChange('domain', e.target.value)}
              placeholder="e.g., mail.example.com"
              hint="Must match exactly, including subdomains"
              required
            />
            <Select
              label="Region"
              value={formData.region}
              onChange={(e) => handleChange('region', e.target.value as 'us' | 'eu')}
              options={[
                { value: 'us', label: 'Mailgun US' },
                { value: 'eu', label: 'Mailgun EU' },
              ]}
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
