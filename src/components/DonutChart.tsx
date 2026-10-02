import { formatMoney } from '../lib/format'
import { CategoryTotal } from '../lib/stats'

interface DonutProps {
  items: CategoryTotal[]
  centerLabel: string
  centerValue: string
}

export function DonutChart({ items, centerLabel, centerValue }: DonutProps) {
  const sum = items.reduce((s, i) => s + i.total, 0)
  const R = 54
  const C = 2 * Math.PI * R
  let acc = 0

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" className="donut">
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--card2)" strokeWidth="18" />
        {sum > 0 &&
          items.map(item => {
            const frac = item.total / sum
            const el = (
              <circle
                key={item.id ?? 'none'}
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke={item.color}
                strokeWidth="18"
                strokeDasharray={`${frac * C} ${C}`}
                strokeDashoffset={-acc * C}
                transform="rotate(-90 70 70)"
              />
            )
            acc += frac
            return el
          })}
        <text x="70" y="66" textAnchor="middle" className="donut-value">
          {centerValue}
        </text>
        <text x="70" y="86" textAnchor="middle" className="donut-label">
          {centerLabel}
        </text>
      </svg>
    </div>
  )
}

interface LegendProps {
  items: CategoryTotal[]
  total: number
  currency: string
}

export function CategoryLegend({ items, total, currency }: LegendProps) {
  return (
    <div className="legend">
      {items.map(i => (
        <div className="legend-row" key={i.id ?? 'none'}>
          <span className="legend-dot" style={{ background: i.color }} />
          <span className="legend-name">
            {i.icon} {i.label}
          </span>
          <span className="legend-pct">{total > 0 ? Math.round((i.total / total) * 100) : 0}%</span>
          <span className="legend-sum">{formatMoney(i.total, currency)}</span>
        </div>
      ))}
    </div>
  )
}
