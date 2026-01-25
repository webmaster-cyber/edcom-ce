import { useState } from 'react'
import { toast } from 'sonner'
import { Copy, Check, RefreshCw, ExternalLink, Key, Server } from 'lucide-react'
import api from '../../config/api'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'

function getWebroot(): string {
  return window.location.origin
}

export function ConnectPage() {
  const { user, reloadUser } = useAuth()
  const [copied, setCopied] = useState<'apikey' | 'curl' | 'smtp' | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState(false)

  const apiKey = user?.apikey || ''
  const smtpHost = user?.smtphost || ''
  const isSmtpConfigured = smtpHost && !smtpHost.includes('your_relay')

  const curlExample = `curl -X POST ${getWebroot()}/api/transactional/send \\
  -H 'Content-Type: application/json' \\
  -H 'X-Auth-APIKey: ${apiKey}' \\
  -d '{
    "fromname": "Your Name",
    "fromemail": "you@yourdomain.com",
    "to": "recipient@example.com",
    "subject": "Hello",
    "body": "<html><body>Your message here</body></html>"
  }'`

  const handleCopy = async (text: string, type: 'apikey' | 'curl' | 'smtp') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(null), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const handleResetApiKey = async () => {
    setIsResetting(true)
    try {
      await api.post('/api/reset/apikey')
      await reloadUser()
      toast.success('API key reset successfully')
    } catch (err) {
      console.error('Failed to reset API key:', err)
      toast.error('Failed to reset API key')
    } finally {
      setIsResetting(false)
      setConfirmDialog(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">API & SMTP</h1>
        <p className="mt-1 text-sm text-text-muted">
          Connect your applications using our REST API or SMTP relay
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* API Key Section */}
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Key className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-text-primary">API Key</h2>
              <p className="text-sm text-text-muted">Use this key to authenticate API requests</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                Your API Key
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={apiKey}
                  readOnly
                  className="input flex-1 bg-gray-50 font-mono text-sm"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopy(apiKey, 'apikey')}
                  icon={copied === 'apikey' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCw className="h-4 w-4" />}
                onClick={() => setConfirmDialog(true)}
                loading={isResetting}
              >
                Reset API Key
              </Button>
              <a
                href="/api/doc"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                API Documentation
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* SMTP Section */}
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Server className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-text-primary">SMTP Relay</h2>
              <p className="text-sm text-text-muted">Send emails via standard SMTP protocol</p>
            </div>
          </div>

          {!isSmtpConfigured ? (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm text-yellow-800">
                SMTP relay is not configured for this installation. Contact your administrator to set up the SMTP hostname.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">Host</label>
                  <div className="flex gap-2">
                    <input type="text" value={smtpHost} readOnly className="input flex-1 bg-gray-50 font-mono text-sm" />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCopy(smtpHost, 'smtp')}
                      icon={copied === 'smtp' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-secondary">Port</label>
                    <input type="text" value="587 (or 2525, 8025)" readOnly className="input w-full bg-gray-50 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text-secondary">Encryption</label>
                    <input type="text" value="STARTTLS" readOnly className="input w-full bg-gray-50 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">Username & Password</label>
                  <p className="text-sm text-text-muted">Use your API key (shown above) as both username and password</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* REST API Example */}
      <div className="mt-6 card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-text-primary">REST API Example</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleCopy(curlExample, 'curl')}
            icon={copied === 'curl' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          >
            Copy
          </Button>
        </div>
        <p className="mb-3 text-sm text-text-muted">
          Send transactional emails using curl or any HTTP client:
        </p>
        <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
          {curlExample}
        </pre>
      </div>

      {/* Info boxes */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h4 className="text-sm font-medium text-blue-800">API Authentication</h4>
          <p className="mt-1 text-sm text-blue-700">
            Include your API key in the <code className="rounded bg-blue-100 px-1">X-Auth-APIKey</code> header
            for all API requests.
          </p>
        </div>

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <h4 className="text-sm font-medium text-yellow-800">SMTP Note</h4>
          <p className="mt-1 text-sm text-yellow-700">
            If using Cloudflare, note that the free proxy doesn't support SMTP traffic.
            Use a non-proxied subdomain for SMTP connections.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDialog}
        title="Reset API Key"
        message="Are you sure you want to reset your API key? Your existing key will stop working immediately and any integrations using it will need to be updated."
        confirmLabel="Reset Key"
        confirmVariant="danger"
        loading={isResetting}
        onConfirm={handleResetApiKey}
        onClose={() => setConfirmDialog(false)}
      />
    </div>
  )
}
