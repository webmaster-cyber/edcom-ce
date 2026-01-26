import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Save, Ban, Play, Pause, CheckCircle, Trash2, LogIn } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import api from '../../config/api'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Checkbox } from '../../components/ui/Checkbox'
import { Modal } from '../../components/ui/Modal'
import { Tabs } from '../../components/ui/Tabs'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import type { Customer, PostalRoute, Frontend, CustomerCredits } from '../../types/admin'

interface CustomerFormData {
  name: string
  frontend: string
  routes: string[]
  minlimit: number
  hourlimit: number
  daylimit: number
  monthlimit: number
  trialend: string
  exampletemplate: boolean
  reverse_funnel_order: boolean
  skip_list_validation: boolean
}

const DEFAULT_FORM: CustomerFormData = {
  name: '',
  frontend: '',
  routes: [],
  minlimit: 999999999,
  hourlimit: 999999999,
  daylimit: 999999999,
  monthlimit: 999999999,
  trialend: '',
  exampletemplate: false,
  reverse_funnel_order: false,
  skip_list_validation: true,
}

export function CustomerEditPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { startImpersonationInNewTab } = useAuth()
  const id = searchParams.get('id') || 'new'
  const isNew = id === 'new'

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<CustomerFormData>(DEFAULT_FORM)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [frontends, setFrontends] = useState<Frontend[]>([])
  const [routes, setRoutes] = useState<PostalRoute[]>([])
  const [credits, setCredits] = useState<CustomerCredits | null>(null)

  // Credits modal
  const [showCreditsModal, setShowCreditsModal] = useState(false)
  const [creditsType, setCreditsType] = useState<'unlimited' | 'expire'>('unlimited')
  const [newCredits, setNewCredits] = useState(0)

  // Action confirmations
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'ban' | 'unban' | 'delete' | 'purge-c' | 'purge-f' | 'purge-t' | 'pause' | 'unpause' | null
    open: boolean
  }>({ type: null, open: false })
  const [isActionLoading, setIsActionLoading] = useState(false)

  const reload = useCallback(async () => {
    setIsLoading(true)
    try {
      const [frontendsRes, routesRes] = await Promise.all([
        api.get<Frontend[]>('/api/frontends'),
        api.get<PostalRoute[]>('/api/routes'),
      ])
      setFrontends(frontendsRes.data)
      // Only show published routes
      setRoutes(routesRes.data.filter((r) => r.published))

      if (!isNew) {
        const [customerRes, creditsRes] = await Promise.all([
          api.get<Customer>(`/api/companies/${id}`),
          api.get<CustomerCredits>(`/api/companies/${id}/credits`).catch(() => null),
        ])
        const c = customerRes.data
        setCustomer(c)
        setFormData({
          name: c.name || '',
          frontend: c.frontend || '',
          routes: c.routes || [],
          minlimit: c.minlimit ?? 999999999,
          hourlimit: c.hourlimit ?? 999999999,
          daylimit: c.daylimit ?? 999999999,
          monthlimit: c.monthlimit ?? 999999999,
          trialend: c.trialend ? format(parseISO(c.trialend), "yyyy-MM-dd'T'HH:mm") : '',
          exampletemplate: c.exampletemplate ?? false,
          reverse_funnel_order: c.reverse_funnel_order ?? false,
          skip_list_validation: c.skip_list_validation ?? true,
        })
        if (creditsRes) {
          setCredits(creditsRes.data)
        }
      } else {
        // Set default frontend if available
        if (frontendsRes.data.length > 0) {
          setFormData((prev) => ({ ...prev, frontend: frontendsRes.data[0].id }))
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [id, isNew])

  useEffect(() => {
    reload()
  }, [reload])

  const handleChange = (field: keyof CustomerFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleRouteToggle = (routeId: string) => {
    setFormData((prev) => {
      const routes = prev.routes.includes(routeId)
        ? prev.routes.filter((r) => r !== routeId)
        : [...prev.routes, routeId]
      return { ...prev, routes }
    })
  }

  const validateForm = (): boolean => {
    return !!(
      formData.name &&
      formData.frontend &&
      formData.routes.length > 0 &&
      formData.minlimit !== null &&
      formData.hourlimit !== null &&
      formData.daylimit !== null &&
      formData.monthlimit !== null
    )
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        ...formData,
        trialend: formData.trialend ? new Date(formData.trialend).toISOString() : null,
      }

      if (isNew) {
        const { data } = await api.post<{ id: string }>('/api/companies', payload)
        toast.success('Customer created')
        navigate(`/admin/customers/users?id=${data.id}`)
      } else {
        await api.patch(`/api/companies/${id}`, payload)
        toast.success('Customer updated')
        navigate('/admin/customers')
      }
    } catch (err) {
      toast.error('Failed to save customer')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateCredits = async () => {
    if (!id || isNew) return
    try {
      await api.patch(`/api/companies/${id}/credits`, {
        [creditsType]: newCredits,
      })
      toast.success('Credits updated')
      setShowCreditsModal(false)
      // Reload credits
      const creditsRes = await api.get<CustomerCredits>(`/api/companies/${id}/credits`)
      setCredits(creditsRes.data)
    } catch {
      toast.error('Failed to update credits')
    }
  }

  const openCreditsModal = (type: 'unlimited' | 'expire') => {
    setCreditsType(type)
    setNewCredits(credits?.[type] ?? 0)
    setShowCreditsModal(true)
  }

  // Action handlers
  const handleApprove = async () => {
    if (!customer || isNew) return
    setIsActionLoading(true)
    try {
      await api.post('/api/approvecompanies', { ids: [id] })
      toast.success('Customer approved')
      setConfirmAction({ type: null, open: false })
      await reload()
    } catch {
      toast.error('Failed to approve customer')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handlePause = async () => {
    if (!customer || isNew) return
    setIsActionLoading(true)
    try {
      await api.post('/api/pausecompanies', [id])
      toast.success('Sending paused')
      setConfirmAction({ type: null, open: false })
      await reload()
    } catch {
      toast.error('Failed to pause customer')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleUnpause = async () => {
    if (!customer || isNew) return
    setIsActionLoading(true)
    try {
      await api.post('/api/unpausecompanies', [id])
      toast.success('Sending unpaused')
      setConfirmAction({ type: null, open: false })
      await reload()
    } catch {
      toast.error('Failed to unpause customer')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleBan = async () => {
    if (!customer || isNew) return
    setIsActionLoading(true)
    try {
      await api.post('/api/bancompanies', [id])
      toast.success('Customer banned')
      setConfirmAction({ type: null, open: false })
      await reload()
    } catch {
      toast.error('Failed to ban customer')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleUnban = async () => {
    if (!customer || isNew) return
    setIsActionLoading(true)
    try {
      await api.post('/api/unbancompanies', [id])
      toast.success('Customer unbanned')
      setConfirmAction({ type: null, open: false })
      await reload()
    } catch {
      toast.error('Failed to unban customer')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handlePurge = async (queue: 'c' | 'f' | 't') => {
    if (!customer || isNew) return
    setIsActionLoading(true)
    try {
      await api.post(`/api/purgequeues/${queue}`, [id])
      const queueName = queue === 'c' ? 'Broadcast' : queue === 'f' ? 'Funnel' : 'Transactional'
      toast.success(`${queueName} queue purged`)
      setConfirmAction({ type: null, open: false })
      await reload()
    } catch {
      toast.error('Failed to purge queue')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!customer || isNew) return
    setIsActionLoading(true)
    try {
      await api.delete(`/api/companies/${id}`)
      toast.success('Customer deleted')
      navigate('/admin/customers')
    } catch {
      toast.error('Failed to delete customer')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleImpersonate = () => {
    if (!customer) return
    startImpersonationInNewTab(customer.id)
  }

  // Tab navigation for existing customers
  const tabs = !isNew
    ? [
        { id: 'settings', label: 'Settings' },
        {
          id: 'users',
          label: 'Users',
          onClick: () => navigate(`/admin/customers/users?id=${id}`),
        },
        {
          id: 'approval',
          label: 'List Approval',
          onClick: () => navigate(`/admin/customers/approval?id=${id}`),
        },
      ]
    : []

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
            {isNew ? 'Create Customer' : 'Customer Settings'}
          </h1>
          {/* Status badges */}
          {customer?.banned && <span className="badge badge-danger">Banned</span>}
          {customer?.paused && <span className="badge badge-warning">Paused</span>}
          {customer?.inreview && <span className="badge badge-info">Awaiting Approval</span>}
          {customer?.paid && <span className="badge badge-success">Paid</span>}
        </div>
        <Button
          onClick={handleSubmit}
          loading={isSaving}
          disabled={!validateForm()}
          icon={<Save className="h-4 w-4" />}
        >
          {isNew ? 'Create & Add Users' : 'Save Changes'}
        </Button>
      </div>

      {/* Actions (existing customers only) */}
      {!isNew && customer && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-gray-50 p-3">
          <Button size="sm" variant="secondary" onClick={handleImpersonate}>
            <LogIn className="mr-1 h-3 w-3" />
            Login As
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setConfirmAction({ type: 'approve', open: true })}
          >
            <CheckCircle className="mr-1 h-3 w-3" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setConfirmAction({ type: 'ban', open: true })}
          >
            <Ban className="mr-1 h-3 w-3" />
            Ban
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setConfirmAction({ type: 'unban', open: true })}
          >
            Unban
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setConfirmAction({ type: 'pause', open: true })}
          >
            <Pause className="mr-1 h-3 w-3" />
            Pause
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setConfirmAction({ type: 'unpause', open: true })}
          >
            <Play className="mr-1 h-3 w-3" />
            Unpause
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setConfirmAction({ type: 'purge-c', open: true })}
          >
            Purge BC
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setConfirmAction({ type: 'purge-f', open: true })}
          >
            Purge Funnel
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setConfirmAction({ type: 'purge-t', open: true })}
          >
            Purge Trans
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setConfirmAction({ type: 'delete', open: true })}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Delete
          </Button>
        </div>
      )}

      {/* Tabs for existing customers */}
      {!isNew && tabs.length > 0 && (
        <div className="mb-6">
          <Tabs tabs={tabs} activeTab="settings" />
        </div>
      )}

      <LoadingOverlay loading={isLoading}>
        {/* Warnings */}
        {routes.length === 0 && (
          <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-4 text-warning">
            No postal routes are configured. This customer will not be able to send mail
            until you create a postal route.
          </div>
        )}

        {frontends.length === 0 && (
          <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-4 text-warning">
            No frontends are configured. You should create a frontend before configuring
            customers.
          </div>
        )}

        {/* Form */}
        <div className="card p-6">
          <div className="space-y-6">
            {/* Company Name */}
            <Input
              label="Company Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />

            {/* Sign-up Info (read-only for existing customers) */}
            {customer?.params && Object.keys(customer.params).length > 0 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-text-primary">
                  Sign-up Info
                </label>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(customer.params)
                          .sort()
                          .map((key) => (
                            <th
                              key={key}
                              className="px-4 py-2 text-left text-xs font-medium uppercase text-text-muted"
                            >
                              {key.charAt(0).toUpperCase() + key.slice(1)}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {Object.keys(customer.params)
                          .sort()
                          .map((key) => (
                            <td
                              key={key}
                              className="px-4 py-3 text-sm text-text-primary"
                            >
                              {customer.params![key]}
                            </td>
                          ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Frontend */}
            <Select
              label="Frontend"
              value={formData.frontend}
              onChange={(e) => handleChange('frontend', e.target.value)}
              options={frontends.map((f) => ({ value: f.id, label: f.name }))}
              required
            />

            {/* Postal Routes */}
            <div>
              <label className="mb-2 block text-sm font-medium text-text-primary">
                Postal Routes <span className="text-danger">*</span>
              </label>
              <div className="space-y-2 rounded-lg border border-border p-3">
                {routes.length === 0 ? (
                  <p className="text-sm text-text-muted">No routes available</p>
                ) : (
                  routes.map((route) => (
                    <label
                      key={route.id}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={formData.routes.includes(route.id)}
                        onChange={() => handleRouteToggle(route.id)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm">{route.name}</span>
                    </label>
                  ))
                )}
              </div>
              <p className="mt-1 text-xs text-text-muted">
                Selecting more than one postal route will allow the customer to choose
                which route to use when sending
              </p>
            </div>

            {/* Send Limits */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Send Limit per Minute"
                type="number"
                min={0}
                value={formData.minlimit}
                onChange={(e) => handleChange('minlimit', parseInt(e.target.value) || 0)}
              />
              <Input
                label="Send Limit per Hour"
                type="number"
                min={0}
                value={formData.hourlimit}
                onChange={(e) => handleChange('hourlimit', parseInt(e.target.value) || 0)}
              />
              <Input
                label="Send Limit per Day"
                type="number"
                min={0}
                value={formData.daylimit}
                onChange={(e) => handleChange('daylimit', parseInt(e.target.value) || 0)}
              />
              <Input
                label="Send Limit per Month"
                type="number"
                min={0}
                value={formData.monthlimit}
                onChange={(e) =>
                  handleChange('monthlimit', parseInt(e.target.value) || 0)
                }
              />
            </div>

            {/* Credits (only for paid existing customers) */}
            {credits && customer?.paid && (
              <div>
                <label className="mb-2 block text-sm font-medium text-text-primary">
                  Credits
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <span className="w-40 text-sm text-text-muted">Unlimited Credits:</span>
                    <span className="w-24 text-sm font-medium">{credits.unlimited}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openCreditsModal('unlimited')}
                    >
                      Update
                    </Button>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-40 text-sm text-text-muted">Monthly Credits:</span>
                    <span className="w-24 text-sm font-medium">{credits.expire}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openCreditsModal('expire')}
                    >
                      Update
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Trial Expiration */}
            <Input
              label="Trial Expiration"
              type="datetime-local"
              value={formData.trialend}
              onChange={(e) => handleChange('trialend', e.target.value)}
            />

            {/* Checkboxes */}
            <div className="space-y-3">
              <Checkbox
                label="Example Data Template"
                checked={formData.exampletemplate}
                onChange={(checked) => handleChange('exampletemplate', checked)}
                description="Only one customer can be the example template at a time. If checked, broadcast, contact, segment and funnel data from this customer will be copied to every new customer in the system."
              />

              <Checkbox
                label="Reverse Funnel Order"
                checked={formData.reverse_funnel_order}
                onChange={(checked) => handleChange('reverse_funnel_order', checked)}
                description="Default: First in, first out. Reverse: Last in, first out."
              />

              <Checkbox
                label="Don't Validate Lists"
                checked={formData.skip_list_validation}
                onChange={(checked) => handleChange('skip_list_validation', checked)}
                description="If unchecked, all contact lists uploaded by this customer will require backend admin approval."
              />
            </div>
          </div>
        </div>
      </LoadingOverlay>

      {/* Credits Modal */}
      <Modal
        open={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
        title="Update Credits"
        size="sm"
      >
        <Input
          label={creditsType === 'unlimited' ? 'Unlimited Credits' : 'Monthly Credits'}
          type="number"
          min={0}
          value={newCredits}
          onChange={(e) => setNewCredits(parseInt(e.target.value) || 0)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowCreditsModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdateCredits}>Save</Button>
        </div>
      </Modal>

      {/* Approve Confirmation */}
      <ConfirmDialog
        open={confirmAction.type === 'approve' && confirmAction.open}
        onClose={() => setConfirmAction({ type: null, open: false })}
        onConfirm={handleApprove}
        title="Approve Customer"
        confirmLabel="Approve"
        loading={isActionLoading}
      >
        Are you sure you want to approve <strong>{customer?.name}</strong>?
      </ConfirmDialog>

      {/* Ban Confirmation */}
      <ConfirmDialog
        open={confirmAction.type === 'ban' && confirmAction.open}
        onClose={() => setConfirmAction({ type: null, open: false })}
        onConfirm={handleBan}
        title="Ban Customer"
        confirmLabel="Ban"
        variant="danger"
        loading={isActionLoading}
      >
        Are you sure you want to ban <strong>{customer?.name}</strong>? They will no longer be
        able to send emails or access the system.
      </ConfirmDialog>

      {/* Unban Confirmation */}
      <ConfirmDialog
        open={confirmAction.type === 'unban' && confirmAction.open}
        onClose={() => setConfirmAction({ type: null, open: false })}
        onConfirm={handleUnban}
        title="Unban Customer"
        confirmLabel="Unban"
        loading={isActionLoading}
      >
        Are you sure you want to unban <strong>{customer?.name}</strong>?
      </ConfirmDialog>

      {/* Pause Confirmation */}
      <ConfirmDialog
        open={confirmAction.type === 'pause' && confirmAction.open}
        onClose={() => setConfirmAction({ type: null, open: false })}
        onConfirm={handlePause}
        title="Pause Sending"
        confirmLabel="Pause"
        loading={isActionLoading}
      >
        Are you sure you want to pause sending for <strong>{customer?.name}</strong>?
      </ConfirmDialog>

      {/* Unpause Confirmation */}
      <ConfirmDialog
        open={confirmAction.type === 'unpause' && confirmAction.open}
        onClose={() => setConfirmAction({ type: null, open: false })}
        onConfirm={handleUnpause}
        title="Unpause Sending"
        confirmLabel="Unpause"
        loading={isActionLoading}
      >
        Are you sure you want to unpause sending for <strong>{customer?.name}</strong>?
      </ConfirmDialog>

      {/* Purge BC Confirmation */}
      <ConfirmDialog
        open={confirmAction.type === 'purge-c' && confirmAction.open}
        onClose={() => setConfirmAction({ type: null, open: false })}
        onConfirm={() => handlePurge('c')}
        title="Purge Broadcast Queue"
        confirmLabel="Purge"
        variant="danger"
        loading={isActionLoading}
      >
        Are you sure you want to purge the broadcast queue for <strong>{customer?.name}</strong>?
      </ConfirmDialog>

      {/* Purge Funnel Confirmation */}
      <ConfirmDialog
        open={confirmAction.type === 'purge-f' && confirmAction.open}
        onClose={() => setConfirmAction({ type: null, open: false })}
        onConfirm={() => handlePurge('f')}
        title="Purge Funnel Queue"
        confirmLabel="Purge"
        variant="danger"
        loading={isActionLoading}
      >
        Are you sure you want to purge the funnel queue for <strong>{customer?.name}</strong>?
      </ConfirmDialog>

      {/* Purge Trans Confirmation */}
      <ConfirmDialog
        open={confirmAction.type === 'purge-t' && confirmAction.open}
        onClose={() => setConfirmAction({ type: null, open: false })}
        onConfirm={() => handlePurge('t')}
        title="Purge Transactional Queue"
        confirmLabel="Purge"
        variant="danger"
        loading={isActionLoading}
      >
        Are you sure you want to purge the transactional queue for <strong>{customer?.name}</strong>?
      </ConfirmDialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirmAction.type === 'delete' && confirmAction.open}
        onClose={() => setConfirmAction({ type: null, open: false })}
        onConfirm={handleDelete}
        title="Delete Customer"
        confirmLabel="Delete"
        variant="danger"
        loading={isActionLoading}
      >
        Are you sure you want to permanently delete <strong>{customer?.name}</strong>? This
        action cannot be undone and will delete all associated data including users, contacts,
        and email history.
      </ConfirmDialog>
    </div>
  )
}
