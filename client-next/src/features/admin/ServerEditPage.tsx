import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Tabs } from '../../components/ui/Tabs'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import type { Server, ServerIPData } from '../../types/admin'

interface ServerFormData {
  name: string
  url: string
  accesskey: string
  ipdata: ServerIPData[]
}

const DEFAULT_FORM: ServerFormData = {
  name: '',
  url: '',
  accesskey: '',
  ipdata: [],
}

const EMPTY_IP_ROW: ServerIPData = {
  ip: '',
  domain: '',
  linkdomain: '',
}

export function ServerEditPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || 'new'
  const isNew = id === 'new'

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<ServerFormData>(DEFAULT_FORM)
  const [activeTab, setActiveTab] = useState('ips')

  const reload = useCallback(async () => {
    if (isNew) return
    setIsLoading(true)
    try {
      const { data } = await api.get<Server>(`/api/sinks/${id}`)
      setFormData({
        name: data.name || '',
        url: data.url || '',
        accesskey: data.accesskey || '',
        ipdata: data.ipdata || [],
      })
    } finally {
      setIsLoading(false)
    }
  }, [id, isNew])

  useEffect(() => {
    reload()
  }, [reload])

  const handleChange = <K extends keyof ServerFormData>(field: K, value: ServerFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddIP = () => {
    setFormData((prev) => ({
      ...prev,
      ipdata: [...prev.ipdata, { ...EMPTY_IP_ROW }],
    }))
  }

  const handleRemoveIP = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      ipdata: prev.ipdata.filter((_, i) => i !== index),
    }))
  }

  const handleIPChange = (index: number, field: keyof ServerIPData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      ipdata: prev.ipdata.map((ip, i) => (i === index ? { ...ip, [field]: value } : ip)),
    }))
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, startIndex: number, field: keyof ServerIPData) => {
    const pasteData = e.clipboardData.getData('text')

    // Check if this looks like multi-line paste data
    if (pasteData.includes('\n') || pasteData.includes('\t')) {
      e.preventDefault()

      const rows = pasteData.split('\n').filter((row) => row.trim())
      const newIpData = [...formData.ipdata]

      rows.forEach((row, rowIndex) => {
        const targetIndex = startIndex + rowIndex
        const columns = row.split('\t')

        // Ensure we have a row to update
        while (newIpData.length <= targetIndex) {
          newIpData.push({ ...EMPTY_IP_ROW })
        }

        // Update based on which column we're pasting into
        if (field === 'ip') {
          newIpData[targetIndex] = {
            ip: columns[0]?.trim() || '',
            domain: columns[1]?.trim() || newIpData[targetIndex].domain,
            linkdomain: columns[2]?.trim() || newIpData[targetIndex].linkdomain,
          }
        } else if (field === 'domain') {
          newIpData[targetIndex] = {
            ...newIpData[targetIndex],
            domain: columns[0]?.trim() || '',
            linkdomain: columns[1]?.trim() || newIpData[targetIndex].linkdomain,
          }
        } else {
          newIpData[targetIndex] = {
            ...newIpData[targetIndex],
            linkdomain: columns[0]?.trim() || '',
          }
        }
      })

      setFormData((prev) => ({ ...prev, ipdata: newIpData }))
    }
  }

  const validateForm = (): boolean => {
    if (!formData.name) return false
    if (!formData.url) return false
    if (!formData.accesskey) return false
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSaving(true)
    try {
      // Filter out empty IP rows
      const payload = {
        ...formData,
        ipdata: formData.ipdata.filter((ip) => ip.ip.trim()),
      }

      if (isNew) {
        await api.post('/api/sinks', payload)
        toast.success('Server created')
      } else {
        await api.patch(`/api/sinks/${id}`, payload)
        toast.success('Server updated')
      }
      navigate('/admin/servers')
    } catch {
      toast.error('Failed to save server')
    } finally {
      setIsSaving(false)
    }
  }

  const tabs = [
    { id: 'ips', label: 'Sending IP Configuration' },
    { id: 'mta', label: 'Connect MTA' },
  ]

  // Ensure we always have at least a few empty rows for the IP table
  const displayIpData = [...formData.ipdata]
  while (displayIpData.length < 5) {
    displayIpData.push({ ...EMPTY_IP_ROW })
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/servers')}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <h1 className="text-xl font-semibold text-text-primary">
            {isNew ? 'Add Server' : `Edit Server`}
          </h1>
        </div>
        <Button
          onClick={handleSubmit}
          loading={isSaving}
          disabled={!validateForm()}
          icon={<Save className="h-4 w-4" />}
        >
          {isNew ? 'Create Server' : 'Save Changes'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <LoadingOverlay loading={isLoading}>
        <div className="card p-6">
          {/* Sending IP Configuration Tab */}
          {activeTab === 'ips' && (
            <div className="space-y-6">
              <div className="max-w-md">
                <Input
                  label="Server Name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Production MTA"
                  required
                />
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-medium text-text-primary">
                    Sending IPs and Domains
                  </label>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleAddIP}
                    icon={<Plus className="h-4 w-4" />}
                  >
                    Add Row
                  </Button>
                </div>

                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                          IP Address
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                          Header Domain
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                          Link Domain
                        </th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-white">
                      {displayIpData.map((ip, index) => {
                        const isRealRow = index < formData.ipdata.length
                        return (
                          <tr key={index} className="group">
                            <td className="px-1 py-1">
                              <input
                                type="text"
                                value={ip.ip}
                                onChange={(e) => {
                                  // If typing in an empty row, add it to real data
                                  if (!isRealRow && e.target.value) {
                                    setFormData((prev) => ({
                                      ...prev,
                                      ipdata: [...prev.ipdata, { ...EMPTY_IP_ROW, ip: e.target.value }],
                                    }))
                                  } else {
                                    handleIPChange(index, 'ip', e.target.value)
                                  }
                                }}
                                onPaste={(e) => handlePaste(e, index, 'ip')}
                                placeholder="192.168.1.1"
                                className="w-full border-0 bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <input
                                type="text"
                                value={ip.domain}
                                onChange={(e) => {
                                  if (!isRealRow && e.target.value) {
                                    setFormData((prev) => ({
                                      ...prev,
                                      ipdata: [...prev.ipdata, { ...EMPTY_IP_ROW, domain: e.target.value }],
                                    }))
                                  } else {
                                    handleIPChange(index, 'domain', e.target.value)
                                  }
                                }}
                                onPaste={(e) => handlePaste(e, index, 'domain')}
                                placeholder="mail.example.com"
                                className="w-full border-0 bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <input
                                type="text"
                                value={ip.linkdomain}
                                onChange={(e) => {
                                  if (!isRealRow && e.target.value) {
                                    setFormData((prev) => ({
                                      ...prev,
                                      ipdata: [...prev.ipdata, { ...EMPTY_IP_ROW, linkdomain: e.target.value }],
                                    }))
                                  } else {
                                    handleIPChange(index, 'linkdomain', e.target.value)
                                  }
                                }}
                                onPaste={(e) => handlePaste(e, index, 'linkdomain')}
                                placeholder="links.example.com"
                                className="w-full border-0 bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                            </td>
                            <td className="px-1 py-1 text-center">
                              {isRealRow && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveIP(index)}
                                  className="p-1 text-text-muted opacity-0 hover:text-danger group-hover:opacity-100"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-text-muted">
                  Click and type to enter data, or paste from a spreadsheet
                </p>
              </div>
            </div>
          )}

          {/* Connect MTA Tab */}
          {activeTab === 'mta' && (
            <div className="max-w-md space-y-6">
              <Input
                label="MTA Management URL"
                value={formData.url}
                onChange={(e) => handleChange('url', e.target.value)}
                placeholder="https://mta.example.com:8080"
                required
                hint="The URL to the MTA management interface"
              />

              <Input
                label="MTA Password"
                type="password"
                value={formData.accesskey}
                onChange={(e) => handleChange('accesskey', e.target.value)}
                placeholder="Enter password"
                required
                hint="Authentication credential for the MTA"
              />
            </div>
          )}
        </div>
      </LoadingOverlay>
    </div>
  )
}
