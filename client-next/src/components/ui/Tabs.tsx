interface Tab {
  key: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  activeKey: string
  onChange: (key: string) => void
}

export function Tabs({ tabs, activeKey, onChange }: TabsProps) {
  return (
    <div className="flex border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
            activeKey === tab.key
              ? 'text-primary'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          {tab.label}
          {tab.count != null && tab.count > 0 && (
            <span className="ml-1.5 text-xs text-text-muted">({tab.count})</span>
          )}
          {activeKey === tab.key && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      ))}
    </div>
  )
}
