import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 text-text-muted">
        {icon || <Inbox className="h-10 w-10" />}
      </div>
      <h3 className="text-base font-medium text-text-primary">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
