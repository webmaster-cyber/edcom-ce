import { useState, useCallback, useEffect, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { RefreshCw, Server, Search, ChevronUp, ChevronDown } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { Badge } from '../../components/ui/Badge'

interface IPStats {
  id: string
  sinkid: string
  sinkname: string
  domaingroupid: string
  domaingroup: string
  ip: string
  policyid: string
  policyname: string
  send: number
  soft: number
  hard: number
  open: number
  err: number
  defercnt: number
  ispaused: boolean
  sendlimit: number
  queue: number
  deferlen: number
}

type SortField = 'domaingroup' | 'ip' | 'sinkname' | 'policyname' | 'send' | 'defercnt' | 'err' | 'queue'
type SortDir = 'asc' | 'desc'

export function IPDeliveryPage() {
  const [stats, setStats] = useState<IPStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState(() => format(subDays(new Date(), 7), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [sortField, setSortField] = useState<SortField>('send')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const reload = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('start', startDate)
      params.append('end', endDate)

      const { data } = await api.get<IPStats[]>(`/api/ipstats?${params.toString()}`)
      setStats(data)
    } catch {
      // Handle error silently
    } finally {
      setIsLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    reload()
  }, [reload])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const filteredAndSortedStats = useMemo(() => {
    let filtered = stats

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.domaingroup?.toLowerCase().includes(searchLower) ||
          s.ip?.toLowerCase().includes(searchLower) ||
          s.sinkname?.toLowerCase().includes(searchLower) ||
          s.policyname?.toLowerCase().includes(searchLower)
      )
    }

    // Sort
    return [...filtered].sort((a, b) => {
      let aVal: string | number = a[sortField] ?? ''
      let bVal: string | number = b[sortField] ?? ''

      // Handle IP sorting numerically
      if (sortField === 'ip') {
        const aParts = (aVal as string).split('.').map(Number)
        const bParts = (bVal as string).split('.').map(Number)
        for (let i = 0; i < 4; i++) {
          if (aParts[i] !== bParts[i]) {
            return sortDir === 'asc' ? aParts[i] - bParts[i] : bParts[i] - aParts[i]
          }
        }
        return 0
      }

      // String comparison
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = (bVal as string).toLowerCase()
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal)
      }

      // Number comparison
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })
  }, [stats, search, sortField, sortDir])

  const formatNumber = (num: number) => {
    return num?.toLocaleString() ?? '0'
  }

  const getDeferralRatio = (stats: IPStats) => {
    if (!stats.send) return '0%'
    return `${((stats.defercnt / stats.send) * 100).toFixed(1)}%`
  }

  const getStatus = (stats: IPStats): { label: string; variant: 'success' | 'warning' | 'danger' | 'default' } => {
    if (stats.ispaused) {
      return { label: 'Paused', variant: 'warning' }
    }
    if (stats.deferlen > 0) {
      return { label: 'Deferred', variant: 'danger' }
    }
    if (stats.send > 0) {
      return { label: 'Active', variant: 'success' }
    }
    return { label: 'Idle', variant: 'default' }
  }

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-left font-medium hover:text-primary"
    >
      {children}
      {sortField === field && (
        sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
      )}
    </button>
  )

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">IP Delivery Report</h1>
          <p className="text-sm text-text-secondary">Per-IP delivery performance</p>
        </div>
        <Button
          variant="secondary"
          icon={<RefreshCw className="h-4 w-4" />}
          onClick={reload}
        >
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="card mb-4 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex-1">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                placeholder="Search domain, IP, server, policy..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </div>

      <LoadingOverlay loading={isLoading}>
        {stats.length === 0 ? (
          <EmptyState
            icon={<Server className="h-10 w-10" />}
            title="No IP statistics"
            description="IP delivery statistics will appear here once emails are sent."
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                      <SortHeader field="domaingroup">Domain</SortHeader>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                      <SortHeader field="ip">IP Address</SortHeader>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                      <SortHeader field="send">Sent</SortHeader>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                      <SortHeader field="defercnt">Deferrals</SortHeader>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                      Defer %
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                      <SortHeader field="err">Errors</SortHeader>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                      <SortHeader field="queue">Queue</SortHeader>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                      <SortHeader field="sinkname">Server</SortHeader>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                      <SortHeader field="policyname">Policy</SortHeader>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAndSortedStats.map((stat) => {
                    const status = getStatus(stat)
                    return (
                      <tr key={stat.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          {stat.domaingroup || '-'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-sm">
                          {stat.ip}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                          {formatNumber(stat.send)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                          {formatNumber(stat.defercnt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-text-muted">
                          {getDeferralRatio(stat)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                          {stat.err > 0 ? (
                            <span className="text-danger">{formatNumber(stat.err)}</span>
                          ) : (
                            formatNumber(stat.err)
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                          {formatNumber(stat.queue)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-secondary">
                          {stat.sinkname || '-'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-secondary">
                          {stat.policyname || '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-3 text-sm text-text-muted">
              Showing {filteredAndSortedStats.length} of {stats.length} records
            </div>
          </div>
        )}
      </LoadingOverlay>
    </div>
  )
}
