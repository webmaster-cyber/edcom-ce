import { useState, useCallback, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
}

export function SearchInput({ value, onChange, placeholder = 'Search...', debounceMs = 500 }: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      setLocalValue(val)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => onChange(val), debounceMs)
    },
    [onChange, debounceMs]
  )

  const handleClear = useCallback(() => {
    setLocalValue('')
    if (timerRef.current) clearTimeout(timerRef.current)
    onChange('')
  }, [onChange])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="input pl-9 pr-8"
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-text-muted hover:text-text-primary"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
