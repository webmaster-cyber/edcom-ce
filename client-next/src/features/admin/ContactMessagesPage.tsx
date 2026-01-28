import { useState, useCallback, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import {
  MessageSquare,
  RefreshCw,
  Trash2,
  CheckCircle,
  Mail,
  User,
  Calendar,
  Clock,
  Phone,
  X,
} from 'lucide-react'
import { formatDistanceToNow, parseISO, format } from 'date-fns'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { SearchInput } from '../../components/data/SearchInput'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { DataTable, type Column } from '../../components/data/DataTable'

interface ContactMessage {
  id: string
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  status: 'new' | 'read' | 'replied'
  ip: string
  created: string
}

type StatusFilter = 'all' | 'new' | 'read' | 'replied'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Messages' },
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'replied', label: 'Replied' },
]

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  new: { label: 'New', className: 'badge badge-info' },
  read: { label: 'Read', className: 'badge badge-secondary' },
  replied: { label: 'Replied', className: 'badge badge-success' },
}

export function ContactMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [viewingMessage, setViewingMessage] = useState<ContactMessage | null>(null)

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
    confirmLabel: string
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: async () => {},
    confirmLabel: '',
  })
  const [confirmLoading, setConfirmLoading] = useState(false)

  const reload = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    else setIsRefreshing(true)
    try {
      const res = await api.get<ContactMessage[]>('/api/admin/contact-messages')
      setMessages(res.data)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const filteredMessages = useMemo(() => {
    let result = messages

    if (statusFilter !== 'all') {
      result = result.filter((m) => m.status === statusFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.email.toLowerCase().includes(query) ||
          m.subject.toLowerCase().includes(query) ||
          m.message.toLowerCase().includes(query)
      )
    }

    return result
  }, [messages, statusFilter, searchQuery])

  const toggleSelectAll = () => {
    if (selected.size === filteredMessages.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredMessages.map((m) => m.id)))
    }
  }

  const handleMarkAs = async (status: 'read' | 'replied') => {
    if (selected.size === 0) return
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          api.patch(`/api/admin/contact-messages/${id}`, { status })
        )
      )
      toast.success(`Marked ${selected.size} message(s) as ${status}`)
      setSelected(new Set())
      await reload(true)
    } catch {
      toast.error('Failed to update messages')
    }
  }

  const handleDelete = () => {
    if (selected.size === 0) return
    setConfirmDialog({
      open: true,
      title: 'Delete Messages',
      message: `Are you sure you want to delete ${selected.size} message(s)? This cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await Promise.all(
          Array.from(selected).map((id) =>
            api.delete(`/api/admin/contact-messages/${id}`)
          )
        )
        toast.success(`Deleted ${selected.size} message(s)`)
        setSelected(new Set())
        await reload(true)
      },
    })
  }

  const handleConfirm = async () => {
    setConfirmLoading(true)
    try {
      await confirmDialog.onConfirm()
    } catch {
      toast.error('Operation failed')
    } finally {
      setConfirmLoading(false)
      setConfirmDialog((prev) => ({ ...prev, open: false }))
    }
  }

  const handleViewMessage = async (msg: ContactMessage) => {
    setViewingMessage(msg)
    // Mark as read when viewed
    if (msg.status === 'new') {
      try {
        await api.patch(`/api/admin/contact-messages/${msg.id}`, { status: 'read' })
        await reload(true)
      } catch {
        // Silently fail
      }
    }
  }

  const columns: Column<ContactMessage>[] = [
    {
      key: 'name',
      header: 'From',
      sortable: true,
      render: (msg: ContactMessage) => (
        <button
          onClick={() => handleViewMessage(msg)}
          className="text-left hover:text-primary"
        >
          <div className="font-medium text-text-primary">{msg.name}</div>
          <div className="text-xs text-text-muted">{msg.email}</div>
        </button>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      sortable: true,
      render: (msg: ContactMessage) => (
        <button
          onClick={() => handleViewMessage(msg)}
          className="text-left hover:text-primary"
        >
          <div className="font-medium">{msg.subject || '(No subject)'}</div>
          <div className="text-xs text-text-muted line-clamp-1 max-w-md">{msg.message}</div>
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (msg: ContactMessage) => {
        const badge = STATUS_BADGES[msg.status] || STATUS_BADGES.new
        return <span className={badge.className}>{badge.label}</span>
      },
    },
    {
      key: 'created',
      header: 'Received',
      sortable: true,
      render: (msg: ContactMessage) => {
        try {
          const date = parseISO(msg.created)
          return (
            <div className="text-sm">
              <div>{formatDistanceToNow(date, { addSuffix: true })}</div>
              <div className="text-xs text-text-muted">{format(date, 'MMM d, yyyy')}</div>
            </div>
          )
        } catch {
          return 'N/A'
        }
      },
    },
  ]

  const newCount = messages.filter((m) => m.status === 'new').length

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-text-primary">Contact Messages</h1>
          {newCount > 0 && (
            <span className="badge badge-info">{newCount} new</span>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => reload(true)}
          icon={<RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="w-48">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            options={STATUS_OPTIONS}
          />
        </div>
        <div className="w-64">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search messages..."
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-gray-50 p-3">
          <span className="mr-2 text-sm text-text-muted">
            {selected.size} selected:
          </span>
          <Button size="sm" variant="secondary" onClick={() => handleMarkAs('read')}>
            <CheckCircle className="mr-1 h-3 w-3" />
            Mark Read
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handleMarkAs('replied')}>
            <Mail className="mr-1 h-3 w-3" />
            Mark Replied
          </Button>
          <Button size="sm" variant="danger" onClick={handleDelete}>
            <Trash2 className="mr-1 h-3 w-3" />
            Delete
          </Button>
        </div>
      )}

      {/* Table */}
      <LoadingOverlay loading={isLoading}>
        {messages.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-10 w-10" />}
            title="No messages"
            description="Contact form submissions will appear here."
          />
        ) : filteredMessages.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-10 w-10" />}
            title="No messages found"
            description={
              searchQuery
                ? `No messages match "${searchQuery}"`
                : 'No messages match the selected filter'
            }
          />
        ) : (
          <DataTable
            data={filteredMessages}
            columns={columns}
            keyField="id"
            selectable
            selected={selected}
            onSelectChange={setSelected}
            onSelectAll={toggleSelectAll}
            defaultSort={{ key: 'created', direction: 'desc' }}
          />
        )}
      </LoadingOverlay>

      {/* Message Detail Modal */}
      {viewingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold">Message Details</h2>
              <button
                onClick={() => setViewingMessage(null)}
                className="text-text-muted hover:text-text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-text-muted" />
                  <span className="font-medium">{viewingMessage.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-text-muted" />
                  <a href={`mailto:${viewingMessage.email}`} className="text-primary hover:underline">
                    {viewingMessage.email}
                  </a>
                </div>
                {viewingMessage.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-text-muted" />
                    <a href={`tel:${viewingMessage.phone}`} className="text-primary hover:underline">
                      {viewingMessage.phone}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-text-muted" />
                  <span>{viewingMessage.created ? format(parseISO(viewingMessage.created), 'PPpp') : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-text-muted" />
                  <span className="text-text-muted">IP: {viewingMessage.ip}</span>
                </div>
              </div>
              <div className="mb-4">
                <div className="text-sm font-medium text-text-muted mb-1">Subject</div>
                <div className="font-medium">{viewingMessage.subject || '(No subject)'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-text-muted mb-1">Message</div>
                <div className="bg-gray-50 rounded border border-border p-4 whitespace-pre-wrap">
                  {viewingMessage.message}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-between items-center">
              <div>
                {STATUS_BADGES[viewingMessage.status] && (
                  <span className={STATUS_BADGES[viewingMessage.status].className}>
                    {STATUS_BADGES[viewingMessage.status].label}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setViewingMessage(null)}
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    window.location.href = `mailto:${viewingMessage.email}?subject=Re: ${viewingMessage.subject}`
                  }}
                >
                  <Mail className="mr-1 h-4 w-4" />
                  Reply via Email
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
        onConfirm={handleConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        loading={confirmLoading}
        variant="danger"
      />
    </div>
  )
}
