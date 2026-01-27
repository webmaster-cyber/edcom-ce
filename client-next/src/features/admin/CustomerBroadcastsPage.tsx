import { useState, useCallback, useEffect, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { RefreshCw, Mail, Search, ChevronUp, ChevronDown } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'

interface BroadcastData {
  cid: string
  campid: string
  name: string
  open: number
  complaint: number
  hard: number
  soft: number
}

interface CustomerData {
  id: string
  name: string
}

interface CustomerStats {
  cid: string
  customerName: string
  totalBroadcasts: number
  avgOpen: number
  avgComplaint: number
  highestComplaint: number
  highestHard: number
  highestSoft: number
}

type ViewMode = 'customer' | 'broadcast'
type SortField = 'customerName' | 'name' | 'open' | 'complaint' | 'hard' | 'soft' | 'totalBroadcasts' | 'avgOpen' | 'avgComplaint' | 'highestComplaint' | 'highestHard' | 'highestSoft'
type SortDir = 'asc' | 'desc'

export function CustomerBroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<BroadcastData[]>([])
  const [customers, setCustomers] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('customer')
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [sortField, setSortField] = useState<SortField>('customerName')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const loadCustomers = useCallback(async () => {
    try {
      const { data } = await api.get<CustomerData[]>('/api/companies')
      const map: Record<string, string> = {}
      data.forEach((c) => {
        map[c.id] = c.name
      })
      setCustomers(map)
    } catch {
      // Ignore
    }
  }, [])

  const loadBroadcasts = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('start', startDate)
      params.append('end', endDate)

      const { data } = await api.get<BroadcastData[]>(`/api/companybroadcasts?${params.toString()}`)
      setBroadcasts(data)
    } catch {
      // Handle error silently
    } finally {
      setIsLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  useEffect(() => {
    loadBroadcasts()
  }, [loadBroadcasts])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir(field === 'customerName' || field === 'name' ? 'asc' : 'desc')
    }
  }

  // Aggregate data by customer
  const customerStats = useMemo(() => {
    const statsMap: Record<string, CustomerStats> = {}

    broadcasts.forEach((bc) => {
      if (!statsMap[bc.cid]) {
        statsMap[bc.cid] = {
          cid: bc.cid,
          customerName: customers[bc.cid] || bc.cid,
          totalBroadcasts: 0,
          avgOpen: 0,
          avgComplaint: 0,
          highestComplaint: 0,
          highestHard: 0,
          highestSoft: 0,
        }
      }

      const stats = statsMap[bc.cid]
      stats.totalBroadcasts++
      stats.avgOpen += bc.open || 0
      stats.avgComplaint += bc.complaint || 0
      stats.highestComplaint = Math.max(stats.highestComplaint, bc.complaint || 0)
      stats.highestHard = Math.max(stats.highestHard, bc.hard || 0)
      stats.highestSoft = Math.max(stats.highestSoft, bc.soft || 0)
    })

    // Calculate averages
    Object.values(statsMap).forEach((stats) => {
      if (stats.totalBroadcasts > 0) {
        stats.avgOpen = stats.avgOpen / stats.totalBroadcasts
        stats.avgComplaint = stats.avgComplaint / stats.totalBroadcasts
      }
    })

    return Object.values(statsMap)
  }, [broadcasts, customers])

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    const searchLower = search.toLowerCase()

    if (viewMode === 'customer') {
      let filtered = customerStats
      if (search) {
        filtered = filtered.filter((s) =>
          s.customerName.toLowerCase().includes(searchLower)
        )
      }

      return [...filtered].sort((a, b) => {
        const aVal = a[sortField as keyof CustomerStats]
        const bVal = b[sortField as keyof CustomerStats]

        if (typeof aVal === 'string') {
          return sortDir === 'asc'
            ? aVal.localeCompare(bVal as string)
            : (bVal as string).localeCompare(aVal)
        }
        return sortDir === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number)
      })
    } else {
      let filtered = broadcasts.map((bc) => ({
        ...bc,
        customerName: customers[bc.cid] || bc.cid,
      }))

      if (search) {
        filtered = filtered.filter(
          (bc) =>
            bc.customerName.toLowerCase().includes(searchLower) ||
            bc.name.toLowerCase().includes(searchLower)
        )
      }

      return [...filtered].sort((a, b) => {
        const aVal = a[sortField as keyof typeof a]
        const bVal = b[sortField as keyof typeof b]

        if (typeof aVal === 'string') {
          return sortDir === 'asc'
            ? aVal.localeCompare(bVal as string)
            : (bVal as string).localeCompare(aVal as string)
        }
        return sortDir === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number)
      })
    }
  }, [viewMode, customerStats, broadcasts, customers, search, sortField, sortDir])

  const formatPercent = (val: number) => {
    if (!val) return '0%'
    return `${val.toFixed(2)}%`
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
          <h1 className="text-xl font-semibold text-text-primary">Customer Broadcasts Report</h1>
          <p className="text-sm text-text-secondary">Broadcast performance across all customers</p>
        </div>
        <Button
          variant="secondary"
          icon={<RefreshCw className="h-4 w-4" />}
          onClick={loadBroadcasts}
        >
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="card mb-4 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'customer' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                setViewMode('customer')
                setSortField('customerName')
                setSortDir('asc')
              }}
            >
              By Customer
            </Button>
            <Button
              variant={viewMode === 'broadcast' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                setViewMode('broadcast')
                setSortField('customerName')
                setSortDir('asc')
              }}
            >
              By Broadcast
            </Button>
          </div>
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
                placeholder={viewMode === 'customer' ? 'Search customer...' : 'Search customer or broadcast...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </div>

      <LoadingOverlay loading={isLoading}>
        {broadcasts.length === 0 ? (
          <EmptyState
            icon={<Mail className="h-10 w-10" />}
            title="No broadcast data"
            description="Customer broadcast statistics will appear here."
          />
        ) : viewMode === 'customer' ? (
          /* By Customer View */
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                      <SortHeader field="customerName">Customer</SortHeader>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                      <SortHeader field="totalBroadcasts">Broadcasts</SortHeader>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                      <SortHeader field="avgOpen">Avg Opens %</SortHeader>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                      <SortHeader field="avgComplaint">Avg Complaints %</SortHeader>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                      <SortHeader field="highestComplaint">Highest Complaint %</SortHeader>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                      <SortHeader field="highestHard">Highest Hard %</SortHeader>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                      <SortHeader field="highestSoft">Highest Soft %</SortHeader>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(filteredData as CustomerStats[]).map((stat) => (
                    <tr key={stat.cid} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 font-medium">
                        {stat.customerName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                        {stat.totalBroadcasts}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                        {formatPercent(stat.avgOpen)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                        {stat.avgComplaint > 0.1 ? (
                          <span className="text-danger">{formatPercent(stat.avgComplaint)}</span>
                        ) : (
                          formatPercent(stat.avgComplaint)
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                        {stat.highestComplaint > 0.1 ? (
                          <span className="text-danger">{formatPercent(stat.highestComplaint)}</span>
                        ) : (
                          formatPercent(stat.highestComplaint)
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                        {stat.highestHard > 5 ? (
                          <span className="text-warning">{formatPercent(stat.highestHard)}</span>
                        ) : (
                          formatPercent(stat.highestHard)
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                        {formatPercent(stat.highestSoft)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-3 text-sm text-text-muted">
              Showing {filteredData.length} customers
            </div>
          </div>
        ) : (
          /* By Broadcast View */
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                      <SortHeader field="customerName">Customer</SortHeader>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                      <SortHeader field="name">Broadcast</SortHeader>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                      <SortHeader field="open">Opens %</SortHeader>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                      <SortHeader field="complaint">Complaints %</SortHeader>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                      <SortHeader field="hard">Hard Bounce %</SortHeader>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                      <SortHeader field="soft">Soft Bounce %</SortHeader>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(filteredData as (BroadcastData & { customerName: string })[]).map((bc) => (
                    <tr key={`${bc.cid}-${bc.campid}`} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {bc.customerName}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {bc.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                        {formatPercent(bc.open)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                        {bc.complaint > 0.1 ? (
                          <span className="text-danger">{formatPercent(bc.complaint)}</span>
                        ) : (
                          formatPercent(bc.complaint)
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                        {bc.hard > 5 ? (
                          <span className="text-warning">{formatPercent(bc.hard)}</span>
                        ) : (
                          formatPercent(bc.hard)
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                        {formatPercent(bc.soft)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-3 text-sm text-text-muted">
              Showing {filteredData.length} broadcasts
            </div>
          </div>
        )}
      </LoadingOverlay>
    </div>
  )
}
