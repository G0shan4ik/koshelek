import { useState } from 'react'
import { useApp } from './context/AppContext'
import { AuthScreen } from './components/AuthScreen'
import { BottomNav, Tab } from './components/BottomNav'
import { Dashboard } from './components/Dashboard'
import { History } from './components/History'
import { Stats } from './components/Stats'
import { SettingsTab } from './components/SettingsTab'
import { OperationModal } from './components/OperationModal'
import { Operation } from './lib/types'

function Splash() {
  return (
    <div className="splash">
      <div className="logo">₽</div>
      <div className="spinner" />
    </div>
  )
}

export default function App() {
  const { mode, authLoading, userId, dataLoading, offline } = useApp()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [editing, setEditing] = useState<Operation | 'new' | null>(null)

  if (authLoading) return <Splash />
  if (mode === 'cloud' && !userId) return <AuthScreen />
  if (dataLoading) return <Splash />

  return (
    <div className="app">
      {offline && <div className="offline-banner">Нет соединения — показаны сохранённые данные</div>}
      <main className="content">
        {tab === 'dashboard' && (
          <Dashboard onAdd={() => setEditing('new')} onEdit={op => setEditing(op)} onNavigate={setTab} />
        )}
        {tab === 'history' && <History onAdd={() => setEditing('new')} onEdit={op => setEditing(op)} />}
        {tab === 'stats' && <Stats />}
        {tab === 'settings' && <SettingsTab />}
      </main>
      <button className="fab" onClick={() => setEditing('new')} aria-label="Добавить операцию">
        +
      </button>
      <BottomNav tab={tab} onChange={setTab} />
      {editing && <OperationModal operation={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
