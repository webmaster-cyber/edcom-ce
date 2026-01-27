import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, FileText } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { ActionMenu } from '../../components/ui/ActionMenu'
import { Badge } from '../../components/ui/Badge'
import type { DeliveryPolicy } from '../../types/admin'

export function PoliciesPage() {
  const navigate = useNavigate()
  const [policies, setPolicies] = useState<DeliveryPolicy[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    policy: DeliveryPolicy | null
  }>({ open: false, policy: null })
  const [isDeleting, setIsDeleting] = useState(false)

  const reload = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get<DeliveryPolicy[]>('/api/policies')
      setPolicies(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const handleCreate = () => {
    navigate('/admin/policies/edit?id=new')
  }

  const handleEdit = (id: string) => {
    navigate(`/admin/policies/edit?id=${id}`)
  }

  const handleDelete = async () => {
    if (!deleteDialog.policy) return
    setIsDeleting(true)
    try {
      await api.delete(`/api/policies/${deleteDialog.policy.id}`)
      toast.success('Policy deleted')
      setDeleteDialog({ open: false, policy: null })
      await reload()
    } catch {
      toast.error('Failed to delete policy. It may be in use by a route.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePublish = async (policy: DeliveryPolicy) => {
    try {
      await api.post(`/api/policies/${policy.id}/publish`)
      toast.success('Policy published')
      await reload()
    } catch {
      toast.error('Failed to publish policy')
    }
  }

  const handleRevert = async (policy: DeliveryPolicy) => {
    try {
      await api.post(`/api/policies/${policy.id}/revert`)
      toast.success('Policy reverted to published version')
      await reload()
    } catch {
      toast.error('Failed to revert policy')
    }
  }

  const handleDuplicate = async (policy: DeliveryPolicy) => {
    try {
      const { data } = await api.post<string>(`/api/policies/${policy.id}/duplicate`)
      toast.success('Policy duplicated')
      navigate(`/admin/policies/edit?id=${data}`)
    } catch {
      toast.error('Failed to duplicate policy')
    }
  }

  const getActions = (policy: DeliveryPolicy) => {
    const actions: { label: string; onClick: () => void; variant?: 'default' | 'danger' }[] = [
      { label: 'Edit', onClick: () => handleEdit(policy.id) },
      { label: 'Duplicate', onClick: () => handleDuplicate(policy) },
    ]

    if (policy.dirty) {
      actions.push({ label: 'Publish', onClick: () => handlePublish(policy) })
      if (policy.published) {
        actions.push({ label: 'Revert', onClick: () => handleRevert(policy) })
      }
    }

    actions.push({
      label: 'Delete',
      onClick: () => setDeleteDialog({ open: true, policy }),
      variant: 'danger',
    })

    return actions
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Delivery Policies</h1>
        <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
          Add Policy
        </Button>
      </div>

      <LoadingOverlay loading={isLoading}>
        {policies.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-10 w-10" />}
            title="No delivery policies"
            description="Create a delivery policy to control how emails are delivered."
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
                Add Policy
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
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-text-muted">
                    Domains
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Modified
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
                {policies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleEdit(policy.id)}
                        className="font-medium text-primary hover:underline"
                      >
                        {policy.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-100 px-2 text-xs font-medium">
                        {policy.domaincount || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {formatDate(policy.modified)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {policy.dirty ? (
                        <Badge variant="warning">Unpublished</Badge>
                      ) : (
                        <Badge variant="success">Published</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ActionMenu items={getActions(policy)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </LoadingOverlay>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, policy: null })}
        onConfirm={handleDelete}
        title="Delete Policy"
        confirmLabel="Delete"
        variant="danger"
        loading={isDeleting}
      >
        Are you sure you want to delete <strong>{deleteDialog.policy?.name}</strong>? This
        action cannot be undone.
      </ConfirmDialog>
    </div>
  )
}
