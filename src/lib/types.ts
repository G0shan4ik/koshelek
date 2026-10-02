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
}

export type OperationInput = Omit<Operation, 'id' | 'created_at' | 'category'>

export interface Settings {
  currency: string
}
