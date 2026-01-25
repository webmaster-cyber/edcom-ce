import { useNavigate } from 'react-router-dom'
import { ArrowLeft, List, Settings, Filter, Zap, FileText } from 'lucide-react'

interface ListNavProps {
  listId: string
  listName: string
  customFieldsCount?: number
  segmentsCount?: number
  funnelsCount?: number
}

export function ListNav({
  listId,
  listName,
  customFieldsCount = 0,
  segmentsCount = 0,
  funnelsCount = 0,
}: ListNavProps) {
  const navigate = useNavigate()

  const CountBadge = ({ count }: { count: number }) => (
    <span className="ml-1.5 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs font-medium text-text-muted">
      {count}
    </span>
  )

  return (
    <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
      {/* Left side - List name and back link */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-text-muted">List:</span>
        <span className="rounded bg-primary px-2 py-1 text-sm font-medium text-white">
          {listName}
        </span>
        <button
          onClick={() => navigate('/contacts')}
          className="flex items-center gap-1 text-sm text-text-muted hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to lists
        </button>
      </div>

      {/* Right side - Navigation links */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => navigate(`/contacts/fields?id=${listId}`)}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary"
        >
          <List className="h-4 w-4" />
          Custom fields
          <CountBadge count={customFieldsCount} />
        </button>

        <button
          onClick={() => navigate(`/funnels?list=${listId}`)}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary"
        >
          <Zap className="h-4 w-4" />
          Funnels
          <CountBadge count={funnelsCount} />
        </button>

        <button
          onClick={() => navigate(`/contacts/segments?list=${listId}`)}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary"
        >
          <Filter className="h-4 w-4" />
          Segments
          <CountBadge count={segmentsCount} />
        </button>

        <button
          onClick={() => navigate(`/contacts/subscribe?id=${listId}`)}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary"
        >
          <FileText className="h-4 w-4" />
          Subscribe form
        </button>

        <button
          onClick={() => navigate(`/contacts/settings?id=${listId}`)}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary"
        >
          <Settings className="h-4 w-4" />
          List settings
        </button>
      </div>
    </div>
  )
}
