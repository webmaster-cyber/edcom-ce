import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Cloud } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { ActionMenu } from '../../components/ui/ActionMenu'
import type { SESConnection } from '../../types/admin'

export function SESPage() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<SESConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    account: SESConnection | null
  }>({ open: false, account: null })
  const [isDeleting, setIsDeleting] = useState(false)

  const reload = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get<SESConnection[]>('/api/ses')
      setAccounts(data.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const handleCreate = () => {
    navigate('/admin/ses/edit?id=new')
  }

  const handleEdit = (id: string) => {
    navigate(`/admin/ses/edit?id=${id}`)
  }

  const handleDelete = async () => {
    if (!deleteDialog.account) return
    setIsDeleting(true)
    try {
      await api.delete(`/api/ses/${deleteDialog.account.id}`)
      toast.success('SES account deleted')
      setDeleteDialog({ open: false, account: null })
      await reload()
    } catch {
      toast.error('Failed to delete SES account')
    } finally {
      setIsDeleting(false)
    }
  }

  const getActions = (account: SESConnection) => [
    { label: 'Edit', onClick: () => handleEdit(account.id) },
    {
      label: 'Delete',
      onClick: () => setDeleteDialog({ open: true, account }),
      variant: 'danger' as const,
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Amazon SES Accounts</h1>
        <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
          Add SES Account
        </Button>
      </div>

      <LoadingOverlay loading={isLoading}>
        {accounts.length === 0 ? (
          <EmptyState
            icon={<Cloud className="h-10 w-10" />}
            title="No SES accounts"
            description="Add an Amazon SES account to send emails through AWS."
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
                Add SES Account
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <div key={account.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <button
                      onClick={() => handleEdit(account.id)}
                      className="font-medium text-primary hover:underline"
                    >
                      {account.name}
                    </button>
                    <p className="mt-1 text-sm text-text-secondary">{account.domain}</p>
                    <p className="text-xs text-text-muted">{account.region}</p>
                  </div>
                  <ActionMenu items={getActions(account)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </LoadingOverlay>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, account: null })}
        onConfirm={handleDelete}
        title="Delete SES Account"
        confirmLabel="Delete"
        variant="danger"
        loading={isDeleting}
      >
        Are you sure you want to delete <strong>{deleteDialog.account?.name}</strong>? This
        action cannot be undone.
      </ConfirmDialog>
    </div>
  )
}
