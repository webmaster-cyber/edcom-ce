import { useRef, useEffect } from 'react'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language?: string
}

export function CodeEditor({ value, onChange }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.max(500, textareaRef.current.scrollHeight)}px`
    }
  }, [value])

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[500px] rounded-md border border-border bg-gray-900 p-4 font-mono text-sm text-green-400
          focus:outline-none focus:ring-2 focus:border-primary resize-y"
        style={{ '--tw-ring-color': 'color-mix(in srgb, var(--color-primary) 50%, transparent)' } as React.CSSProperties}
        spellCheck={false}
        placeholder="Paste your HTML email code here..."
      />
    </div>
  )
}
