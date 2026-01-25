import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { ListNav } from './components/ListNav'
import type { ContactList } from '../../types/contact'

export function ListSettingsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const listId = searchParams.get('id') || ''

  const [list, setList] = useState<ContactList | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState('')

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
    confirmLabel: string
    confirmVariant?: 'primary' | 'danger'
  }>({ open: false, title: '', message: '', onConfirm: async () => {}, confirmLabel: '' })
  const [confirmLoading, setConfirmLoading] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get<ContactList>(`/api/lists/${listId}`)
        setList(data)
        setName(data.name)
      } catch (err) {
        console.error('Failed to load list:', err)
        toast.error('Failed to load list')
      } finally {
        setIsLoading(false)
      }
    }
    if (listId) load()
  }, [listId])

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('List name is required')
      return
    }

    setIsSaving(true)
    try {
      await api.patch(`/api/lists/${listId}`, { name: name.trim() })
      toast.success('List settings saved')
      // Update local state
      setList((prev) => (prev ? { ...prev, name: name.trim() } : null))
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = () => {
    setConfirmDialog({
      open: true,
      title: 'Delete List',
      message: `Are you sure you want to delete "${list?.name}"? This will permanently delete the list and all ${list?.count?.toLocaleString() || 0} contacts in it. This action cannot be undone.`,
      confirmLabel: 'Delete List',
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/api/lists/${listId}`)
          toast.success('List deleted')
          navigate('/contacts')
        } catch {
          toast.error('Failed to delete list')
        }
      },
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/contacts/find?id=${listId}`)}
            className="rounded-md p-1.5 text-text-muted hover:bg-gray-100 hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">List Settings</h1>
            {list && <p className="text-sm text-text-muted">{list.name}</p>}
          </div>
        </div>
        <Button onClick={handleSave} loading={isSaving}>
          Save Settings
        </Button>
      </div>

      {/* List Navigation */}
      {list && (
        <ListNav
          listId={listId}
          listName={list.name}
        />
      )}

      <LoadingOverlay loading={isLoading}>
        <div className="max-w-2xl space-y-6">
          {/* General Settings */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-medium text-text-primary">General Settings</h2>
            <div className="space-y-4">
              <Input
                label="List Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter list name"
              />
            </div>
          </div>

          {/* List Info */}
          {list && (
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-medium text-text-primary">List Information</h2>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-text-muted">Total Contacts</dt>
                  <dd className="font-medium text-text-primary">{list.count?.toLocaleString() || 0}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Active</dt>
                  <dd className="font-medium text-green-600">{list.active?.toLocaleString() || 0}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Unsubscribed</dt>
                  <dd className="font-medium text-yellow-600">{list.unsubscribed?.toLocaleString() || 0}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Bounced</dt>
                  <dd className="font-medium text-red-600">{list.bounced?.toLocaleString() || 0}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Complained</dt>
                  <dd className="font-medium text-red-600">{list.complained?.toLocaleString() || 0}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">List ID</dt>
                  <dd className="font-mono text-xs text-text-muted">{listId}</dd>
                </div>
              </dl>
            </div>
          )}

          {/* Danger Zone */}
          <div className="card border-danger/30 p-6">
            <h2 className="mb-4 text-lg font-medium text-danger">Danger Zone</h2>
            <p className="mb-4 text-sm text-text-muted">
              Permanently delete this list and all its contacts. This action cannot be undone.
            </p>
            <Button variant="danger" onClick={handleDelete}>
              Delete List
            </Button>
          </div>
        </div>
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
