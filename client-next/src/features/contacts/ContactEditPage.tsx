import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Mail } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { TagInput } from '../../components/ui/TagInput'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ContactInfoCard } from './components/ContactInfoCard'
import type { ContactRecord } from '../../types/contact'

interface ContactData extends ContactRecord {
  _tags?: string[]
  _lists?: { id: string; name: string; status: string }[]
  notes?: string
}

export function ContactEditPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''

  const [contact, setContact] = useState<ContactData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [recentTags, setRecentTags] = useState<string[]>([])
  const [availableFields, setAvailableFields] = useState<string[]>([])

  // Editable state
  const [editedFields, setEditedFields] = useState<Record<string, string>>({})
  const [editedTags, setEditedTags] = useState<string[]>([])
  const [newFieldName, setNewFieldName] = useState('')
  const [showAddField, setShowAddField] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [contactRes, tagsRes, fieldsRes] = await Promise.all([
          api.get<ContactData>(`/api/contactdata/${encodeURIComponent(email)}`),
          api.get<string[]>('/api/recenttags').catch(() => ({ data: [] })),
          api.get<string[]>('/api/allfields').catch(() => ({ data: [] })),
        ])
        setContact(contactRes.data)
        setRecentTags(tagsRes.data)
        setAvailableFields(fieldsRes.data)

        // Initialize editable state
        const fields: Record<string, string> = {}
        Object.entries(contactRes.data).forEach(([key, value]) => {
          if (!key.startsWith('_') && key.toLowerCase() !== 'email') {
            fields[key] = String(value ?? '')
          }
        })
        setEditedFields(fields)
        setEditedTags(contactRes.data._tags || [])
      } catch (err) {
        console.error('Failed to load contact:', err)
        toast.error('Failed to load contact')
      } finally {
        setIsLoading(false)
      }
    }
    if (email) load()
  }, [email])

  const handleFieldChange = (field: string, value: string) => {
    setEditedFields((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddField = () => {
    if (!newFieldName.trim()) return
    const fieldName = newFieldName.trim().toLowerCase().replace(/\s+/g, '_')
    setEditedFields((prev) => ({ ...prev, [fieldName]: '' }))
    setNewFieldName('')
    setShowAddField(false)
  }

  const handleRemoveField = (field: string) => {
    setEditedFields((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await api.patch(`/api/contactdata/${encodeURIComponent(email)}`, {
        ...editedFields,
        _tags: editedTags,
        notes: notes,
      })
      toast.success('Contact updated')
      navigate(-1)
    } catch {
      toast.error('Failed to save contact')
    } finally {
      setIsSaving(false)
    }
  }

  // Standard fields (case-insensitive matching)
  const standardFieldsLower = ['firstname', 'lastname', 'name', 'phone', 'company', 'city', 'state', 'country', 'zip']

  const isStandardField = (field: string): boolean => {
    return standardFieldsLower.includes(field.toLowerCase())
  }

  const getStandardFieldIndex = (field: string): number => {
    return standardFieldsLower.indexOf(field.toLowerCase())
  }

  // Notes field state
  const [notes, setNotes] = useState('')

  // Initialize notes from contact data
  useEffect(() => {
    if (contact) {
      setNotes((contact.notes as string) || '')
    }
  }, [contact])

  // Get contact display name
  const getContactName = (): string => {
    if (!contact) return ''
    const firstName = (contact.firstname || contact.FirstName || '') as string
    const lastName = (contact.lastname || contact.LastName || '') as string
    const name = (contact.name || contact.Name || '') as string

    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim()
    }
    return name || ''
  }

  // Separate standard and custom fields (case-insensitive sorting)
  const displayFields = Object.keys(editedFields).sort((a, b) => {
    const aStandard = getStandardFieldIndex(a)
    const bStandard = getStandardFieldIndex(b)
    if (aStandard !== -1 && bStandard !== -1) return aStandard - bStandard
    if (aStandard !== -1) return -1
    if (bStandard !== -1) return 1
    return a.localeCompare(b)
  })

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="rounded-md p-1.5 text-text-muted hover:bg-gray-100 hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Edit Contact</h1>
          <p className="text-sm text-text-muted">{email}</p>
        </div>
      </div>

      <LoadingOverlay loading={isLoading}>
        {contact && (
          <div className="space-y-6">
            {/* Contact Info Card */}
            <ContactInfoCard
              email={email}
              name={getContactName()}
              lists={contact._lists}
            />

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main form */}
              <div className="card p-6 lg:col-span-2">
                <h2 className="mb-4 text-lg font-medium text-text-primary">Properties</h2>

                <div className="space-y-4">
                  {/* Email (read-only) */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-secondary">
                      Email
                    </label>
                    <input
                      type="text"
                      value={email}
                      disabled
                      className="input w-full bg-gray-50"
                    />
                  </div>

                {/* Editable fields */}
                {displayFields.map((field) => (
                  <div key={field} className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input
                        label={field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ')}
                        value={editedFields[field]}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                      />
                    </div>
                    {!isStandardField(field) && (
                      <button
                        type="button"
                        onClick={() => handleRemoveField(field)}
                        className="mb-0.5 rounded-md p-2 text-text-muted hover:bg-red-50 hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Add field */}
                {showAddField ? (
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input
                        label="New field name"
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        placeholder="e.g., company_size"
                        autoFocus
                      />
                    </div>
                    <Button onClick={handleAddField} disabled={!newFieldName.trim()}>
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
                  >
                    Add Property
                  </Button>
                )}

                {/* Suggested fields */}
                {availableFields.filter((f) => !displayFields.includes(f) && f.toLowerCase() !== 'email').length > 0 && (
                  <div className="border-t border-border pt-4">
                    <p className="mb-2 text-xs text-text-muted">Available fields:</p>
                    <div className="flex flex-wrap gap-1">
                      {availableFields
                        .filter((f) => !displayFields.includes(f) && f.toLowerCase() !== 'email')
                        .slice(0, 10)
                        .map((field) => (
                          <button
                            key={field}
                            type="button"
                            onClick={() => setEditedFields((prev) => ({ ...prev, [field]: '' }))}
                            className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-text-secondary hover:bg-gray-200"
                          >
                            + {field}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Tags */}
                <div className="card p-6">
                  <h2 className="mb-4 text-lg font-medium text-text-primary">Tags</h2>
                  <TagInput
                    value={editedTags}
                    onChange={setEditedTags}
                    suggestions={recentTags}
                    placeholder="Add tags..."
                  />
                </div>

                {/* Notes */}
                <div className="card p-6">
                  <h2 className="mb-4 text-lg font-medium text-text-primary">Notes</h2>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this contact..."
                    rows={6}
                    className="w-full rounded-md border-2 border-amber-200 bg-amber-50 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-amber-300 focus:outline-none focus:ring-0"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #fef3c7 27px, #fef3c7 28px)',
                      lineHeight: '28px',
                    }}
                  />
                </div>
              </div>

              {/* Save button */}
              <div className="lg:col-span-3 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} loading={isSaving}>
                  Save Changes
                </Button>
              </div>
            </div>

            {/* Campaign Activity Section */}
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-medium text-text-primary">Campaign Activity</h2>
              <EmptyState
                icon={<Mail className="h-8 w-8" />}
                title="No campaign data available"
                description="Campaign activity tracking will be available in a future update."
              />
              {/* Placeholder table structure for future implementation */}
              {false && (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-2 text-left text-xs font-medium text-text-muted uppercase">
                          Campaign
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-text-muted uppercase">
                          Opens
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-text-muted uppercase">
                          Clicks
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {/* Future: Map campaign activity data here */}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </LoadingOverlay>
    </div>
  )
}
