import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'
import { api, cloudEnabled } from '../lib/api'
import { localStore } from '../lib/localStore'
import {
  Category,
  CategoryInput,
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
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  changePassword: (password: string) => Promise<void>
  addOperation: (input: OperationInput) => Promise<void>
  updateOperation: (id: string, input: OperationInput) => Promise<void>
  deleteOperation: (id: string) => Promise<void>
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
  importLocalData: (categories: Category[], operations: Operation[]) => void
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
      if (raw) return { currency: 'RUB', ...(JSON.parse(raw) as Partial<Settings>) }
    } catch {
      return { currency: 'RUB' }
    }
    return { currency: 'RUB' }
  })

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
      const [ops, cats, sts, mvs] = await Promise.all([
        api.listOperations(),
        api.listCategories(),
        api.listStashes(),
        api.listStashMoves()
      ])
      setOperations(ops)
      setCategories(cats)
      setStashes(sts)
      setStashMoves(mvs)
      setOffline(false)
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

  const addOperation = async (input: OperationInput): Promise<void> => {
    const op = await api.addOperation(input)
    setOperations(prev => sortByDateDesc([op, ...prev]))
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

  const deleteOperation = async (id: string): Promise<void> => {
    await api.deleteOperation(id)
    setOperations(prev => prev.filter(o => o.id !== id))
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
      await addStashMove({
        stash_id: id,
        type: 'out',
        amount: Math.round(bal * 100) / 100,
        note: reason === 'return' ? 'Возврат в баланс' : 'Копилка разбита',
        date
      })
      if (reason === 'spent') {
        await addOperation({
          type: 'expense',
          amount: Math.round(bal * 100) / 100,
          category_id: null,
          note: `💥 Копилка: ${piggy.name ?? ''}`.trim(),
          date
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

  const resetLocalData = (): void => {
    api.resetLocalData()
    setCategories(localStore.listCategories())
    setOperations(localStore.listOperations())
    setStashes(localStore.ensureSafe())
    setStashMoves(localStore.listStashMoves())
  }

  const importLocalData = (cats: Category[], ops: Operation[]): void => {
    localStore.resetAll()
    const catMap = new Map(cats.map(c => [c.id, c]))
    const storedOps: Operation[] = ops.map(o => ({ ...o, category: null }))
    localStorage.setItem('koshelok:categories', JSON.stringify(cats))
    localStorage.setItem('koshelok:operations', JSON.stringify(storedOps))
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
    signIn,
    signUp,
    signOut,
    changePassword,
    addOperation,
    updateOperation,
    deleteOperation,
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
