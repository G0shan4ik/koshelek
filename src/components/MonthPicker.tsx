import { currentMonth, monthTitle, shiftMonth } from '../lib/format'

interface Props {
  month: string | null
  onChange: (month: string | null) => void
  allowAll?: boolean
}

export function MonthPicker({ month, onChange, allowAll }: Props) {
  const base = month ?? currentMonth()
  const atCurrent = month === currentMonth()
  return (
    <div className="month-picker">
      <button className="mp-btn" onClick={() => onChange(shiftMonth(base, -1))} aria-label="Предыдущий месяц">
        ‹
      </button>
      <button className="mp-title" onClick={() => onChange(currentMonth())}>
        {month ? monthTitle(month) : 'Всё время'}
      </button>
      <button
        className="mp-btn"
        disabled={atCurrent}
        onClick={() => onChange(shiftMonth(base, 1))}
        aria-label="Следующий месяц"
      >
        ›
      </button>
      {allowAll && month && (
        <button className="mp-all" onClick={() => onChange(null)}>
          Всё время
        </button>
      )}
    </div>
  )
}
