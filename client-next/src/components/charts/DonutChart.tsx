import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface DonutChartProps {
  value: number
  total: number
  color?: string
  size?: number
  label?: string
}

export function DonutChart({ value, total, color = 'var(--color-primary)', size = 80, label }: DonutChartProps) {
  const pct = total > 0 ? (value / total) * 100 : 0
  const data = [
    { value: pct },
    { value: 100 - pct },
  ]

  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ width: size, height: size }} className="relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius="70%"
              outerRadius="100%"
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              <Cell fill={color} />
              <Cell fill="#e2e8f0" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-text-primary">
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>
      {label && (
        <span className="text-[11px] text-text-muted">{label}</span>
      )}
    </div>
  )
}
