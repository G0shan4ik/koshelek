import { Category, CategoryInput, Operation, OperationInput } from './types'
import { defaultCategories, uid } from './defaults'
import { sortByDateDesc } from './stats'

const OPS_KEY = 'koshelok:operations'
const CATS_KEY = 'koshelok:categories'

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function categories(): Category[] {
  let cats = read<Category[]>(CATS_KEY)
  if (!cats) {
    cats = defaultCategories()
    write(CATS_KEY, cats)
  }
  return cats
}

function operations(): Operation[] {
  return read<Operation[]>(OPS_KEY) ?? []
}

function join(op: Operation, cats: Category[]): Operation {
  return { ...op, category: cats.find(c => c.id === op.category_id) ?? null }
}

export const localStore = {
  listCategories(): Category[] {
    return categories()
  },
  addCategory(input: CategoryInput): Category {
    const cats = categories()
    const cat: Category = { ...input, id: uid() }
    write(CATS_KEY, [...cats, cat])
    return cat
  },
  updateCategory(id: string, input: Partial<CategoryInput>): void {
    write(CATS_KEY, categories().map(c => (c.id === id ? { ...c, ...input } : c)))
  },
  deleteCategory(id: string): void {
    write(CATS_KEY, categories().filter(c => c.id !== id))
    write(OPS_KEY, operations().map(o => (o.category_id === id ? { ...o, category_id: null, category: null } : o)))
  },
  listOperations(): Operation[] {
    const cats = categories()
    return sortByDateDesc(operations().map(o => join(o, cats)))
  },
  addOperation(input: OperationInput): Operation {
    const op: Operation = { ...input, category: null, id: uid(), created_at: new Date().toISOString() }
    write(OPS_KEY, [...operations(), op])
    return join(op, categories())
  },
  updateOperation(id: string, input: OperationInput): void {
    write(OPS_KEY, operations().map(o => (o.id === id ? { ...o, ...input } : o)))
  },
  deleteOperation(id: string): void {
    write(OPS_KEY, operations().filter(o => o.id !== id))
  },
  resetAll(): void {
    localStorage.removeItem(OPS_KEY)
    localStorage.removeItem(CATS_KEY)
  }
}
