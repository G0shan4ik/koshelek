import { convertPeriod, currentPeriod, isCurrentPeriod, Period, PeriodKind, periodTitle, shiftPeriod } from '../lib/period'

interface Props {
  period: Period | null
  onChange: (p: Period | null) => void
  allowAll?: boolean
  showKind?: boolean
}

export function PeriodPicker({ period, onChange, allowAll, showKind = true }: Props) {
  const kind: PeriodKind = period?.kind ?? 'month'
  const base = period ?? currentPeriod(kind)
  const atCurrent = period !== null && isCurrentPeriod(period)

  return (
    <div className="period-wrap">
      {showKind && (
        <div className="segmented period-seg">
          <button className={kind === 'month' ? 'active' : ''} onClick={() => onChange(convertPeriod(period, 'month'))}>
            Месяц
          </button>
          <button className={kind === 'year' ? 'active' : ''} onClick={() => onChange(convertPeriod(period, 'year'))}>
            Год
          </button>
        </div>
      )}
      <div className="month-picker">
        <button className="mp-btn" onClick={() => onChange(shiftPeriod(base, -1))} aria-label="Раньше">
          ‹
        </button>
        <button className="mp-title" onClick={() => onChange(currentPeriod(kind))}>
          {period ? periodTitle(period) : 'Всё время'}
        </button>
        <button className="mp-btn" disabled={atCurrent} onClick={() => onChange(shiftPeriod(base, 1))} aria-label="Позже">
          ›
        </button>
        {allowAll && period && (
          <button className="mp-all" onClick={() => onChange(null)}>
            Всё время
          </button>
        )}
      </div>
    </div>
  )
}
