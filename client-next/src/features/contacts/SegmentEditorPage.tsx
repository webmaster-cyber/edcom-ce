import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Calculator, Loader2 } from 'lucide-react'
import api from '../../config/api'
import { usePolling } from '../../hooks/usePolling'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { SegmentRuleBuilder } from './SegmentRuleBuilder'
import type { Segment, SegmentGroup, SegmentFormData } from '../../types/contact'

const INITIAL_RULES: SegmentGroup = {
  logic: 'and',
  rules: [],
}

const INITIAL_DATA: SegmentFormData = {
  name: '',
  rules: INITIAL_RULES,
  subset_enabled: false,
  subset_type: 'percent',
  subset_value: 10,
  subset_sort: 'random',
}

export function SegmentEditorPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || ''
  const isNew = id === 'new'

  const [data, setData] = useState<SegmentFormData>(INITIAL_DATA)
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)

  // Reference data
  const [lists, setLists] = useState<{ id: string; name: string }[]>([])
  const [broadcasts, setBroadcasts] = useState<{ id: string; name: string }[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [fields, setFields] = useState<string[]>([])

  // Calculation state
  const [isCalculating, setIsCalculating] = useState(false)
  const [calculatedCount, setCalculatedCount] = useState<number | null>(null)
  const [calcId, setCalcId] = useState<string | null>(null)

  // Load segment and reference data
  useEffect(() => {
    async function load() {
      try {
        const [listsRes, tagsRes, fieldsRes, broadcastsRes] = await Promise.all([
          api.get<{ id: string; name: string }[]>('/api/lists').catch(() => ({ data: [] })),
          api.get<string[]>('/api/recenttags').catch(() => ({ data: [] })),
          api.get<string[]>('/api/allfields').catch(() => ({ data: [] })),
          api.get<{ broadcasts: { id: string; name: string }[] }>('/api/broadcasts?search=').catch(() => ({ data: { broadcasts: [] } })),
        ])
        setLists(listsRes.data)
        setTags(tagsRes.data)
        setFields(fieldsRes.data)
        setBroadcasts(broadcastsRes.data.broadcasts || [])

        if (!isNew) {
          const { data: segment } = await api.get<Segment>(`/api/segments/${id}`)
          setData({
            name: segment.name,
            rules: segment.rules || INITIAL_RULES,
            subset_enabled: !!segment.subset,
            subset_type: segment.subset?.type || 'percent',
            subset_value: segment.subset?.value || 10,
            subset_sort: segment.subset?.sort || 'random',
          })
          setCalculatedCount(segment.count ?? null)
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id, isNew])

  // Handle save
  const handleSave = async () => {
    if (!data.name.trim()) {
      toast.error('Segment name is required')
      return
    }

    if (data.rules.rules.length === 0) {
      toast.error('Add at least one rule')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        name: data.name.trim(),
        rules: data.rules,
        subset: data.subset_enabled
          ? {
              type: data.subset_type,
              value: data.subset_value,
              sort: data.subset_sort,
            }
          : null,
      }

      if (isNew) {
        const { data: result } = await api.post<{ id: string }>('/api/segments', payload)
        toast.success('Segment created')
        navigate(`/segments/edit?id=${result.id}`, { replace: true })
      } else {
        await api.patch(`/api/segments/${id}`, payload)
        toast.success('Segment saved')
      }
    } catch {
      toast.error('Failed to save segment')
    } finally {
      setIsSaving(false)
    }
  }

  // Calculate count
  const handleCalculate = async () => {
    if (data.rules.rules.length === 0) {
      toast.error('Add at least one rule first')
      return
    }

    setIsCalculating(true)
    setCalculatedCount(null)

    try {
      // For new segments, we need to save first or use a temp calculation
      if (isNew) {
        // Create segment first
        const { data: result } = await api.post<{ id: string }>('/api/segments', {
          name: data.name.trim() || 'Untitled Segment',
          rules: data.rules,
          subset: data.subset_enabled
            ? {
                type: data.subset_type,
                value: data.subset_value,
                sort: data.subset_sort,
              }
            : null,
        })
        navigate(`/segments/edit?id=${result.id}`, { replace: true })
        setCalcId(result.id)
      } else {
        // Save changes first
        await api.patch(`/api/segments/${id}`, {
          name: data.name.trim(),
          rules: data.rules,
          subset: data.subset_enabled
            ? {
                type: data.subset_type,
                value: data.subset_value,
                sort: data.subset_sort,
              }
            : null,
        })
        setCalcId(id)
      }
    } catch {
      toast.error('Failed to start calculation')
      setIsCalculating(false)
    }
  }

  // Poll for calculation result
  usePolling({
    callback: async () => {
      if (!calcId) return
      try {
        const { data: segment } = await api.get<Segment>(`/api/segments/${calcId}`)
        if (!segment.calculating) {
          setIsCalculating(false)
          setCalculatedCount(segment.count ?? null)
          setCalcId(null)
        }
      } catch {
        setIsCalculating(false)
        setCalcId(null)
      }
    },
    intervalMs: 2000,
    enabled: isCalculating && !!calcId,
  })

  const update = useCallback((updates: Partial<SegmentFormData>) => {
    setData((prev) => ({ ...prev, ...updates }))
    setCalculatedCount(null) // Reset count when rules change
  }, [])

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/segments')}
          className="rounded-md p-1.5 text-text-muted hover:bg-gray-100 hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-text-primary">
          {isNew ? 'Create Segment' : 'Edit Segment'}
        </h1>
      </div>

      <LoadingOverlay loading={isLoading}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main editor */}
          <div className="space-y-6 lg:col-span-2">
            {/* Name */}
            <div className="card p-6">
              <Input
                label="Segment Name"
                value={data.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="e.g., Active Subscribers"
              />
            </div>

            {/* Rules */}
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-medium text-text-primary">Rules</h2>
              <p className="mb-4 text-sm text-text-secondary">
                Define the criteria for contacts to be included in this segment.
              </p>

              <SegmentRuleBuilder
                group={data.rules}
                onChange={(rules) => update({ rules })}
                fields={fields}
                lists={lists}
                broadcasts={broadcasts}
                tags={tags}
              />
            </div>

            {/* Subset */}
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="subset_enabled"
                  checked={data.subset_enabled}
                  onChange={(e) => update({ subset_enabled: e.target.checked })}
                  className="rounded text-primary"
                />
                <label htmlFor="subset_enabled" className="text-sm font-medium text-text-primary">
                  Limit to a subset of matching contacts
                </label>
              </div>

              {data.subset_enabled && (
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-secondary">
                      Type
                    </label>
                    <select
                      value={data.subset_type}
                      onChange={(e) => update({ subset_type: e.target.value as 'percent' | 'count' })}
                      className="input w-full"
                    >
                      <option value="percent">Percentage</option>
                      <option value="count">Fixed count</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-secondary">
                      {data.subset_type === 'percent' ? 'Percentage' : 'Count'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={data.subset_type === 'percent' ? 100 : undefined}
                      value={data.subset_value}
                      onChange={(e) => update({ subset_value: parseInt(e.target.value) || 1 })}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-secondary">
                      Selection
                    </label>
                    <select
                      value={data.subset_sort}
                      onChange={(e) => update({ subset_sort: e.target.value })}
                      className="input w-full"
                    >
                      <option value="random">Random</option>
                      <option value="newest">Newest first</option>
                      <option value="oldest">Oldest first</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Count */}
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-medium text-text-primary">Segment Size</h2>

              {isCalculating ? (
                <div className="flex items-center gap-2 text-info">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Calculating...</span>
                </div>
              ) : calculatedCount !== null ? (
                <div className="text-3xl font-semibold text-text-primary">
                  {calculatedCount.toLocaleString()}
                  <span className="ml-2 text-base font-normal text-text-muted">contacts</span>
                </div>
              ) : (
                <p className="text-sm text-text-muted">
                  Calculate to see how many contacts match your criteria.
                </p>
              )}

              <Button
                variant="secondary"
                icon={<Calculator className="h-4 w-4" />}
                onClick={handleCalculate}
                loading={isCalculating}
                disabled={data.rules.rules.length === 0}
                className="mt-4 w-full"
              >
                Calculate Count
              </Button>
            </div>

            {/* Save */}
            <div className="card p-6">
              <div className="space-y-3">
                <Button onClick={handleSave} loading={isSaving} className="w-full">
                  {isNew ? 'Create Segment' : 'Save Changes'}
                </Button>
                <Button variant="secondary" onClick={() => navigate('/segments')} className="w-full">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </LoadingOverlay>
    </div>
  )
}
