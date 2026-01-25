import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Webhook, MoreHorizontal, Trash2, Settings } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import type { Webhook as WebhookType } from '../../types/webhook'
import { WEBHOOK_EVENTS } from '../../types/webhook'

export function WebhooksPage() {
  const navigate = useNavigate()
  const [webhooks, setWebhooks] = useState<WebhookType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
    confirmLabel: string
  }>({ open: false, title: '', message: '', onConfirm: async () => {}, confirmLabel: '' })
  const [confirmLoading, setConfirmLoading] = useState(false)

  useEffect(() => {
    loadWebhooks()
  }, [])

  async function loadWebhooks() {
    try {
      const { data } = await api.get<WebhookType[]>('/api/resthooks')
      setWebhooks(data)
    } catch (err) {
      console.error('Failed to load webhooks:', err)
      toast.error('Failed to load webhooks')
    } finally {
      setIsLoading(false)
    }
  }

  const getEventLabel = (event: string): string => {
    const eventInfo = WEBHOOK_EVENTS.find((e) => e.value === event)
    return eventInfo?.label || event
  }

  const handleCreate = () => {
    navigate('/integrations/webhooks/edit?id=new')
  }

  const handleDelete = (webhook: WebhookType) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Webhook',
      message: `Are you sure you want to delete "${webhook.name || webhook.target_url}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await api.delete(`/api/resthooks/${webhook.id}`)
          toast.success('Webhook deleted')
          setWebhooks(webhooks.filter((w) => w.id !== webhook.id))
        } catch {
          toast.error('Failed to delete webhook')
        }
      },
    })
    setOpenMenu(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Webhooks</h1>
          <p className="mt-1 text-sm text-text-muted">
            Send real-time notifications to external services when events occur
          </p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
          Create Webhook
        </Button>
      </div>

      <LoadingOverlay loading={isLoading}>
        {webhooks.length === 0 ? (
          <EmptyState
            icon={<Webhook className="h-12 w-12" />}
            title="No webhooks"
            description="Create a webhook to send event notifications to your applications."
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
                Create Webhook
              </Button>
            }
          />
        ) : (
          <div className="card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50 text-left text-sm font-medium text-text-secondary">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">URL</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((webhook) => (
                  <tr
                    key={webhook.id}
                    className="border-b border-border last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/integrations/webhooks/edit?id=${webhook.id}`)}
                        className="text-left"
                      >
                        <span className="font-medium text-text-primary hover:text-brand-primary">
                          {webhook.name || 'Unnamed webhook'}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-text-muted">
                        {webhook.target_url.length > 50
                          ? webhook.target_url.substring(0, 50) + '...'
                          : webhook.target_url}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {getEventLabel(webhook.event)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setOpenMenu(openMenu === webhook.id ? null : webhook.id)}
                          className="rounded-md p-1 text-text-muted hover:bg-gray-100 hover:text-text-primary"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>

                        {openMenu === webhook.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenu(null)}
                            />
                            <div className="absolute right-0 z-20 mt-1 w-40 rounded-md border border-border bg-white py-1 shadow-lg">
                              <button
                                onClick={() => {
                                  navigate(`/integrations/webhooks/edit?id=${webhook.id}`)
                                  setOpenMenu(null)
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary hover:bg-gray-50"
                              >
                                <Settings className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(webhook)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </LoadingOverlay>

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        confirmVariant="danger"
        loading={confirmLoading}
        onConfirm={async () => {
          setConfirmLoading(true)
          try {
            await confirmDialog.onConfirm()
          } finally {
            setConfirmLoading(false)
            setConfirmDialog((prev) => ({ ...prev, open: false }))
          }
        }}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      />
    </div>
  )
}
