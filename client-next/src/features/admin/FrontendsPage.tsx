import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Settings } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { ActionMenu } from '../../components/ui/ActionMenu'
import type { Frontend } from '../../types/admin'

export function FrontendsPage() {
  const navigate = useNavigate()

  const [frontends, setFrontends] = useState<Frontend[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    frontend: Frontend | null
  }>({ open: false, frontend: null })
  const [isDeleting, setIsDeleting] = useState(false)

  const reload = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get<Frontend[]>('/api/frontends')
      setFrontends(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const handleCreate = () => {
    navigate('/admin/frontends/edit?id=new')
  }

  const handleEdit = (id: string) => {
    navigate(`/admin/frontends/edit?id=${id}`)
  }

  const handleDelete = async () => {
    if (!deleteDialog.frontend) return
    setIsDeleting(true)
    try {
      await api.delete(`/api/frontends/${deleteDialog.frontend.id}`)
      toast.success('Frontend deleted')
      setDeleteDialog({ open: false, frontend: null })
      await reload()
    } catch {
      toast.error('Failed to delete frontend')
    } finally {
      setIsDeleting(false)
    }
  }

  const getActions = (frontend: Frontend) => [
    { label: 'Edit', onClick: () => handleEdit(frontend.id) },
    {
      label: 'Delete',
      onClick: () => setDeleteDialog({ open: true, frontend }),
      variant: 'danger' as const,
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Frontend Configuration</h1>
        <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
          Add Configuration
        </Button>
      </div>

      <LoadingOverlay loading={isLoading}>
        {frontends.length === 0 ? (
          <EmptyState
            icon={<Settings className="h-10 w-10" />}
            title="No frontend configurations"
            description="Create a frontend configuration to customize branding and settings."
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
                Add Configuration
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
                    Approval
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Trial
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {frontends.map((frontend) => (
                  <tr key={frontend.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleEdit(frontend.id)}
                        className="font-medium text-primary hover:underline"
                      >
                        {frontend.name}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {frontend.useapprove ? (
                        <span className="badge badge-info">Required</span>
                      ) : (
                        <span className="text-sm text-text-muted">Not required</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {frontend.usetrial ? (
                        <span className="text-sm">
                          {frontend.trialdays} day{frontend.trialdays !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-sm text-text-muted">Disabled</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ActionMenu items={getActions(frontend)} />
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
        onClose={() => setDeleteDialog({ open: false, frontend: null })}
        onConfirm={handleDelete}
        title="Delete Frontend"
        confirmLabel="Delete"
        variant="danger"
        loading={isDeleting}
      >
        Are you sure you want to delete <strong>{deleteDialog.frontend?.name}</strong>? This
        action cannot be undone.
      </ConfirmDialog>
    </div>
  )
}
