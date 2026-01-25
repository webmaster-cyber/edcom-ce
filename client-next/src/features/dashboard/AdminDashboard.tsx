import { ExternalLink, Play } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface OnboardingCardProps {
  title: string
  description: string
  helpUrl?: string
  videoId?: string
  onClick?: () => void
}

function OnboardingCard({ title, description, helpUrl, onClick }: OnboardingCardProps) {
  return (
    <div className="card p-5 transition-shadow hover:shadow-md">
      <h3 className="mb-2 text-sm font-semibold text-text-primary">{title}</h3>
      <p className="mb-3 text-sm text-text-secondary">{description}</p>
      <div className="flex items-center gap-3">
        {helpUrl && (
          <a
            href={helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover"
          >
            <ExternalLink className="h-3 w-3" />
            Documentation
          </a>
        )}
        {onClick && (
          <button
            onClick={onClick}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover"
          >
            <Play className="h-3 w-3" />
            Get Started
          </button>
        )}
      </div>
    </div>
  )
}

export function AdminDashboard() {
  const { user } = useAuth()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Backend Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Welcome back. Here are some resources to help you get started.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <OnboardingCard
          title="Backend vs Frontend vs Customer Accounts"
          description="Learn the basics of navigating your new email service provider as the postmaster."
          helpUrl="https://docs.emaildelivery.com/docs/introduction/what-you-can-do-in-the-emaildelivery.com-backend"
        />
        <OnboardingCard
          title="Sending Your First Email"
          description="Connections, Postal Routes, Customer Accounts, Email Marketing Frontend."
          helpUrl="https://docs.emaildelivery.com/docs/introduction/getting-ready-to-send"
        />
        <OnboardingCard
          title="Managing Deliverability"
          description="Monitor bounce rates, complaint rates, and delivery performance across your platform."
          helpUrl="https://docs.emaildelivery.com/docs/introduction/managing-deliverability"
        />
      </div>

      {user?.software_version && (
        <p className="mt-8 text-right text-xs text-text-muted">
          Software version: {user.software_version}
        </p>
      )}
    </div>
  )
}
