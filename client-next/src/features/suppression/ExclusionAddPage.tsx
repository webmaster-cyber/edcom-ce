import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'

const EXCLUSION_LISTS: Record<string, { name: string; type: 'emails' | 'domains' }> = {
  e: { name: 'Do Not Email', type: 'emails' },
  m: { name: 'Malicious', type: 'emails' },
  d: { name: 'Domains', type: 'domains' },
}

export function ExclusionAddPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const listId = searchParams.get('id') || 'e'

  const listInfo = EXCLUSION_LISTS[listId] || EXCLUSION_LISTS.e
  const isDomains = listInfo.type === 'domains'

  const [data, setData] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    const items = data
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    if (items.length === 0) {
      toast.error(`Please enter at least one ${isDomains ? 'domain' : 'email address'}`)
      return
    }

    setIsSaving(true)
    try {
      await api.post(`/api/exclusion/${listId}/add`, { data: items })
      toast.success(`Added ${items.length} ${isDomains ? 'domain' : 'email'}${items.length > 1 ? 's' : ''} to ${listInfo.name}`)
      navigate('/suppression?tab=exclusion')
    } catch (err) {
      console.error('Failed to add items:', err)
      toast.error('Failed to add items')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/suppression?tab=exclusion')}
            className="rounded-md p-1.5 text-text-muted hover:bg-gray-100 hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">
              Add to {listInfo.name}
            </h1>
            <p className="text-sm text-text-muted">
              Add {isDomains ? 'domains' : 'email addresses'} to the exclusion list
            </p>
          </div>
        </div>
        <Button onClick={handleSave} loading={isSaving}>
          Add {isDomains ? 'Domains' : 'Emails'}
        </Button>
      </div>

      <div className="mx-auto max-w-xl space-y-6">
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-medium text-text-primary">
            {isDomains ? 'Domains' : 'Email Addresses'}
          </h2>
          <p className="mb-4 text-sm text-text-muted">
            Enter {isDomains ? 'domains' : 'email addresses'} to add, one per line.
          </p>

          <textarea
            value={data}
            onChange={(e) => setData(e.target.value)}
            placeholder={isDomains
              ? 'competitor.com\nblockedsender.org\nspammer.net'
              : 'john@example.com\njane@example.com\nspammer@bad.com'
            }
            rows={10}
            className="input w-full font-mono text-sm"
          />
        </div>

        {/* Info */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h4 className="text-sm font-medium text-blue-800">About {listInfo.name}</h4>
          <p className="mt-1 text-sm text-blue-700">
            {listId === 'e' && 'Email addresses added here will never receive any messages from your campaigns.'}
            {listId === 'm' && 'Use this list for known spam traps, honeypots, and other problematic addresses.'}
            {listId === 'd' && 'All email addresses from these domains will be excluded from your campaigns.'}
          </p>
        </div>
      </div>
    </div>
  )
}
