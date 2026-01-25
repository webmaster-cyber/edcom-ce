import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Play, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { Modal } from '../../components/ui/Modal'
import type { Webhook, WebhookTestResult } from '../../types/webhook'
import { WEBHOOK_EVENTS, WEBHOOK_EXAMPLE_PAYLOADS } from '../../types/webhook'

export function WebhookEditPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const webhookId = searchParams.get('id') || ''
  const isNew = webhookId === 'new'

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [event, setEvent] = useState<string>('form_submit')

  // Test modal
  const [showTestModal, setShowTestModal] = useState(false)
  const [testPayload, setTestPayload] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<WebhookTestResult | null>(null)

  useEffect(() => {
    if (!isNew) {
      loadWebhook()
    }
  }, [webhookId, isNew])

  useEffect(() => {
    // Update example payload when event changes
    const example = WEBHOOK_EXAMPLE_PAYLOADS[event as keyof typeof WEBHOOK_EXAMPLE_PAYLOADS]
    if (example) {
      setTestPayload(JSON.stringify(example, null, 2))
    }
  }, [event])

  async function loadWebhook() {
    try {
      const { data } = await api.get<Webhook>(`/api/resthooks/${webhookId}`)
      setName(data.name || '')
      setTargetUrl(data.target_url)
      setEvent(data.event)
    } catch (err) {
      console.error('Failed to load webhook:', err)
      toast.error('Failed to load webhook')
      navigate('/integrations/webhooks')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!targetUrl.trim()) {
      toast.error('Target URL is required')
      return
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      toast.error('Target URL must start with http:// or https://')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        name: name.trim() || undefined,
        target_url: targetUrl.trim(),
        event,
      }

      if (isNew) {
        await api.post('/api/resthooks', payload)
        toast.success('Webhook created')
      } else {
        await api.patch(`/api/resthooks/${webhookId}`, payload)
        toast.success('Webhook saved')
      }
      navigate('/integrations/webhooks')
    } catch (err: unknown) {
      console.error('Failed to save webhook:', err)
      const axiosErr = err as { response?: { data?: { title?: string; description?: string } } }
      const message =
        axiosErr.response?.data?.description ||
        axiosErr.response?.data?.title ||
        'Failed to save webhook'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    if (!targetUrl.trim()) {
      toast.error('Please enter a target URL first')
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      let payload: object
      try {
        payload = JSON.parse(testPayload)
      } catch {
        toast.error('Invalid JSON payload')
        setIsTesting(false)
        return
      }

      const { data } = await api.post<WebhookTestResult>('/api/resthooks/test', {
        target_url: targetUrl.trim(),
        payload,
      })
      setTestResult(data)
    } catch (err: unknown) {
      console.error('Webhook test failed:', err)
      const axiosErr = err as { response?: { data?: { title?: string; description?: string } } }
      setTestResult({
        success: false,
        error:
          axiosErr.response?.data?.description ||
          axiosErr.response?.data?.title ||
          'Test request failed',
      })
    } finally {
      setIsTesting(false)
    }
  }

  const eventOptions = WEBHOOK_EVENTS.map((e) => ({
    value: e.value,
    label: e.label,
  }))

  const selectedEventInfo = WEBHOOK_EVENTS.find((e) => e.value === event)

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/integrations/webhooks')}
            className="rounded-md p-1.5 text-text-muted hover:bg-gray-100 hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">
              {isNew ? 'New Webhook' : 'Edit Webhook'}
            </h1>
            {!isNew && name && <p className="text-sm text-text-muted">{name}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <Button
              variant="secondary"
              icon={<Play className="h-4 w-4" />}
              onClick={() => setShowTestModal(true)}
            >
              Test
            </Button>
          )}
          <Button onClick={handleSave} loading={isSaving}>
            {isNew ? 'Create Webhook' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <LoadingOverlay loading={isLoading}>
        <div className="mx-auto max-w-2xl">
          <div className="card p-6">
            <div className="space-y-4">
              <Input
                label="Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., CRM Integration"
                hint="A friendly name to identify this webhook"
              />

              <Input
                label="Target URL"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com/webhook"
                hint="The URL that will receive POST requests when events occur"
              />

              <Select
                label="Event"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                options={eventOptions}
              />

              {selectedEventInfo && (
                <p className="text-sm text-text-muted">{selectedEventInfo.description}</p>
              )}
            </div>
          </div>

          {/* Example Payload Preview */}
          <div className="mt-6 card p-6">
            <h2 className="mb-4 text-lg font-medium text-text-primary">Example Payload</h2>
            <p className="mb-3 text-sm text-text-muted">
              When this event occurs, a POST request with JSON like this will be sent to your URL:
            </p>
            <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
              {JSON.stringify(
                WEBHOOK_EXAMPLE_PAYLOADS[event as keyof typeof WEBHOOK_EXAMPLE_PAYLOADS],
                null,
                2
              )}
            </pre>
          </div>

          {/* Info */}
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 className="text-sm font-medium text-blue-800">About Webhooks</h4>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-700">
              <li>Webhooks send HTTP POST requests with JSON payloads</li>
              <li>Your endpoint should respond with a 2xx status code</li>
              <li>Failed deliveries will be retried up to 2 times</li>
              <li>If your endpoint returns 410 Gone, the webhook will be deleted</li>
            </ul>
          </div>
        </div>
      </LoadingOverlay>

      {/* Test Modal */}
      <Modal
        open={showTestModal}
        onClose={() => {
          setShowTestModal(false)
          setTestResult(null)
        }}
        title="Test Webhook"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              Target URL
            </label>
            <code className="block rounded bg-gray-100 px-3 py-2 text-sm text-text-muted">
              {targetUrl}
            </code>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              Test Payload (JSON)
            </label>
            <textarea
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              rows={10}
              className="input w-full font-mono text-sm"
              placeholder="Enter JSON payload..."
            />
          </div>

          {testResult && (
            <div
              className={`rounded-lg p-4 ${
                testResult.success
                  ? 'border border-green-200 bg-green-50'
                  : 'border border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span
                  className={`font-medium ${
                    testResult.success ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {testResult.success ? 'Success' : 'Failed'}
                </span>
                {testResult.status_code && (
                  <span className="text-sm text-text-muted">
                    (Status: {testResult.status_code})
                  </span>
                )}
              </div>
              {testResult.error && (
                <p className="mt-2 text-sm text-red-700">{testResult.error}</p>
              )}
              {testResult.response && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-text-secondary">Response:</p>
                  <pre className="mt-1 max-h-32 overflow-auto rounded bg-white p-2 text-xs text-text-muted">
                    {testResult.response}
                  </pre>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowTestModal(false)
                setTestResult(null)
              }}
            >
              Close
            </Button>
            <Button
              onClick={handleTest}
              disabled={isTesting}
              icon={isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            >
              {isTesting ? 'Sending...' : 'Send Test'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
