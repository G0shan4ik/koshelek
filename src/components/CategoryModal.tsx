import { FormEvent, useState } from 'react'
import { useApp } from '../context/AppContext'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../lib/defaults'
import { Category, OperationType } from '../lib/types'

export function CategoryModal({ category, onClose }: { category: Category | null; onClose: () => void }) {
  const { addCategory, updateCategory, deleteCategory, operations } = useApp()
  const [name, setName] = useState(category?.name ?? '')
  const [icon, setIcon] = useState(category?.icon ?? CATEGORY_ICONS[0])
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0])
  const [type, setType] = useState<OperationType>(category?.type ?? 'expense')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const usageCount = category ? operations.filter(o => o.category_id === category.id).length : 0

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Введи название')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const input = { name: name.trim(), icon: icon || '💰', color, type }
      if (category) await updateCategory(category.id, input)
      else await addCategory(input)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!category) return
    const msg =
      usageCount > 0
        ? `Удалить категорию «${category.name}»? ${usageCount} операций останутся без категории.`
        : `Удалить категорию «${category.name}»?`
    if (!window.confirm(msg)) return
    setBusy(true)
    try {
      await deleteCategory(category.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{category ? 'Категория' : 'Новая категория'}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <form onSubmit={submit}>
          {!category && (
            <div className="type-toggle">
              <button
                type="button"
                className={type === 'expense' ? 'active expense-active' : ''}
                onClick={() => setType('expense')}
              >
                Расход
              </button>
              <button
                type="button"
                className={type === 'income' ? 'active income-active' : ''}
                onClick={() => setType('income')}
              >
                Доход
              </button>
            </div>
          )}

          <label className="field-label">Название</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} maxLength={40} autoFocus />

          <label className="field-label">Иконка</label>
          <div className="icon-grid">
            {CATEGORY_ICONS.map(i => (
              <button
                type="button"
                key={i}
                className={'icon-cell' + (icon === i ? ' active' : '')}
                onClick={() => setIcon(i)}
              >
                {i}
              </button>
            ))}
          </div>

          <label className="field-label">Цвет</label>
          <div className="color-grid">
            {CATEGORY_COLORS.map(c => (
              <button
                type="button"
                key={c}
                className={'color-cell' + (color === c ? ' active' : '')}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={c}
              />
            ))}
          </div>

          {error && <div className="error">{error}</div>}

          <div className="sheet-actions">
            {category && (
              <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>
                Удалить
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Сохраняю…' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
