import { ReactNode } from 'react'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default'
type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  children: ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
  default: 'bg-gray-100 text-text-muted',
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
}

export function Badge({ variant = 'default', size = 'md', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const statusVariants: Record<string, BadgeVariant> = {
    active: 'success',
    unsubscribed: 'warning',
    bounced: 'danger',
    complained: 'danger',
    soft: 'warning',
  }

  return (
    <Badge variant={statusVariants[status.toLowerCase()] || 'default'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}
