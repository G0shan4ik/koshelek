import {
  Category,
  CategoryInput,
  ManualRate,
  Operation,
  OperationInput,
  Stash,
  StashInput,
  StashMove,
  StashMoveInput
} from './types'
import { defaultCategories, uid } from './defaults'
import { sortByDateDesc } from './stats'

const OPS_KEY = 'koshelok:operations'
const CATS_KEY = 'koshelok:categories'
const STASH_KEY = 'koshelok:stashes'
const MOVE_KEY = 'koshelok:stash-moves'
const RATE_KEY = 'koshelok:rates'

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
  restoreOperation(op: Operation, restoredMoves: StashMove[]): void {
    write(OPS_KEY, [...operations(), op])
    write(MOVE_KEY, [...moves(), ...restoredMoves])
  },
  deleteOperation(id: string): void {
    write(OPS_KEY, operations().filter(o => o.id !== id))
    write(MOVE_KEY, moves().filter(m => m.operation_id !== id))
  },
  listStashes(): Stash[] {
    return stashes()
  },
  ensureSafe(): Stash[] {
    const list = stashes()
    if (list.some(s => s.kind === 'safe')) return list
    const safe: Stash = {
      id: uid(),
      kind: 'safe',
      name: null,
      goal: null,
      icon: '🔐',
      color: '#ffd60a',
      created_at: new Date().toISOString(),
      status: 'open',
      closed_reason: null,
      closed_at: null
    }
    const next = [safe, ...list]
    write(STASH_KEY, next)
    return next
  },
  createStash(input: StashInput): Stash {
    const stash: Stash = { ...input, id: uid(), created_at: new Date().toISOString() }
    write(STASH_KEY, [...stashes(), stash])
    return stash
  },
  updateStash(id: string, input: Partial<StashInput>): void {
    write(STASH_KEY, stashes().map(s => (s.id === id ? { ...s, ...input } : s)))
  },
  deleteStash(id: string): void {
    write(STASH_KEY, stashes().filter(s => s.id !== id))
    write(MOVE_KEY, moves().filter(m => m.stash_id !== id))
  },
  listStashMoves(): StashMove[] {
    return sortByDateDesc(moves())
  },
  addStashMove(input: StashMoveInput): StashMove {
    const move: StashMove = {
      ...input,
      id: uid(),
      created_at: new Date().toISOString(),
      operation_id: input.operation_id ?? null
    }
    write(MOVE_KEY, [...moves(), move])
    return move
  },
  listRates(): ManualRate[] {
    return read<ManualRate[]>(RATE_KEY) ?? []
  },
  upsertRate(code: string, rate: number | null): void {
    const list = read<ManualRate[]>(RATE_KEY) ?? []
    if (rate === null) {
      write(RATE_KEY, list.filter(r => r.code !== code))
      return
    }
    const existing = list.find(r => r.code === code)
    if (existing) {
      write(RATE_KEY, list.map(r => (r.code === code ? { ...r, rate } : r)))
    } else {
      write(RATE_KEY, [...list, { id: uid(), code, rate }])
    }
  },
  resetAll(): void {
    localStorage.removeItem(OPS_KEY)
    localStorage.removeItem(CATS_KEY)
    localStorage.removeItem(STASH_KEY)
    localStorage.removeItem(MOVE_KEY)
  }
}

function stashes(): Stash[] {
  return read<Stash[]>(STASH_KEY) ?? []
}

function moves(): StashMove[] {
  return read<StashMove[]>(MOVE_KEY) ?? []
}
