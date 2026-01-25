import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Zap, Tag, Play, Pause, Mail } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/data/SearchInput'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ActionMenu } from '../../components/ui/ActionMenu'
import type { Funnel } from '../../types/funnel'

export function FunnelsPage() {
  const navigate = useNavigate()
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
    confirmLabel: string
    confirmVariant?: 'primary' | 'danger'
  }>({ open: false, title: '', message: '', onConfirm: async () => {}, confirmLabel: '' })
  const [confirmLoading, setConfirmLoading] = useState(false)

  const loadFunnels = useCallback(async () => {
    try {
      const { data } = await api.get<Funnel[]>('/api/funnels')
      setFunnels(data)
    } catch (err) {
      console.error('Failed to load funnels:', err)
      toast.error('Failed to load funnels')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFunnels()
  }, [loadFunnels])

  const filteredFunnels = funnels.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleToggleActive = async (funnel: Funnel) => {
    try {
      await api.patch(`/api/funnels/${funnel.id}`, { active: !funnel.active })
      toast.success(funnel.active ? 'Funnel deactivated' : 'Funnel activated')
      loadFunnels()
    } catch {
      toast.error('Failed to update funnel')
    }
  }

  const handleDuplicate = async (funnel: Funnel) => {
    try {
      await api.post(`/api/funnels/${funnel.id}/duplicate`)
      toast.success('Funnel duplicated')
      loadFunnels()
    } catch {
      toast.error('Failed to duplicate funnel')
    }
  }

  const handleDelete = (funnel: Funnel) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Funnel',
      message: `Are you sure you want to delete "${funnel.name}"? This will also delete all messages in this funnel.`,
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/api/funnels/${funnel.id}`)
          toast.success('Funnel deleted')
          loadFunnels()
        } catch {
          toast.error('Failed to delete funnel')
        }
      },
    })
  }

  const getActions = (funnel: Funnel) => [
    {
      label: 'Edit Settings',
      onClick: () => navigate(`/funnels/settings?id=${funnel.id}`),
    },
    {
      label: 'View Messages',
      onClick: () => navigate(`/funnels/messages?id=${funnel.id}`),
    },
    {
      label: funnel.active ? 'Deactivate' : 'Activate',
      onClick: () => handleToggleActive(funnel),
    },
    {
      label: 'Duplicate',
      onClick: () => handleDuplicate(funnel),
    },
    {
      label: 'Delete',
      onClick: () => handleDelete(funnel),
      variant: 'danger' as const,
    },
  ]

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Funnels</h1>
          <p className="text-sm text-text-muted">
            Automated email sequences triggered by tags or actions
          </p>
        </div>
        <Button
          icon={<Plus className="h-4 w-4" />}
          onClick={() => navigate('/funnels/settings?id=new')}
        >
          Create Funnel
        </Button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search funnels..."
        />
      </div>

      {/* Content */}
      <LoadingOverlay loading={isLoading}>
        {filteredFunnels.length === 0 && !isLoading ? (
          <EmptyState
            icon={<Zap className="h-10 w-10" />}
            title={searchQuery ? 'No funnels found' : 'No funnels yet'}
            description={
              searchQuery
                ? 'Try adjusting your search query.'
                : 'Create your first automated email sequence.'
            }
            action={
              !searchQuery && (
                <Button
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => navigate('/funnels/settings?id=new')}
                >
                  Create Funnel
                </Button>
              )
            }
          />
        ) : (
          <div className="card">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-border bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                      Contacts
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">
                      Modified
                    </th>
                    <th className="w-20 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredFunnels.map((funnel) => (
                    <tr key={funnel.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/funnels/messages?id=${funnel.id}`)}
                          className="font-medium text-primary hover:underline"
                        >
                          {funnel.name}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {(funnel.count || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            funnel.type === 'tags'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {funnel.type === 'tags' ? (
                            <>
                              <Tag className="h-3 w-3" />
                              Tags
                            </>
                          ) : (
                            <>
                              <Mail className="h-3 w-3" />
                              Responders
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(funnel)}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            funnel.active
                              ? 'bg-success/10 text-success'
                              : 'bg-gray-100 text-text-muted'
                          }`}
                        >
                          {funnel.active ? (
                            <>
                              <Play className="h-3 w-3" />
                              Active
                            </>
                          ) : (
                            <>
                              <Pause className="h-3 w-3" />
                              Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {formatDate(funnel.modified)}
                      </td>
                      <td className="px-4 py-3">
                        <ActionMenu items={getActions(funnel)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
