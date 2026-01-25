import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Tag, Mail } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { TagInput } from '../../components/ui/TagInput'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import type { Funnel } from '../../types/funnel'

interface Route {
  id: string
  name: string
}

export function FunnelSettingsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || 'new'
  const isNew = id === 'new'

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [routes, setRoutes] = useState<Route[]>([])
  const [recentTags, setRecentTags] = useState<string[]>([])

  // Form state
  const [name, setName] = useState('')
  const [type, setType] = useState<'tags' | 'responders'>('tags')
  const [tags, setTags] = useState<string[]>([])
  const [exitTags, setExitTags] = useState<string[]>([])
  const [fromName, setFromName] = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [route, setRoute] = useState('')
  const [multiple, setMultiple] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [routesRes, tagsRes] = await Promise.all([
          api.get<Route[]>('/api/userroutes').catch(() => ({ data: [] })),
          api.get<string[]>('/api/recenttags').catch(() => ({ data: [] })),
        ])
        setRoutes(routesRes.data)
        setRecentTags(tagsRes.data)

        if (!isNew) {
          const { data: funnel } = await api.get<Funnel>(`/api/funnels/${id}`)
          setName(funnel.name || '')
          setType(funnel.type || 'tags')
          setTags(funnel.tags || [])
          setExitTags(funnel.exittags || [])
          setFromName(funnel.fromname || '')
          setFromEmail(funnel.fromemail || '')
          setReplyTo(funnel.replyto || '')
          setRoute(funnel.route || '')
          setMultiple(funnel.multiple || false)
        }
      } catch (err) {
        console.error('Failed to load:', err)
        toast.error('Failed to load funnel')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id, isNew])

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a funnel name')
      return
    }

    if (type === 'tags' && tags.length === 0) {
      toast.error('Please add at least one trigger tag')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        name: name.trim(),
        type,
        tags: type === 'tags' ? tags : [],
        exittags: type === 'tags' ? exitTags : [],
        fromname: fromName.trim(),
        fromemail: fromEmail.trim(),
        replyto: replyTo.trim(),
        route,
        multiple,
        messages: [],
      }

      if (isNew) {
        const { data } = await api.post<{ id: string }>('/api/funnels', payload)
        toast.success('Funnel created')
        navigate(`/funnels/messages?id=${data.id}`)
      } else {
        await api.patch(`/api/funnels/${id}`, payload)
        toast.success('Funnel updated')
        navigate(`/funnels/messages?id=${id}`)
      }
    } catch (err) {
      console.error('Failed to save:', err)
      toast.error('Failed to save funnel')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/funnels')}
          className="rounded-md p-1.5 text-text-muted hover:bg-gray-100 hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            {isNew ? 'Create Funnel' : 'Funnel Settings'}
          </h1>
          <p className="text-sm text-text-muted">
            {isNew ? 'Set up a new automated email sequence' : 'Configure funnel settings'}
          </p>
        </div>
      </div>

      <LoadingOverlay loading={isLoading}>
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Basic Settings */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-medium text-text-primary">Basic Settings</h2>
            <div className="space-y-4">
              <Input
                label="Funnel Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Welcome Series, Webinar Follow-up"
                required
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-text-secondary">
                  Trigger Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setType('tags')}
                    className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-colors ${
                      type === 'tags'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-gray-300'
                    }`}
                  >
                    <div
                      className={`rounded-full p-2 ${
                        type === 'tags' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-text-muted'
                      }`}
                    >
                      <Tag className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-text-primary">Tag-Based</div>
                      <div className="text-xs text-text-muted">
                        Triggered when contacts are tagged
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('responders')}
                    className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-colors ${
                      type === 'responders'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-gray-300'
                    }`}
                  >
                    <div
                      className={`rounded-full p-2 ${
                        type === 'responders'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-gray-100 text-text-muted'
                      }`}
                    >
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-text-primary">Responders</div>
                      <div className="text-xs text-text-muted">
                        Triggered by broadcasts or forms
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {type === 'tags' && (
                <>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="flex gap-3">
                      <Tag className="h-5 w-5 shrink-0 text-blue-500" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-900">How this funnel works</p>
                        <p className="mt-1 text-blue-700">
                          When a contact receives a trigger tag, they automatically enter this funnel
                          and start receiving the email sequence. Tags can be applied from broadcasts,
                          forms, imports, the API, or manually on a contact's profile.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-secondary">
                      Trigger Tags <span className="text-danger">*</span>
                    </label>
                    <p className="mb-2 text-xs text-text-muted">
                      Contacts enter this funnel when they receive any of these tags
                    </p>
                    <TagInput
                      value={tags}
                      onChange={setTags}
                      suggestions={recentTags}
                      placeholder="Add trigger tags..."
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-secondary">
                      Exit Tags
                    </label>
                    <p className="mb-2 text-xs text-text-muted">
                      Contacts leave this funnel early if they receive any of these tags
                    </p>
                    <TagInput
                      value={exitTags}
                      onChange={setExitTags}
                      suggestions={recentTags}
                      placeholder="Add exit tags..."
                    />
                  </div>
                </>
              )}

              {type === 'responders' && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex gap-3">
                    <Mail className="h-5 w-5 shrink-0 text-blue-500" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900">How to trigger this funnel</p>
                      <p className="mt-1 text-blue-700">
                        To send contacts to this funnel, select it on:
                      </p>
                      <ul className="mt-2 list-inside list-disc text-blue-700">
                        <li>The <strong>Review page</strong> when creating a broadcast (for openers/clickers)</li>
                        <li>The <strong>Contacts tab</strong> when configuring a form</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={multiple}
                  onChange={(e) => setMultiple(e.target.checked)}
                  className="rounded text-primary"
                />
                <span className="text-sm text-text-secondary">
                  Allow contacts to go through this funnel multiple times
                </span>
              </label>
            </div>
          </div>

          {/* Sender Settings */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-medium text-text-primary">Default Sender</h2>
            <p className="mb-4 text-sm text-text-muted">
              These defaults can be overridden per message
            </p>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="From Name"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="Your Company"
                />
                <Input
                  label="Sender Email"
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="hello@example.com"
                />
              </div>
              <Input
                label="Reply-To Email"
                type="email"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                placeholder="replies@example.com"
              />
              {routes.length > 0 && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">
                    Sending Route
                  </label>
                  <select
                    value={route}
                    onChange={(e) => setRoute(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">Default route</option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate('/funnels')}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={isSaving}>
              {isNew ? 'Create Funnel' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </LoadingOverlay>
    </div>
  )
}
