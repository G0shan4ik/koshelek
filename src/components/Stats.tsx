import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { currentPeriod, monthsOfYear, periodMatches, Period } from '../lib/period'
import { formatMoney, shortMonth } from '../lib/format'
import { groupByCategory, lastMonths, sumByType } from '../lib/stats'
import { CategoryLegend, DonutChart } from './DonutChart'
import { MonthBars } from './MonthBars'
import { PeriodPicker } from './PeriodPicker'

export function Stats() {
  const { operations, settings } = useApp()
  const [period, setPeriod] = useState<Period>(currentPeriod('month'))
  const cur = settings.currency

  const bars = useMemo(() => {
    const months = period.kind === 'month' ? lastMonths(period.value, 6) : monthsOfYear(period.value)
    return months.map(m => {
      const ops = operations.filter(o => o.date.startsWith(m))
      return { label: shortMonth(m), income: sumByType(ops, 'income'), expense: sumByType(ops, 'expense') }
    })
  }, [period, operations])

  const yearBars = useMemo(() => {
    const years = [...new Set(operations.map(o => o.date.slice(0, 4)))].sort()
    return years.map(y => {
      const ops = operations.filter(o => o.date.startsWith(y))
      return { label: y, income: sumByType(ops, 'income'), expense: sumByType(ops, 'expense') }
    })
  }, [operations])

  const periodOps = useMemo(() => operations.filter(o => periodMatches(period, o.date)), [operations, period])
  const expenseByCat = useMemo(
    () => groupByCategory(periodOps.filter(o => o.type === 'expense')),
    [periodOps]
  )
  const incomeByCat = useMemo(
    () => groupByCategory(periodOps.filter(o => o.type === 'income')),
    [periodOps]
  )
  const expense = sumByType(periodOps, 'expense')
  const income = sumByType(periodOps, 'income')

  return (
    <div className="page">
      <header className="page-head">
        <h1>Отчёты</h1>
      </header>

      <PeriodPicker period={period} onChange={p => setPeriod(p ?? currentPeriod('month'))} />

      <section className="card">
        <h3>{period.kind === 'month' ? 'Динамика за 6 месяцев' : `Динамика по месяцам ${period.value} года`}</h3>
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

      {period.kind === 'year' && yearBars.length > 1 && (
        <section className="card">
          <h3>Динамика по годам</h3>
          <div className="bars-legend">
            <span>
              <i className="dot green-dot" /> доходы
            </span>
            <span>
              <i className="dot red-dot" /> расходы
            </span>
          </div>
          <MonthBars data={yearBars} currency={cur} />
        </section>
      )}

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
            <p>Нет расходов за этот период</p>
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
            <p>Нет доходов за этот период</p>
          </div>
        )}
      </section>
    </div>
  )
}
