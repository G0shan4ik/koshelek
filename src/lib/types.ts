export type OperationType = 'income' | 'expense'

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: OperationType
}

export type CategoryInput = Omit<Category, 'id'>

export interface Operation {
  id: string
  type: OperationType
  amount: number
  category_id: string | null
  note: string | null
  date: string
  created_at: string
  category: Category | null
  currency: string
  amount_orig: number
  rate: number
}

export type OperationInput = Omit<Operation, 'id' | 'created_at' | 'category'>

export interface Settings {
  currency: string
  currencies: string[]
}

export interface Stash {
  id: string
  kind: 'safe' | 'piggy'
  name: string | null
  goal: number | null
  icon: string
  color: string
  created_at: string
  status: 'open' | 'closed'
  closed_reason: 'return' | 'spent' | null
  closed_at: string | null
}

export type StashInput = Omit<Stash, 'id' | 'created_at'>

export interface StashMove {
  id: string
  stash_id: string
  type: 'in' | 'out'
  amount: number
  note: string | null
  date: string
  created_at: string
  operation_id: string | null
  currency: string
  amount_orig: number
  rate: number
}

export interface ManualRate {
  id: string
  code: string
  rate: number
}

export type StashMoveInput = Omit<StashMove, 'id' | 'created_at'>
