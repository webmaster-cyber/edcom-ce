import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

interface ActionMenuItem {
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
}

interface ActionMenuProps {
  items: ActionMenuItem[]
  label?: string
}

export function ActionMenu({ items, label = 'Actions' }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [open])

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX - 140, // 140 is min-width of menu
      })
    }
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-gray-50"
      >
        {label}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] min-w-[140px] rounded-md border border-border bg-surface py-1 shadow-lg"
            style={{ top: position.top, left: position.left }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setOpen(false)
                  item.onClick()
                }}
                className={`block w-full px-4 py-1.5 text-left text-sm ${
                  item.variant === 'danger'
                    ? 'text-danger hover:bg-red-50'
                    : 'text-text-secondary hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  )
}
