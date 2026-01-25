import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { format, subDays } from 'date-fns'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import api from '../../config/api'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { Tabs } from '../../components/ui/Tabs'
import type { TransactionalBounceMessage } from '../../types/transactional'

type MessageType = 'hard' | 'soft' | 'complaint'

export function TransactionalMessagesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tag = searchParams.get('tag') || ''
  const domain = searchParams.get('domain') || ''
  const initialType = (searchParams.get('type') as MessageType) || 'hard'

  const [messages, setMessages] = useState<TransactionalBounceMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [messageType, setMessageType] = useState<MessageType>(initialType)
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30')

  const loadData = useCallback(async () => {
    if (!tag) return

    try {
      const start = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd')
      const end = format(new Date(), 'yyyy-MM-dd')

      let url = `/api/transactional/tag/${encodeURIComponent(tag)}/msgs?start=${start}&end=${end}&type=${messageType}&domain=${encodeURIComponent(domain || '')}`

      const { data } = await api.get<TransactionalBounceMessage[]>(url)
      setMessages(data)
    } catch (err) {
      console.error('Failed to load:', err)
      toast.error('Failed to load bounce messages')
    } finally {
      setIsLoading(false)
    }
  }, [tag, domain, messageType, dateRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  const tabs = [
    { key: 'hard' as const, label: 'Hard Bounces' },
    { key: 'soft' as const, label: 'Soft Bounces' },
    { key: 'complaint' as const, label: 'Complaints' },
  ]

  const getBackUrl = () => {
    if (domain) {
      return `/transactional/domains?tag=${encodeURIComponent(tag)}`
    }
    return `/transactional/tag?id=${encodeURIComponent(tag)}`
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(getBackUrl())}
            className="rounded-md p-1.5 text-text-muted hover:bg-gray-100 hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Bounce Messages</h1>
            <p className="text-sm text-text-muted">
              Tag: {tag || '(no tag)'}
              {domain && ` • Domain: ${domain}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7' | '30' | '90')}
            className="input text-sm"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="border-b border-border px-4 pt-2">
          <Tabs
            tabs={tabs}
            activeKey={messageType}
            onChange={(k) => setMessageType(k as MessageType)}
          />
        </div>

        <LoadingOverlay loading={isLoading}>
          {messages.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-10 w-10" />}
              title={`No ${messageType === 'hard' ? 'hard bounce' : messageType === 'soft' ? 'soft bounce' : 'complaint'} messages`}
              description="No messages found for the selected criteria."
            />
          ) : (
            <div className="divide-y divide-border">
              {messages.map((msg, idx) => (
                <div key={idx} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary">{msg.msg}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-lg font-semibold text-text-primary">
                        {(msg.count || 0).toLocaleString()}
                      </span>
                      <p className="text-xs text-text-muted">occurrences</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </LoadingOverlay>
      </div>
    </div>
  )
}
