import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Layers, Loader2, Copy } from 'lucide-react'
import api from '../../config/api'
import { useAuth } from '../../contexts/AuthContext'
import { usePolling } from '../../hooks/usePolling'
import { Button } from '../../components/ui/Button'
import { ActionMenu } from '../../components/ui/ActionMenu'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import type { Segment } from '../../types/contact'

export function SegmentsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [segments, setSegments] = useState<Segment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
    confirmLabel: string
  }>({ open: false, title: '', message: '', onConfirm: async () => {}, confirmLabel: '' })
  const [confirmLoading, setConfirmLoading] = useState(false)

  // Load segments
  const reload = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const { data } = await api.get<Segment[]>('/api/segments')
      setSegments(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  // Poll for calculating segments
  const hasCalculating = segments.some((s) => s.calculating)
  usePolling({
    callback: () => reload(true),
    intervalMs: 3000,
    enabled: hasCalculating,
  })

  // Actions
  const handleDuplicate = async (segment: Segment) => {
    try {
      await api.post(`/api/segments/${segment.id}/duplicate`)
      toast.success('Segment duplicated')
      await reload()
    } catch {
      toast.error('Failed to duplicate segment')
    }
  }

  const handleExport = async (segment: Segment) => {
    try {
      await api.post(`/api/segments/${segment.id}/export`)
      toast.success('Export started. Download from Data Exports page.')
    } catch {
      toast.error('Failed to start export')
    }
  }

  const handleTag = async (segment: Segment) => {
    // For now, just navigate to a tag modal or show a prompt
    const tagName = window.prompt('Enter tag name to apply to all contacts in this segment:')
    if (!tagName) return

    try {
      await api.post(`/api/segments/${segment.id}/tag`, { tags: [tagName.trim()] })
      toast.success('Tagging started')
    } catch {
      toast.error('Failed to start tagging')
    }
  }

  const handleDelete = (segment: Segment) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Segment',
      message: `Are you sure you want to delete "${segment.name}"?`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await api.delete(`/api/segments/${segment.id}`)
        toast.success('Segment deleted')
        await reload()
      },
    })
  }

  const handleConfirm = async () => {
    setConfirmLoading(true)
    try {
      await confirmDialog.onConfirm()
    } finally {
      setConfirmLoading(false)
      setConfirmDialog((prev) => ({ ...prev, open: false }))
    }
  }

  const getActions = (segment: Segment) => {
    const items: { label: string; onClick: () => void; variant?: 'default' | 'danger' }[] = [
      { label: 'Edit', onClick: () => navigate(`/segments/edit?id=${segment.id}`) },
      { label: 'Duplicate', onClick: () => handleDuplicate(segment) },
      { label: 'Tag Contacts', onClick: () => handleTag(segment) },
    ]

    if (user && !user.nodataexport) {
      items.push({ label: 'Export', onClick: () => handleExport(segment) })
    }

    items.push({ label: 'Delete', onClick: () => handleDelete(segment), variant: 'danger' })

    return items
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Segments</h1>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/segments/edit?id=new')}>
          Create Segment
        </Button>
      </div>

      {/* Content */}
      <LoadingOverlay loading={isLoading}>
        {segments.length === 0 ? (
          <EmptyState
            icon={<Layers className="h-10 w-10" />}
            title="No segments"
            description="Create a segment to define dynamic contact groups based on rules."
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/segments/edit?id=new')}>
                Create Segment
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {segments.map((segment) => (
              <SegmentCard
                key={segment.id}
                segment={segment}
                actions={getActions(segment)}
                onNavigate={() => navigate(`/segments/edit?id=${segment.id}`)}
              />
            ))}
          </div>
        )}
      </LoadingOverlay>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
        onConfirm={handleConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        loading={confirmLoading}
      />
    </div>
  )
}

interface SegmentCardProps {
  segment: Segment
  actions: { label: string; onClick: () => void; variant?: 'default' | 'danger' }[]
  onNavigate: () => void
}

function SegmentCard({ segment, actions, onNavigate }: SegmentCardProps) {
  const ruleCount = countRules(segment.rules)

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <button
            onClick={onNavigate}
            className="text-sm font-semibold text-text-primary hover:text-primary truncate block text-left"
          >
            {segment.name}
          </button>
        </div>
        <ActionMenu items={actions} />
      </div>

      {/* Count */}
      <div className="mb-3 flex items-center gap-2">
        {segment.calculating ? (
          <div className="flex items-center gap-2 text-sm text-info">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Calculating...</span>
          </div>
        ) : (
          <div className="text-2xl font-semibold text-text-primary">
            {segment.count?.toLocaleString() ?? '-'}
            <span className="ml-1 text-sm font-normal text-text-muted">contacts</span>
          </div>
        )}
      </div>

      {/* Rule summary */}
      <div className="text-xs text-text-muted">
        {ruleCount} rule{ruleCount !== 1 ? 's' : ''}
        {segment.rules.logic && (
          <span className="ml-1">
            ({segment.rules.logic.toUpperCase()})
          </span>
        )}
        {segment.subset && (
          <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5">
            Subset: {segment.subset.type === 'percent' ? `${segment.subset.value}%` : segment.subset.value}
          </span>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-3 flex gap-2 border-t border-border pt-3">
        <button
          onClick={onNavigate}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-xs text-text-secondary hover:bg-gray-50"
        >
          Edit
        </button>
        <button
          onClick={() => actions.find((a) => a.label === 'Duplicate')?.onClick()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-xs text-text-secondary hover:bg-gray-50"
        >
          <Copy className="h-3 w-3" />
          Duplicate
        </button>
      </div>
    </div>
  )
}

// Count rules recursively
function countRules(group: Segment['rules']): number {
  if (!group || !group.rules) return 0
  return group.rules.reduce((count, item) => {
    if ('logic' in item && 'rules' in item) {
      return count + countRules(item)
    }
    return count + 1
  }, 0)
}
