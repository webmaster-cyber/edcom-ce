import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Plus,
  Eye,
  EyeOff,
  Copy,
  KeyRound,
  LogIn,
  CheckCircle,
  Ban,
  Pause,
  Play,
  Trash2,
} from 'lucide-react'
import api from '../../config/api'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Tabs } from '../../components/ui/Tabs'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { ActionMenu } from '../../components/ui/ActionMenu'
import type { Customer, CustomerUser } from '../../types/admin'

function ApiKeyDisplay({ apiKey }: { apiKey: string }) {
  const [isVisible, setIsVisible] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey)
      toast.success('API Key copied to clipboard')
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopy}
        className="p-1 text-text-muted hover:text-primary"
        title="Copy to clipboard"
      >
        <Copy className="h-4 w-4" />
      </button>
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="p-1 text-text-muted hover:text-primary"
        title={isVisible ? 'Hide' : 'Show'}
      >
        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
      <code className="flex-1 rounded bg-gray-100 px-2 py-1 text-xs font-mono">
        {isVisible ? apiKey : '••••••••••••••••••••'}
      </code>
    </div>
  )
}

export function CustomerUsersPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { startImpersonationInNewTab } = useAuth()
  const id = searchParams.get('id')

  const [isLoading, setIsLoading] = useState(true)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [users, setUsers] = useState<CustomerUser[]>([])

  // Customer action confirmations
  const [customerAction, setCustomerAction] = useState<{
    type: 'approve' | 'ban' | 'unban' | 'pause' | 'unpause' | 'purge-c' | 'purge-f' | 'purge-t' | 'delete' | null
    open: boolean
  }>({ type: null, open: false })
  const [isCustomerActionLoading, setIsCustomerActionLoading] = useState(false)

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

  const reload = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    try {
      const [customerRes, usersRes] = await Promise.all([
        api.get<Customer>(`/api/companies/${id}`),
        api.get<CustomerUser[]>(`/api/companies/${id}/users`),
      ])
      setCustomer(customerRes.data)
      setUsers(usersRes.data)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    reload()
  }, [reload])

  if (!id) {
    navigate('/admin/customers')
    return null
  }

  const handleCreateUser = () => {
    navigate(`/admin/users/edit?id=new&cid=${id}`)
  }

  const handleEditUser = (userId: string) => {
    navigate(`/admin/users/edit?id=${userId}&cid=${id}`)
  }

  const handleDeleteUser = (user: CustomerUser) => {
    setConfirmDialog({
      open: true,
      title: 'Delete User',
      message: `Are you sure you want to delete "${user.fullname}"?`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await api.delete(`/api/users/${user.id}`)
        toast.success('User deleted')
        await reload()
      },
    })
  }

  const handleSendPasswordReset = async (user: CustomerUser) => {
    try {
      await api.post('/api/reset/sendemail', { email: user.username })
      toast.success('Password reset email sent')
    } catch {
      toast.error('Failed to send password reset email')
    }
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

  // Customer action handlers
  const handleImpersonate = () => {
    if (!customer) return
    startImpersonationInNewTab(customer.id)
  }

  const handleCustomerApprove = async () => {
    if (!customer) return
    setIsCustomerActionLoading(true)
    try {
      await api.post('/api/approvecompanies', { ids: [id] })
      toast.success('Customer approved')
      setCustomerAction({ type: null, open: false })
      await reload()
    } catch {
      toast.error('Failed to approve customer')
    } finally {
      setIsCustomerActionLoading(false)
    }
  }

  const handleCustomerBan = async () => {
    if (!customer) return
    setIsCustomerActionLoading(true)
    try {
      await api.post('/api/bancompanies', [id])
      toast.success('Customer banned')
      setCustomerAction({ type: null, open: false })
      await reload()
    } catch {
      toast.error('Failed to ban customer')
    } finally {
      setIsCustomerActionLoading(false)
    }
  }

  const handleCustomerUnban = async () => {
    if (!customer) return
    setIsCustomerActionLoading(true)
    try {
      await api.post('/api/unbancompanies', [id])
      toast.success('Customer unbanned')
      setCustomerAction({ type: null, open: false })
      await reload()
    } catch {
      toast.error('Failed to unban customer')
    } finally {
      setIsCustomerActionLoading(false)
    }
  }

  const handleCustomerPause = async () => {
    if (!customer) return
    setIsCustomerActionLoading(true)
    try {
      await api.post('/api/pausecompanies', [id])
      toast.success('Sending paused')
      setCustomerAction({ type: null, open: false })
      await reload()
    } catch {
      toast.error('Failed to pause customer')
    } finally {
      setIsCustomerActionLoading(false)
    }
  }

  const handleCustomerUnpause = async () => {
    if (!customer) return
    setIsCustomerActionLoading(true)
    try {
      await api.post('/api/unpausecompanies', [id])
      toast.success('Sending unpaused')
      setCustomerAction({ type: null, open: false })
      await reload()
    } catch {
      toast.error('Failed to unpause customer')
    } finally {
      setIsCustomerActionLoading(false)
    }
  }

  const handleCustomerPurge = async (queue: 'c' | 'f' | 't') => {
    if (!customer) return
    setIsCustomerActionLoading(true)
    try {
      await api.post(`/api/purgequeues/${queue}`, [id])
      const queueName = queue === 'c' ? 'Broadcast' : queue === 'f' ? 'Funnel' : 'Transactional'
      toast.success(`${queueName} queue purged`)
      setCustomerAction({ type: null, open: false })
      await reload()
    } catch {
      toast.error('Failed to purge queue')
    } finally {
      setIsCustomerActionLoading(false)
    }
  }

  const handleCustomerDelete = async () => {
    if (!customer) return
    setIsCustomerActionLoading(true)
    try {
      await api.delete(`/api/companies/${id}`)
      toast.success('Customer deleted')
      navigate('/admin/customers')
    } catch {
      toast.error('Failed to delete customer')
    } finally {
      setIsCustomerActionLoading(false)
    }
  }

  const getActions = (user: CustomerUser) => [
    { label: 'Edit', onClick: () => handleEditUser(user.id) },
    { label: 'Send Password Reset', onClick: () => handleSendPasswordReset(user) },
    { label: 'Delete', onClick: () => handleDeleteUser(user), variant: 'danger' as const },
  ]

  const tabs = [
    {
      id: 'settings',
      label: 'Settings',
      onClick: () => navigate(`/admin/customers/edit?id=${id}`),
    },
    { id: 'users', label: 'Users' },
    {
      id: 'approval',
      label: 'List Approval',
      onClick: () => navigate(`/admin/customers/approval?id=${id}`),
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/customers')}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <h1 className="text-xl font-semibold text-text-primary">
            Users {customer ? `for "${customer.name}"` : ''}
          </h1>
          {customer?.banned && <span className="badge badge-danger">Banned</span>}
          {customer?.paused && <span className="badge badge-warning">Paused</span>}
          {customer?.inreview && <span className="badge badge-info">Awaiting Approval</span>}
          {customer?.paid && <span className="badge badge-success">Paid</span>}
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreateUser}>
          Create User
        </Button>
      </div>

      {/* Customer Actions */}
      {customer && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-gray-50 p-3">
          <Button size="sm" variant="secondary" onClick={handleImpersonate}>
            <LogIn className="mr-1 h-3 w-3" />
            Login As
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCustomerAction({ type: 'approve', open: true })}
          >
            <CheckCircle className="mr-1 h-3 w-3" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCustomerAction({ type: 'ban', open: true })}
          >
            <Ban className="mr-1 h-3 w-3" />
            Ban
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCustomerAction({ type: 'unban', open: true })}
          >
            Unban
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCustomerAction({ type: 'pause', open: true })}
          >
            <Pause className="mr-1 h-3 w-3" />
            Pause
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCustomerAction({ type: 'unpause', open: true })}
          >
            <Play className="mr-1 h-3 w-3" />
            Unpause
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCustomerAction({ type: 'purge-c', open: true })}
          >
            Purge BC
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCustomerAction({ type: 'purge-f', open: true })}
          >
            Purge Funnel
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setCustomerAction({ type: 'purge-t', open: true })}
          >
            Purge Trans
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setCustomerAction({ type: 'delete', open: true })}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Delete
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <Tabs tabs={tabs} activeTab="users" />
      </div>

      <LoadingOverlay loading={isLoading}>
        {users.length === 0 ? (
          <EmptyState
            icon={<KeyRound className="h-10 w-10" />}
            title="No users configured"
            description="Create a user to allow access to this customer account."
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreateUser}>
                Create User
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
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    API Key
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleEditUser(user.id)}
                        className="font-medium text-primary hover:underline"
                      >
                        {user.fullname}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {user.username}
                    </td>
                    <td className="px-4 py-3">
                      {user.disabled ? (
                        <span className="badge badge-danger">Disabled</span>
                      ) : (
                        <span className="badge badge-success">Enabled</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ApiKeyDisplay apiKey={user.apikey} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ActionMenu items={getActions(user)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </LoadingOverlay>

      {/* User Confirm dialog */}
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

      {/* Customer Action Confirmations */}
      <ConfirmDialog
        open={customerAction.type === 'approve' && customerAction.open}
        onClose={() => setCustomerAction({ type: null, open: false })}
        onConfirm={handleCustomerApprove}
        title="Approve Customer"
        confirmLabel="Approve"
        loading={isCustomerActionLoading}
      >
        Are you sure you want to approve <strong>{customer?.name}</strong>?
      </ConfirmDialog>

      <ConfirmDialog
        open={customerAction.type === 'ban' && customerAction.open}
        onClose={() => setCustomerAction({ type: null, open: false })}
        onConfirm={handleCustomerBan}
        title="Ban Customer"
        confirmLabel="Ban"
        variant="danger"
        loading={isCustomerActionLoading}
      >
        Are you sure you want to ban <strong>{customer?.name}</strong>?
      </ConfirmDialog>

      <ConfirmDialog
        open={customerAction.type === 'unban' && customerAction.open}
        onClose={() => setCustomerAction({ type: null, open: false })}
        onConfirm={handleCustomerUnban}
        title="Unban Customer"
        confirmLabel="Unban"
        loading={isCustomerActionLoading}
      >
        Are you sure you want to unban <strong>{customer?.name}</strong>?
      </ConfirmDialog>

      <ConfirmDialog
        open={customerAction.type === 'pause' && customerAction.open}
        onClose={() => setCustomerAction({ type: null, open: false })}
        onConfirm={handleCustomerPause}
        title="Pause Sending"
        confirmLabel="Pause"
        loading={isCustomerActionLoading}
      >
        Are you sure you want to pause sending for <strong>{customer?.name}</strong>?
      </ConfirmDialog>

      <ConfirmDialog
        open={customerAction.type === 'unpause' && customerAction.open}
        onClose={() => setCustomerAction({ type: null, open: false })}
        onConfirm={handleCustomerUnpause}
        title="Unpause Sending"
        confirmLabel="Unpause"
        loading={isCustomerActionLoading}
      >
        Are you sure you want to unpause sending for <strong>{customer?.name}</strong>?
      </ConfirmDialog>

      <ConfirmDialog
        open={customerAction.type === 'purge-c' && customerAction.open}
        onClose={() => setCustomerAction({ type: null, open: false })}
        onConfirm={() => handleCustomerPurge('c')}
        title="Purge Broadcast Queue"
        confirmLabel="Purge"
        variant="danger"
        loading={isCustomerActionLoading}
      >
        Are you sure you want to purge the broadcast queue for <strong>{customer?.name}</strong>?
      </ConfirmDialog>

      <ConfirmDialog
        open={customerAction.type === 'purge-f' && customerAction.open}
        onClose={() => setCustomerAction({ type: null, open: false })}
        onConfirm={() => handleCustomerPurge('f')}
        title="Purge Funnel Queue"
        confirmLabel="Purge"
        variant="danger"
        loading={isCustomerActionLoading}
      >
        Are you sure you want to purge the funnel queue for <strong>{customer?.name}</strong>?
      </ConfirmDialog>

      <ConfirmDialog
        open={customerAction.type === 'purge-t' && customerAction.open}
        onClose={() => setCustomerAction({ type: null, open: false })}
        onConfirm={() => handleCustomerPurge('t')}
        title="Purge Transactional Queue"
        confirmLabel="Purge"
        variant="danger"
        loading={isCustomerActionLoading}
      >
        Are you sure you want to purge the transactional queue for <strong>{customer?.name}</strong>?
      </ConfirmDialog>

      <ConfirmDialog
        open={customerAction.type === 'delete' && customerAction.open}
        onClose={() => setCustomerAction({ type: null, open: false })}
        onConfirm={handleCustomerDelete}
        title="Delete Customer"
        confirmLabel="Delete"
        variant="danger"
        loading={isCustomerActionLoading}
      >
        Are you sure you want to permanently delete <strong>{customer?.name}</strong>? This
        action cannot be undone.
      </ConfirmDialog>
    </div>
  )
}
