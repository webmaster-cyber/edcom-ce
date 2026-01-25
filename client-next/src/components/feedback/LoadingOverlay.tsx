import { Spinner } from '../ui/Spinner'

interface LoadingOverlayProps {
  loading: boolean
  children: React.ReactNode
}

export function LoadingOverlay({ loading, children }: LoadingOverlayProps) {
  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }
  return <>{children}</>
}
