import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import type { SESConnection } from '../../types/admin'

interface FormData {
  name: string
  region: string
  access: string
  secret: string
  domain: string
  linkdomain: string
}

const DEFAULT_FORM: FormData = {
  name: '',
  region: 'us-east-1',
  access: '',
  secret: '',
  domain: '',
  linkdomain: '',
}

export function SESEditPage() {
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
      const { data } = await api.get<SESConnection>(`/api/ses/${id}`)
      setFormData({
        name: data.name || '',
        region: data.region || 'us-east-1',
        access: data.access || '',
        secret: data.secret || '',
        domain: data.domain || '',
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
    return !!(
      formData.name.trim() &&
      formData.region.trim() &&
      formData.access.trim() &&
      formData.secret.trim() &&
      formData.domain.trim()
    )
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSaving(true)
    try {
      if (isNew) {
        await api.post('/api/ses', formData)
        toast.success('SES account created')
      } else {
        await api.patch(`/api/ses/${id}`, formData)
        toast.success('SES account updated')
      }
      navigate('/admin/ses')
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
            onClick={() => navigate('/admin/ses')}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <h1 className="text-xl font-semibold text-text-primary">
            {isNew ? 'Add SES Account' : `Edit SES Account`}
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
              placeholder="e.g., My SES Account"
              required
            />
            <Input
              label="AWS Region"
              value={formData.region}
              onChange={(e) => handleChange('region', e.target.value)}
              placeholder="e.g., us-east-1"
              required
            />
            <Input
              label="AWS Access Key"
              value={formData.access}
              onChange={(e) => handleChange('access', e.target.value)}
              placeholder="Enter your AWS access key"
              required
            />
            <Input
              label="AWS Secret Key"
              type="password"
              value={formData.secret}
              onChange={(e) => handleChange('secret', e.target.value)}
              placeholder="Enter your AWS secret key"
              required
            />
            <Input
              label="Authenticated Sending Domain"
              value={formData.domain}
              onChange={(e) => handleChange('domain', e.target.value)}
              placeholder="e.g., mail.example.com"
              required
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
