import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { format, subDays } from 'date-fns'
import { ArrowLeft, Globe } from 'lucide-react'
import api from '../../config/api'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import type { TransactionalDomainStats } from '../../types/transactional'

export function TransactionalDomainsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tag = searchParams.get('tag') || ''

  const [domainStats, setDomainStats] = useState<TransactionalDomainStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30')

  const loadData = useCallback(async () => {
    if (!tag) return

    try {
      const start = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd')
      const end = format(new Date(), 'yyyy-MM-dd')

      const { data } = await api.get<TransactionalDomainStats[]>(
        `/api/transactional/tag/${encodeURIComponent(tag)}/domainstats?start=${start}&end=${end}`
      )

      setDomainStats(data)
    } catch (err) {
      console.error('Failed to load:', err)
      toast.error('Failed to load domain stats')
    } finally {
      setIsLoading(false)
    }
  }, [tag, dateRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  const calcRate = (num: number, denom: number) => {
    if (!denom) return '0%'
    return ((num / denom) * 100).toFixed(1) + '%'
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/transactional/tag?id=${encodeURIComponent(tag)}`)}
            className="rounded-md p-1.5 text-text-muted hover:bg-gray-100 hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Domain Performance</h1>
            <p className="text-sm text-text-muted">Tag: {tag || '(no tag)'}</p>
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

      <LoadingOverlay loading={isLoading}>
        {domainStats.length === 0 ? (
          <EmptyState
            icon={<Globe className="h-10 w-10" />}
            title="No domain data"
            description="No emails have been sent with this tag yet."
          />
        ) : (
          <div className="card">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-border bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-muted">
                      Domain
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-text-muted">
                      Sent
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-text-muted">
                      Opened
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-text-muted">
                      Clicked
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-text-muted">
                      Bounced
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-text-muted">
                      Complaints
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {domainStats.map((stat) => (
                    <tr
                      key={stat.domain}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() =>
                        navigate(
                          `/transactional/messages?tag=${encodeURIComponent(tag)}&domain=${encodeURIComponent(stat.domain)}`
                        )
                      }
                    >
                      <td className="px-4 py-3 text-sm font-medium text-primary hover:underline">
                        {stat.domain}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-text-secondary">
                        {(stat.send || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-text-secondary">
                        {(stat.open || 0).toLocaleString()}
                        <span className="ml-1 text-xs text-text-muted">
                          ({calcRate(stat.open || 0, stat.send || 0)})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-text-secondary">
                        {(stat.click || 0).toLocaleString()}
                        <span className="ml-1 text-xs text-text-muted">
                          ({calcRate(stat.click || 0, stat.send || 0)})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <span className={(stat.hard || 0) + (stat.soft || 0) > 0 ? 'text-danger' : 'text-text-secondary'}>
                          {((stat.hard || 0) + (stat.soft || 0)).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <span
                          className={(stat.complaint || 0) > 0 ? 'text-danger' : 'text-text-secondary'}
                        >
                          {(stat.complaint || 0).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </LoadingOverlay>
    </div>
  )
}
