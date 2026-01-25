import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: SelectOption[]
  error?: string
  helperText?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, className = '', ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="mb-1 block text-sm font-medium text-text-secondary">{label}</label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`input w-full appearance-none pr-10 ${error ? 'border-danger' : ''} ${className}`}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        </div>
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
        {helperText && !error && <p className="mt-1 text-sm text-text-muted">{helperText}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
