import { useMemo } from 'react'
import { ArrowRight } from 'lucide-react'

interface ColumnMapperProps {
  columns: string[]
  mapping: Record<string, string>
  onChange: (mapping: Record<string, string>) => void
  availableFields: string[]
  hasHeader: boolean
}

const BUILT_IN_FIELDS = ['email', 'firstname', 'lastname', 'name', 'phone', 'company', 'city', 'state', 'country', 'zip']

export function ColumnMapper({
  columns,
  mapping,
  onChange,
  availableFields,
  hasHeader,
}: ColumnMapperProps) {
  // Combine built-in and custom fields
  const allFields = useMemo(() => {
    const custom = availableFields.filter((f) => !BUILT_IN_FIELDS.includes(f.toLowerCase()))
    return [...BUILT_IN_FIELDS, ...custom]
  }, [availableFields])

  const handleColumnChange = (columnIndex: number, field: string) => {
    const newMapping = { ...mapping }
    if (field) {
      newMapping[columnIndex.toString()] = field
    } else {
      delete newMapping[columnIndex.toString()]
    }
    onChange(newMapping)
  }

  // Auto-detect email column if not mapped yet
  const emailMapped = Object.values(mapping).includes('email')

  return (
    <div className="space-y-3">
      <div className="text-sm text-text-secondary">
        Map your CSV columns to contact properties. The email column is required.
      </div>

      <div className="rounded-lg border border-border divide-y divide-border">
        {columns.map((column, index) => {
          const currentMapping = mapping[index.toString()] || ''
          const isEmailCandidate =
            !emailMapped &&
            (column.toLowerCase().includes('email') || column.toLowerCase() === 'e-mail')

          return (
            <div key={index} className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text-primary truncate">
                  {hasHeader ? column : `Column ${index + 1}`}
                </div>
                {hasHeader && (
                  <div className="text-xs text-text-muted">Column {index + 1}</div>
                )}
              </div>

              <ArrowRight className="h-4 w-4 text-text-muted flex-shrink-0" />

              <div className="w-48 flex-shrink-0">
                <select
                  value={currentMapping}
                  onChange={(e) => handleColumnChange(index, e.target.value)}
                  className={`input w-full ${
                    isEmailCandidate && !currentMapping ? 'border-warning' : ''
                  }`}
                >
                  <option value="">-- Skip column --</option>
                  <optgroup label="Standard fields">
                    {BUILT_IN_FIELDS.map((field) => (
                      <option
                        key={field}
                        value={field}
                        disabled={Object.values(mapping).includes(field) && currentMapping !== field}
                      >
                        {field.charAt(0).toUpperCase() + field.slice(1)}
                        {field === 'email' ? ' (required)' : ''}
                      </option>
                    ))}
                  </optgroup>
                  {allFields.filter((f) => !BUILT_IN_FIELDS.includes(f)).length > 0 && (
                    <optgroup label="Custom fields">
                      {allFields
                        .filter((f) => !BUILT_IN_FIELDS.includes(f))
                        .map((field) => (
                          <option
                            key={field}
                            value={field}
                            disabled={Object.values(mapping).includes(field) && currentMapping !== field}
                          >
                            {field}
                          </option>
                        ))}
                    </optgroup>
                  )}
                  <optgroup label="Create new">
                    <option value="__new__">+ Create new field...</option>
                  </optgroup>
                </select>
              </div>
            </div>
          )
        })}
      </div>

      {!emailMapped && (
        <div className="rounded-md bg-warning/10 px-4 py-3 text-sm text-warning">
          Please map a column to the Email field. This field is required.
        </div>
      )}
    </div>
  )
}
