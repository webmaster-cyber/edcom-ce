import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Plus,
  Settings,
  Play,
  Pause,
  Clock,
  Mail,
  MousePointer,
  Eye,
} from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ActionMenu } from '../../components/ui/ActionMenu'
import type { Funnel, FunnelMessage } from '../../types/funnel'

export function FunnelMessagesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || ''

  const [funnel, setFunnel] = useState<Funnel | null>(null)
  const [messages, setMessages] = useState<FunnelMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
    confirmLabel: string
    confirmVariant?: 'primary' | 'danger'
  }>({ open: false, title: '', message: '', onConfirm: async () => {}, confirmLabel: '' })
  const [confirmLoading, setConfirmLoading] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [funnelRes, messagesRes] = await Promise.all([
        api.get<Funnel>(`/api/funnels/${id}`),
        api.get<FunnelMessage[]>(`/api/funnels/${id}/messages`),
      ])
      setFunnel(funnelRes.data)
      setMessages(messagesRes.data)
    } catch (err) {
      console.error('Failed to load:', err)
      toast.error('Failed to load funnel')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) loadData()
  }, [id, loadData])

  const handleToggleActive = async () => {
    if (!funnel) return
    try {
      await api.patch(`/api/funnels/${id}`, { active: !funnel.active })
      toast.success(funnel.active ? 'Funnel deactivated' : 'Funnel activated')
      loadData()
    } catch {
      toast.error('Failed to update funnel')
    }
  }

  const handleAddMessage = async () => {
    if (!funnel) return

    try {
      // Create the message
      const { data } = await api.post<{ id: string }>('/api/messages', {
        funnel: id,
        subject: '',
        type: 'wysiwyg',
        initialize: true,
        rawText: '',
        preheader: '',
        parts: [],
        bodyStyle: {},
        who: 'all',
        days: [true, true, true, true, true, true, true],
        dayoffset: -new Date().getTimezoneOffset(),
        supplists: [],
        supptags: [],
        suppsegs: [],
        openaddtags: [],
        openremtags: [],
        clickaddtags: [],
        clickremtags: [],
        sendaddtags: [],
        sendremtags: [],
      })

      // Add message to funnel's messages array
      const currentMessages = funnel.messages || []
      await api.patch(`/api/funnels/${id}`, {
        messages: [
          ...currentMessages,
          {
            id: data.id,
            whennum: messages.length === 0 ? 0 : 1,
            whentype: 'days',
            whentime: '',
            unpublished: true,
            fromname: funnel.fromname || '',
            returnpath: funnel.returnpath || '',
            fromemail: funnel.fromemail || '',
            replyto: funnel.replyto || '',
            msgroute: '',
          },
        ],
      })

      toast.success('Message created')
      navigate(`/funnels/message?id=${data.id}`)
    } catch {
      toast.error('Failed to create message')
    }
  }

  const handleDuplicateMessage = async (message: FunnelMessage) => {
    if (!funnel) return

    try {
      // Duplicate the message
      const { data } = await api.post<{ id: string }>(`/api/messages/${message.id}/duplicate`)

      // Find the original message in the funnel's messages array and duplicate its settings
      const currentMessages = funnel.messages || []
      const originalRef = currentMessages.find((m) => m.id === message.id)

      // Add duplicated message to funnel's messages array
      await api.patch(`/api/funnels/${id}`, {
        messages: [
          ...currentMessages,
          {
            id: data.id,
            whennum: originalRef?.whennum ?? 1,
            whentype: originalRef?.whentype ?? 'days',
            whentime: originalRef?.whentime ?? '',
            unpublished: true,
            fromname: originalRef?.fromname ?? funnel.fromname ?? '',
            returnpath: originalRef?.returnpath ?? funnel.returnpath ?? '',
            fromemail: originalRef?.fromemail ?? funnel.fromemail ?? '',
            replyto: originalRef?.replyto ?? funnel.replyto ?? '',
            msgroute: originalRef?.msgroute ?? '',
          },
        ],
      })

      toast.success('Message duplicated')
      loadData()
    } catch {
      toast.error('Failed to duplicate message')
    }
  }

  const handleDeleteMessage = (message: FunnelMessage) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Message',
      message: `Are you sure you want to delete "${message.subject}"?`,
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      onConfirm: async () => {
        if (!funnel) return
        try {
          // Delete the message
          await api.delete(`/api/messages/${message.id}`)

          // Remove from funnel's messages array
          const currentMessages = funnel.messages || []
          await api.patch(`/api/funnels/${id}`, {
            messages: currentMessages.filter((m) => m.id !== message.id),
          })

          toast.success('Message deleted')
          loadData()
        } catch {
          toast.error('Failed to delete message')
        }
      },
    })
  }

  const getMessageActions = (message: FunnelMessage) => [
    {
      label: 'Edit',
      onClick: () => navigate(`/funnels/message?id=${message.id}`),
    },
    {
      label: 'View Stats',
      onClick: () => navigate(`/funnels/message/stats?id=${message.id}`),
    },
    {
      label: 'Duplicate',
      onClick: () => handleDuplicateMessage(message),
    },
    {
      label: 'Delete',
      onClick: () => handleDeleteMessage(message),
      variant: 'danger' as const,
    },
  ]

  const formatTiming = (message: FunnelMessage, index: number) => {
    if (index === 0) {
      if (message.whennum === 0) {
        return 'Send immediately after entering funnel'
      }
      return `Send ${message.whennum} ${message.whentype} after entering funnel`
    }
    return `Wait ${message.whennum} ${message.whentype} after previous message`
  }

  const formatWho = (who: string) => {
    switch (who) {
      case 'all':
        return 'All contacts'
      case 'openany':
        return 'Opened any previous message'
      case 'openlast':
        return 'Opened last message'
      case 'clickany':
        return 'Clicked any previous message'
      case 'clicklast':
        return 'Clicked last message'
      default:
        return who
    }
  }

  const calcRate = (num: number, denom: number) => {
    if (!denom) return '0%'
    return ((num / denom) * 100).toFixed(1) + '%'
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/funnels')}
            className="rounded-md p-1.5 text-text-muted hover:bg-gray-100 hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">
              {funnel?.name || 'Funnel Messages'}
            </h1>
            <p className="text-sm text-text-muted">
              {messages.length} message{messages.length !== 1 ? 's' : ''} in sequence
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={<Settings className="h-4 w-4" />}
            onClick={() => navigate(`/funnels/settings?id=${id}`)}
          >
            Settings
          </Button>
          {funnel && (
            <Button
              variant={funnel.active ? 'secondary' : 'primary'}
              icon={funnel.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              onClick={handleToggleActive}
            >
              {funnel.active ? 'Deactivate' : 'Activate'}
            </Button>
          )}
        </div>
      </div>

      <LoadingOverlay loading={isLoading}>
        {messages.length === 0 && !isLoading ? (
          <EmptyState
            icon={<Mail className="h-10 w-10" />}
            title="No messages yet"
            description="Add your first message to start building the email sequence."
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={handleAddMessage}>
                Add Message
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={message.id} className="card">
                {/* Timing indicator */}
                <div className="flex items-center gap-2 border-b border-border bg-gray-50 px-4 py-2 text-sm text-text-muted">
                  <Clock className="h-4 w-4" />
                  {formatTiming(message, index)}
                  {index > 0 && (
                    <span className="ml-2 text-xs">
                      ({formatWho(message.who)})
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Subject */}
                      <button
                        onClick={() => navigate(`/funnels/message?id=${message.id}`)}
                        className="text-lg font-medium text-primary hover:underline"
                      >
                        {message.subject || '(No subject)'}
                      </button>

                      {/* Stats */}
                      <div className="mt-3 flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-4 w-4 text-text-muted" />
                          <span className="text-text-secondary">
                            {(message.send || 0).toLocaleString()} sent
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Eye className="h-4 w-4 text-text-muted" />
                          <span className="text-text-secondary">
                            {calcRate(message.opened || 0, message.send || 0)} opened
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MousePointer className="h-4 w-4 text-text-muted" />
                          <span className="text-text-secondary">
                            {calcRate(message.clicked || 0, message.send || 0)} clicked
                          </span>
                        </div>
                        {(message.unsubscribed || 0) > 0 && (
                          <span className="text-warning">
                            {message.unsubscribed} unsubs
                          </span>
                        )}
                        {(message.complained || 0) > 0 && (
                          <span className="text-danger">
                            {message.complained} complaints
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Screenshot preview */}
                    {message.screenshot && (
                      <div className="ml-4 hidden h-20 w-32 overflow-hidden rounded border border-border sm:block">
                        <img
                          src={message.screenshot}
                          alt="Preview"
                          className="h-full w-full object-cover object-top"
                        />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="ml-4">
                      <ActionMenu items={getMessageActions(message)} />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Add message button */}
            <button
              onClick={handleAddMessage}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-4 text-text-muted transition-colors hover:border-primary hover:text-primary"
            >
              <Plus className="h-5 w-5" />
              Add Message
            </button>
          </div>
        )}
      </LoadingOverlay>

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        confirmVariant={confirmDialog.confirmVariant}
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
