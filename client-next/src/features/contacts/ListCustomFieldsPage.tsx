import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { ListNav } from './components/ListNav'
import type { ContactList } from '../../types/contact'

interface ListDetails extends ContactList {
  used_properties?: string[]
}

// Standard fields that are always available (lowercase for comparison)
const STANDARD_FIELDS_LOWER = ['email', 'firstname', 'lastname', 'phone', 'company', 'city', 'state', 'country', 'zip']

// Check if a field is a standard field (case-insensitive)
const isStandardField = (field: string): boolean => {
  return STANDARD_FIELDS_LOWER.includes(field.toLowerCase())
}

export function ListCustomFieldsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const listId = searchParams.get('id') || ''

  const [list, setList] = useState<ListDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [customFields, setCustomFields] = useState<string[]>([])
  const [newFieldName, setNewFieldName] = useState('')
  const [showAddField, setShowAddField] = useState(false)

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
    confirmLabel: string
  }>({ open: false, title: '', message: '', onConfirm: async () => {}, confirmLabel: '' })
  const [confirmLoading, setConfirmLoading] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get<ListDetails>(`/api/lists/${listId}`)
        setList(data)
        // Filter out standard fields and internal fields
        const fields = (data.used_properties || []).filter(
          (f) => !f.startsWith('!') && !isStandardField(f)
        )
        setCustomFields(fields)
      } catch (err) {
        console.error('Failed to load list:', err)
        toast.error('Failed to load list')
      } finally {
        setIsLoading(false)
      }
    }
    if (listId) load()
  }, [listId])

  const handleAddField = async () => {
    if (!newFieldName.trim()) return
    const fieldName = newFieldName.trim().toLowerCase().replace(/\s+/g, '_')

    if (customFields.some(f => f.toLowerCase() === fieldName.toLowerCase()) || isStandardField(fieldName)) {
      toast.error('Field already exists')
      return
    }

    setIsSaving(true)
    try {
      // Add field to list's used_properties
      const currentProps = list?.used_properties || []
      await api.patch(`/api/lists/${listId}`, {
        used_properties: [...currentProps, fieldName],
      })
      setCustomFields([...customFields, fieldName])
      setNewFieldName('')
      setShowAddField(false)
      toast.success('Field added')
    } catch {
      toast.error('Failed to add field')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteField = (field: string) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Custom Field',
      message: `Are you sure you want to delete the "${field}" field? This will not delete any data already stored in this field.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          const currentProps = list?.used_properties || []
          await api.patch(`/api/lists/${listId}`, {
            used_properties: currentProps.filter((p) => p !== field),
          })
          setCustomFields(customFields.filter((f) => f !== field))
          toast.success('Field deleted')
        } catch {
          toast.error('Failed to delete field')
        }
      },
    })
  }

  const formatFieldLabel = (field: string): string => {
    return field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ')
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
            <h1 className="text-xl font-semibold text-text-primary">Custom Fields</h1>
            {list && <p className="text-sm text-text-muted">{list.name}</p>}
          </div>
        </div>
      </div>

      {/* List Navigation */}
      {list && (
        <ListNav
          listId={listId}
          listName={list.name}
          customFieldsCount={customFields.length}
        />
      )}

      <LoadingOverlay loading={isLoading}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Standard Fields */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-medium text-text-primary">Standard Fields</h2>
            <p className="mb-4 text-sm text-text-muted">
              These fields are available for all contacts and cannot be removed.
            </p>
            <div className="space-y-2">
              {[
                { key: 'email', label: 'Email' },
                { key: 'firstname', label: 'First Name' },
                { key: 'lastname', label: 'Last Name' },
                { key: 'phone', label: 'Phone' },
                { key: 'company', label: 'Company' },
                { key: 'city', label: 'City' },
                { key: 'state', label: 'State' },
                { key: 'country', label: 'Country' },
                { key: 'zip', label: 'Zip Code' },
              ].map((field) => (
                <div
                  key={field.key}
                  className="flex items-center justify-between rounded-md border border-border bg-gray-50 px-4 py-2"
                >
                  <span className="text-sm text-text-primary">{field.label}</span>
                  <span className="text-xs text-text-muted">Standard</span>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Fields */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-medium text-text-primary">Custom Fields</h2>
            <p className="mb-4 text-sm text-text-muted">
              Custom fields specific to this list. Add fields here or import contacts with additional columns.
            </p>

            {customFields.length === 0 && !showAddField ? (
              <EmptyState
                icon={<Plus className="h-8 w-8" />}
                title="No custom fields"
                description="Add custom fields to store additional information about your contacts."
                action={
                  <Button
                    icon={<Plus className="h-4 w-4" />}
                    onClick={() => setShowAddField(true)}
                  >
                    Add Custom Field
                  </Button>
                }
              />
            ) : (
              <div className="space-y-2">
                {customFields.map((field) => (
                  <div
                    key={field}
                    className="flex items-center justify-between rounded-md border border-border px-4 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-text-muted/50" />
                      <span className="text-sm text-text-primary">{formatFieldLabel(field)}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteField(field)}
                      className="rounded-md p-1 text-text-muted hover:bg-red-50 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {/* Add field form */}
                {showAddField ? (
                  <div className="mt-4 flex items-end gap-2">
                    <div className="flex-1">
                      <Input
                        label="Field name"
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        placeholder="e.g., company_size"
                        autoFocus
                      />
                    </div>
                    <Button onClick={handleAddField} loading={isSaving} disabled={!newFieldName.trim()}>
                      Add
                    </Button>
                    <Button variant="secondary" onClick={() => setShowAddField(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    icon={<Plus className="h-4 w-4" />}
                    onClick={() => setShowAddField(true)}
                    className="mt-4"
                  >
                    Add Custom Field
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info box */}
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h4 className="text-sm font-medium text-blue-800">About Custom Fields</h4>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-700">
            <li>Custom fields are automatically created when you import contacts with additional columns</li>
            <li>Field names should use lowercase letters, numbers, and underscores</li>
            <li>Deleting a field here only removes it from the list schema - existing data is preserved</li>
            <li>Use custom fields for segmentation and personalization in your emails</li>
          </ul>
        </div>
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
