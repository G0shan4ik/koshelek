import { supabase } from './supabase'
import { localStore } from './localStore'
import { defaultCategories } from './defaults'
import { Category, CategoryInput, Operation, OperationInput, Stash, StashInput, StashMove, StashMoveInput } from './types'

export const cloudEnabled = supabase !== null

function translateError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Неверный email или пароль'
  if (m.includes('already registered')) return 'Этот email уже зарегистрирован'
  if (m.includes('unable to validate email')) return 'Некорректный email'
  if (m.includes('password should be at least')) return 'Пароль должен быть не короче 6 символов'
  if (m.includes('failed to fetch') || m.includes('network')) return 'Нет соединения с сервером'
  return message
}

interface OpRow {
  id: string
  type: 'income' | 'expense'
  amount: number
  category_id: string | null
  note: string | null
  date: string
  created_at: string
  categories: Category | Category[] | null
}

function normalizeStash(row: Partial<Stash> & { id: string }): Stash {
  const base = row as Stash
  return {
    ...base,
    status: base.status ?? 'open',
    closed_reason: base.closed_reason ?? null,
    closed_at: base.closed_at ?? null
  }
}

function normalizeOp(row: OpRow): Operation {
  const cat = Array.isArray(row.categories) ? row.categories[0] ?? null : row.categories
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    category_id: row.category_id,
    note: row.note,
    date: row.date,
    created_at: row.created_at,
    category: cat ?? null
  }
}

export const api = {
  onAuthChange(cb: (userId: string | null, email: string | null) => void): () => void {
    if (!supabase) {
      cb('local', null)
      return () => {}
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      cb(session?.user.id ?? null, session?.user.email ?? null)
    })
    return () => data.subscription.unsubscribe()
  },

  async signIn(email: string, password: string): Promise<void> {
    if (!supabase) throw new Error('Облачный режим не настроен')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(translateError(error.message))
  },

  async signUp(email: string, password: string): Promise<boolean> {
    if (!supabase) throw new Error('Облачный режим не настроен')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw new Error(translateError(error.message))
    return data.session === null
  },

  async signOut(): Promise<void> {
    if (supabase) await supabase.auth.signOut()
  },

  async listCategories(): Promise<Category[]> {
    if (!supabase) return localStore.listCategories()
    const { data, error } = await supabase.from('categories').select('*').order('sort_order')
    if (error) throw error
    return (data ?? []) as Category[]
  },

  async ensureDefaultCategories(): Promise<void> {
    if (!supabase) {
      localStore.listCategories()
      return
    }
    const { count } = await supabase.from('categories').select('id', { count: 'exact', head: true })
    if (count && count > 0) return
    const { data } = await supabase.auth.getUser()
    const userId = data.user?.id
    if (!userId) return
    const rows = defaultCategories().map((c, i) => ({
      user_id: userId,
      name: c.name,
      icon: c.icon,
      color: c.color,
      type: c.type,
      sort_order: i
    }))
    await supabase.from('categories').insert(rows)
  },

  async addCategory(input: CategoryInput): Promise<Category> {
    if (!supabase) return localStore.addCategory(input)
    const { data: user } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('categories')
      .insert({ ...input, user_id: user.user!.id })
      .select()
      .single()
    if (error) throw error
    return data as Category
  },

  async updateCategory(id: string, input: Partial<CategoryInput>): Promise<void> {
    if (!supabase) {
      localStore.updateCategory(id, input)
      return
    }
    const { error } = await supabase.from('categories').update(input).eq('id', id)
    if (error) throw error
  },

  async deleteCategory(id: string): Promise<void> {
    if (!supabase) {
      localStore.deleteCategory(id)
      return
    }
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw error
  },

  async listOperations(): Promise<Operation[]> {
    if (!supabase) return localStore.listOperations()
    const { data, error } = await supabase
      .from('operations')
      .select('*, categories(*)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return ((data ?? []) as unknown as OpRow[]).map(normalizeOp)
  },

  async addOperation(input: OperationInput): Promise<Operation> {
    if (!supabase) return localStore.addOperation(input)
    const { data: user } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('operations')
      .insert({ ...input, user_id: user.user!.id })
      .select('*, categories(*)')
      .single()
    if (error) throw error
    return normalizeOp(data as unknown as OpRow)
  },

  async updateOperation(id: string, input: OperationInput): Promise<void> {
    if (!supabase) {
      localStore.updateOperation(id, input)
      return
    }
    const { error } = await supabase.from('operations').update(input).eq('id', id)
    if (error) throw error
  },

  async deleteOperation(id: string): Promise<void> {
    if (!supabase) {
      localStore.deleteOperation(id)
      return
    }
    const { error } = await supabase.from('operations').delete().eq('id', id)
    if (error) throw error
  },

  async restoreOperation(op: Operation): Promise<void> {
    if (!supabase) {
      localStore.restoreOperation(op)
      return
    }
    const { data: user } = await supabase.auth.getUser()
    const { error } = await supabase.from('operations').insert({
      id: op.id,
      type: op.type,
      amount: op.amount,
      category_id: op.category_id,
      note: op.note,
      date: op.date,
      created_at: op.created_at,
      user_id: user.user!.id
    })
    if (error) throw error
  },

  async getProfile(): Promise<{ email: string | null; createdAt: string | null }> {
    if (!supabase) return { email: null, createdAt: null }
    const { data } = await supabase.auth.getUser()
    return { email: data.user?.email ?? null, createdAt: data.user?.created_at ?? null }
  },

  async changePassword(password: string): Promise<void> {
    if (!supabase) throw new Error('Доступно только в облачном режиме')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw new Error(translateError(error.message))
  },

  async listStashes(): Promise<Stash[]> {
    if (!supabase) return localStore.ensureSafe().map(normalizeStash)
    const { data, error } = await supabase.from('stashes').select('*').order('created_at')
    if (error) throw error
    return ((data ?? []) as Stash[]).map(normalizeStash)
  },

  async ensureSafe(): Promise<void> {
    if (!supabase) {
      localStore.ensureSafe()
      return
    }
    const { count } = await supabase
      .from('stashes')
      .select('id', { count: 'exact', head: true })
      .eq('kind', 'safe')
    if (count && count > 0) return
    const { data } = await supabase.auth.getUser()
    const userId = data.user?.id
    if (!userId) return
    await supabase.from('stashes').insert({ user_id: userId, kind: 'safe', icon: '🔐', color: '#ffd60a' })
  },

  async createStash(input: StashInput): Promise<Stash> {
    if (!supabase) return localStore.createStash(input)
    const { data: user } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('stashes')
      .insert({ ...input, user_id: user.user!.id })
      .select()
      .single()
    if (error) throw error
    return data as Stash
  },

  async updateStash(id: string, input: Partial<StashInput>): Promise<void> {
    if (!supabase) {
      localStore.updateStash(id, input)
      return
    }
    const { error } = await supabase.from('stashes').update(input).eq('id', id)
    if (error) throw error
  },

  async deleteStash(id: string): Promise<void> {
    if (!supabase) {
      localStore.deleteStash(id)
      return
    }
    const { error } = await supabase.from('stashes').delete().eq('id', id)
    if (error) throw error
  },

  async listStashMoves(): Promise<StashMove[]> {
    if (!supabase) return localStore.listStashMoves()
    const { data, error } = await supabase
      .from('stash_moves')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as StashMove[]
  },

  async addStashMove(input: StashMoveInput): Promise<StashMove> {
    if (!supabase) return localStore.addStashMove(input)
    const { data: user } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('stash_moves')
      .insert({ ...input, user_id: user.user!.id })
      .select()
      .single()
    if (error) throw error
    return data as StashMove
  },

  resetLocalData(): void {
    localStore.resetAll()
  }
}
