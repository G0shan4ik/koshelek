import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatMoney, monthTitle } from '../lib/format'
import { groupByCategory, movesNet, sumByType } from '../lib/stats'
import { Operation } from '../lib/types'
import { CategoryLegend, DonutChart } from './DonutChart'
import { PeriodPicker } from './PeriodPicker'
import { OperationRow } from './OperationRow'
import { Tab } from './BottomNav'
import { currentPeriod, Period } from '../lib/period'

interface Props {
  onAdd: () => void
  onEdit: (op: Operation) => void
  onNavigate: (tab: Tab) => void
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return 'Доброй ночи'
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Добрый день'
  return 'Добрый вечер'
}

export function Dashboard({ onAdd, onEdit, onNavigate }: Props) {
  const { operations, settings, stashMoves } = useApp()
  const [period, setPeriod] = useState<Period>(currentPeriod('month'))
  const month = period.value
  const cur = settings.currency

  const monthOps = useMemo(() => operations.filter(o => o.date.startsWith(month)), [operations, month])
  const income = sumByType(monthOps, 'income')
  const expense = sumByType(monthOps, 'expense')
  const monthStashNet = useMemo(
    () => movesNet(stashMoves.filter(m => m.date.startsWith(month))),
    [stashMoves, month]
  )
  const expenseByCat = useMemo(
    () => groupByCategory(monthOps.filter(o => o.type === 'expense')),
    [monthOps]
  )
  const recent = operations.slice(0, 6)

  return (
    <div className="page">
      <header className="page-head">
        <div className="logo logo-small">₽</div>
        <div>
          <h1>Кошелёк</h1>
          <span className="sub">{greeting()}</span>
        </div>
      </header>

      <section className="card balance-card">
        <span className="balance-label">Баланс за {monthTitle(month).toLowerCase()}</span>
        <span className="balance-value">{formatMoney(income - expense - monthStashNet, cur)}</span>
      </section>

      <PeriodPicker period={period} onChange={p => setPeriod(p ?? currentPeriod('month'))} showKind={false} />

      <div className="stat-row">
        <div className="card stat-card">
          <span className="stat-label">Доходы</span>
          <span className="stat-value green">+{formatMoney(income, cur)}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Расходы</span>
          <span className="stat-value red">−{formatMoney(expense, cur)}</span>
        </div>
      </div>

      <section className="card">
        <h3>Расходы по категориям</h3>
        {expense > 0 ? (
          <>
            <DonutChart items={expenseByCat} centerLabel="расходы" centerValue={formatMoney(expense, cur)} />
            <CategoryLegend items={expenseByCat.slice(0, 5)} total={expense} currency={cur} />
          </>
        ) : (
          <div className="empty">
            <span>🌿</span>
            <p>В этом месяце расходов нет</p>
            <button className="btn btn-primary" onClick={onAdd}>
              Добавить операцию
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h3>Последние операции</h3>
          <button className="link-btn" onClick={() => onNavigate('history')}>
            Все →
          </button>
        </div>
        {recent.length > 0 ? (
          <div className="op-list">
            {recent.map(op => (
              <OperationRow key={op.id} op={op} onClick={() => onEdit(op)} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <span>👋</span>
            <p>Пока пусто. Добавь первую операцию!</p>
          </div>
        )}
      </section>
    </div>
  )
}
