interface Tab {
  key?: string
  id?: string // alias for key
  label: string
  count?: number
  onClick?: () => void
  disabled?: boolean
}

interface TabsProps {
  tabs: Tab[]
  activeKey?: string
  activeTab?: string // alias for activeKey
  onChange?: (key: string) => void
}

export function Tabs({ tabs, activeKey, activeTab, onChange }: TabsProps) {
  const currentActive = activeKey || activeTab || ''

  return (
    <div className="flex border-b border-border">
      {tabs.map((tab) => {
        const tabKey = tab.key || tab.id || tab.label
        const isActive = currentActive === tabKey

        return (
          <button
            key={tabKey}
            onClick={() => {
              if (tab.disabled) return
              if (tab.onClick) {
                tab.onClick()
              } else if (onChange) {
                onChange(tabKey)
              }
            }}
            disabled={tab.disabled}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'text-primary'
                : tab.disabled
                ? 'text-text-muted cursor-not-allowed'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className="ml-1.5 text-xs text-text-muted">({tab.count})</span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        )
      })}
    </div>
  )
}
