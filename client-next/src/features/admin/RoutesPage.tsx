import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Route, Check } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { ActionMenu } from '../../components/ui/ActionMenu'
import { Badge } from '../../components/ui/Badge'
import type { PostalRoute } from '../../types/admin'

export function RoutesPage() {
  const navigate = useNavigate()
  const [routes, setRoutes] = useState<PostalRoute[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    route: PostalRoute | null
  }>({ open: false, route: null })
  const [isDeleting, setIsDeleting] = useState(false)

  const reload = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get<PostalRoute[]>('/api/routes')
      setRoutes(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const handleCreate = () => {
    navigate('/admin/routes/edit?id=new')
  }

  const handleEdit = (id: string) => {
    navigate(`/admin/routes/edit?id=${id}`)
  }

  const handleDelete = async () => {
    if (!deleteDialog.route) return
    setIsDeleting(true)
    try {
      await api.delete(`/api/routes/${deleteDialog.route.id}`)
      toast.success('Route deleted')
      setDeleteDialog({ open: false, route: null })
      await reload()
    } catch {
      toast.error('Failed to delete route. It may be assigned to customers.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePublish = async (route: PostalRoute) => {
    try {
      await api.post(`/api/routes/${route.id}/publish`)
      toast.success('Route published')
      await reload()
    } catch {
      toast.error('Failed to publish route')
    }
  }

  const handleRevert = async (route: PostalRoute) => {
    try {
      await api.post(`/api/routes/${route.id}/revert`)
      toast.success('Route reverted to published version')
      await reload()
    } catch {
      toast.error('Failed to revert route')
    }
  }

  const handleUnpublish = async (route: PostalRoute) => {
    try {
      await api.post(`/api/routes/${route.id}/unpublish`)
      toast.success('Route unpublished')
      await reload()
    } catch {
      toast.error('Failed to unpublish route')
    }
  }

  const handleDuplicate = async (route: PostalRoute) => {
    try {
      const { data } = await api.post<string>(`/api/routes/${route.id}/duplicate`)
      toast.success('Route duplicated')
      navigate(`/admin/routes/edit?id=${data}`)
    } catch {
      toast.error('Failed to duplicate route')
    }
  }

  const getActions = (route: PostalRoute) => {
    const actions: { label: string; onClick: () => void; variant?: 'default' | 'danger' }[] = [
      { label: 'Edit', onClick: () => handleEdit(route.id) },
      { label: 'Duplicate', onClick: () => handleDuplicate(route) },
    ]

    if (route.dirty) {
      actions.push({ label: 'Publish', onClick: () => handlePublish(route) })
      if (route.published) {
        actions.push({ label: 'Revert', onClick: () => handleRevert(route) })
      }
    }

    if (route.published) {
      actions.push({ label: 'Unpublish', onClick: () => handleUnpublish(route) })
    }

    actions.push({
      label: 'Delete',
      onClick: () => setDeleteDialog({ open: true, route }),
      variant: 'danger',
    })

    return actions
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
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
        <h1 className="text-xl font-semibold text-text-primary">Postal Routes</h1>
        <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
          Add Route
        </Button>
      </div>

      <LoadingOverlay loading={isLoading}>
        {routes.length === 0 ? (
          <EmptyState
            icon={<Route className="h-10 w-10" />}
            title="No postal routes"
            description="Create a postal route to configure email delivery routing."
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
                Add Route
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
                    Default
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
                {routes.map((route) => (
                  <tr key={route.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleEdit(route.id)}
                        className="font-medium text-primary hover:underline"
                      >
                        {route.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {route.usedefault && (
                        <Check className="mx-auto h-5 w-5 text-success" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {formatDate(route.modified)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {route.dirty ? (
                        <Badge variant="warning">Unpublished</Badge>
                      ) : (
                        <Badge variant="success">Published</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ActionMenu items={getActions(route)} />
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
        onClose={() => setDeleteDialog({ open: false, route: null })}
        onConfirm={handleDelete}
        title="Delete Route"
        confirmLabel="Delete"
        variant="danger"
        loading={isDeleting}
      >
        Are you sure you want to delete <strong>{deleteDialog.route?.name}</strong>? This
        action cannot be undone.
      </ConfirmDialog>
    </div>
  )
}
