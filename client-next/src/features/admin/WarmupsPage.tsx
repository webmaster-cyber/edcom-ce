import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Flame, Check, AlertCircle } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { ActionMenu } from '../../components/ui/ActionMenu'
import { Badge } from '../../components/ui/Badge'
import type { Warmup } from '../../types/admin'

export function WarmupsPage() {
  const navigate = useNavigate()
  const [warmups, setWarmups] = useState<Warmup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    warmup: Warmup | null
  }>({ open: false, warmup: null })
  const [isDeleting, setIsDeleting] = useState(false)

  const reload = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get<Warmup[]>('/api/warmups')
      setWarmups(data.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const handleCreate = () => {
    navigate('/admin/warmups/edit?id=new')
  }

  const handleEdit = (id: string) => {
    navigate(`/admin/warmups/edit?id=${id}`)
  }

  const handleDelete = async () => {
    if (!deleteDialog.warmup) return
    setIsDeleting(true)
    try {
      await api.delete(`/api/warmups/${deleteDialog.warmup.id}`)
      toast.success('Warmup schedule deleted')
      setDeleteDialog({ open: false, warmup: null })
      await reload()
    } catch {
      toast.error('Failed to delete warmup schedule')
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePublish = async (warmup: Warmup) => {
    try {
      await api.post(`/api/warmups/${warmup.id}/publish`)
      toast.success('Warmup schedule published')
      await reload()
    } catch {
      toast.error('Failed to publish warmup schedule')
    }
  }

  const handleRevert = async (warmup: Warmup) => {
    try {
      await api.post(`/api/warmups/${warmup.id}/revert`)
      toast.success('Warmup schedule reverted')
      await reload()
    } catch {
      toast.error('Failed to revert warmup schedule')
    }
  }

  const handleEnable = async (warmup: Warmup) => {
    try {
      await api.post(`/api/warmups/${warmup.id}/enable`)
      toast.success('Warmup schedule enabled')
      await reload()
    } catch {
      toast.error('Failed to enable warmup schedule')
    }
  }

  const handleDisable = async (warmup: Warmup) => {
    try {
      await api.post(`/api/warmups/${warmup.id}/disable`)
      toast.success('Warmup schedule disabled')
      await reload()
    } catch {
      toast.error('Failed to disable warmup schedule')
    }
  }

  const handleDuplicate = async (warmup: Warmup) => {
    try {
      const { data } = await api.post<string>(`/api/warmups/${warmup.id}/duplicate`)
      toast.success('Warmup schedule duplicated')
      navigate(`/admin/warmups/edit?id=${data}`)
    } catch {
      toast.error('Failed to duplicate warmup schedule')
    }
  }

  const getActions = (warmup: Warmup) => {
    const actions: { label: string; onClick: () => void; variant?: 'default' | 'danger' }[] = [
      { label: 'Edit', onClick: () => handleEdit(warmup.id) },
    ]

    if (warmup.dirty) {
      actions.push({ label: 'Publish', onClick: () => handlePublish(warmup) })
      if (warmup.published) {
        actions.push({ label: 'Revert', onClick: () => handleRevert(warmup) })
      }
    }

    actions.push({ label: 'Duplicate', onClick: () => handleDuplicate(warmup) })

    if (warmup.disabled) {
      actions.push({ label: 'Enable', onClick: () => handleEnable(warmup) })
    } else {
      actions.push({ label: 'Disable', onClick: () => handleDisable(warmup) })
    }

    actions.push({
      label: 'Delete',
      onClick: () => setDeleteDialog({ open: true, warmup }),
      variant: 'danger',
    })

    return actions
  }

  const getStatus = (warmup: Warmup) => {
    if (warmup.disabled) {
      return { label: 'Disabled', variant: 'default' as const, icon: null }
    }
    if (warmup.dirty) {
      return { label: 'Unpublished', variant: 'warning' as const, icon: <AlertCircle className="h-3 w-3" /> }
    }
    return { label: 'Published', variant: 'success' as const, icon: <Check className="h-3 w-3" /> }
  }

  const countIPs = (ips?: string) => {
    if (!ips) return 0
    return ips.split('\n').filter((ip) => ip.trim()).length
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">IP Warmup Schedules</h1>
        <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
          Add Warmup Schedule
        </Button>
      </div>

      <LoadingOverlay loading={isLoading}>
        {warmups.length === 0 ? (
          <EmptyState
            icon={<Flame className="h-10 w-10" />}
            title="No warmup schedules"
            description="Create a warmup schedule to gradually increase sending volume from new IPs."
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
                Add Warmup Schedule
              </Button>
            }
          />
        ) : (
          <div className="card overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Server
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-text-muted">
                    IPs
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-text-muted">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {warmups.map((warmup) => {
                  const status = getStatus(warmup)
                  return (
                    <tr key={warmup.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleEdit(warmup.id)}
                          className="font-medium text-primary hover:underline"
                        >
                          {warmup.name}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {warmup.sinkname || '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {countIPs(warmup.ips)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={status.variant}>
                          <span className="flex items-center gap-1">
                            {status.icon}
                            {status.label}
                          </span>
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ActionMenu items={getActions(warmup)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </LoadingOverlay>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, warmup: null })}
        onConfirm={handleDelete}
        title="Delete Warmup Schedule"
        confirmLabel="Delete"
        variant="danger"
        loading={isDeleting}
      >
        Are you sure you want to delete <strong>{deleteDialog.warmup?.name}</strong>? This
        action cannot be undone.
      </ConfirmDialog>
    </div>
  )
}
