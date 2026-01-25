import { Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { useNavigationGuardContext } from '../../contexts/NavigationGuardContext'

interface WizardNavProps {
  title: string
  step: number
  totalSteps: number
  backTo?: string
  nextLabel?: string
  onNext?: () => void
  onSave?: () => void
  onAutoSave?: () => Promise<void>
  saving?: boolean
  nextDisabled?: boolean
  id?: string
}

const stepLabels = ['Settings', 'Template', 'Editor', 'Recipients', 'Review']

const stepPaths = [
  '/broadcasts/settings',
  '/broadcasts/templates',
  '/broadcasts/template',
  '/broadcasts/rcpt',
  '/broadcasts/review',
]

export function WizardNav({
  step,
  backTo,
  nextLabel,
  onNext,
  onSave,
  onAutoSave,
  saving,
  nextDisabled,
  id,
}: WizardNavProps) {
  const navigate = useNavigate()
  const { guardedNavigate } = useNavigationGuardContext()

  async function navigateWithAutoSave(to: string) {
    if (onAutoSave) await onAutoSave()
    navigate(to)
  }

  return (
    <div className="mb-6 card p-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {backTo && (
            <button
              onClick={() => navigateWithAutoSave(backTo)}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-text-muted hover:bg-gray-100 hover:text-text-primary transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>{step > 0 ? stepLabels[step - 1] : 'Back'}</span>
            </button>
          )}
          <button
            onClick={() => guardedNavigate('/broadcasts')}
            className="rounded-md px-2 py-1.5 text-xs text-danger hover:bg-danger/5 transition-colors"
          >
            Cancel Wizard
          </button>
        </div>
        <div className="flex items-center gap-2">
          {onSave && (
            <Button variant="ghost" size="sm" onClick={onSave} loading={saving}>
              Save Draft
            </Button>
          )}
          {onNext && (
            <button
              onClick={onNext}
              disabled={nextDisabled || saving}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <span>{nextLabel || 'Next'}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Step indicator */}
      <div className="mt-4 flex items-start">
        {stepLabels.map((label, i) => (
          <Fragment key={label}>
            <button
              onClick={() => i !== step && navigateWithAutoSave(`${stepPaths[i]}?id=${id}`)}
              className={`flex flex-col items-center gap-1.5 ${i !== step ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  i < step
                    ? 'bg-primary text-white'
                    : i === step
                    ? 'bg-primary text-white ring-4 ring-primary/15'
                    : 'bg-gray-100 text-text-muted border border-border hover:bg-gray-200'
                }`}
              >
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span
                className={`text-[11px] whitespace-nowrap ${
                  i <= step ? 'text-text-primary font-medium' : 'text-text-muted'
                }`}
              >
                {label}
              </span>
            </button>
            {i < stepLabels.length - 1 && (
              <div
                className={`h-px flex-1 mx-2 mt-3 ${
                  i < step ? 'bg-primary' : 'bg-border'
                }`}
              />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
