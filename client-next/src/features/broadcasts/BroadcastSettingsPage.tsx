import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import api from '../../config/api'
import { useAuth } from '../../contexts/AuthContext'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { useNavigationGuard } from '../../hooks/useNavigationGuard'
import { WizardNav } from './WizardNav'
import type { BroadcastFormData } from '../../types/broadcast'

const defaultData: Partial<BroadcastFormData> = {
  name: '',
  fromname: '',
  returnpath: '',
  fromemail: '',
  replyto: '',
  subject: '',
  preheader: '',
  type: 'beefree',
  rawText: '',
  parts: [],
  bodyStyle: { version: 3 },
  lists: [],
  segments: [],
  tags: [],
  supplists: [],
  suppsegs: [],
  supptags: [],
  when: 'draft',
  scheduled_for: null,
  disableopens: false,
  randomize: false,
  newestfirst: false,
  funnel: '',
  resendwhennum: 2,
  resendwhentype: 'days',
  resendsubject: '',
  resendpreheader: '',
  openaddtags: [],
  openremtags: [],
  clickaddtags: [],
  clickremtags: [],
  sendaddtags: [],
  sendremtags: [],
}

export function BroadcastSettingsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || 'new'
  const { user } = useAuth()

  const [data, setData] = useState<Partial<BroadcastFormData>>(defaultData)
  const [isLoading, setIsLoading] = useState(id !== 'new')
  const [isSaving, setIsSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [showReplyTo, setShowReplyTo] = useState(false)
  const [showFromEmail, setShowFromEmail] = useState(false)
  const [allFields, setAllFields] = useState<string[]>([])

  // Load existing broadcast
  useEffect(() => {
    async function load() {
      if (id === 'new') {
        // Auto-populate from user
        if (user) {
          setData((prev) => ({
            ...prev,
            fromname: user.fullname || '',
            returnpath: user.email || '',
          }))
        }
        return
      }
      try {
        const [bcRes, fieldsRes] = await Promise.all([
          api.get(`/api/broadcasts/${id}`),
          api.get('/api/allfields'),
        ])
        setData(bcRes.data)
        setAllFields(fieldsRes.data)
        if (bcRes.data.replyto) setShowReplyTo(true)
        if (bcRes.data.fromemail) setShowFromEmail(true)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id, user])

  // Load fields for new broadcasts
  useEffect(() => {
    if (id === 'new') {
      api.get('/api/allfields').then((res) => setAllFields(res.data)).catch(() => {})
    }
  }, [id])

  function handleChange(field: string, value: string | boolean) {
    setData((prev) => ({ ...prev, [field]: value }))
    setDirty(true)
  }

  const guardSave = useCallback(async () => {
    if (id === 'new') return
    try {
      await api.patch(`/api/broadcasts/${id}`, data)
      setDirty(false)
      toast.success('Draft saved')
    } catch {
      toast.error('Failed to save')
    }
  }, [data, id])

  useNavigationGuard({ dirty, onSave: guardSave })

  const autoSave = useCallback(async () => {
    if (!dirty || id === 'new') return
    try {
      await api.patch(`/api/broadcasts/${id}`, data)
      setDirty(false)
    } catch {
      // silent fail for auto-save
    }
  }, [dirty, data, id])

  async function handleSave() {
    setIsSaving(true)
    try {
      if (id === 'new') {
        const { data: result } = await api.post('/api/broadcasts/', {
          ...data,
          type: 'beefree',
        })
        setDirty(false)
        toast.success('Broadcast created')
        navigate(`/broadcasts/templates?id=${result.id}`)
      } else {
        await api.patch(`/api/broadcasts/${id}`, data)
        setDirty(false)
        toast.success('Settings saved')
        navigate(`/broadcasts/templates?id=${id}`)
      }
    } catch {
      toast.error('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  function insertMergeTag(field: 'subject' | 'preheader', tag: string) {
    const value = data[field] || ''
    const mergeTag = tag === 'Email' ? `{{${tag}}}` : `{{${tag}, default=}}`
    handleChange(field, value + mergeTag)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const isValid = !!(data.name && data.subject && data.fromname && data.returnpath)

  return (
    <div>
      <WizardNav
        title={id === 'new' ? 'Create Broadcast' : 'Broadcast Settings'}
        step={0}
        totalSteps={5}
        id={id}
        nextLabel="Choose Template"
        onNext={handleSave}
        onAutoSave={autoSave}
        nextDisabled={!isValid}
        saving={isSaving}
      />

      <div className="card p-6">
        <div className="space-y-6">
          {/* Broadcast Name */}
          <Input
            label="Broadcast Name"
            value={data.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., Weekly Newsletter"
            required
          />

          {/* From / Sender */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="From Name"
              value={data.fromname || ''}
              onChange={(e) => handleChange('fromname', e.target.value)}
              placeholder="Your Name"
            />
            <div>
              <Input
                label="Sender Email Address"
                type="email"
                value={data.returnpath || ''}
                onChange={(e) => handleChange('returnpath', e.target.value)}
                placeholder="you@example.com"
              />
              <div className="mt-1 flex gap-3 text-xs">
                {!showReplyTo && (
                  <button
                    onClick={() => setShowReplyTo(true)}
                    className="text-primary hover:text-primary-hover"
                  >
                    + Reply-To
                  </button>
                )}
                {!showFromEmail && (
                  <button
                    onClick={() => setShowFromEmail(true)}
                    className="text-primary hover:text-primary-hover"
                  >
                    + From Email
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Optional fields */}
          {(showReplyTo || showFromEmail) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {showReplyTo && (
                <Input
                  label="Reply-To Address"
                  type="email"
                  value={data.replyto || ''}
                  onChange={(e) => handleChange('replyto', e.target.value)}
                  placeholder="reply@example.com"
                />
              )}
              {showFromEmail && (
                <Input
                  label="From Email (alternate)"
                  type="email"
                  value={data.fromemail || ''}
                  onChange={(e) => handleChange('fromemail', e.target.value)}
                  placeholder="alternate@example.com"
                />
              )}
            </div>
          )}

          {/* Subject */}
          <div>
            <div className="flex items-end justify-between">
              <label className="block text-sm font-medium text-text-primary">Subject *</label>
              {allFields.length > 0 && (
                <PersonalizeMenu
                  fields={allFields}
                  onSelect={(tag) => insertMergeTag('subject', tag)}
                />
              )}
            </div>
            <input
              className="input mt-1"
              value={data.subject || ''}
              onChange={(e) => handleChange('subject', e.target.value)}
              placeholder="Email subject line"
              required
            />
          </div>

          {/* Preheader */}
          <div>
            <div className="flex items-end justify-between">
              <label className="block text-sm font-medium text-text-primary">Preheader</label>
              {allFields.length > 0 && (
                <PersonalizeMenu
                  fields={allFields}
                  onSelect={(tag) => insertMergeTag('preheader', tag)}
                />
              )}
            </div>
            <input
              className="input mt-1"
              value={data.preheader || ''}
              onChange={(e) => handleChange('preheader', e.target.value)}
              placeholder="Preview text shown in inbox"
            />
            <p className="mt-1 text-xs text-text-muted">
              Text shown after the subject line in some email clients.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}

function PersonalizeMenu({ fields, onSelect }: { fields: string[]; onSelect: (f: string) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <Button variant="ghost" size="sm" onClick={() => setOpen(!open)}>
        Personalize
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 max-h-48 w-48 overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-lg">
          {fields.map((f) => (
            <button
              key={f}
              onClick={() => {
                onSelect(f)
                setOpen(false)
              }}
              className="block w-full px-4 py-1.5 text-left text-sm text-text-secondary hover:bg-gray-50"
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
