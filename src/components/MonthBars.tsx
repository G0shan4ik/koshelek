import { formatMoney } from '../lib/format'

interface Bar {
  label: string
  income: number
  expense: number
}

export function MonthBars({ data, currency }: { data: Bar[]; currency: string }) {
  const max = Math.max(1, ...data.map(d => Math.max(d.income, d.expense)))
  const h = (v: number) => (v > 0 ? `${Math.max(4, (v / max) * 100)}%` : '0%')

  return (
    <div className="bars">
      {data.map((d, i) => (
        <div className="bar-col" key={i}>
          <div className="bar-pair">
            <div className="bar bar-income" style={{ height: h(d.income) }} title={`Доходы: ${formatMoney(d.income, currency)}`} />
            <div className="bar bar-expense" style={{ height: h(d.expense) }} title={`Расходы: ${formatMoney(d.expense, currency)}`} />
          </div>
          <span className="bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  )
}
