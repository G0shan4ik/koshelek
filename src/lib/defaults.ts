import { Category } from './types'

export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

interface Preset {
  name: string
  icon: string
  color: string
  type: 'income' | 'expense'
}

const PRESETS: Preset[] = [
  { name: 'Продукты', icon: '🛒', color: '#4cd964', type: 'expense' },
  { name: 'Кафе и рестораны', icon: '🍔', color: '#ff9500', type: 'expense' },
  { name: 'Транспорт', icon: '🚌', color: '#5ac8fa', type: 'expense' },
  { name: 'Жильё', icon: '🏠', color: '#ff2d55', type: 'expense' },
  { name: 'Связь и интернет', icon: '📱', color: '#af52de', type: 'expense' },
  { name: 'Развлечения', icon: '🎮', color: '#ff375f', type: 'expense' },
  { name: 'Здоровье', icon: '💊', color: '#30d158', type: 'expense' },
  { name: 'Одежда', icon: '👕', color: '#bf5af2', type: 'expense' },
  { name: 'Подписки', icon: '📺', color: '#64d2ff', type: 'expense' },
  { name: 'Образование', icon: '📚', color: '#ffd60a', type: 'expense' },
  { name: 'Прочие расходы', icon: '📦', color: '#98989d', type: 'expense' },
  { name: 'Зарплата', icon: '💼', color: '#34c759', type: 'income' },
  { name: 'Фриланс', icon: '💻', color: '#0a84ff', type: 'income' },
  { name: 'Подарки', icon: '🎁', color: '#ff375f', type: 'income' },
  { name: 'Инвестиции', icon: '📈', color: '#66d19e', type: 'income' },
  { name: 'Прочие доходы', icon: '💰', color: '#ffd60a', type: 'income' }
]

export function defaultCategories(): Category[] {
  return PRESETS.map(p => ({ id: uid(), name: p.name, icon: p.icon, color: p.color, type: p.type }))
}

export const CATEGORY_ICONS = [
  '🛒', '🍔', '🚌', '🏠', '📱', '🎮', '💊', '👕', '📺', '📚',
  '📦', '💼', '💻', '🎁', '📈', '💰', '⛽', '✈️', '🐾', '💇',
  '🏋️', '🎬', '🎵', '☕', '🚗', '🔧', '👶', '🏦', '💸', '🎓'
]

export const CATEGORY_COLORS = [
  '#ff453a', '#ff9f0a', '#ffd60a', '#30d158', '#34c759', '#4cd964',
  '#64d2ff', '#5ac8fa', '#0a84ff', '#40c8e0', '#bf5af2', '#af52de',
  '#ff375f', '#ff2d55', '#ac8e68', '#98989d'
]
