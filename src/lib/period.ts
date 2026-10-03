import { currentMonth, monthTitle, shiftMonth, todayISO } from './format'

export type PeriodKind = 'month' | 'year'

export interface Period {
  kind: PeriodKind
  value: string
}

export function currentPeriod(kind: PeriodKind): Period {
  return kind === 'month' ? { kind, value: currentMonth() } : { kind, value: todayISO().slice(0, 4) }
}

export function shiftPeriod(p: Period, delta: number): Period {
  if (p.kind === 'month') return { kind: 'month', value: shiftMonth(p.value, delta) }
  return { kind: 'year', value: String(Number(p.value) + delta) }
}

export function periodTitle(p: Period): string {
  return p.kind === 'month' ? monthTitle(p.value) : p.value
}

export function periodMatches(p: Period, date: string): boolean {
  return date.startsWith(p.value)
}

export function isCurrentPeriod(p: Period): boolean {
  return p.value === currentPeriod(p.kind).value
}

export function convertPeriod(p: Period | null, kind: PeriodKind): Period {
  if (!p) return currentPeriod(kind)
  if (p.kind === kind) return p
  if (kind === 'year') return { kind, value: p.value.slice(0, 4) }
  return { kind, value: `${p.value}-${currentMonth().slice(5)}` }
}

export function monthsOfYear(year: string): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)
}
