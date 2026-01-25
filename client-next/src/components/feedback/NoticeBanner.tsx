import { ReactNode, useState } from 'react'
import { X, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'

type NoticeVariant = 'info' | 'warning' | 'success' | 'danger'

interface NoticeBannerProps {
  variant?: NoticeVariant
  title?: string
  children: ReactNode
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
}

const variantConfig: Record<NoticeVariant, { bg: string; text: string; icon: typeof Info }> = {
  info: {
    bg: 'bg-info/10 border-info/20',
    text: 'text-info',
    icon: Info,
  },
  warning: {
    bg: 'bg-warning/10 border-warning/20',
    text: 'text-warning',
    icon: AlertTriangle,
  },
  success: {
    bg: 'bg-success/10 border-success/20',
    text: 'text-success',
    icon: CheckCircle,
  },
  danger: {
    bg: 'bg-danger/10 border-danger/20',
    text: 'text-danger',
    icon: AlertCircle,
  },
}

export function NoticeBanner({
  variant = 'info',
  title,
  children,
  dismissible = true,
  onDismiss,
  className = '',
}: NoticeBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const config = variantConfig[variant]
  const Icon = config.icon

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  return (
    <div
      className={`rounded-lg border ${config.bg} px-4 py-3 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 flex-shrink-0 ${config.text}`} />
        <div className="flex-1 min-w-0">
          {title && (
            <p className={`font-medium ${config.text} mb-1`}>{title}</p>
          )}
          <div className="text-sm text-text-secondary">{children}</div>
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 rounded-md p-1 text-text-muted hover:bg-white/50 hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
