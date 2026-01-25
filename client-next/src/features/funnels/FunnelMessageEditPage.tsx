import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Send } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Tabs } from '../../components/ui/Tabs'
import { TagInput } from '../../components/ui/TagInput'
import { Modal } from '../../components/ui/Modal'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { BeefreeEditor } from '../../components/editors/BeefreeEditor'
import { CodeEditor } from '../../components/editors/CodeEditor'
import type { FunnelMessage, Funnel } from '../../types/funnel'
import type { ContactList } from '../../types/contact'

type TabId = 'message' | 'settings' | 'tagging' | 'suppression'

interface Segment {
  id: string
  name: string
}

export function FunnelMessageEditPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || ''

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('message')
  const [funnel, setFunnel] = useState<Funnel | null>(null)
  const [lists, setLists] = useState<ContactList[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [recentTags, setRecentTags] = useState<string[]>([])

  // Message content
  const [subject, setSubject] = useState('')
  const [preheader, setPreheader] = useState('')
  const [editorType, setEditorType] = useState<'beefree' | 'raw'>('beefree')
  const [htmlContent, setHtmlContent] = useState('')
  const [templateJson, setTemplateJson] = useState('')
  const savedRawTextRef = useRef<string>('')

  // Settings
  const [who, setWho] = useState<'all' | 'openany' | 'openlast' | 'clickany' | 'clicklast'>('all')
  const [whenNum, setWhenNum] = useState(0)
  const [whenType, setWhenType] = useState<'mins' | 'hours' | 'days'>('days')
  const [days, setDays] = useState<boolean[]>([true, true, true, true, true, true, true])

  // Tagging
  const [openAddTags, setOpenAddTags] = useState<string[]>([])
  const [openRemTags, setOpenRemTags] = useState<string[]>([])
  const [clickAddTags, setClickAddTags] = useState<string[]>([])
  const [clickRemTags, setClickRemTags] = useState<string[]>([])
  const [sendAddTags, setSendAddTags] = useState<string[]>([])
  const [sendRemTags, setSendRemTags] = useState<string[]>([])

  // Suppression
  const [suppLists, setSuppLists] = useState<string[]>([])
  const [suppSegs, setSuppSegs] = useState<string[]>([])
  const [suppTags, setSuppTags] = useState<string[]>([])

  // Test email modal
  const [showTestModal, setShowTestModal] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [isSendingTest, setIsSendingTest] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [messageRes, listsRes, segmentsRes, tagsRes] = await Promise.all([
        api.get<FunnelMessage>(`/api/messages/${id}`),
        api.get<ContactList[]>('/api/lists').catch(() => ({ data: [] })),
        api.get<Segment[]>('/api/segments').catch(() => ({ data: [] })),
        api.get<string[]>('/api/recenttags').catch(() => ({ data: [] })),
      ])

      const msg = messageRes.data
      setSubject(msg.subject || '')
      setPreheader(msg.preheader || '')
      setEditorType(msg.type === 'raw' ? 'raw' : 'beefree')
      setWho(msg.who || 'all')
      setWhenNum(msg.whennum ?? 0)
      setWhenType(msg.whentype || 'days')
      setDays(msg.days || [true, true, true, true, true, true, true])
      setOpenAddTags(msg.openaddtags || [])
      setOpenRemTags(msg.openremtags || [])
      setClickAddTags(msg.clickaddtags || [])
      setClickRemTags(msg.clickremtags || [])
      setSendAddTags(msg.sendaddtags || [])
      setSendRemTags(msg.sendremtags || [])
      setSuppLists(msg.supplists || [])
      setSuppSegs(msg.suppsegs || [])
      setSuppTags(msg.supptags || [])

      // Load template content - beefree uses rawText, legacy uses parts
      if (msg.rawText) {
        setTemplateJson(msg.rawText)
        setHtmlContent(msg.rawText)
      } else if (msg.parts) {
        setTemplateJson(JSON.stringify(msg.parts))
      }

      // Load funnel info
      if (msg.funnel) {
        const { data: funnelData } = await api.get<Funnel>(`/api/funnels/${msg.funnel}`)
        setFunnel(funnelData)
      }

      setLists(listsRes.data)
      setSegments(segmentsRes.data)
      setRecentTags(tagsRes.data)
    } catch (err) {
      console.error('Failed to load:', err)
      toast.error('Failed to load message')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) loadData()
  }, [id, loadData])

  const handleSave = async () => {
    if (!subject.trim()) {
      toast.error('Please enter a subject line')
      return
    }

    setIsSaving(true)
    try {
      // Trigger Beefree to save first if using visual editor
      if (editorType === 'beefree') {
        await triggerBeeSave()
      }

      const payload: Partial<FunnelMessage> = {
        subject: subject.trim(),
        preheader: preheader.trim(),
        type: editorType === 'beefree' ? 'beefree' : 'raw',
        who,
        whennum: whenNum,
        whentype: whenType,
        days,
        openaddtags: openAddTags,
        openremtags: openRemTags,
        clickaddtags: clickAddTags,
        clickremtags: clickRemTags,
        sendaddtags: sendAddTags,
        sendremtags: sendRemTags,
        supplists: suppLists,
        suppsegs: suppSegs,
        supptags: suppTags,
      }

      if (editorType === 'beefree' && savedRawTextRef.current) {
        payload.rawText = savedRawTextRef.current
      } else if (editorType === 'raw') {
        payload.rawText = htmlContent
      }

      await api.patch(`/api/messages/${id}`, payload)
      toast.success('Message saved')
    } catch (err) {
      console.error('Failed to save:', err)
      toast.error('Failed to save message')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      toast.error('Please enter an email address')
      return
    }

    setIsSendingTest(true)
    try {
      await api.post(`/api/messages/${id}/test`, { email: testEmail.trim() })
      toast.success('Test email sent')
      setShowTestModal(false)
    } catch {
      toast.error('Failed to send test email')
    } finally {
      setIsSendingTest(false)
    }
  }

  const handleBeefreeSave = useCallback((json: string, html: string) => {
    // Store both json and html for saving - use ref for immediate access
    savedRawTextRef.current = JSON.stringify({ html, json: JSON.parse(json) })
  }, [])

  const triggerBeeSave = async () => {
    const container = document.getElementById('bee-plugin-container') as HTMLDivElement & { triggerSave?: () => Promise<void> } | null
    if (container?.triggerSave) {
      await container.triggerSave()
    }
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const tabs = [
    { key: 'message', label: 'Message' },
    { key: 'settings', label: 'Settings' },
    { key: 'tagging', label: 'Tagging' },
    { key: 'suppression', label: 'Suppression' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => funnel && navigate(`/funnels/messages?id=${funnel.id}`)}
            className="rounded-md p-1.5 text-text-muted hover:bg-gray-100 hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Edit Message</h1>
            {funnel && (
              <p className="text-sm text-text-muted">{funnel.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={<Send className="h-4 w-4" />}
            onClick={() => setShowTestModal(true)}
          >
            Send Test
          </Button>
          <Button onClick={handleSave} loading={isSaving}>
            Save
          </Button>
        </div>
      </div>

      <LoadingOverlay loading={isLoading}>
        {/* Consistent tab bar */}
        <div className="flex items-center gap-4 border-b border-border bg-gray-50 px-4 py-2">
          <Tabs
            tabs={tabs}
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as TabId)}
          />
          {activeTab === 'message' && (
            <div className="ml-auto flex items-center gap-4">
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject line..."
                className="!w-64"
              />
              <Input
                value={preheader}
                onChange={(e) => setPreheader(e.target.value)}
                placeholder="Preheader..."
                className="!w-48"
              />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditorType('beefree')}
                  className={`rounded px-3 py-1 text-sm ${
                    editorType === 'beefree'
                      ? 'bg-primary text-white'
                      : 'text-text-secondary hover:bg-gray-200'
                  }`}
                >
                  Visual
                </button>
                <button
                  onClick={() => setEditorType('raw')}
                  className={`rounded px-3 py-1 text-sm ${
                    editorType === 'raw'
                      ? 'bg-primary text-white'
                      : 'text-text-secondary hover:bg-gray-200'
                  }`}
                >
                  HTML
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Message Tab - Full width */}
        {activeTab === 'message' && (
          <>
            {editorType === 'beefree' ? (
              <BeefreeEditor
                template={templateJson}
                fields={[]}
                onSave={handleBeefreeSave}
              />
            ) : (
              <div className="h-[calc(100vh-200px)] min-h-[400px]">
                <CodeEditor
                  value={htmlContent}
                  onChange={setHtmlContent}
                  language="html"
                />
              </div>
            )}
          </>
        )}

        {/* Other tabs */}
        {activeTab !== 'message' && (
          <div className="p-4">
            {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <div className="card p-6">
                    <h3 className="mb-4 font-medium text-text-primary">Send Timing</h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-text-secondary">Wait</span>
                      <input
                        type="number"
                        min="0"
                        value={whenNum}
                        onChange={(e) => setWhenNum(parseInt(e.target.value) || 0)}
                        className="input w-20"
                      />
                      <select
                        value={whenType}
                        onChange={(e) => setWhenType(e.target.value as 'mins' | 'hours' | 'days')}
                        className="input"
                      >
                        <option value="mins">minutes</option>
                        <option value="hours">hours</option>
                        <option value="days">days</option>
                      </select>
                      <span className="text-text-secondary">after previous message</span>
                    </div>
                  </div>

                  <div className="card p-6">
                    <h3 className="mb-4 font-medium text-text-primary">Send To</h3>
                    <select
                      value={who}
                      onChange={(e) => setWho(e.target.value as typeof who)}
                      className="input w-full"
                    >
                      <option value="all">All contacts in funnel</option>
                      <option value="openany">Contacts who opened any previous message</option>
                      <option value="openlast">Contacts who opened the last message</option>
                      <option value="clickany">Contacts who clicked any previous message</option>
                      <option value="clicklast">Contacts who clicked the last message</option>
                    </select>
                  </div>

                  <div className="card p-6">
                    <h3 className="mb-4 font-medium text-text-primary">Days to Send</h3>
                    <div className="flex flex-wrap gap-2">
                      {dayNames.map((day, i) => (
                        <button
                          key={day}
                          onClick={() => {
                            const newDays = [...days]
                            newDays[i] = !newDays[i]
                            setDays(newDays)
                          }}
                          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                            days[i]
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 text-text-muted'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-text-muted">
                      Messages will only be sent on selected days
                    </p>
                  </div>
                </div>
              )}

              {/* Tagging Tab */}
              {activeTab === 'tagging' && (
                <div className="space-y-6">
                  <div className="card p-6">
                    <h3 className="mb-4 font-medium text-text-primary">When Message is Sent</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm text-text-secondary">Add tags</label>
                        <TagInput
                          value={sendAddTags}
                          onChange={setSendAddTags}
                          suggestions={recentTags}
                          placeholder="Tags to add..."
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-text-secondary">Remove tags</label>
                        <TagInput
                          value={sendRemTags}
                          onChange={setSendRemTags}
                          suggestions={recentTags}
                          placeholder="Tags to remove..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="card p-6">
                    <h3 className="mb-4 font-medium text-text-primary">When Message is Opened</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm text-text-secondary">Add tags</label>
                        <TagInput
                          value={openAddTags}
                          onChange={setOpenAddTags}
                          suggestions={recentTags}
                          placeholder="Tags to add..."
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-text-secondary">Remove tags</label>
                        <TagInput
                          value={openRemTags}
                          onChange={setOpenRemTags}
                          suggestions={recentTags}
                          placeholder="Tags to remove..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="card p-6">
                    <h3 className="mb-4 font-medium text-text-primary">When Link is Clicked</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm text-text-secondary">Add tags</label>
                        <TagInput
                          value={clickAddTags}
                          onChange={setClickAddTags}
                          suggestions={recentTags}
                          placeholder="Tags to add..."
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-text-secondary">Remove tags</label>
                        <TagInput
                          value={clickRemTags}
                          onChange={setClickRemTags}
                          suggestions={recentTags}
                          placeholder="Tags to remove..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Suppression Tab */}
              {activeTab === 'suppression' && (
                <div className="space-y-6">
                  <div className="card p-6">
                    <h3 className="mb-4 font-medium text-text-primary">Exclude by List</h3>
                    <p className="mb-3 text-sm text-text-muted">
                      Contacts on these lists will not receive this message
                    </p>
                    <div className="space-y-2">
                      {lists.map((list) => (
                        <label key={list.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={suppLists.includes(list.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSuppLists([...suppLists, list.id])
                              } else {
                                setSuppLists(suppLists.filter((l) => l !== list.id))
                              }
                            }}
                            className="rounded text-primary"
                          />
                          <span className="text-sm text-text-secondary">{list.name}</span>
                        </label>
                      ))}
                      {lists.length === 0 && (
                        <p className="text-sm text-text-muted">No lists available</p>
                      )}
                    </div>
                  </div>

                  <div className="card p-6">
                    <h3 className="mb-4 font-medium text-text-primary">Exclude by Segment</h3>
                    <p className="mb-3 text-sm text-text-muted">
                      Contacts matching these segments will not receive this message
                    </p>
                    <div className="space-y-2">
                      {segments.map((seg) => (
                        <label key={seg.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={suppSegs.includes(seg.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSuppSegs([...suppSegs, seg.id])
                              } else {
                                setSuppSegs(suppSegs.filter((s) => s !== seg.id))
                              }
                            }}
                            className="rounded text-primary"
                          />
                          <span className="text-sm text-text-secondary">{seg.name}</span>
                        </label>
                      ))}
                      {segments.length === 0 && (
                        <p className="text-sm text-text-muted">No segments available</p>
                      )}
                    </div>
                  </div>

                  <div className="card p-6">
                    <h3 className="mb-4 font-medium text-text-primary">Exclude by Tag</h3>
                    <p className="mb-3 text-sm text-text-muted">
                      Contacts with any of these tags will not receive this message
                    </p>
                    <TagInput
                      value={suppTags}
                      onChange={setSuppTags}
                      suggestions={recentTags}
                      placeholder="Add exclusion tags..."
                    />
                  </div>
                </div>
              )}
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
