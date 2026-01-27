import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Server } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { ActionMenu } from '../../components/ui/ActionMenu'
import type { SMTPRelayConnection } from '../../types/admin'

export function SMTPRelaysPage() {
  const navigate = useNavigate()
  const [relays, setRelays] = useState<SMTPRelayConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    relay: SMTPRelayConnection | null
  }>({ open: false, relay: null })
  const [isDeleting, setIsDeleting] = useState(false)

  const reload = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get<SMTPRelayConnection[]>('/api/smtprelays')
      setRelays(data.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const handleCreate = () => {
    navigate('/admin/smtprelays/edit?id=new')
  }

  const handleEdit = (id: string) => {
    navigate(`/admin/smtprelays/edit?id=${id}`)
  }

  const handleDelete = async () => {
    if (!deleteDialog.relay) return
    setIsDeleting(true)
    try {
      await api.delete(`/api/smtprelays/${deleteDialog.relay.id}`)
      toast.success('SMTP relay deleted')
      setDeleteDialog({ open: false, relay: null })
      await reload()
    } catch {
      toast.error('Failed to delete SMTP relay')
    } finally {
      setIsDeleting(false)
    }
  }

  const getActions = (relay: SMTPRelayConnection) => [
    { label: 'Edit', onClick: () => handleEdit(relay.id) },
    {
      label: 'Delete',
      onClick: () => setDeleteDialog({ open: true, relay }),
      variant: 'danger' as const,
    },
  ]

  const formatSSL = (ssltype: string) => {
    switch (ssltype) {
      case 'ssl': return 'SSL'
      case 'starttls': return 'STARTTLS'
      default: return 'None'
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">SMTP Relays</h1>
        <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
          Add SMTP Relay
        </Button>
      </div>

      <LoadingOverlay loading={isLoading}>
        {relays.length === 0 ? (
          <EmptyState
            icon={<Server className="h-10 w-10" />}
            title="No SMTP relays"
            description="Add an SMTP relay to send emails through a custom SMTP server."
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
                Add SMTP Relay
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relays.map((relay) => (
              <div key={relay.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <button
                      onClick={() => handleEdit(relay.id)}
                      className="font-medium text-primary hover:underline"
                    >
                      {relay.name}
                    </button>
                    <p className="mt-1 text-sm text-text-secondary">
                      {relay.hostname}:{relay.port}
                    </p>
                    <p className="text-xs text-text-muted">
                      {formatSSL(relay.ssltype)}
                      {relay.useauth && ' + Auth'}
                    </p>
                  </div>
                  <ActionMenu items={getActions(relay)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </LoadingOverlay>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, relay: null })}
        onConfirm={handleDelete}
        title="Delete SMTP Relay"
        confirmLabel="Delete"
        variant="danger"
        loading={isDeleting}
      >
        Are you sure you want to delete <strong>{deleteDialog.relay?.name}</strong>? This
        action cannot be undone.
      </ConfirmDialog>
    </div>
  )
}
