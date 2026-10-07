import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { api, cloudEnabled, fetchFxRates, readFxCache } from '../lib/api'
import { localStore } from '../lib/localStore'
import {
  Category,
  CategoryInput,
  ManualRate,
  Operation,
  OperationInput,
  Settings,
  Stash,
  StashInput,
  StashMove,
  StashMoveInput
} from '../lib/types'
import { sortByDateDesc } from '../lib/stats'
import { todayISO } from '../lib/format'

const SETTINGS_KEY = 'koshelok:settings'

function cacheKey(userId: string): string {
  return `koshelok:cache:${userId}`
}

interface Profile {
  email: string | null
  createdAt: string | null
}

interface AppContextValue {
  mode: 'cloud' | 'local'
  authLoading: boolean
  userId: string | null
  email: string | null
  profile: Profile | null
  operations: Operation[]
  categories: Category[]
  stashes: Stash[]
  stashMoves: StashMove[]
  dataLoading: boolean
  offline: boolean
  settings: Settings
  setCurrency: (currency: string) => void
  fx: Record<string, number>
  manualRates: ManualRate[]
  rateFor: (code: string) => number | null
  addCurrency: (code: string) => void
  removeCurrency: (code: string) => void
  overrideRate: (code: string, rate: number | null) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  changePassword: (password: string) => Promise<void>
  addOperation: (input: OperationInput) => Promise<Operation>
  updateOperation: (id: string, input: OperationInput) => Promise<void>
  deleteOperation: (id: string) => Promise<void>
  pendingDelete: { op: Operation; moves: StashMove[] } | null
  undoDelete: () => Promise<void>
  addCategory: (input: CategoryInput) => Promise<void>
  updateCategory: (id: string, input: CategoryInput) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  createStash: (input: StashInput) => Promise<void>
  updateStash: (id: string, input: Partial<StashInput>) => Promise<void>
  deleteStash: (id: string) => Promise<void>
  closePiggy: (id: string, reason: 'return' | 'spent') => Promise<void>
  addStashMove: (input: StashMoveInput) => Promise<void>
  refresh: () => Promise<void>
  resetLocalData: () => void
  importLocalData: (
    categories: Category[],
    operations: Operation[],
    stashes?: Stash[],
    moves?: StashMove[]
  ) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const mode: 'cloud' | 'local' = cloudEnabled ? 'cloud' : 'local'
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [operations, setOperations] = useState<Operation[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [stashes, setStashes] = useState<Stash[]>([])
  const [stashMoves, setStashMoves] = useState<StashMove[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      if (raw) return { currency: 'RUB', currencies: [], ...(JSON.parse(raw) as Partial<Settings>) }
    } catch {
      return { currency: 'RUB', currencies: [] }
    }
    return { currency: 'RUB', currencies: [] }
  })
  const [fx, setFx] = useState<Record<string, number>>(() => readFxCache()?.rates ?? {})
  const [manualRates, setManualRates] = useState<ManualRate[]>([])

  useEffect(() => {
    const unsub = api.onAuthChange((id, em) => {
      setUserId(id)
      setEmail(em)
      setAuthLoading(false)
      if (!id) {
        setOperations([])
        setCategories([])
        setStashes([])
        setStashMoves([])
        setProfile(null)
        setPendingDelete(null)
        setDataLoading(false)
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!userId || mode === 'local') {
      setProfile({ email: null, createdAt: null })
      return
    }
    let mounted = true
    api.getProfile().then(p => {
      if (mounted) setProfile(p)
    })
    return () => {
      mounted = false
    }
  }, [userId, mode])

  const loadData = useCallback(async () => {
    if (!userId) return
    setDataLoading(true)
    try {
      await api.ensureDefaultCategories()
      await api.ensureSafe()
      const [ops, cats, sts, mvs, rates] = await Promise.all([
        api.listOperations(),
        api.listCategories(),
        api.listStashes(),
        api.listStashMoves(),
        api.listRates()
      ])
      setOperations(ops)
      setCategories(cats)
      setStashes(sts)
      setStashMoves(mvs)
      setManualRates(rates)
      setOffline(false)
      try {
        const fresh = await fetchFxRates()
        setFx(fresh.rates)
      } catch {
        setFx(readFxCache()?.rates ?? {})
      }
    } catch {
      try {
        const raw = localStorage.getItem(cacheKey(userId))
        if (raw) {
          const cache = JSON.parse(raw) as {
            operations: Operation[]
            categories: Category[]
            stashes: Stash[]
            stashMoves: StashMove[]
          }
          setOperations(cache.operations ?? [])
          setCategories(cache.categories ?? [])
          setStashes(cache.stashes ?? [])
          setStashMoves(cache.stashMoves ?? [])
          setOffline(true)
        }
      } catch {
        return
      }
    } finally {
      setDataLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!userId || offline) return
    try {
      localStorage.setItem(cacheKey(userId), JSON.stringify({ operations, categories, stashes, stashMoves }))
    } catch {
      return
    }
  }, [operations, categories, stashes, stashMoves, userId, offline])

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      return
    }
  }, [settings])

  const signIn = async (em: string, pass: string): Promise<void> => {
    await api.signIn(em, pass)
  }

  const signUp = async (em: string, pass: string): Promise<string | null> => {
    const needsConfirm = await api.signUp(em, pass)
    return needsConfirm ? 'Аккаунт создан. Проверь почту и подтверди email, затем войди.' : null
  }

  const signOut = async (): Promise<void> => {
    await api.signOut()
    setOffline(false)
  }

  const changePassword = async (password: string): Promise<void> => {
    await api.changePassword(password)
  }

  const addOperation = async (input: OperationInput): Promise<Operation> => {
    const op = await api.addOperation(input)
    setOperations(prev => sortByDateDesc([op, ...prev]))
    return op
  }

  const updateOperation = async (id: string, input: OperationInput): Promise<void> => {
    await api.updateOperation(id, input)
    setOperations(prev =>
      sortByDateDesc(
        prev.map(o =>
          o.id === id ? { ...o, ...input, category: categories.find(c => c.id === input.category_id) ?? null } : o
        )
      )
    )
  }

  const [pendingDelete, setPendingDelete] = useState<{ op: Operation; moves: StashMove[] } | null>(null)
  const deleteTimer = useRef<number | null>(null)

  const clearDeleteTimer = () => {
    if (deleteTimer.current !== null) {
      window.clearTimeout(deleteTimer.current)
      deleteTimer.current = null
    }
  }

  const deleteOperation = async (id: string): Promise<void> => {
    const op = operations.find(o => o.id === id)
    if (!op) return
    const linkedMoves = stashMoves.filter(m => m.operation_id === id)
    await api.deleteOperation(id)
    setOperations(prev => prev.filter(o => o.id !== id))
    setStashMoves(prev => prev.filter(m => m.operation_id !== id))
    clearDeleteTimer()
    setPendingDelete({ op, moves: linkedMoves })
    deleteTimer.current = window.setTimeout(() => setPendingDelete(null), 8000)
  }

  const undoDelete = async (): Promise<void> => {
    const pending = pendingDelete
    if (!pending) return
    clearDeleteTimer()
    setPendingDelete(null)
    await api.restoreOperation(pending.op, pending.moves)
    setOperations(prev => sortByDateDesc([pending.op, ...prev]))
    setStashMoves(prev => sortByDateDesc([...pending.moves, ...prev]))
  }

  const addCategory = async (input: CategoryInput): Promise<void> => {
    const cat = await api.addCategory(input)
    setCategories(prev => [...prev, cat])
  }

  const updateCategory = async (id: string, input: CategoryInput): Promise<void> => {
    await api.updateCategory(id, input)
    setCategories(prev => prev.map(c => (c.id === id ? { ...c, ...input } : c)))
  }

  const deleteCategory = async (id: string): Promise<void> => {
    await api.deleteCategory(id)
    setCategories(prev => prev.filter(c => c.id !== id))
    setOperations(prev =>
      prev.map(o => (o.category_id === id ? { ...o, category_id: null, category: null } : o))
    )
  }

  const createStash = async (input: StashInput): Promise<void> => {
    const stash = await api.createStash(input)
    setStashes(prev => [...prev, stash])
  }

  const updateStash = async (id: string, input: Partial<StashInput>): Promise<void> => {
    await api.updateStash(id, input)
    setStashes(prev => prev.map(s => (s.id === id ? { ...s, ...input } : s)))
  }

  const deleteStash = async (id: string): Promise<void> => {
    await api.deleteStash(id)
    setStashes(prev => prev.filter(s => s.id !== id))
    setStashMoves(prev => prev.filter(m => m.stash_id !== id))
  }

  const addStashMove = async (input: StashMoveInput): Promise<void> => {
    const move = await api.addStashMove(input)
    setStashMoves(prev => sortByDateDesc([move, ...prev]))
  }

  const closePiggy = async (id: string, reason: 'return' | 'spent'): Promise<void> => {
    const piggy = stashes.find(s => s.id === id)
    if (!piggy) return
    const bal = stashMoves
      .filter(m => m.stash_id === id)
      .reduce((s, m) => s + (m.type === 'in' ? m.amount : -m.amount), 0)
    const date = todayISO()
    if (bal > 0) {
      const balRounded = Math.round(bal * 100) / 100
      await addStashMove({
        stash_id: id,
        type: 'out',
        amount: balRounded,
        note: reason === 'return' ? 'Возврат в баланс' : 'Копилка разбита',
        date,
        operation_id: null,
        currency: settings.currency,
        amount_orig: balRounded,
        rate: 1
      })
      if (reason === 'spent') {
        await addOperation({
          type: 'expense',
          amount: balRounded,
          category_id: null,
          note: `💥 Копилка: ${piggy.name ?? ''}`.trim(),
          date,
          currency: settings.currency,
          amount_orig: balRounded,
          rate: 1
        })
      }
    }
    await updateStash(id, {
      status: 'closed',
      closed_reason: reason,
      closed_at: new Date().toISOString()
    })
  }

  const setCurrency = (currency: string): void => {
    setSettings(prev => ({ ...prev, currency }))
  }

  const rateFor = (code: string): number | null => {
    if (code === settings.currency) return 1
    const manual = manualRates.find(r => r.code === code)
    if (manual) return manual.rate
    return fx[code] ?? null
  }

  const addCurrency = (code: string): void => {
    const upper = code.trim().toUpperCase()
    if (!upper || upper === settings.currency) return
    setSettings(prev =>
      prev.currencies.includes(upper) ? prev : { ...prev, currencies: [...prev.currencies, upper] }
    )
  }

  const removeCurrency = (code: string): void => {
    setSettings(prev => ({ ...prev, currencies: prev.currencies.filter(c => c !== code) }))
  }

  const overrideRate = async (code: string, rate: number | null): Promise<void> => {
    await api.upsertRate(code, rate)
    setManualRates(prev =>
      rate === null ? prev.filter(r => r.code !== code) : [...prev.filter(r => r.code !== code), { id: code, code, rate }]
    )
  }

  const resetLocalData = (): void => {
    api.resetLocalData()
    setCategories(localStore.listCategories())
    setOperations(localStore.listOperations())
    setStashes(localStore.ensureSafe())
    setStashMoves(localStore.listStashMoves())
  }

  const importLocalData = (
    cats: Category[],
    ops: Operation[],
    sts: Stash[] = [],
    mvs: StashMove[] = []
  ): void => {
    localStore.resetAll()
    const catMap = new Map(cats.map(c => [c.id, c]))
    const storedOps: Operation[] = ops.map(o => ({ ...o, category: null }))
    localStorage.setItem('koshelok:categories', JSON.stringify(cats))
    localStorage.setItem('koshelok:operations', JSON.stringify(storedOps))
    localStorage.setItem('koshelok:stashes', JSON.stringify(sts))
    localStorage.setItem('koshelok:stash-moves', JSON.stringify(mvs))
    setCategories(cats)
    setOperations(storedOps.map(o => ({ ...o, category: catMap.get(o.category_id ?? '') ?? null })))
    setStashes(localStore.ensureSafe())
    setStashMoves(localStore.listStashMoves())
  }

  const value: AppContextValue = {
    mode,
    authLoading,
    userId,
    email,
    profile,
    operations,
    categories,
    stashes,
    stashMoves,
    dataLoading,
    offline,
    settings,
    setCurrency,
    fx,
    manualRates,
    rateFor,
    addCurrency,
    removeCurrency,
    overrideRate,
    signIn,
    signUp,
    signOut,
    changePassword,
    addOperation,
    updateOperation,
    deleteOperation,
    pendingDelete,
    undoDelete,
    addCategory,
    updateCategory,
    deleteCategory,
    createStash,
    updateStash,
    deleteStash,
    closePiggy,
    addStashMove,
    refresh: loadData,
    resetLocalData,
    importLocalData
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
