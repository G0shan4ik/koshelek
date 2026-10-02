export type Tab = 'dashboard' | 'history' | 'stats' | 'settings'

const ITEMS: Array<{ id: Tab; icon: string; label: string }> = [
  { id: 'dashboard', icon: '🏠', label: 'Обзор' },
  { id: 'history', icon: '📋', label: 'История' },
  { id: 'stats', icon: '📈', label: 'Отчёты' },
  { id: 'settings', icon: '⚙️', label: 'Ещё' }
]

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="bottom-nav">
      {ITEMS.map(item => (
        <button
          key={item.id}
          className={'nav-item' + (tab === item.id ? ' active' : '')}
          onClick={() => onChange(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
