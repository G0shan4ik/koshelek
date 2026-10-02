export const CURRENCIES = [
  { code: 'RUB', label: 'Рубли (₽)' },
  { code: 'BYN', label: 'Белорусские рубли (Br)' },
  { code: 'USD', label: 'Доллары ($)' },
  { code: 'EUR', label: 'Евро (€)' },
  { code: 'KZT', label: 'Тенге (₸)' },
  { code: 'UAH', label: 'Гривны (₴)' },
  { code: 'PLN', label: 'Злотые (zł)' },
  { code: 'GBP', label: 'Фунты (£)' }
]

export function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    }).format(value)
  } catch {
    return value.toFixed(2)
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function currentMonth(): string {
  return todayISO().slice(0, 7)
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

export function monthTitle(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

export function shortMonth(month: string): string {
  const m = Number(month.split('-')[1])
  return MONTHS[m - 1].slice(0, 3).toLowerCase()
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDateLong(iso: string): string {
  const today = todayISO()
  const yest = shiftDay(today, -1)
  if (iso === today) return 'Сегодня'
  if (iso === yest) return 'Вчера'
  const d = parseISO(iso)
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}, ${WEEKDAYS[d.getDay()]}`
}

function shiftDay(iso: string, delta: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + delta)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
