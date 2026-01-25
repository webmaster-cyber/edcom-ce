import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, FileText, MoreHorizontal, Copy, Trash2, Settings } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import type { FormListItem } from '../../types/form'
import type { ContactList } from '../../types/contact'

export function FormsPage() {
  const navigate = useNavigate()
  const [forms, setForms] = useState<FormListItem[]>([])
  const [lists, setLists] = useState<ContactList[]>([])
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
    loadData()
  }, [])

  async function loadData() {
    try {
      const [formsRes, listsRes] = await Promise.all([
        api.get<FormListItem[]>('/api/forms'),
        api.get<ContactList[]>('/api/lists'),
      ])
      // Sort forms by name
      const sortedForms = formsRes.data.sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      )
      setForms(sortedForms)
      setLists(listsRes.data)
    } catch (err) {
      console.error('Failed to load forms:', err)
      toast.error('Failed to load forms')
    } finally {
      setIsLoading(false)
    }
  }

  const getListName = (listId: string): string => {
    const list = lists.find((l) => l.id === listId)
    return list?.name || 'Unknown list'
  }

  const handleCreate = () => {
    navigate('/forms/new')
  }

  const handleDuplicate = async (form: FormListItem) => {
    try {
      await api.post(`/api/forms/${form.id}/duplicate`)
      toast.success('Form duplicated')
      loadData()
    } catch {
      toast.error('Failed to duplicate form')
    }
    setOpenMenu(null)
  }

  const handleDelete = (form: FormListItem) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Form',
      message: `Are you sure you want to delete "${form.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await api.delete(`/api/forms/${form.id}`)
          toast.success('Form deleted')
          setForms(forms.filter((f) => f.id !== form.id))
        } catch {
          toast.error('Failed to delete form')
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
          <h1 className="text-2xl font-semibold text-text-primary">Subscribe Forms</h1>
          <p className="mt-1 text-sm text-text-muted">
            Create embeddable forms to grow your contact lists
          </p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
          Create Form
        </Button>
      </div>

      <LoadingOverlay loading={isLoading}>
        {forms.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="No subscribe forms"
            description="Create a form to start collecting email subscribers on your website."
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
                Create Form
              </Button>
            }
          />
        ) : (
          <div className="card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50 text-left text-sm font-medium text-text-secondary">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">List</th>
                  <th className="px-4 py-3 text-right">Views</th>
                  <th className="px-4 py-3 text-right">Signups</th>
                  <th className="px-4 py-3 text-right">Conversion</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {forms.map((form) => (
                  <tr
                    key={form.id}
                    className="border-b border-border last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/forms/settings?id=${form.id}`)}
                        className="text-left"
                      >
                        <span className="font-medium text-text-primary hover:text-primary">
                          {form.name}
                        </span>
                        {form.disabled && (
                          <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                            Disabled
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {getListName(form.list)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-text-muted">
                      {(form.views_uniq || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-text-muted">
                      {(form.submits_uniq || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-text-muted">
                      {(form.views_uniq || 0) > 0
                        ? `${(((form.submits_uniq || 0) / (form.views_uniq || 1)) * 100).toFixed(1)}%`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setOpenMenu(openMenu === form.id ? null : form.id)}
                          className="rounded-md p-1 text-text-muted hover:bg-gray-100 hover:text-text-primary"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>

                        {openMenu === form.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenu(null)}
                            />
                            <div className="absolute right-0 z-20 mt-1 w-40 rounded-md border border-border bg-white py-1 shadow-lg">
                              <button
                                onClick={() => {
                                  navigate(`/forms/settings?id=${form.id}`)
                                  setOpenMenu(null)
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary hover:bg-gray-50"
                              >
                                <Settings className="h-4 w-4" />
                                Settings
                              </button>
                              <button
                                onClick={() => handleDuplicate(form)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary hover:bg-gray-50"
                              >
                                <Copy className="h-4 w-4" />
                                Duplicate
                              </button>
                              <button
                                onClick={() => handleDelete(form)}
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
