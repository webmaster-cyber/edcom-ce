import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { AreaChart } from '../../../components/charts/AreaChart'
import type { ContactList, GrowthDataPoint } from '../../../types/contact'

interface SubscriberChartsProps {
  list: ContactList
}

interface StatusDataItem {
  name: string
  value: number
  color: string
}

export function SubscriberCharts({ list }: SubscriberChartsProps) {
  // Safely access numeric values with defaults
  const totalSubscribers = Number(list.count) || 0
  const unsubscribed = Number(list.unsubscribed) || 0
  const bounced = Number(list.bounced) || 0
  const complained = Number(list.complained) || 0
  const soft = Number(list.soft) || 0

  // Calculate active if not provided: total minus all inactive statuses
  const activeFromApi = Number(list.active) || 0
  const active = activeFromApi > 0 ? activeFromApi : Math.max(0, totalSubscribers - unsubscribed - bounced - complained - soft)

  const active30 = Number(list.active30) || 0
  const active60 = Number(list.active60) || 0
  const active90 = Number(list.active90) || 0

  // Status breakdown data for donut chart
  const statusData: StatusDataItem[] = [
    { name: 'Active', value: active, color: 'var(--color-success)' },
    { name: 'Unsubscribed', value: unsubscribed, color: 'var(--color-warning)' },
    { name: 'Bounced', value: bounced, color: 'var(--color-danger)' },
    { name: 'Complained', value: complained, color: '#f97316' },
  ].filter(item => item.value > 0)

  // Growth data derived from active30/60/90 fields
  // Create month labels based on current date
  const now = new Date()
  const getMonthLabel = (monthsAgo: number): string => {
    const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }

  // Show actual values - don't substitute 0s
  const growthData: GrowthDataPoint[] = [
    { label: getMonthLabel(3), value: active90 },
    { label: getMonthLabel(2), value: active60 },
    { label: getMonthLabel(1), value: active30 },
    { label: getMonthLabel(0), value: active },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Status Donut Chart */}
      <div className="card p-4">
        <h3 className="mb-4 text-sm font-medium text-text-primary">Status Breakdown</h3>
        {totalSubscribers > 0 ? (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  innerRadius="50%"
                  outerRadius="80%"
                  dataKey="value"
                  paddingAngle={2}
                  stroke="none"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString()} (${((value / totalSubscribers) * 100).toFixed(1)}%)`,
                    name,
                  ]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value: string) => (
                    <span className="text-xs text-text-secondary">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[200px] items-center justify-center text-sm text-text-muted">
            No subscriber data
          </div>
        )}
        {/* Status summary */}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Active</span>
            <span className="font-medium text-success">{active.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Unsubscribed</span>
            <span className="font-medium text-warning">{unsubscribed.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Bounced</span>
            <span className="font-medium text-danger">{bounced.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Complained</span>
            <span className="font-medium text-danger">{complained.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Growth Area Chart */}
      <div className="card p-4">
        <h3 className="mb-4 text-sm font-medium text-text-primary">Subscriber Growth</h3>
        <AreaChart
          data={growthData}
          color="var(--color-primary)"
          height={200}
          showGrid={true}
          showAxis={true}
        />
        {/* Growth summary */}
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-xs">
          <div className="text-center">
            <div className="font-medium text-text-primary">{active30.toLocaleString()}</div>
            <div className="text-text-muted">30d Active</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-text-primary">{active60.toLocaleString()}</div>
            <div className="text-text-muted">60d Active</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-text-primary">{active90.toLocaleString()}</div>
            <div className="text-text-muted">90d Active</div>
          </div>
        </div>
      </div>
    </div>
  )
}
