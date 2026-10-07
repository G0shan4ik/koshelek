import { FormEvent, useState } from 'react'
import { useApp } from '../context/AppContext'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../lib/defaults'
import { formatMoney } from '../lib/format'
import { Stash } from '../lib/types'

export function PiggyModal({ piggy, onClose }: { piggy: Stash | null; onClose: () => void }) {
  const { createStash, updateStash, deleteStash, closePiggy, stashMoves, settings } = useApp()
  const [name, setName] = useState(piggy?.name ?? '')
  const [goal, setGoal] = useState(piggy?.goal ? String(piggy.goal).replace('.', ',') : '')
  const [icon, setIcon] = useState(piggy?.icon ?? '🐷')
  const [color, setColor] = useState(piggy?.color ?? CATEGORY_COLORS[3])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const moveCount = piggy ? stashMoves.filter(m => m.stash_id === piggy.id).length : 0

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Введи название копилки')
      return
    }
    const goalValue = goal.trim() === '' ? null : Number(goal.replace(',', '.'))
    if (goalValue !== null && (!Number.isFinite(goalValue) || goalValue <= 0)) {
      setError('Потолок должен быть числом больше нуля или пустым')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const input = {
        kind: 'piggy' as const,
        name: name.trim(),
        goal: goalValue,
        icon: icon || '🐷',
        color,
        status: 'open' as const,
        closed_reason: null,
        closed_at: null
      }
      if (piggy) await updateStash(piggy.id, input)
      else await createStash(input)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!piggy) return
    const msg =
      moveCount > 0
        ? `Удалить копилку «${piggy.name}» вместе с историей (${moveCount} движений)? Деньги вернутся в оборот.`
        : `Удалить копилку «${piggy.name}»?`
    if (!window.confirm(msg)) return
    setBusy(true)
    try {
      await deleteStash(piggy.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
      setBusy(false)
    }
  }

  const balance = piggy
    ? stashMoves.filter(m => m.stash_id === piggy.id).reduce((s, m) => s + (m.type === 'in' ? m.amount : -m.amount), 0)
    : 0

  const close = async (reason: 'return' | 'spent') => {
    if (!piggy) return
    const msg =
      reason === 'return'
        ? `Вернуть ${formatMoney(balance, settings.currency)} в баланс и закрыть копилку «${piggy.name}»?`
        : `Разбить копилку «${piggy.name}»? ${formatMoney(balance, settings.currency)} будут списаны как расход по назначению.`
    if (!window.confirm(msg)) return
    setBusy(true)
    try {
      await closePiggy(piggy.id, reason)
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
          <h2>{piggy ? 'Копилка' : 'Новая копилка'}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <form onSubmit={submit}>
          <label className="field-label">Название</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} maxLength={40} autoFocus />

          <label className="field-label">Потолок (необязательно)</label>
          <input
            className="input"
            inputMode="decimal"
            placeholder="Без потолка"
            value={goal}
            onChange={e => setGoal(e.target.value.replace(/[^\d.,]/g, '').slice(0, 15))}
          />

          <label className="field-label">Иконка</label>
          <div className="icon-grid">
            {CATEGORY_ICONS.map(i => (
              <button type="button" key={i} className={'icon-cell' + (icon === i ? ' active' : '')} onClick={() => setIcon(i)}>
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

          {piggy && (
            <>
              <label className="field-label">Закрыть копилку</label>
              <div className="btn-col">
                <button type="button" className="btn btn-secondary" onClick={() => close('return')} disabled={busy}>
                  ↩️ Вернуть в баланс
                </button>
                <button type="button" className="btn btn-danger" onClick={() => close('spent')} disabled={busy}>
                  💥 Разбить копилку
                </button>
              </div>
            </>
          )}

          {error && <div className="error">{error}</div>}

          <div className="sheet-actions">
            {piggy && (
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
