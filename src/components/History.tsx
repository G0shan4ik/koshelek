import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { currentMonth, formatDateLong, formatMoney } from '../lib/format'
import { sumByType } from '../lib/stats'
import { Operation, OperationType } from '../lib/types'
import { MonthPicker } from './MonthPicker'
import { OperationRow } from './OperationRow'

export function History({ onEdit, onAdd }: { onEdit: (op: Operation) => void; onAdd: () => void }) {
  const { operations, categories, settings } = useApp()
  const [month, setMonth] = useState<string | null>(currentMonth())
  const [type, setType] = useState<'all' | OperationType>('all')
  const [catId, setCatId] = useState<string>('all')
  const [query, setQuery] = useState('')
  const cur = settings.currency

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return operations.filter(o => {
      if (month && !o.date.startsWith(month)) return false
      if (type !== 'all' && o.type !== type) return false
      if (catId === 'none' && o.category_id !== null) return false
      if (catId !== 'all' && catId !== 'none' && o.category_id !== catId) return false
      if (q && !(o.note ?? '').toLowerCase().includes(q) && !(o.category?.name ?? '').toLowerCase().includes(q)) {
        return false
      }
      return true
    })
  }, [operations, month, type, catId, query])

  const groups = useMemo(() => {
    const map = new Map<string, Operation[]>()
    for (const o of filtered) {
      const list = map.get(o.date) ?? []
      list.push(o)
      map.set(o.date, list)
    }
    return [...map.entries()].map(([date, ops]) => ({ date, ops }))
  }, [filtered])

  const income = sumByType(filtered, 'income')
  const expense = sumByType(filtered, 'expense')

  return (
    <div className="page">
      <header className="page-head">
        <h1>История</h1>
      </header>

      <MonthPicker month={month} onChange={setMonth} allowAll />

      <div className="filters">
        <input
          className="input"
          placeholder="Поиск по заметке или категории…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <div className="chip-row">
          {(['all', 'income', 'expense'] as const).map(t => (
            <button key={t} className={'chip' + (type === t ? ' active' : '')} onClick={() => setType(t)}>
              {t === 'all' ? 'Все' : t === 'income' ? 'Доходы' : 'Расходы'}
            </button>
          ))}
        </div>
        <div className="chip-row scroll">
          <button className={'chip' + (catId === 'all' ? ' active' : '')} onClick={() => setCatId('all')}>
            Все категории
          </button>
          {categories.map(c => (
            <button key={c.id} className={'chip' + (catId === c.id ? ' active' : '')} onClick={() => setCatId(c.id)}>
              {c.icon} {c.name}
            </button>
          ))}
          <button className={'chip' + (catId === 'none' ? ' active' : '')} onClick={() => setCatId('none')}>
            Без категории
          </button>
        </div>
      </div>

      <section className="card summary-inline">
        <span className="green">+{formatMoney(income, cur)}</span>
        <span className="red">−{formatMoney(expense, cur)}</span>
      </section>

      {groups.length === 0 ? (
        <div className="card empty">
          <span>🔍</span>
          <p>Ничего не найдено</p>
          <button className="btn btn-primary" onClick={onAdd}>
            Добавить операцию
          </button>
        </div>
      ) : (
        groups.map(g => (
          <section className="card day-group" key={g.date}>
            <div className="day-head">
              <span>{formatDateLong(g.date)}</span>
              <span className="day-sums">
                {sumByType(g.ops, 'income') > 0 && (
                  <span className="green">+{formatMoney(sumByType(g.ops, 'income'), cur)}</span>
                )}
                {sumByType(g.ops, 'expense') > 0 && (
                  <span className="red">−{formatMoney(sumByType(g.ops, 'expense'), cur)}</span>
                )}
              </span>
            </div>
            <div className="op-list">
              {g.ops.map(op => (
                <OperationRow key={op.id} op={op} onClick={() => onEdit(op)} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
