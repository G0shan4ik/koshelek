import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { currentPeriod, periodMatches, Period } from '../lib/period'
import { formatDateLong, formatMoney, monthTitle } from '../lib/format'
import { sumByType } from '../lib/stats'
import { Operation, OperationType } from '../lib/types'
import { PeriodPicker } from './PeriodPicker'
import { OperationRow } from './OperationRow'

interface DayGroup {
  date: string
  ops: Operation[]
}

interface MonthGroup {
  month: string
  ops: Operation[]
  days: DayGroup[]
}

function groupDays(ops: Operation[]): DayGroup[] {
  const map = new Map<string, Operation[]>()
  for (const o of ops) {
    const list = map.get(o.date) ?? []
    list.push(o)
    map.set(o.date, list)
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, list]) => ({ date, ops: list }))
}

export function History({ onEdit, onAdd }: { onEdit: (op: Operation) => void; onAdd: () => void }) {
  const { operations, categories, settings } = useApp()
  const [period, setPeriod] = useState<Period | null>(currentPeriod('month'))
  const [type, setType] = useState<'all' | OperationType>('all')
  const [catId, setCatId] = useState<string>('all')
  const [query, setQuery] = useState('')
  const cur = settings.currency

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return operations.filter(o => {
      if (period && !periodMatches(period, o.date)) return false
      if (type !== 'all' && o.type !== type) return false
      if (catId === 'none' && o.category_id !== null) return false
      if (catId !== 'all' && catId !== 'none' && o.category_id !== catId) return false
      if (q && !(o.note ?? '').toLowerCase().includes(q) && !(o.category?.name ?? '').toLowerCase().includes(q)) {
        return false
      }
      return true
    })
  }, [operations, period, type, catId, query])

  const monthGroups = useMemo<MonthGroup[]>(() => {
    const map = new Map<string, Operation[]>()
    for (const o of filtered) {
      const key = o.date.slice(0, 7)
      const list = map.get(key) ?? []
      list.push(o)
      map.set(key, list)
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([month, ops]) => ({ month, ops, days: groupDays(ops) }))
  }, [filtered])

  const showMonthHeads = period === null || period.kind === 'year'
  const income = sumByType(filtered, 'income')
  const expense = sumByType(filtered, 'expense')

  const sums = (ops: Operation[]) => (
    <span className="day-sums">
      {sumByType(ops, 'income') > 0 && <span className="green">+{formatMoney(sumByType(ops, 'income'), cur)}</span>}
      {sumByType(ops, 'expense') > 0 && <span className="red">−{formatMoney(sumByType(ops, 'expense'), cur)}</span>}
    </span>
  )

  return (
    <div className="page">
      <header className="page-head">
        <h1>История</h1>
      </header>

      <PeriodPicker period={period} onChange={setPeriod} allowAll />

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

      {monthGroups.length === 0 ? (
        <div className="card empty">
          <span>🔍</span>
          <p>Ничего не найдено</p>
          <button className="btn btn-primary" onClick={onAdd}>
            Добавить операцию
          </button>
        </div>
      ) : (
        monthGroups.map(mg => (
          <section className="card day-group" key={mg.month}>
            {showMonthHeads && (
              <div className="month-head">
                <span>{monthTitle(mg.month)}</span>
                {sums(mg.ops)}
              </div>
            )}
            {mg.days.map(g => (
              <div className="day-block" key={g.date}>
                <div className="day-head">
                  <span>{formatDateLong(g.date)}</span>
                  {sums(g.ops)}
                </div>
                <div className="op-list">
                  {g.ops.map(op => (
                    <OperationRow key={op.id} op={op} onClick={() => onEdit(op)} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  )
}
