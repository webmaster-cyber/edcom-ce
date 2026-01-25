import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, FileText, Mail } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { SearchInput } from '../../components/data/SearchInput'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ActionMenu } from '../../components/ui/ActionMenu'
import { TransactionalNav } from './TransactionalNav'
import type { TransactionalTemplate } from '../../types/transactional'

export function TransactionalTemplatesPage() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<TransactionalTemplate[]>([])
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

  const loadTemplates = useCallback(async () => {
    try {
      const { data } = await api.get<TransactionalTemplate[]>('/api/transactional/templates')
      setTemplates(data.filter((t) => !t.example))
    } catch (err) {
      console.error('Failed to load templates:', err)
      toast.error('Failed to load templates')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDuplicate = async (template: TransactionalTemplate) => {
    try {
      await api.post(`/api/transactional/templates/${template.id}/duplicate`)
      toast.success('Template duplicated')
      loadTemplates()
    } catch {
      toast.error('Failed to duplicate template')
    }
  }

  const handleDelete = (template: TransactionalTemplate) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Template',
      message: `Are you sure you want to delete "${template.name}"?`,
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/api/transactional/templates/${template.id}`)
          toast.success('Template deleted')
          loadTemplates()
        } catch {
          toast.error('Failed to delete template')
        }
      },
    })
  }

  const getActions = (template: TransactionalTemplate) => [
    {
      label: 'Edit',
      onClick: () => navigate(`/transactional/template?id=${template.id}`),
    },
    {
      label: 'Duplicate',
      onClick: () => handleDuplicate(template),
    },
    {
      label: 'Delete',
      onClick: () => handleDelete(template),
      variant: 'danger' as const,
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Transactional</h1>
          <p className="text-sm text-text-muted">
            Email templates for API-triggered transactional messages
          </p>
        </div>
        <Button
          icon={<Plus className="h-4 w-4" />}
          onClick={() => navigate('/transactional/template?id=new')}
        >
          Create Template
        </Button>
      </div>

      <TransactionalNav />

      {/* Search */}
      <div className="mb-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search templates..."
        />
      </div>

      {/* Content */}
      <LoadingOverlay loading={isLoading}>
        {filteredTemplates.length === 0 && !isLoading ? (
          <EmptyState
            icon={<FileText className="h-10 w-10" />}
            title={searchQuery ? 'No templates found' : 'No templates yet'}
            description={
              searchQuery
                ? 'Try adjusting your search query.'
                : 'Create your first transactional email template.'
            }
            action={
              !searchQuery && (
                <Button
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => navigate('/transactional/template?id=new')}
                >
                  Create Template
                </Button>
              )
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <div key={template.id} className="card overflow-hidden">
                {/* Preview */}
                <div className="relative h-32 bg-gray-100">
                  {template.image ? (
                    <img
                      src={template.image}
                      alt={template.name}
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Mail className="h-10 w-10 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => navigate(`/transactional/template?id=${template.id}`)}
                        className="font-medium text-primary hover:underline truncate block"
                      >
                        {template.name}
                      </button>
                      <p className="mt-1 text-sm text-text-muted truncate">
                        {template.subject || '(No subject)'}
                      </p>
                      {template.tag && (
                        <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-text-secondary">
                          {template.tag}
                        </span>
                      )}
                    </div>
                    <ActionMenu items={getActions(template)} />
                  </div>
                </div>
              </div>
            ))}
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
