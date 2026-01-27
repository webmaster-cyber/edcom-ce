import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import type { Warmup, Server } from '../../types/admin'

interface FormData {
  name: string
  sink: string
  ips: string
  excludeips: string
  domains: string
  excludedomains: string
  priority: 'low' | 'med' | 'high'
  dailylimit: number
  limitcount: number
  rampfactor: number
  threshold: number
  thresholddays: number
  dayoverrides: Record<string, number>
  afterlimit: 'warmup' | 'policy'
}

const DEFAULT_FORM: FormData = {
  name: '',
  sink: '',
  ips: '',
  excludeips: '',
  domains: '*',
  excludedomains: '',
  priority: 'low',
  dailylimit: 200,
  limitcount: 14,
  rampfactor: 100,
  threshold: 80,
  thresholddays: 1,
  dayoverrides: {},
  afterlimit: 'warmup',
}

export function WarmupEditPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || 'new'
  const isNew = id === 'new'

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM)
  const [servers, setServers] = useState<Server[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [hasPublished, setHasPublished] = useState(false)

  const reload = useCallback(async () => {
    if (isNew) return
    setIsLoading(true)
    try {
      const { data } = await api.get<Warmup>(`/api/warmups/${id}`)
      setFormData({
        name: data.name || '',
        sink: data.sink || '',
        ips: data.ips || '',
        excludeips: data.excludeips || '',
        domains: data.domains || '*',
        excludedomains: data.excludedomains || '',
        priority: data.priority || 'low',
        dailylimit: data.dailylimit ?? 200,
        limitcount: data.limitcount ?? 14,
        rampfactor: data.rampfactor ?? 100,
        threshold: data.threshold ?? 80,
        thresholddays: data.thresholddays ?? 1,
        dayoverrides: data.dayoverrides || {},
        afterlimit: data.afterlimit || 'warmup',
      })
      setIsDirty(data.dirty ?? false)
      setHasPublished(!!data.published)
    } finally {
      setIsLoading(false)
    }
  }, [id, isNew])

  const loadServers = useCallback(async () => {
    try {
      const { data } = await api.get<Server[]>('/api/sinks')
      setServers(data.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())))
    } catch {
      // Ignore
    }
  }, [])

  useEffect(() => {
    reload()
    loadServers()
  }, [reload, loadServers])

  const handleChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Calculate schedule preview
  const schedulePreview = useMemo(() => {
    const schedule: { day: number; limit: number }[] = []
    let limit = formData.dailylimit

    for (let i = 0; i <= formData.limitcount; i++) {
      const override = formData.dayoverrides[i.toString()]
      const displayLimit = override !== undefined ? override : limit

      schedule.push({ day: i, limit: displayLimit })

      if (i < formData.limitcount) {
        // Calculate next limit based on ramp factor
        const factor = formData.rampfactor / 100
        limit = Math.floor(limit * (1 + factor))
        // Round to nice numbers
        if (limit > 1000) {
          limit = Math.floor(limit / 100) * 100
        } else if (limit > 100) {
          limit = Math.floor(limit / 10) * 10
        }
      }
    }

    return schedule
  }, [formData.dailylimit, formData.limitcount, formData.rampfactor, formData.dayoverrides])

  const handleDayOverride = (day: number, value: string) => {
    const numValue = parseInt(value)
    setFormData((prev) => {
      const newOverrides = { ...prev.dayoverrides }
      if (isNaN(numValue) || value === '') {
        delete newOverrides[day.toString()]
      } else {
        newOverrides[day.toString()] = numValue
      }
      return { ...prev, dayoverrides: newOverrides }
    })
  }

  const validateForm = (): boolean => {
    return !!(formData.name.trim() && formData.sink && formData.ips.trim())
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSaving(true)
    try {
      if (isNew) {
        const { data } = await api.post<string>('/api/warmups', formData)
        toast.success('Warmup schedule created')
        navigate(`/admin/warmups/edit?id=${data}`)
      } else {
        await api.patch(`/api/warmups/${id}`, formData)
        toast.success('Warmup schedule updated')
        await reload()
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { description?: string } } }).response?.data?.description
          : 'Unknown error'
      toast.error(`Failed to save: ${message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    try {
      await api.post(`/api/warmups/${id}/publish`)
      toast.success('Warmup schedule published')
      await reload()
    } catch {
      toast.error('Failed to publish warmup schedule')
    }
  }

  const handleRevert = async () => {
    try {
      await api.post(`/api/warmups/${id}/revert`)
      toast.success('Warmup schedule reverted')
      await reload()
    } catch {
      toast.error('Failed to revert warmup schedule')
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
            onClick={() => navigate('/admin/warmups')}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <h1 className="text-xl font-semibold text-text-primary">
            {isNew ? 'Create Warmup Schedule' : 'Edit Warmup Schedule'}
          </h1>
          {!isNew && isDirty && (
            <span className="rounded bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
              Unpublished Changes
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isNew && isDirty && (
            <Button variant="secondary" onClick={handlePublish}>
              Publish
            </Button>
          )}
          {!isNew && hasPublished && isDirty && (
            <Button variant="secondary" onClick={handleRevert}>
              Revert
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            loading={isSaving}
            disabled={!validateForm()}
            icon={<Save className="h-4 w-4" />}
          >
            Save
          </Button>
        </div>
      </div>

      <LoadingOverlay loading={isLoading}>
        <div className="space-y-6">
          {/* Warning Banner */}
          <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <span className="text-sm font-medium text-warning">
              Warmup limits always override delivery policy limits
            </span>
          </div>

          {/* Basic Information */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-medium text-text-primary">Basic Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Schedule Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Gmail Warmup"
                required
              />
              <Select
                label="Server"
                value={formData.sink}
                onChange={(e) => handleChange('sink', e.target.value)}
                options={[
                  { value: '', label: 'Select a server...' },
                  ...servers.map((s) => ({ value: s.id, label: s.name })),
                ]}
                required
              />
              <Input
                label="IPs to Warm Up"
                value={formData.ips}
                onChange={(e) => handleChange('ips', e.target.value)}
                placeholder="One IP per line"
                multiline
                rows={4}
                required
              />
              <Input
                label="Exclude IPs"
                value={formData.excludeips}
                onChange={(e) => handleChange('excludeips', e.target.value)}
                placeholder="One IP per line (optional)"
                multiline
                rows={4}
              />
            </div>
          </div>

          {/* Domain Configuration */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-medium text-text-primary">Domain Configuration</h2>
            <p className="mb-4 text-sm text-text-secondary">
              Wildcards accepted, e.g.: <code className="rounded bg-gray-100 px-1">yahoo.*</code> specifies all yahoo TLDs
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Domains to Warm Up"
                value={formData.domains}
                onChange={(e) => handleChange('domains', e.target.value)}
                placeholder="* for all domains, or one per line"
                multiline
                rows={3}
              />
              <Input
                label="Exclude Domains"
                value={formData.excludedomains}
                onChange={(e) => handleChange('excludedomains', e.target.value)}
                placeholder="One domain per line (optional)"
                multiline
                rows={3}
              />
            </div>
          </div>

          {/* Warmup Strategy */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-medium text-text-primary">Warmup Strategy</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Select
                label="Warmup Priority"
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value as 'low' | 'med' | 'high')}
                options={[
                  { value: 'low', label: 'Default' },
                  { value: 'med', label: 'Higher' },
                  { value: 'high', label: 'Highest' },
                ]}
              />
              <Input
                label="Initial Daily Limit"
                type="number"
                min={1}
                value={formData.dailylimit}
                onChange={(e) => handleChange('dailylimit', parseInt(e.target.value) || 200)}
              />
              <Input
                label="Number of Increases"
                type="number"
                min={1}
                max={30}
                value={formData.limitcount}
                onChange={(e) => handleChange('limitcount', parseInt(e.target.value) || 14)}
              />
              <Input
                label="Increase by (%)"
                type="number"
                min={1}
                max={1000}
                value={formData.rampfactor}
                onChange={(e) => handleChange('rampfactor', parseInt(e.target.value) || 100)}
                hint="Percentage to increase limit"
              />
              <Input
                label="Threshold (%)"
                type="number"
                min={1}
                max={100}
                value={formData.threshold}
                onChange={(e) => handleChange('threshold', parseInt(e.target.value) || 80)}
                hint="Delivery success % before increasing"
              />
              <Input
                label="Days at Threshold"
                type="number"
                min={1}
                max={20}
                value={formData.thresholddays}
                onChange={(e) => handleChange('thresholddays', parseInt(e.target.value) || 1)}
                hint="Days at threshold before increase"
              />
            </div>
            <div className="mt-4">
              <Select
                label="After Final Increase"
                value={formData.afterlimit}
                onChange={(e) => handleChange('afterlimit', e.target.value as 'warmup' | 'policy')}
                options={[
                  { value: 'warmup', label: 'Keep final warmup limit' },
                  { value: 'policy', label: 'End warmup and use policy limit' },
                ]}
              />
            </div>
          </div>

          {/* Schedule Preview */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-medium text-text-primary">Warmup Schedule Preview</h2>
            <p className="mb-4 text-sm text-text-secondary">
              Edit individual day limits below to override the calculated values.
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                      Increase #
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                      Send Limit
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {schedulePreview.map((row) => (
                    <tr key={row.day} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-3 py-2 text-sm">
                        {row.day === 0 ? 'Initial' : row.day}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={formData.dayoverrides[row.day.toString()] ?? row.limit}
                          onChange={(e) => handleDayOverride(row.day, e.target.value)}
                          className="w-32"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </LoadingOverlay>
    </div>
  )
}
