import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Ban, Trash2, Settings, Loader2, Search, PlusCircle } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { Tabs } from '../../components/ui/Tabs'

interface SuppressionList {
  id: string
  name: string
  count?: number
  processing?: string
  processing_error?: string
  type?: string
}

export function SuppressionPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'suppression'
  const isExclusion = activeTab === 'exclusion'

  const [lists, setLists] = useState<SuppressionList[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
    confirmLabel: string
  }>({ open: false, title: '', message: '', onConfirm: async () => {}, confirmLabel: '' })
  const [confirmLoading, setConfirmLoading] = useState(false)

  const loadLists = async () => {
    try {
      const endpoint = isExclusion ? '/api/exclusion' : '/api/supplists'
      const { data } = await api.get<SuppressionList[]>(endpoint)
      setLists(data)

      // Poll if any lists are processing (suppression only)
      if (!isExclusion) {
        const hasProcessing = data.some((list) => list.processing)
        if (hasProcessing && !pollRef.current) {
          pollRef.current = setInterval(loadLists, 10000)
        } else if (!hasProcessing && pollRef.current) {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
      }
    } catch (err) {
      console.error('Failed to load lists:', err)
      toast.error('Failed to load lists')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setIsLoading(true)
    loadLists()
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
      }
    }
  }, [activeTab])

  const filteredLists = lists.filter((list) =>
    list.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = (list: SuppressionList) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Suppression List',
      message: `Are you sure you want to delete "${list.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await api.delete(`/api/supplists/${list.id}`)
          toast.success('Suppression list deleted')
          setLists(lists.filter((l) => l.id !== list.id))
        } catch {
          toast.error('Failed to delete suppression list')
        }
      },
    })
    setOpenMenu(null)
  }

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab })
    setSearch('')
  }

  const tabs = [
    { key: 'suppression', label: 'Suppression Lists' },
    { key: 'exclusion', label: 'Exclusion Lists' },
  ]

  const listType = isExclusion ? 'Exclusion' : 'Suppression'

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{listType} Lists</h1>
          <p className="mt-1 text-sm text-text-muted">
            {isExclusion
              ? 'Manage email addresses and domains to exclude from sending'
              : 'Manage lists of email addresses that should never receive messages'}
          </p>
        </div>
        {!isExclusion && (
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/suppression/new')}
          >
            Create Suppression List
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <Tabs tabs={tabs} activeKey={activeTab} onChange={handleTabChange} />
      </div>

      {/* Search - only for suppression lists */}
      {!isExclusion && lists.length > 0 && (
        <div className="mb-4">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search lists..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-full pl-9"
            />
          </div>
        </div>
      )}

      <LoadingOverlay loading={isLoading}>
        {lists.length === 0 && !isExclusion ? (
          <EmptyState
            icon={<Ban className="h-12 w-12" />}
            title="No suppression lists"
            description="Create a suppression list to prevent sending to certain email addresses."
            action={
              <Button
                icon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/suppression/new')}
              >
                Create Suppression List
              </Button>
            }
          />
        ) : filteredLists.length === 0 && !isExclusion ? (
          <div className="rounded-lg border border-border bg-white p-8 text-center">
            <p className="text-text-muted">No lists match your search.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredLists.map((list) => (
              <div key={list.id} className="card">
                {/* Header */}
                <div className="border-b border-border bg-gray-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                    {isExclusion ? (list.type === 'domains' ? 'Domains' : 'Emails') : 'Suppression'}
                  </p>
                  <h3 className="mt-1 font-medium text-text-primary">
                    {list.name}
                  </h3>
                </div>

                {/* Body */}
                <div className="p-4">
                  <div className="flex flex-col items-center py-4">
                    {list.processing ? (
                      <div className="flex flex-col items-center gap-2 text-warning">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="text-sm">{list.processing}</span>
                      </div>
                    ) : list.processing_error ? (
                      <div className="text-center text-danger">
                        <span className="text-sm">{list.processing_error}</span>
                      </div>
                    ) : (
                      <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 border-primary">
                        <span className="text-2xl font-bold text-text-primary">
                          {(list.count || 0).toLocaleString()}
                        </span>
                        <span className="text-xs uppercase tracking-wider text-text-muted">
                          Count
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-center">
                    {isExclusion ? (
                      // Exclusion lists: just an Add button
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<PlusCircle className="h-4 w-4" />}
                        onClick={() => navigate(`/exclusion/add?id=${list.id}`)}
                      >
                        Add {list.type === 'domains' ? 'Domains' : 'Emails'}
                      </Button>
                    ) : (
                      // Suppression lists: dropdown with Edit/Delete
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === list.id ? null : list.id)}
                          className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary hover:bg-gray-50"
                        >
                          Actions
                        </button>

                        {openMenu === list.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenu(null)}
                            />
                            <div className="absolute left-1/2 z-20 mt-1 w-40 -translate-x-1/2 rounded-md border border-border bg-white py-1 shadow-lg">
                              <button
                                onClick={() => {
                                  navigate(`/suppression/edit?id=${list.id}`)
                                  setOpenMenu(null)
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary hover:bg-gray-50"
                              >
                                <Settings className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(list)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </LoadingOverlay>

      {/* Info */}
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h4 className="text-sm font-medium text-blue-800">
          About {listType} Lists
        </h4>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-700">
          {isExclusion ? (
            <>
              <li><strong>Do Not Email</strong> - Email addresses that should never receive messages</li>
              <li><strong>Malicious</strong> - Known spam traps and problematic addresses</li>
              <li><strong>Domains</strong> - Entire domains to exclude (e.g., competitor.com)</li>
            </>
          ) : (
            <>
              <li>Email addresses in suppression lists will never receive messages</li>
              <li>Use for do-not-contact requests, competitors, etc.</li>
              <li>Import lists from CSV files or add addresses manually</li>
            </>
          )}
        </ul>
      </div>

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
