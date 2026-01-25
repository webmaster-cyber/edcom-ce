import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronUp, ChevronDown, Copy } from 'lucide-react'
import { ActionMenu } from '../../../components/ui/ActionMenu'
import type { ContactList } from '../../../types/contact'

interface ListsTableViewProps {
  lists: ContactList[]
  getActions: (list: ContactList) => { label: string; onClick: () => void; variant?: 'default' | 'danger' }[]
}

type SortField = 'id' | 'name' | 'active' | 'unsubscribed' | 'bounced' | 'count'
type SortDirection = 'asc' | 'desc'

export function ListsTableView({ lists, getActions }: ListsTableViewProps) {
  const navigate = useNavigate()
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Calculate active subscribers - fallback to count minus inactive statuses if not provided
  const getActiveCount = (list: ContactList): number => {
    const activeFromApi = Number(list.active) || 0
    if (activeFromApi > 0) return activeFromApi

    const total = Number(list.count) || 0
    const unsubscribed = Number(list.unsubscribed) || 0
    const bounced = Number(list.bounced) || 0
    const complained = Number(list.complained) || 0
    const soft = Number(list.soft) || 0

    return Math.max(0, total - unsubscribed - bounced - complained - soft)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedLists = [...lists].sort((a, b) => {
    let aVal: string | number
    let bVal: string | number

    // Use calculated active count for sorting
    if (sortField === 'active') {
      aVal = getActiveCount(a)
      bVal = getActiveCount(b)
    } else {
      aVal = a[sortField] ?? ''
      bVal = b[sortField] ?? ''
    }

    if (typeof aVal === 'string') aVal = aVal.toLowerCase()
    if (typeof bVal === 'string') bVal = bVal.toLowerCase()

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th className="px-4 py-3 text-left">
      <button
        onClick={() => handleSort(field)}
        className="inline-flex items-center gap-1 text-xs font-medium text-text-muted uppercase hover:text-text-primary"
      >
        {label}
        <span className="flex flex-col">
          <ChevronUp
            className={`h-3 w-3 -mb-1 ${sortField === field && sortDirection === 'asc' ? 'text-primary' : 'text-text-muted/40'}`}
          />
          <ChevronDown
            className={`h-3 w-3 ${sortField === field && sortDirection === 'desc' ? 'text-primary' : 'text-text-muted/40'}`}
          />
        </span>
      </button>
    </th>
  )

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id)
    toast.success('ID copied to clipboard')
  }

  return (
    <div className="card">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <SortHeader field="name" label="Name" />
              <SortHeader field="active" label="Active" />
              <SortHeader field="unsubscribed" label="Unsub" />
              <SortHeader field="bounced" label="Bounced" />
              <SortHeader field="id" label="ID" />
              <th className="w-20 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedLists.map((list) => (
              <tr key={list.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <button
                    onClick={() => navigate(`/contacts/find?id=${list.id}`)}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {list.name}
                  </button>
                  {list.unapproved && (
                    <span className="ml-2 inline-flex items-center rounded bg-warning/10 px-1.5 py-0.5 text-[10px] text-warning">
                      Pending
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-success">
                    {getActiveCount(list).toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-warning">
                    {(list.unsubscribed ?? 0).toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-danger">
                    {(list.bounced ?? 0).toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <code className="text-xs text-text-muted font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                      {list.id}
                    </code>
                    <button
                      onClick={() => handleCopyId(list.id)}
                      className="p-1 rounded text-text-muted hover:text-primary hover:bg-gray-100"
                      title="Copy ID"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <ActionMenu items={getActions(list)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
