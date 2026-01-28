import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Save, Plus, Trash2, Shield } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Checkbox } from '../../components/ui/Checkbox'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import type { Plan, PlanFeature } from '../../types/billing'

// System features that gate functionality — these auto-populate on new plans
const SYSTEM_FEATURES: PlanFeature[] = [
  { name: 'Broadcasts', included: true },
  { name: 'Funnels', included: true },
  { name: 'Transactional', included: true },
  { name: 'Templates', included: true },
  { name: 'Analytics', included: true },
  { name: 'API Access', included: true },
]

const SYSTEM_FEATURE_NAMES = SYSTEM_FEATURES.map((f) => f.name.toLowerCase())

const isSystemFeature = (name: string) => SYSTEM_FEATURE_NAMES.includes(name.toLowerCase())

/** Prepend any missing system features to an existing feature list */
const mergeSystemFeatures = (existing: PlanFeature[]): PlanFeature[] => {
  const names = new Set(existing.map((f) => f.name.toLowerCase()))
  const missing = SYSTEM_FEATURES.filter((sf) => !names.has(sf.name.toLowerCase()))
  return [...missing, ...existing]
}

interface PlanFormData {
  name: string
  slug: string
  description: string
  price_usd: number
  price_zwl: number
  billing_period: 'monthly' | 'yearly'
  subscriber_limit: number | null
  send_limit_monthly: number | null
  features: PlanFeature[]
  trial_days: number
  is_free: boolean
  active: boolean
  sort_order: number
}

const DEFAULT_FORM: PlanFormData = {
  name: '',
  slug: '',
  description: '',
  price_usd: 0,
  price_zwl: 0,
  billing_period: 'monthly',
  subscriber_limit: null,
  send_limit_monthly: null,
  features: [...SYSTEM_FEATURES],
  trial_days: 0,
  is_free: false,
  active: true,
  sort_order: 0,
}

const BILLING_PERIOD_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

export function PlanEditPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || 'new'
  const isNew = id === 'new'

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<PlanFormData>(DEFAULT_FORM)

  const reload = useCallback(async () => {
    if (isNew) return
    setIsLoading(true)
    try {
      const { data } = await api.get<Plan>(`/api/plans/${id}`)
      setFormData({
        name: data.name || '',
        slug: data.slug || '',
        description: data.description || '',
        price_usd: data.price_usd || 0,
        price_zwl: data.price_zwl || 0,
        billing_period: data.billing_period || 'monthly',
        subscriber_limit: data.subscriber_limit,
        send_limit_monthly: data.send_limit_monthly,
        features: mergeSystemFeatures(Array.isArray(data.features) ? data.features : []),
        trial_days: data.trial_days || 0,
        is_free: data.is_free || false,
        active: data.active !== false,
        sort_order: data.sort_order || 0,
      })
    } finally {
      setIsLoading(false)
    }
  }, [id, isNew])

  useEffect(() => {
    reload()
  }, [reload])

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Plan name is required')
      return
    }
    if (!formData.slug.trim()) {
      toast.error('Plan slug is required')
      return
    }

    setIsSaving(true)
    try {
      if (isNew) {
        await api.post('/api/plans', formData)
        toast.success('Plan created')
      } else {
        await api.patch(`/api/plans/${id}`, formData)
        toast.success('Plan saved')
      }
      navigate('/admin/plans')
    } catch {
      toast.error('Failed to save plan')
    } finally {
      setIsSaving(false)
    }
  }

  const updateField = <K extends keyof PlanFormData>(field: K, value: PlanFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const addFeature = () => {
    setFormData((prev) => ({
      ...prev,
      features: [...prev.features, { name: '', included: true }],
    }))
  }

  const updateFeature = (index: number, field: keyof PlanFeature, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.map((f, i) => (i === index ? { ...f, [field]: value } : f)),
    }))
  }

  const removeFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }))
  }

  const moveFeature = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= formData.features.length) return
    setFormData((prev) => {
      const features = [...prev.features]
      const temp = features[index]
      features[index] = features[newIndex]
      features[newIndex] = temp
      return { ...prev, features }
    })
  }

  const autoSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/admin/plans')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold text-text-primary">
          {isNew ? 'New Plan' : 'Edit Plan'}
        </h1>
      </div>

      <LoadingOverlay loading={isLoading}>
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Basic Info */}
          <div className="card space-y-4 p-6">
            <h2 className="text-lg font-medium">Basic Information</h2>
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => {
                updateField('name', e.target.value)
                if (isNew) updateField('slug', autoSlug(e.target.value))
              }}
            />
            <Input
              label="Slug"
              value={formData.slug}
              onChange={(e) => updateField('slug', e.target.value)}
              hint="URL-friendly identifier (e.g. starter, pro, enterprise)"
            />
            <Input
              label="Description"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
            />
            <Input
              label="Sort Order"
              type="number"
              value={String(formData.sort_order)}
              onChange={(e) => updateField('sort_order', parseInt(e.target.value) || 0)}
            />
            <div className="flex gap-4">
              <Checkbox
                label="Active"
                checked={formData.active}
                onChange={(checked) => updateField('active', checked)}
              />
              <Checkbox
                label="Free Plan"
                checked={formData.is_free}
                onChange={(checked) => updateField('is_free', checked)}
              />
            </div>
          </div>

          {/* Pricing */}
          {!formData.is_free && (
            <div className="card space-y-4 p-6">
              <h2 className="text-lg font-medium">Pricing</h2>
              <Select
                label="Billing Period"
                value={formData.billing_period}
                onChange={(e) => updateField('billing_period', e.target.value as 'monthly' | 'yearly')}
                options={BILLING_PERIOD_OPTIONS}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Price (USD)"
                  type="number"
                  value={String(formData.price_usd)}
                  onChange={(e) => updateField('price_usd', parseFloat(e.target.value) || 0)}
                />
                <Input
                  label="Price (ZWL)"
                  type="number"
                  value={String(formData.price_zwl)}
                  onChange={(e) => updateField('price_zwl', parseFloat(e.target.value) || 0)}
                />
              </div>
              <Input
                label="Trial Days"
                type="number"
                value={String(formData.trial_days)}
                onChange={(e) => updateField('trial_days', parseInt(e.target.value) || 0)}
              />
            </div>
          )}

          {/* Limits */}
          <div className="card space-y-4 p-6">
            <h2 className="text-lg font-medium">Limits</h2>
            <Input
              label="Subscriber Limit"
              type="number"
              value={formData.subscriber_limit !== null ? String(formData.subscriber_limit) : ''}
              onChange={(e) =>
                updateField('subscriber_limit', e.target.value ? parseInt(e.target.value) : null)
              }
              hint="Leave empty for unlimited"
            />
            <Input
              label="Monthly Send Limit"
              type="number"
              value={formData.send_limit_monthly !== null ? String(formData.send_limit_monthly) : ''}
              onChange={(e) =>
                updateField('send_limit_monthly', e.target.value ? parseInt(e.target.value) : null)
              }
              hint="Leave empty for unlimited"
            />
          </div>

          {/* Features */}
          <div className="card space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium">Features</h2>
                <p className="text-sm text-text-muted">
                  These appear as the checklist on the sign-up page. System features
                  (<Shield className="inline h-3 w-3" />) control access to functionality.
                </p>
              </div>
              <div className="flex gap-2">
                {SYSTEM_FEATURES.some(
                  (sf) => !formData.features.some((f) => f.name.toLowerCase() === sf.name.toLowerCase())
                ) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Shield className="h-4 w-4" />}
                    onClick={() => {
                      const missing = SYSTEM_FEATURES.filter(
                        (sf) => !formData.features.some((f) => f.name.toLowerCase() === sf.name.toLowerCase())
                      )
                      setFormData((prev) => ({
                        ...prev,
                        features: [...missing, ...prev.features],
                      }))
                    }}
                  >
                    Add System
                  </Button>
                )}
                <Button variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={addFeature}>
                  Add Custom
                </Button>
              </div>
            </div>

            {formData.features.length === 0 && (
              <p className="py-4 text-center text-sm text-text-muted">
                No features added yet.
              </p>
            )}

            <div className="space-y-2">
              {formData.features.map((feature, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 rounded-lg border p-2 ${
                    isSystemFeature(feature.name) ? 'border-primary/20 bg-primary/[0.02]' : 'border-border'
                  }`}
                >
                  <div className="flex flex-col">
                    <button
                      type="button"
                      className="text-text-muted hover:text-text-primary disabled:opacity-30"
                      disabled={index === 0}
                      onClick={() => moveFeature(index, -1)}
                    >
                      <svg className="h-3 w-3" viewBox="0 0 10 6" fill="currentColor"><path d="M5 0L10 6H0z"/></svg>
                    </button>
                    <button
                      type="button"
                      className="text-text-muted hover:text-text-primary disabled:opacity-30"
                      disabled={index === formData.features.length - 1}
                      onClick={() => moveFeature(index, 1)}
                    >
                      <svg className="h-3 w-3" viewBox="0 0 10 6" fill="currentColor"><path d="M5 6L0 0h10z"/></svg>
                    </button>
                  </div>
                  {isSystemFeature(feature.name) && (
                    <Shield className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                  <input
                    type="text"
                    value={feature.name}
                    onChange={(e) => updateFeature(index, 'name', e.target.value)}
                    placeholder="Feature name (e.g. Email broadcasts)"
                    className="flex-1 rounded border-0 bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-0"
                  />
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={feature.included}
                      onChange={(e) => updateFeature(index, 'included', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    Included
                  </label>
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="rounded p-1 text-text-muted hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate('/admin/plans')}>
              Cancel
            </Button>
            <Button icon={<Save className="h-4 w-4" />} onClick={handleSave} loading={isSaving}>
              {isNew ? 'Create Plan' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </LoadingOverlay>
    </div>
  )
}
