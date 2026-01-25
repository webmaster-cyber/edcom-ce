import { User } from 'lucide-react'
import { Badge, StatusBadge } from '../../../components/ui/Badge'

interface ListMembership {
  id: string
  name: string
  status: string
}

interface ContactInfoCardProps {
  email: string
  name?: string
  lists?: ListMembership[]
}

export function ContactInfoCard({ email, name, lists = [] }: ContactInfoCardProps) {
  // Determine overall status from list memberships
  const getOverallStatus = (): string => {
    if (lists.length === 0) return 'unknown'

    // Check if any list has a non-active status
    const hasComplained = lists.some((l) => l.status === 'complained')
    const hasBounced = lists.some((l) => l.status === 'bounced')
    const hasUnsubscribed = lists.some((l) => l.status === 'unsubscribed')

    if (hasComplained) return 'complained'
    if (hasBounced) return 'bounced'
    if (hasUnsubscribed) return 'unsubscribed'
    return 'active'
  }

  const overallStatus = getOverallStatus()

  return (
    <div className="card p-6">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
          <User className="h-8 w-8 text-primary" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-text-primary truncate">
              {name || email}
            </h2>
            <StatusBadge status={overallStatus} />
          </div>

          {name && (
            <p className="mt-1 text-sm text-text-muted truncate">{email}</p>
          )}

          {/* List memberships */}
          {lists.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {lists.map((list) => (
                <Badge
                  key={list.id}
                  variant={
                    list.status === 'active' ? 'success' :
                    list.status === 'unsubscribed' ? 'warning' :
                    list.status === 'bounced' || list.status === 'complained' ? 'danger' :
                    'default'
                  }
                  size="sm"
                >
                  {list.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
