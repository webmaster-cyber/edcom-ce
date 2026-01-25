import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Code, ExternalLink, Copy, Check, Eye, Users, RefreshCw } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { TagInput } from '../../components/ui/TagInput'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import type { SubscribeForm } from '../../types/form'
import type { ContactList } from '../../types/contact'

// Get webroot for embed URLs
function getWebroot(): string {
  return window.location.origin
}

export function FormSettingsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const formId = searchParams.get('id') || ''
  const isNew = location.pathname === '/forms/new'
  const preselectedList = searchParams.get('list') || ''

  const [form, setForm] = useState<SubscribeForm | null>(null)
  const [lists, setLists] = useState<ContactList[]>([])
  const [recentTags, setRecentTags] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copied, setCopied] = useState<'embed' | 'hosted' | null>(null)

  // Editable fields
  const [name, setName] = useState('')
  const [listId, setListId] = useState('')
  const [disabled, setDisabled] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

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
        const [listsRes, tagsRes] = await Promise.all([
          api.get<ContactList[]>('/api/lists'),
          api.get<string[]>('/api/recenttags').catch(() => ({ data: [] })),
        ])
        setLists(listsRes.data)
        setRecentTags(tagsRes.data)

        if (!isNew) {
          const { data } = await api.get<SubscribeForm>(`/api/forms/${formId}`)
          setForm(data)
          setName(data.name)
          setListId(data.list)
          setDisabled(data.disabled || false)
          setTags(data.tags || [])
          setSuccessMsg(data.successmsg || '')
          setErrorMsg(data.errormsg || '')
        } else {
          // New form defaults
          setName('')
          setListId(preselectedList || listsRes.data[0]?.id || '')
          setDisabled(false)
          setTags([])
          setSuccessMsg('Thank you for subscribing!')
          setErrorMsg('Something went wrong. Please try again.')
        }
      } catch (err) {
        console.error('Failed to load form:', err)
        toast.error('Failed to load form')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [formId, isNew, preselectedList])

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Form name is required')
      return
    }
    // Use listId or fall back to first available list
    const selectedListId = listId || lists[0]?.id
    if (!selectedListId) {
      toast.error('Please select a contact list')
      return
    }

    setIsSaving(true)
    try {
      if (isNew) {
        // New form needs all the default fields including visual structure
        // Card-style form with shadow and rounded corners - mobile first (max 340px)
        const defaultBodyStyle = {
          version: 3,
          paddingTop: 32,
          paddingLeft: 24,
          paddingRight: 24,
          paddingBottom: 32,
          bodyType: 'fixed',
          bodyWidth: 340,
          backgroundColor: '#ffffff',
          backgroundType: 'color',
          borderRadius: 12,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }
        // Brand color - professional blue
        const brandColor = '#2563EB'

        // Clean, professional form parts with mobile-first design
        const headlinePart = {
          type: 'Headline',
          id: 'headline',
          fontSize: 20,
          color: '#111827',
          paddingTop: 0,
          paddingBottom: 4,
          paddingLeft: 0,
          paddingRight: 0,
          html: `<table style="border-spacing: 0; border-collapse: collapse; padding: 0; vertical-align: top; width: 100%"><tr><td style="padding: 0 0 4px 0; text-align: center;"><h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.3;">Stay in the loop</h2></td></tr></table>`,
        }
        const textPart = {
          type: 'Text',
          id: 'subtext',
          fontSize: 14,
          color: '#6b7280',
          paddingTop: 0,
          paddingBottom: 20,
          paddingLeft: 0,
          paddingRight: 0,
          html: `<table style="border-spacing: 0; border-collapse: collapse; padding: 0; vertical-align: top; width: 100%"><tr><td style="padding: 0 0 20px 0; text-align: center;"><p style="margin: 0; font-size: 14px; color: #6b7280; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5;">Subscribe to receive updates directly in your inbox.</p></td></tr></table>`,
        }
        const emailInputPart = {
          type: 'Input',
          id: 'email-input',
          placeholder: 'you@example.com',
          field: 'Email',
          fontSize: 16,
          color: '#374151',
          inputColor: '#ffffff',
          inputBorderColor: '#e5e7eb',
          inputHeight: 6,
          inputWidth: 6,
          inputRadius: 8,
          inputType: 'email',
          align: 'left',
          required: true,
          paddingTop: 0,
          paddingBottom: 12,
          paddingLeft: 0,
          paddingRight: 0,
          html: `<table style="border-spacing: 0; border-collapse: collapse; padding: 0; vertical-align: top; width: 100%"><tr><td style="padding: 0 0 12px 0;"><input type="email" name="Email" required placeholder="you@example.com" style="width: 100%; padding: 12px 14px; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border: 1px solid #e5e7eb; border-radius: 8px; box-sizing: border-box; outline: none; background: #f9fafb;"></td></tr></table>`,
        }
        const submitButtonPart = {
          type: 'Button',
          id: 'submit-button',
          text: 'Subscribe',
          fontSize: 16,
          color: '#FFFFFF',
          buttonColor: brandColor,
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
          html: `<table style="border-spacing: 0; border-collapse: collapse; padding: 0; vertical-align: top; width: 100%"><tr><td style="padding: 0;"><button type="submit" style="width: 100%; padding: 12px 20px; font-size: 16px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #FFFFFF; background: ${brandColor}; border: none; border-radius: 8px; cursor: pointer;">Subscribe</button></td></tr></table>`,
        }
        const privacyPart = {
          type: 'Text',
          id: 'privacy',
          fontSize: 12,
          color: '#9ca3af',
          paddingTop: 12,
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
          html: `<table style="border-spacing: 0; border-collapse: collapse; padding: 0; vertical-align: top; width: 100%"><tr><td style="padding: 12px 0 0 0; text-align: center;"><p style="margin: 0; font-size: 12px; color: #9ca3af; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.4;">We respect your privacy. Unsubscribe at any time.</p></td></tr></table>`,
        }
        const defaultParts = [headlinePart, textPart, emailInputPart, submitButtonPart, privacyPart]

        const newFormPayload = {
          name: name.trim(),
          list: selectedListId,
          tags,
          funnel: '',
          // Visual structure
          parts: defaultParts,
          bodyStyle: defaultBodyStyle,
          initialize: false,
          // Display settings
          display: 'slide',
          slidelocation: 'bottom-right',
          hellolocation: 'top',
          // Mobile settings - same card style, optimized for mobile
          mobile: {
            parts: JSON.parse(JSON.stringify(defaultParts)),
            bodyStyle: {
              ...defaultBodyStyle,
              bodyType: 'full',
              bodyWidth: 320,
              paddingTop: 28,
              paddingLeft: 20,
              paddingRight: 20,
              paddingBottom: 28,
            },
            display: 'slide',
            slidelocation: 'bottom',
            hellolocation: 'bottom',
          },
          // Behavior settings
          submitaction: 'msg',
          submitmsg: successMsg || 'Thank you for subscribing!',
          showdelaysecs: 0,
          showwhen: '',
          hideaftersubmit: true,
          returnaftersubmit: false,
          returnaftersubmitdays: 3,
          hideaftershow: false,
          returnaftershow: false,
          returnaftershowdays: 1,
        }
        const { data } = await api.post<{ id: string }>('/api/forms', newFormPayload)
        toast.success('Form created')
        navigate(`/forms/settings?id=${data.id}`, { replace: true })
      } else {
        // Existing form - only update editable fields
        const updatePayload = {
          name: name.trim(),
          list: selectedListId,
          disabled,
          tags,
          submitmsg: successMsg,
        }
        await api.patch(`/api/forms/${formId}`, updatePayload)
        toast.success('Form saved')
      }
    } catch (err: unknown) {
      console.error('Failed to save form:', err)
      const axiosErr = err as { response?: { data?: { title?: string; description?: string } } }
      const message = axiosErr.response?.data?.description || axiosErr.response?.data?.title || 'Failed to save form'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRefreshStats = async () => {
    if (isNew) return
    setIsRefreshing(true)
    try {
      const { data } = await api.get<SubscribeForm>(`/api/forms/${formId}`)
      setForm(data)
    } catch {
      toast.error('Failed to refresh stats')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleDelete = () => {
    setConfirmDialog({
      open: true,
      title: 'Delete Form',
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/api/forms/${formId}`)
          toast.success('Form deleted')
          navigate('/forms')
        } catch {
          toast.error('Failed to delete form')
        }
      },
    })
  }

  const hostedUrl = useMemo(() => {
    if (isNew) return ''
    return `${getWebroot()}/api/showform/${formId}`
  }, [formId, isNew])

  const embedCode = useMemo(() => {
    if (isNew) return ''
    return `<script id="script-${formId}" src="${getWebroot()}/api/showform/${formId}/embed.js" async></script>`
  }, [formId, isNew])

  const handleCopy = async (type: 'embed' | 'hosted') => {
    const text = type === 'embed' ? embedCode : hostedUrl
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(null), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const listOptions = useMemo(() => {
    return lists.map((l) => ({ value: l.id, label: l.name }))
  }, [lists])

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/forms')}
            className="rounded-md p-1.5 text-text-muted hover:bg-gray-100 hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">
              {isNew ? 'New Form' : 'Form Settings'}
            </h1>
            {!isNew && <p className="text-sm text-text-muted">{name}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          )}
          <Button onClick={handleSave} loading={isSaving}>
            {isNew ? 'Create Form' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <LoadingOverlay loading={isLoading}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main settings */}
          <div className="space-y-6 lg:col-span-2">
            {/* Basic Settings */}
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-medium text-text-primary">Basic Settings</h2>
              <div className="space-y-4">
                <Input
                  label="Form Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Newsletter Signup"
                />

                <Select
                  label="Add Contacts To"
                  value={listId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setListId(e.target.value)}
                  options={listOptions}
                />

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={disabled}
                      onChange={(e) => setDisabled(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-text-primary">
                      Disable form (will not accept submissions)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-medium text-text-primary">Auto-Tag Subscribers</h2>
              <p className="mb-4 text-sm text-text-muted">
                Contacts who submit this form will automatically be tagged with these tags.
              </p>
              <TagInput
                value={tags}
                onChange={setTags}
                suggestions={recentTags}
                placeholder="Add tags..."
              />
            </div>

            {/* Messages */}
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-medium text-text-primary">Messages</h2>
              <div className="space-y-4">
                <Input
                  label="Success Message"
                  value={successMsg}
                  onChange={(e) => setSuccessMsg(e.target.value)}
                  placeholder="Thank you for subscribing!"
                />
                <Input
                  label="Error Message"
                  value={errorMsg}
                  onChange={(e) => setErrorMsg(e.target.value)}
                  placeholder="Something went wrong. Please try again."
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            {!isNew && form && (
              <div className="card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-medium text-text-primary">Statistics</h2>
                  <button
                    onClick={handleRefreshStats}
                    disabled={isRefreshing}
                    className="rounded-md p-1 text-text-muted hover:bg-gray-100 hover:text-text-primary disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <Eye className="mx-auto mb-1 h-5 w-5 text-text-muted" />
                    <div className="text-2xl font-semibold text-text-primary">
                      {(form.views_uniq || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-text-muted">Unique Views</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <Users className="mx-auto mb-1 h-5 w-5 text-text-muted" />
                    <div className="text-2xl font-semibold text-text-primary">
                      {(form.submits_uniq || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-text-muted">Signups</div>
                  </div>
                </div>
                {(form.views_uniq || 0) > 0 && (
                  <div className="mt-3 text-center text-sm text-text-muted">
                    {(((form.submits_uniq || 0) / (form.views_uniq || 1)) * 100).toFixed(1)}%
                    conversion rate
                  </div>
                )}
              </div>
            )}

            {/* Embed Code */}
            {!isNew && (
              <div className="card p-6">
                <h2 className="mb-4 text-lg font-medium text-text-primary">Embed Code</h2>

                <div className="space-y-4">
                  {/* Hosted URL */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-secondary">
                      Hosted Form URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={hostedUrl}
                        readOnly
                        className="input flex-1 bg-gray-50 text-xs"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopy('hosted')}
                        icon={
                          copied === 'hosted' ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )
                        }
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => window.open(hostedUrl, '_blank')}
                        icon={<ExternalLink className="h-4 w-4" />}
                      />
                    </div>
                  </div>

                  {/* Embed Script */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-secondary">
                      Embed Script
                    </label>
                    <div className="relative">
                      <textarea
                        value={embedCode}
                        readOnly
                        rows={3}
                        className="input w-full bg-gray-50 font-mono text-xs"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopy('embed')}
                        icon={
                          copied === 'embed' ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )
                        }
                        className="absolute right-2 top-2"
                      />
                    </div>
                    <p className="mt-1 text-xs text-text-muted">
                      Paste this script in the body of your web page where you want the form to
                      appear.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex gap-2">
                <Code className="h-5 w-5 flex-shrink-0 text-blue-600" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800">Form Builder</h4>
                  <p className="mt-1 text-sm text-blue-700">
                    {isNew
                      ? 'After creating the form, you can customize its appearance using the visual editor.'
                      : 'Use the visual form builder to customize the look and feel of your form.'}
                  </p>
                </div>
              </div>
            </div>
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
