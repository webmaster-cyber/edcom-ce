import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Plus,
  FileText,
  Eye,
  Users,
  ExternalLink,
  Copy,
  Check,
  Settings,
} from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ListNav } from './components/ListNav'
import type { ContactList } from '../../types/contact'
import type { FormListItem } from '../../types/form'

// Get webroot for embed URLs
function getWebroot(): string {
  return window.location.origin
}

export function ListSubscribeFormPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const listId = searchParams.get('id') || ''

  const [list, setList] = useState<ContactList | null>(null)
  const [forms, setForms] = useState<FormListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [listRes, formsRes] = await Promise.all([
          api.get<ContactList>(`/api/lists/${listId}`),
          api.get<FormListItem[]>('/api/forms'),
        ])
        setList(listRes.data)
        // Filter forms that belong to this list
        const listForms = formsRes.data.filter((f) => f.list === listId)
        setForms(listForms)
      } catch (err) {
        console.error('Failed to load data:', err)
        toast.error('Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }
    if (listId) load()
  }, [listId])

  const handleCreateForm = () => {
    navigate(`/forms/new?list=${listId}`)
  }

  const handleCopyEmbed = async (formId: string) => {
    const embedCode = `<script id="script-${formId}" src="${getWebroot()}/api/showform/${formId}/embed.js" async></script>`
    try {
      await navigator.clipboard.writeText(embedCode)
      setCopiedId(formId)
      toast.success('Embed code copied')
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast.error('Failed to copy')
    }
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
            <h1 className="text-xl font-semibold text-text-primary">Subscribe Forms</h1>
            {list && <p className="text-sm text-text-muted">{list.name}</p>}
          </div>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreateForm}>
          Create Form
        </Button>
      </div>

      {/* List Navigation */}
      {list && <ListNav listId={listId} listName={list.name} />}

      <LoadingOverlay loading={isLoading}>
        {forms.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="No subscribe forms"
            description="Create a subscribe form to let visitors sign up for this list on your website."
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreateForm}>
                Create Form
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {forms.map((form) => (
              <div key={form.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Form name and status */}
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-text-primary">{form.name}</h3>
                      {form.disabled && (
                        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                          Disabled
                        </span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="mt-2 flex items-center gap-4 text-sm text-text-muted">
                      <div className="flex items-center gap-1.5">
                        <Eye className="h-4 w-4" />
                        <span>{(form.views_uniq || 0).toLocaleString()} views</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        <span>{(form.submits_uniq || 0).toLocaleString()} signups</span>
                      </div>
                      {(form.views_uniq || 0) > 0 && (
                        <span>
                          {(((form.submits_uniq || 0) / (form.views_uniq || 1)) * 100).toFixed(1)}%
                          conversion
                        </span>
                      )}
                    </div>

                    {/* Embed code preview */}
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <code className="flex-1 truncate rounded bg-gray-100 px-2 py-1 font-mono text-xs text-text-muted">
                          {`<script id="script-${form.id}" src="${getWebroot()}/api/showform/${form.id}/embed.js" async></script>`}
                        </code>
                        <button
                          onClick={() => handleCopyEmbed(form.id)}
                          className="rounded-md p-1.5 text-text-muted hover:bg-gray-100 hover:text-text-primary"
                          title="Copy embed code"
                        >
                          {copiedId === form.id ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="ml-4 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<ExternalLink className="h-4 w-4" />}
                      onClick={() =>
                        window.open(`${getWebroot()}/api/showform/${form.id}`, '_blank')
                      }
                    >
                      Preview
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Settings className="h-4 w-4" />}
                      onClick={() => navigate(`/forms/settings?id=${form.id}`)}
                    >
                      Settings
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Info box */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h4 className="text-sm font-medium text-blue-800">About Subscribe Forms</h4>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-700">
                <li>Forms can be embedded on your website using the script tag shown above</li>
                <li>Visitors who submit the form will be automatically added to this list</li>
                <li>You can customize the form appearance in the form settings</li>
                <li>View detailed statistics in the form settings page</li>
              </ul>
            </div>
          </div>
        )}
      </LoadingOverlay>
    </div>
  )
}
