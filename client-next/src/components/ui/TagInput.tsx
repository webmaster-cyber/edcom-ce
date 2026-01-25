import { useState, useRef, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
  disabled?: boolean
}

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = 'Add tag...',
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter suggestions based on input
  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(s)
  )

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim()
      if (trimmed && !value.includes(trimmed)) {
        onChange([...value, trimmed])
      }
      setInputValue('')
      setShowSuggestions(false)
      setHighlightIndex(-1)
    },
    [value, onChange]
  )

  const removeTag = useCallback(
    (tag: string) => {
      onChange(value.filter((t) => t !== tag))
    },
    [value, onChange]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIndex >= 0 && filteredSuggestions[highlightIndex]) {
        addTag(filteredSuggestions[highlightIndex])
      } else if (inputValue) {
        addTag(inputValue)
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => Math.min(i + 1, filteredSuggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setHighlightIndex(-1)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`input flex min-h-[38px] flex-wrap items-center gap-1.5 px-2 py-1.5 ${
          disabled ? 'bg-gray-50 cursor-not-allowed' : 'cursor-text'
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeTag(tag)
                }}
                className="rounded-full p-0.5 hover:bg-primary/20"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setShowSuggestions(true)
            setHighlightIndex(-1)
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={disabled}
          className="min-w-[100px] flex-1 border-none bg-transparent p-0 text-sm outline-none focus:ring-0"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-surface py-1 shadow-lg">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addTag(suggestion)}
              className={`block w-full px-3 py-1.5 text-left text-sm ${
                index === highlightIndex
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-gray-50'
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
