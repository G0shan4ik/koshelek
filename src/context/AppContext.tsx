import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'
import { api, cloudEnabled } from '../lib/api'
import { localStore } from '../lib/localStore'
import { Category, CategoryInput, Operation, OperationInput, Settings } from '../lib/types'
import { sortByDateDesc } from '../lib/stats'

const SETTINGS_KEY = 'koshelok:settings'

function cacheKey(userId: string): string {
  return `koshelok:cache:${userId}`
}

interface AppContextValue {
  mode: 'cloud' | 'local'
  authLoading: boolean
  userId: string | null
  email: string | null
  operations: Operation[]
  categories: Category[]
  dataLoading: boolean
  offline: boolean
  settings: Settings
  setCurrency: (currency: string) => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  addOperation: (input: OperationInput) => Promise<void>
  updateOperation: (id: string, input: OperationInput) => Promise<void>
  deleteOperation: (id: string) => Promise<void>
  addCategory: (input: CategoryInput) => Promise<void>
  updateCategory: (id: string, input: CategoryInput) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  refresh: () => Promise<void>
  resetLocalData: () => void
  importLocalData: (categories: Category[], operations: Operation[]) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const mode: 'cloud' | 'local' = cloudEnabled ? 'cloud' : 'local'
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [operations, setOperations] = useState<Operation[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      if (raw) return { currency: 'RUB', ...(JSON.parse(raw) as Partial<Settings>) }
    } catch {
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
        setDataLoading(false)
      }
    })
    return unsub
  }, [])

  const loadData = useCallback(async () => {
    if (!userId) return
    setDataLoading(true)
    try {
      await api.ensureDefaultCategories()
      const [ops, cats] = await Promise.all([api.listOperations(), api.listCategories()])
      setOperations(ops)
      setCategories(cats)
      setOffline(false)
    } catch {
      try {
        const raw = localStorage.getItem(cacheKey(userId))
        if (raw) {
          const cache = JSON.parse(raw) as { operations: Operation[]; categories: Category[] }
          setOperations(cache.operations ?? [])
          setCategories(cache.categories ?? [])
          setOffline(true)
        }
      } catch {
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
      localStorage.setItem(cacheKey(userId), JSON.stringify({ operations, categories }))
    } catch {
    }
  }, [operations, categories, userId, offline])

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
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

  const addOperation = async (input: OperationInput): Promise<void> => {
    const op = await api.addOperation(input)
    setOperations(prev => sortByDateDesc([op, ...prev]))
  }

  const updateOperation = async (id: string, input: OperationInput): Promise<void> => {
    await api.updateOperation(id, input)
    setOperations(prev =>
      sortByDateDesc(
        prev.map(o =>
          o.id === id
            ? { ...o, ...input, category: categories.find(c => c.id === input.category_id) ?? null }
            : o
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
    setOperations(prev => prev.map(o => (o.category_id === id ? { ...o, category_id: null, category: null } : o)))
  }

  const setCurrency = (currency: string): void => {
    setSettings(prev => ({ ...prev, currency }))
  }

  const resetLocalData = (): void => {
    api.resetLocalData()
    setOperations([])
    setCategories(localStore.listCategories())
    setOperations(localStore.listOperations())
  }

  const importLocalData = (cats: Category[], ops: Operation[]): void => {
    localStore.resetAll()
    const catMap = new Map(cats.map(c => [c.id, c]))
    const storedOps: Operation[] = ops.map(o => ({ ...o, category: null }))
    localStorage.setItem('koshelok:categories', JSON.stringify(cats))
    localStorage.setItem('koshelok:operations', JSON.stringify(storedOps))
    setCategories(cats)
    setOperations(storedOps.map(o => ({ ...o, category: catMap.get(o.category_id ?? '') ?? null })))
  }

  const value: AppContextValue = {
    mode,
    authLoading,
    userId,
    email,
    operations,
    categories,
    dataLoading,
    offline,
    settings,
    setCurrency,
    signIn,
    signUp,
    signOut,
    addOperation,
    updateOperation,
    deleteOperation,
    addCategory,
    updateCategory,
    deleteCategory,
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
