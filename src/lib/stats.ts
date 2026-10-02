import { Operation } from './types'
import { shiftMonth } from './format'

export function sumByType(ops: Operation[], type: 'income' | 'expense'): number {
  return ops.reduce((s, o) => (o.type === type ? s + o.amount : s), 0)
}

export function totalBalance(ops: Operation[]): number {
  return ops.reduce((s, o) => s + (o.type === 'income' ? o.amount : -o.amount), 0)
}

export interface CategoryTotal {
  id: string | null
  label: string
  icon: string
  color: string
  total: number
}

export function groupByCategory(ops: Operation[]): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>()
  for (const o of ops) {
    const key = o.category?.id ?? 'none'
    let entry = map.get(key)
    if (!entry) {
      entry = {
        id: o.category?.id ?? null,
        label: o.category?.name ?? 'Без категории',
        icon: o.category?.icon ?? '❔',
        color: o.category?.color ?? '#98989d',
        total: 0
      }
      map.set(key, entry)
    }
    entry.total += o.amount
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

export function lastMonths(month: string, count: number): string[] {
  const res: string[] = []
  let m = month
  for (let i = 0; i < count; i++) {
    res.unshift(m)
    m = shiftMonth(m, -1)
  }
  return res
}

export function sortByDateDesc(list: Operation[]): Operation[] {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return a.created_at < b.created_at ? 1 : -1
  })
}
