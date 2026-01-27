import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Save, Plus, Trash2, AlertTriangle } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Tabs } from '../../components/ui/Tabs'
import { Checkbox } from '../../components/ui/Checkbox'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import type { DeliveryPolicy, Server, CustomNumConn, CustomWait, PolicySink } from '../../types/admin'

interface PolicyFormData {
  name: string
  domains: string
  // Connection settings
  numconns: number
  retryfor: number
  sendsperconn: number
  connerrwait: number
  connerrwaittype: 'mins' | 'hours'
  customnumconns: CustomNumConn[]
  // Deferral settings
  deferwait: number
  deferwaittype: 'mins' | 'hours'
  customwait: CustomWait[]
  ratedefer: boolean
  ratedefercheckmins: number
  ratedefertarget: number
  ratedeferwait: number
  ratedeferwaittype: 'mins' | 'hours'
  // Server settings
  sinks: PolicySink[]
}

const DEFAULT_FORM: PolicyFormData = {
  name: '',
  domains: '',
  numconns: 1,
  retryfor: 72,
  sendsperconn: 20,
  connerrwait: 5,
  connerrwaittype: 'mins',
  customnumconns: [],
  deferwait: 5,
  deferwaittype: 'mins',
  customwait: [],
  ratedefer: false,
  ratedefercheckmins: 10,
  ratedefertarget: 400,
  ratedeferwait: 5,
  ratedeferwaittype: 'mins',
  sinks: [],
}

const TIME_UNIT_OPTIONS = [
  { value: 'mins', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
]

export function PolicyEditPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || 'new'
  const isNew = id === 'new'

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<PolicyFormData>(DEFAULT_FORM)
  const [activeTab, setActiveTab] = useState('domains')
  const [servers, setServers] = useState<Server[]>([])

  const reload = useCallback(async () => {
    if (isNew) return
    setIsLoading(true)
    try {
      const { data } = await api.get<DeliveryPolicy>(`/api/policies/${id}`)
      setFormData({
        name: data.name || '',
        domains: data.domains || '',
        numconns: data.numconns ?? 1,
        retryfor: data.retryfor ?? 72,
        sendsperconn: data.sendsperconn ?? 20,
        connerrwait: data.connerrwait ?? 5,
        connerrwaittype: data.connerrwaittype || 'mins',
        customnumconns: data.customnumconns || [],
        deferwait: data.deferwait ?? 5,
        deferwaittype: data.deferwaittype || 'mins',
        customwait: data.customwait || [],
        ratedefer: data.ratedefer ?? false,
        ratedefercheckmins: data.ratedefercheckmins ?? 10,
        ratedefertarget: data.ratedefertarget ?? 400,
        ratedeferwait: data.ratedeferwait ?? 5,
        ratedeferwaittype: data.ratedeferwaittype || 'mins',
        sinks: (data.sinks || []).map((s) => ({ ...s, iplist: s.iplist || {} })),
      })
    } finally {
      setIsLoading(false)
    }
  }, [id, isNew])

  const loadServers = useCallback(async () => {
    try {
      const { data } = await api.get<Server[]>('/api/sinks')
      setServers(data)
    } catch {
      // Ignore errors loading servers
    }
  }, [])

  useEffect(() => {
    reload()
    loadServers()
  }, [reload, loadServers])

  const handleChange = <K extends keyof PolicyFormData>(field: K, value: PolicyFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Custom MX connections handlers
  const handleAddCustomConn = () => {
    setFormData((prev) => ({
      ...prev,
      customnumconns: [...prev.customnumconns, { mx: '', val: 1 }],
    }))
  }

  const handleRemoveCustomConn = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      customnumconns: prev.customnumconns.filter((_, i) => i !== index),
    }))
  }

  const handleCustomConnChange = (index: number, field: keyof CustomNumConn, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      customnumconns: prev.customnumconns.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  // Custom wait handlers
  const handleAddCustomWait = () => {
    setFormData((prev) => ({
      ...prev,
      customwait: [...prev.customwait, { msg: '', val: 5, valtype: 'mins' }],
    }))
  }

  const handleRemoveCustomWait = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      customwait: prev.customwait.filter((_, i) => i !== index),
    }))
  }

  const handleCustomWaitChange = (index: number, field: keyof CustomWait, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      customwait: prev.customwait.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  // Sink handlers
  const handleAddSink = () => {
    const defaultSink: PolicySink = {
      sink: servers[0]?.id || '',
      allips: true,
      pct: 100,
      sendcap: '',
      sendrate: '',
      captime: new Date().toISOString().slice(0, 16),
      iplist: {},
    }
    setFormData((prev) => ({
      ...prev,
      sinks: [...prev.sinks, defaultSink],
    }))
  }

  const handleRemoveSink = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      sinks: prev.sinks.filter((_, i) => i !== index),
    }))
  }

  const handleSinkChange = (index: number, field: keyof PolicySink, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      sinks: prev.sinks.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  const validateForm = (): boolean => {
    return !!formData.name
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please enter a policy name')
      return
    }

    setIsSaving(true)
    try {
      if (isNew) {
        const { data } = await api.post<string>('/api/policies', formData)
        toast.success('Policy created')
        navigate(`/admin/policies/edit?id=${data}`)
      } else {
        await api.patch(`/api/policies/${id}`, formData)
        toast.success('Policy updated')
        await reload()
      }
    } catch (err: unknown) {
      console.error('Policy save error:', err)
      let message = 'Unknown error'
      if (err && typeof err === 'object') {
        const axiosErr = err as { response?: { data?: { description?: string; message?: string } }; message?: string }
        message = axiosErr.response?.data?.description || axiosErr.response?.data?.message || axiosErr.message || message
      }
      toast.error(`Failed to save policy: ${message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const tabs = [
    { id: 'domains', label: '1. Domains' },
    { id: 'connection', label: '2. Connection' },
    { id: 'deferrals', label: '3. Deferrals' },
    { id: 'servers', label: '4. Servers' },
  ]

  const getServerIpCount = (sinkId: string) => {
    const server = servers.find((s) => s.id === sinkId)
    return server?.ipdata?.length || 0
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/policies')}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <h1 className="text-xl font-semibold text-text-primary">
            {isNew ? 'New Delivery Policy' : `Edit Policy: ${formData.name}`}
          </h1>
        </div>
        <Button
          onClick={handleSubmit}
          loading={isSaving}
          disabled={!validateForm()}
          icon={<Save className="h-4 w-4" />}
        >
          {isNew ? 'Create Policy' : 'Save Changes'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <LoadingOverlay loading={isLoading}>
        <div className="card p-6">
          {/* Step 1: Domains */}
          {activeTab === 'domains' && (
            <div className="max-w-xl space-y-6">
              <Input
                label="Policy Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Gmail Delivery Policy"
                required
              />

              <Input
                label="Domains"
                value={formData.domains}
                onChange={(e) => handleChange('domains', e.target.value)}
                placeholder="gmail.com googlemail.com"
                multiline
                rows={4}
                hint="Enter domains this policy applies to, separated by spaces or newlines. Leave empty to apply to all domains."
              />
            </div>
          )}

          {/* Step 2: Connection Settings */}
          {activeTab === 'connection' && (
            <div className="space-y-6">
              <div className="grid max-w-2xl gap-6 md:grid-cols-2">
                <div className="flex gap-2">
                  <Input
                    label="After Connection Error, Wait"
                    type="number"
                    min={1}
                    value={formData.connerrwait}
                    onChange={(e) => handleChange('connerrwait', parseInt(e.target.value) || 5)}
                    className="flex-1"
                  />
                  <div className="w-32">
                    <Select
                      label="&nbsp;"
                      value={formData.connerrwaittype}
                      onChange={(e) => handleChange('connerrwaittype', e.target.value as 'mins' | 'hours')}
                      options={TIME_UNIT_OPTIONS}
                    />
                  </div>
                </div>

                <Input
                  label="Hours to Retry Messages"
                  type="number"
                  min={1}
                  value={formData.retryfor}
                  onChange={(e) => handleChange('retryfor', parseInt(e.target.value) || 72)}
                  hint="Default: 72 hours"
                />

                <Input
                  label="Messages per Connection"
                  type="number"
                  min={1}
                  value={formData.sendsperconn}
                  onChange={(e) => handleChange('sendsperconn', parseInt(e.target.value) || 20)}
                  hint="Default: 20"
                />

                <Input
                  label="Simultaneous Connections"
                  type="number"
                  min={1}
                  value={formData.numconns}
                  onChange={(e) => handleChange('numconns', parseInt(e.target.value) || 1)}
                  hint="Default: 1"
                />
              </div>

              {/* Custom MX Connections */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-medium text-text-primary">
                    Per-MX Connection Limits
                  </label>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleAddCustomConn}
                    icon={<Plus className="h-4 w-4" />}
                  >
                    Add
                  </Button>
                </div>

                {formData.customnumconns.length > 0 && (
                  <div className="space-y-2">
                    {formData.customnumconns.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={item.mx}
                          onChange={(e) => handleCustomConnChange(index, 'mx', e.target.value)}
                          placeholder="MX domain pattern"
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          min={1}
                          value={item.val}
                          onChange={(e) => handleCustomConnChange(index, 'val', parseInt(e.target.value) || 1)}
                          className="w-24"
                        />
                        <span className="text-sm text-text-muted">connections</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomConn(index)}
                          className="p-1 text-text-muted hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {formData.customnumconns.length === 0 && (
                  <p className="text-sm text-text-muted">No custom MX connection limits configured.</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Deferral Handling */}
          {activeTab === 'deferrals' && (
            <div className="space-y-6">
              <div className="flex max-w-md gap-2">
                <Input
                  label="Default Deferral Retry Time"
                  type="number"
                  min={1}
                  value={formData.deferwait}
                  onChange={(e) => handleChange('deferwait', parseInt(e.target.value) || 5)}
                  className="flex-1"
                />
                <div className="w-32">
                  <Select
                    label="&nbsp;"
                    value={formData.deferwaittype}
                    onChange={(e) => handleChange('deferwaittype', e.target.value as 'mins' | 'hours')}
                    options={TIME_UNIT_OPTIONS}
                  />
                </div>
              </div>

              {/* Custom Deferral Rules */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-medium text-text-primary">
                    Custom Deferral Rules
                  </label>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleAddCustomWait}
                    icon={<Plus className="h-4 w-4" />}
                  >
                    Add Rule
                  </Button>
                </div>

                {formData.customwait.length > 0 && (
                  <div className="space-y-3">
                    {formData.customwait.map((item, index) => (
                      <div key={index} className="rounded-lg border border-border p-3">
                        <div className="mb-2 flex items-start gap-2">
                          <Input
                            value={item.msg}
                            onChange={(e) => handleCustomWaitChange(index, 'msg', e.target.value)}
                            placeholder="Message pattern to match"
                            className="flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomWait(index)}
                            className="p-1 text-text-muted hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={item.type === 'transient'}
                              onChange={(e) =>
                                handleCustomWaitChange(index, 'type', e.target.checked ? 'transient' : undefined as unknown as string)
                              }
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm">Treat as transient (retry immediately)</span>
                          </label>
                          {item.type !== 'transient' && (
                            <>
                              <span className="text-sm text-text-muted">or wait</span>
                              <Input
                                type="number"
                                min={1}
                                value={item.val}
                                onChange={(e) => handleCustomWaitChange(index, 'val', parseInt(e.target.value) || 5)}
                                className="w-20"
                              />
                              <Select
                                value={item.valtype}
                                onChange={(e) => handleCustomWaitChange(index, 'valtype', e.target.value)}
                                options={TIME_UNIT_OPTIONS}
                                className="w-28"
                              />
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {formData.customwait.length === 0 && (
                  <p className="text-sm text-text-muted">No custom deferral rules configured.</p>
                )}
              </div>

              {/* Rate-based Deferral */}
              <div className="border-t border-border pt-6">
                <Checkbox
                  label="Enable Rate-based Deferral"
                  description="Automatically slow down delivery when success rate drops"
                  checked={formData.ratedefer}
                  onChange={(checked) => handleChange('ratedefer', checked)}
                />

                {formData.ratedefer && (
                  <div className="mt-4 grid max-w-2xl gap-4 pl-6 md:grid-cols-2">
                    <Input
                      label="Check Interval (minutes)"
                      type="number"
                      min={1}
                      value={formData.ratedefercheckmins}
                      onChange={(e) => handleChange('ratedefercheckmins', parseInt(e.target.value) || 10)}
                    />
                    <Input
                      label="Target Delivery Rate"
                      type="number"
                      min={1}
                      value={formData.ratedefertarget}
                      onChange={(e) => handleChange('ratedefertarget', parseInt(e.target.value) || 400)}
                    />
                    <div className="flex gap-2">
                      <Input
                        label="Wait Time"
                        type="number"
                        min={1}
                        value={formData.ratedeferwait}
                        onChange={(e) => handleChange('ratedeferwait', parseInt(e.target.value) || 5)}
                        className="flex-1"
                      />
                      <div className="w-32">
                        <Select
                          label="&nbsp;"
                          value={formData.ratedeferwaittype}
                          onChange={(e) => handleChange('ratedeferwaittype', e.target.value as 'mins' | 'hours')}
                          options={TIME_UNIT_OPTIONS}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Server Configuration */}
          {activeTab === 'servers' && (
            <div className="space-y-6">
              <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" />
                <p className="text-sm text-text-secondary">
                  Warmup limits always override delivery policy limits. If a server is in warmup mode,
                  those limits will take precedence.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-primary">
                  Server Assignments
                </label>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleAddSink}
                  icon={<Plus className="h-4 w-4" />}
                  disabled={servers.length === 0}
                >
                  Add Server
                </Button>
              </div>

              {servers.length === 0 && (
                <p className="text-sm text-text-muted">
                  No servers configured. Add servers in the Servers section first.
                </p>
              )}

              {formData.sinks.length > 0 && (
                <div className="space-y-4">
                  {formData.sinks.map((sink, index) => (
                    <div key={index} className="rounded-lg border border-border p-4">
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <Select
                            label="Server"
                            value={sink.sink}
                            onChange={(e) => handleSinkChange(index, 'sink', e.target.value)}
                            options={servers.map((s) => ({ value: s.id, label: s.name }))}
                            className="w-48"
                          />
                          <div className="pt-6">
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">
                              {getServerIpCount(sink.sink)} IPs
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSink(index)}
                          className="p-1 text-text-muted hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-4">
                        <Input
                          label="Traffic %"
                          type="number"
                          min={0}
                          max={100}
                          value={sink.pct}
                          onChange={(e) => handleSinkChange(index, 'pct', parseInt(e.target.value) || 0)}
                        />
                        <Input
                          label="Daily Limit"
                          type="number"
                          min={0}
                          value={sink.sendcap === '' ? '' : sink.sendcap}
                          onChange={(e) => handleSinkChange(index, 'sendcap', e.target.value === '' ? '' : parseInt(e.target.value))}
                          placeholder="No limit"
                        />
                        <Input
                          label="Hourly Limit"
                          type="number"
                          min={0}
                          value={sink.sendrate === '' ? '' : sink.sendrate}
                          onChange={(e) => handleSinkChange(index, 'sendrate', e.target.value === '' ? '' : parseInt(e.target.value))}
                          placeholder="No limit"
                        />
                        <Input
                          label="Day Starts At"
                          type="time"
                          value={sink.captime ? sink.captime.slice(11, 16) : '09:00'}
                          onChange={(e) => {
                            const date = sink.captime ? sink.captime.slice(0, 10) : new Date().toISOString().slice(0, 10)
                            handleSinkChange(index, 'captime', `${date}T${e.target.value}:00`)
                          }}
                        />
                      </div>

                      <div className="mt-3">
                        <Checkbox
                          label="Apply limits to all IPs"
                          checked={sink.allips}
                          onChange={(checked) => handleSinkChange(index, 'allips', checked)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {formData.sinks.length === 0 && servers.length > 0 && (
                <p className="text-sm text-text-muted">
                  No servers assigned to this policy. Add a server to configure delivery limits.
                </p>
              )}
            </div>
          )}
        </div>
      </LoadingOverlay>
    </div>
  )
}
