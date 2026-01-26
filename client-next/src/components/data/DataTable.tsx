import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  width?: string
  render?: (item: T) => React.ReactNode
}

interface SortState {
  key: string
  direction: 'asc' | 'desc'
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyField: keyof T
  selectable?: boolean
  selected?: Set<string>
  onSelectChange?: (selected: Set<string>) => void
  onSelectAll?: () => void
  defaultSort?: SortState
  emptyMessage?: string
}

export function DataTable<T>({
  data,
  columns,
  keyField,
  selectable = false,
  selected = new Set(),
  onSelectChange,
  onSelectAll,
  defaultSort,
  emptyMessage = 'No data',
}: DataTableProps<T>) {
  const [sortState, setSortState] = useState<SortState | null>(defaultSort || null)

  const handleSort = (key: string) => {
    if (!columns.find((c) => c.key === key)?.sortable) return

    setSortState((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const sortedData = useMemo(() => {
    if (!sortState) return data

    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortState.key]
      const bVal = (b as Record<string, unknown>)[sortState.key]

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return sortState.direction === 'asc' ? 1 : -1
      if (bVal == null) return sortState.direction === 'asc' ? -1 : 1

      // Compare values
      let comparison = 0
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase())
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal
      } else {
        comparison = String(aVal).localeCompare(String(bVal))
      }

      return sortState.direction === 'asc' ? comparison : -comparison
    })
  }, [data, sortState])

  const handleRowSelect = (id: string) => {
    if (!onSelectChange) return
    const newSelected = new Set(selected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    onSelectChange(newSelected)
  }

  const isAllSelected = data.length > 0 && selected.size === data.length
  const isSomeSelected = selected.size > 0 && selected.size < data.length

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr className="border-b border-border">
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeSelected
                    }}
                    onChange={onSelectAll}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-${col.align || 'left'}`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className={`inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider hover:text-text-primary ${
                        sortState?.key === col.key ? 'text-primary' : 'text-text-muted'
                      }`}
                    >
                      {col.header}
                      <span className="flex flex-col">
                        <ChevronUp
                          className={`h-3 w-3 -mb-1 ${
                            sortState?.key === col.key && sortState.direction === 'asc'
                              ? 'text-primary'
                              : 'text-text-muted/40'
                          }`}
                        />
                        <ChevronDown
                          className={`h-3 w-3 ${
                            sortState?.key === col.key && sortState.direction === 'desc'
                              ? 'text-primary'
                              : 'text-text-muted/40'
                          }`}
                        />
                      </span>
                    </button>
                  ) : (
                    <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                      {col.header}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-8 text-center text-sm text-text-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((item) => {
                const id = String((item as Record<string, unknown>)[keyField as string])
                const isSelected = selected.has(id)

                return (
                  <tr
                    key={id}
                    className={`hover:bg-gray-50 ${isSelected ? 'bg-primary/5' : ''}`}
                  >
                    {selectable && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleRowSelect(id)}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-sm text-${col.align || 'left'}`}
                      >
                        {col.render
                          ? col.render(item)
                          : String((item as Record<string, unknown>)[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
