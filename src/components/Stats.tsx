import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { currentMonth, formatMoney, shortMonth } from '../lib/format'
import { groupByCategory, lastMonths, sumByType } from '../lib/stats'
import { CategoryLegend, DonutChart } from './DonutChart'
import { MonthBars } from './MonthBars'
import { MonthPicker } from './MonthPicker'

export function Stats() {
  const { operations, settings } = useApp()
  const [month, setMonth] = useState(currentMonth())
  const cur = settings.currency

  const months = useMemo(() => lastMonths(month, 6), [month])
  const bars = useMemo(
    () =>
      months.map(m => {
        const ops = operations.filter(o => o.date.startsWith(m))
        return { label: shortMonth(m), income: sumByType(ops, 'income'), expense: sumByType(ops, 'expense') }
      }),
    [months, operations]
  )

  const monthOps = useMemo(() => operations.filter(o => o.date.startsWith(month)), [operations, month])
  const expenseByCat = useMemo(
    () => groupByCategory(monthOps.filter(o => o.type === 'expense')),
    [monthOps]
  )
  const incomeByCat = useMemo(
    () => groupByCategory(monthOps.filter(o => o.type === 'income')),
    [monthOps]
  )
  const expense = sumByType(monthOps, 'expense')
  const income = sumByType(monthOps, 'income')

  return (
    <div className="page">
      <header className="page-head">
        <h1>Отчёты</h1>
      </header>

      <MonthPicker month={month} onChange={m => setMonth(m ?? currentMonth())} />

      <section className="card">
        <h3>Динамика за 6 месяцев</h3>
        <div className="bars-legend">
          <span>
            <i className="dot green-dot" /> доходы
          </span>
          <span>
            <i className="dot red-dot" /> расходы
          </span>
        </div>
        <MonthBars data={bars} currency={cur} />
      </section>

      <section className="card">
        <h3>Расходы по категориям</h3>
        {expense > 0 ? (
          <>
            <DonutChart items={expenseByCat} centerLabel="расходы" centerValue={formatMoney(expense, cur)} />
            <CategoryLegend items={expenseByCat} total={expense} currency={cur} />
          </>
        ) : (
          <div className="empty">
            <span>🌿</span>
            <p>Нет расходов за этот месяц</p>
          </div>
        )}
      </section>

      <section className="card">
        <h3>Доходы по источникам</h3>
        {income > 0 ? (
          <>
            <DonutChart items={incomeByCat} centerLabel="доходы" centerValue={formatMoney(income, cur)} />
            <CategoryLegend items={incomeByCat} total={income} currency={cur} />
          </>
        ) : (
          <div className="empty">
            <span>💤</span>
            <p>Нет доходов за этот месяц</p>
          </div>
        )}
      </section>
    </div>
  )
}
