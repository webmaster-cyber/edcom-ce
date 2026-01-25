import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Send } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { BeefreeEditor } from '../../components/editors/BeefreeEditor'
import { CodeEditor } from '../../components/editors/CodeEditor'
import type { TransactionalTemplate } from '../../types/transactional'

export function TransactionalTemplateEditPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || ''
  const isNew = id === 'new'

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)

  // Template fields
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [preheader, setPreheader] = useState('')
  const [fromName, setFromName] = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [tag, setTag] = useState('')
  const [editorType, setEditorType] = useState<'beefree' | 'raw'>('beefree')
  const [templateJson, setTemplateJson] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const savedRawTextRef = useRef<string>('')

  // Test email modal
  const [showTestModal, setShowTestModal] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testVariables, setTestVariables] = useState('{}')
  const [isSendingTest, setIsSendingTest] = useState(false)

  const loadTemplate = useCallback(async () => {
    if (isNew) return

    try {
      const { data } = await api.get<TransactionalTemplate>(`/api/transactional/templates/${id}`)
      setName(data.name || '')
      setSubject(data.subject || '')
      setPreheader(data.preheader || '')
      setFromName(data.fromname || '')
      setFromEmail(data.fromemail || '')
      setReplyTo(data.replyto || '')
      setTag(data.tag || '')
      setEditorType(data.type === 'raw' ? 'raw' : 'beefree')

      if (data.rawText) {
        setTemplateJson(data.rawText)
        setHtmlContent(data.rawText)
      } else if (data.parts) {
        setTemplateJson(JSON.stringify(data.parts))
      }
    } catch (err) {
      console.error('Failed to load:', err)
      toast.error('Failed to load template')
    } finally {
      setIsLoading(false)
    }
  }, [id, isNew])

  useEffect(() => {
    loadTemplate()
  }, [loadTemplate])

  const handleBeefreeSave = useCallback((json: string, html: string) => {
    savedRawTextRef.current = JSON.stringify({ html, json: JSON.parse(json) })
  }, [])

  const triggerBeeSave = async () => {
    const container = document.getElementById('bee-plugin-container') as HTMLDivElement & { triggerSave?: () => Promise<void> } | null
    if (container?.triggerSave) {
      await container.triggerSave()
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a template name')
      return
    }
    if (!subject.trim()) {
      toast.error('Please enter a subject line')
      return
    }

    setIsSaving(true)
    try {
      if (editorType === 'beefree') {
        await triggerBeeSave()
      }

      const payload: Partial<TransactionalTemplate> & { rawText?: string } = {
        name: name.trim(),
        subject: subject.trim(),
        preheader: preheader.trim(),
        fromname: fromName.trim(),
        fromemail: fromEmail.trim(),
        replyto: replyTo.trim(),
        tag: tag.trim(),
        type: editorType === 'beefree' ? 'beefree' : 'raw',
      }

      if (editorType === 'beefree' && savedRawTextRef.current) {
        payload.rawText = savedRawTextRef.current
      } else if (editorType === 'raw') {
        payload.rawText = htmlContent
      }

      if (isNew) {
        const { data } = await api.post<{ id: string }>('/api/transactional/templates', payload)
        toast.success('Template created')
        navigate(`/transactional/template?id=${data.id}`, { replace: true })
      } else {
        await api.patch(`/api/transactional/templates/${id}`, payload)
        toast.success('Template saved')
      }
    } catch (err) {
      console.error('Failed to save:', err)
      toast.error('Failed to save template')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      toast.error('Please enter an email address')
      return
    }

    let variables = {}
    try {
      variables = JSON.parse(testVariables)
    } catch {
      toast.error('Invalid JSON for variables')
      return
    }

    setIsSendingTest(true)
    try {
      // Save first
      await handleSave()

      await api.post(`/api/transactional/templates/${id}/test`, {
        to: testEmail.trim(),
        variables,
      })
      toast.success('Test email sent')
      setShowTestModal(false)
    } catch {
      toast.error('Failed to send test email')
    } finally {
      setIsSendingTest(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/transactional/templates')}
            className="rounded-md p-1.5 text-text-muted hover:bg-gray-100 hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">
              {isNew ? 'Create Template' : 'Edit Template'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button
              variant="secondary"
              icon={<Send className="h-4 w-4" />}
              onClick={() => setShowTestModal(true)}
            >
              Send Test
            </Button>
          )}
          <Button onClick={handleSave} loading={isSaving}>
            {isNew ? 'Create' : 'Save'}
          </Button>
        </div>
      </div>

      <LoadingOverlay loading={isLoading}>
        {/* Settings Bar */}
        <div className="mb-4 card p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Template Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Welcome Email"
              required
            />
            <Input
              label="Default Tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g., welcome"
            />
            <Input
              label="From Name"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Your Company"
            />
            <Input
              label="From Email"
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="hello@example.com"
            />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Reply-To Email"
              type="email"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              placeholder="support@example.com"
            />
            <Input
              label="Subject Line"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Your subject here..."
              required
            />
            <Input
              label="Preheader"
              value={preheader}
              onChange={(e) => setPreheader(e.target.value)}
              placeholder="Preview text..."
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                Editor Type
              </label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditorType('beefree')}
                  className={`flex-1 rounded px-3 py-2 text-sm ${
                    editorType === 'beefree'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                  }`}
                >
                  Visual
                </button>
                <button
                  onClick={() => setEditorType('raw')}
                  className={`flex-1 rounded px-3 py-2 text-sm ${
                    editorType === 'raw'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                  }`}
                >
                  HTML
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Editor */}
        {editorType === 'beefree' ? (
          <BeefreeEditor
            template={templateJson}
            fields={[]}
            onSave={handleBeefreeSave}
            transactional
          />
        ) : (
          <div className="card h-[calc(100vh-350px)] min-h-[400px] overflow-hidden">
            <CodeEditor
              value={htmlContent}
              onChange={setHtmlContent}
              language="html"
            />
          </div>
        )}
      </LoadingOverlay>

      {/* Test Email Modal */}
      <Modal
        open={showTestModal}
        onClose={() => setShowTestModal(false)}
        title="Send Test Email"
      >
        <div className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@example.com"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              Test Variables (JSON)
            </label>
            <textarea
              value={testVariables}
              onChange={(e) => setTestVariables(e.target.value)}
              rows={4}
              className="input w-full font-mono text-sm"
              placeholder='{"name": "John", "amount": "$100"}'
            />
            <p className="mt-1 text-xs text-text-muted">
              Variables will replace {'{{variable}}'} placeholders in your template
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowTestModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendTest} loading={isSendingTest}>
              Send Test
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
