import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Server, Copy, Check, Download, Settings } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Tabs } from '../../components/ui/Tabs'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { ActionMenu } from '../../components/ui/ActionMenu'
import type { Server as ServerType, DKIMConfig } from '../../types/admin'

export function ServersPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'servers'

  // Servers state
  const [servers, setServers] = useState<ServerType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    server: ServerType | null
  }>({ open: false, server: null })
  const [isDeleting, setIsDeleting] = useState(false)

  // DKIM state
  const [dkimConfig, setDkimConfig] = useState<DKIMConfig>({ selector: 'dkim', entries: {} })
  const [isDkimLoading, setIsDkimLoading] = useState(false)
  const [showDkimModal, setShowDkimModal] = useState(false)
  const [dkimSelector, setDkimSelector] = useState('dkim')
  const [dkimDomains, setDkimDomains] = useState('')
  const [isSavingDkim, setIsSavingDkim] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const reloadServers = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get<ServerType[]>('/api/sinks')
      setServers(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reloadDkim = useCallback(async () => {
    setIsDkimLoading(true)
    try {
      const { data } = await api.get<DKIMConfig>('/api/dkimentries')
      setDkimConfig(data)
    } finally {
      setIsDkimLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'servers') {
      reloadServers()
    } else {
      reloadDkim()
    }
  }, [activeTab, reloadServers, reloadDkim])

  const handleTabChange = (tab: string) => {
    setSearchParams(tab === 'servers' ? {} : { tab })
  }

  // Server handlers
  const handleCreateServer = () => {
    navigate('/admin/servers/edit?id=new')
  }

  const handleEditServer = (id: string) => {
    navigate(`/admin/servers/edit?id=${id}`)
  }

  const handleDeleteServer = async () => {
    if (!deleteDialog.server) return
    setIsDeleting(true)
    try {
      await api.delete(`/api/sinks/${deleteDialog.server.id}`)
      toast.success('Server deleted')
      setDeleteDialog({ open: false, server: null })
      await reloadServers()
    } catch {
      toast.error('Failed to delete server')
    } finally {
      setIsDeleting(false)
    }
  }

  const getServerActions = (server: ServerType) => [
    { label: 'Edit', onClick: () => handleEditServer(server.id) },
    {
      label: 'Delete',
      onClick: () => setDeleteDialog({ open: true, server }),
      variant: 'danger' as const,
    },
  ]

  // DKIM handlers
  const openDkimModal = () => {
    setDkimSelector(dkimConfig.selector || 'dkim')
    setDkimDomains(Object.keys(dkimConfig.entries || {}).join('\n'))
    setShowDkimModal(true)
  }

  const handleSaveDkim = async () => {
    setIsSavingDkim(true)
    try {
      const domains = dkimDomains
        .split(/[\n,]/)
        .map((d) => d.toLowerCase().trim())
        .filter((d) => d && /^[a-z0-9.-]+$/.test(d))

      // Build entries object - use existing entry or empty object for new domains
      const entries: Record<string, object> = {}
      const existingEntries = dkimConfig.entries || {}
      domains.forEach((domain) => {
        entries[domain] = existingEntries[domain] || {}
      })

      await api.patch('/api/dkimentries', {
        entries,
        selector: dkimSelector,
      })

      toast.success('DKIM configuration saved')
      setShowDkimModal(false)

      // Poll until all DKIM keys are generated
      const hasGeneratingKeys = domains.some(
        (domain) => !existingEntries[domain]?.txtvalue
      )

      if (hasGeneratingKeys) {
        setIsDkimLoading(true)
        let attempts = 0
        const maxAttempts = 20 // Max 60 seconds of polling

        while (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 3000))

          const { data } = await api.get<DKIMConfig>('/api/dkimentries')
          setDkimConfig(data)

          // Check if all entries have txtvalue
          const allGenerated = Object.values(data.entries || {}).every(
            (entry) => entry.txtvalue
          )

          if (allGenerated) {
            break
          }

          attempts++
        }
        setIsDkimLoading(false)
      } else {
        await reloadDkim()
      }
    } catch (err: unknown) {
      console.error('DKIM save error:', err)
      // Extract error message from axios response or Error object
      let message = 'Unknown error'
      if (err && typeof err === 'object') {
        const axiosErr = err as { response?: { data?: { description?: string; message?: string } }; message?: string }
        message = axiosErr.response?.data?.description || axiosErr.response?.data?.message || axiosErr.message || message
      }
      toast.error(`Failed to save DKIM: ${message}`)
    } finally {
      setIsSavingDkim(false)
    }
  }

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const handleExportDkim = () => {
    const rows = [['Domain', 'TXT Record Name', 'TXT Record Value']]
    Object.entries(dkimConfig.entries || {}).forEach(([domain, entry]) => {
      rows.push([
        domain,
        `${dkimConfig.selector}._domainkey.${domain}`,
        entry.txtvalue || 'Generating...',
      ])
    })

    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dkim-records.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const tabs = [
    { id: 'servers', label: 'Servers' },
    { id: 'dkim', label: 'DKIM' },
  ]

  const dkimDomainList = Object.entries(dkimConfig.entries || {})

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Servers</h1>
        {activeTab === 'servers' ? (
          <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreateServer}>
            Add Server
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleExportDkim} icon={<Download className="h-4 w-4" />}>
              Export CSV
            </Button>
            <Button onClick={openDkimModal} icon={<Settings className="h-4 w-4" />}>
              Configure DKIM
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />
      </div>

      {/* Servers Tab */}
      {activeTab === 'servers' && (
        <LoadingOverlay loading={isLoading}>
          {servers.length === 0 ? (
            <EmptyState
              icon={<Server className="h-10 w-10" />}
              title="No servers configured"
              description="Add an MTA server to enable email delivery."
              action={
                <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreateServer}>
                  Add Server
                </Button>
              }
            />
          ) : (
            <div className="card overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                      MTA URL
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-text-muted">
                      IPs
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {servers.map((server) => (
                    <tr key={server.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleEditServer(server.id)}
                          className="font-medium text-primary hover:underline"
                        >
                          {server.name}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        <code className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                          {server.url}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-100 px-2 text-xs font-medium">
                          {server.ipdata?.length || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ActionMenu items={getServerActions(server)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </LoadingOverlay>
      )}

      {/* DKIM Tab */}
      {activeTab === 'dkim' && (
        <LoadingOverlay loading={isDkimLoading}>
          {dkimDomainList.length === 0 ? (
            <EmptyState
              icon={<Server className="h-10 w-10" />}
              title="No DKIM domains configured"
              description="Configure DKIM to improve email deliverability and authentication."
              action={
                <Button onClick={openDkimModal} icon={<Settings className="h-4 w-4" />}>
                  Configure DKIM
                </Button>
              }
            />
          ) : (
            <div className="card overflow-hidden">
              <div className="border-b border-border bg-gray-50 px-4 py-2">
                <span className="text-sm text-text-muted">
                  Selector: <code className="rounded bg-white px-2 py-0.5 text-xs">{dkimConfig.selector}</code>
                </span>
              </div>
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                      Domain
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                      TXT Record Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                      TXT Record Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dkimDomainList.map(([domain, entry]) => {
                    const recordName = `${dkimConfig.selector}._domainkey.${domain}`
                    const recordValue = entry.txtvalue || ''
                    const isGenerating = !recordValue

                    return (
                      <tr key={domain} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-text-primary">
                          {domain}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <code className="rounded bg-gray-100 px-2 py-1 text-xs">
                              {recordName}
                            </code>
                            <button
                              onClick={() => handleCopy(recordName, `name-${domain}`)}
                              className="p-1 text-text-muted hover:text-primary"
                              title="Copy"
                            >
                              {copiedField === `name-${domain}` ? (
                                <Check className="h-4 w-4 text-success" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isGenerating ? (
                            <span className="text-sm italic text-text-muted">Generating...</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <code className="max-w-md truncate rounded bg-gray-100 px-2 py-1 text-xs" title={recordValue}>
                                {recordValue.length > 50 ? `${recordValue.substring(0, 50)}...` : recordValue}
                              </code>
                              <button
                                onClick={() => handleCopy(recordValue, `value-${domain}`)}
                                className="p-1 text-text-muted hover:text-primary"
                                title="Copy"
                              >
                                {copiedField === `value-${domain}` ? (
                                  <Check className="h-4 w-4 text-success" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </LoadingOverlay>
      )}

      {/* Delete Server Confirmation */}
      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, server: null })}
        onConfirm={handleDeleteServer}
        title="Delete Server"
        confirmLabel="Delete"
        variant="danger"
        loading={isDeleting}
      >
        Are you sure you want to delete <strong>{deleteDialog.server?.name}</strong>? This
        action cannot be undone.
      </ConfirmDialog>

      {/* DKIM Configuration Modal */}
      <Modal
        open={showDkimModal}
        onClose={() => setShowDkimModal(false)}
        title="Configure DKIM"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="DKIM Selector"
            value={dkimSelector}
            onChange={(e) => setDkimSelector(e.target.value)}
            placeholder="dkim"
            hint="The selector prefix for DKIM records (e.g., 'dkim' creates 'dkim._domainkey.domain.com')"
          />

          <Input
            label="Domains"
            value={dkimDomains}
            onChange={(e) => setDkimDomains(e.target.value)}
            placeholder="example.com&#10;mail.example.com"
            multiline
            rows={6}
            hint="Enter one domain per line"
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setShowDkimModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveDkim} loading={isSavingDkim}>
            Save Configuration
          </Button>
        </div>
      </Modal>
    </div>
  )
}
