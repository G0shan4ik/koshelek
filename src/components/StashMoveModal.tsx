import { FormEvent, useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatMoney, todayISO } from '../lib/format'
import { stashBalance } from '../lib/stats'
import { Stash } from '../lib/types'

interface Props {
  stash: Stash
  initialType: 'in' | 'out'
  onClose: () => void
}

export function StashMoveModal({ stash, initialType, onClose }: Props) {
  const { stashMoves, addStashMove, settings } = useApp()
  const [type, setType] = useState<'in' | 'out'>(initialType)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const balance = stashBalance(stashMoves, stash.id)
  const title = stash.kind === 'safe' ? 'Сейф' : stash.name ?? 'Копилка'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const value = Number(amount.replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) {
      setError('Введи сумму больше нуля')
      return
    }
    if (type === 'out' && value > balance) {
      setError(`Недостаточно средств: доступно ${formatMoney(balance, settings.currency)}`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await addStashMove({
        stash_id: stash.id,
        type,
        amount: Math.round(value * 100) / 100,
        note: note.trim() || null,
        date: todayISO(),
        operation_id: null
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>
            {stash.icon} {title}
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="type-toggle">
            <button type="button" className={type === 'in' ? 'active income-active' : ''} onClick={() => setType('in')}>
              Внести
            </button>
            <button type="button" className={type === 'out' ? 'active expense-active' : ''} onClick={() => setType('out')}>
              Достать
            </button>
          </div>

          <div className="amount-field">
            <input
              className="amount-input"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^\d.,]/g, '').slice(0, 15))}
              autoFocus
            />
          </div>

          <label className="field-label">Заметка</label>
          <input
            className="input"
            placeholder="Например: на отпуск"
            value={note}
            onChange={e => setNote(e.target.value)}
            maxLength={200}
          />

          <p className="muted small stash-hint">Сейчас в сейфе/копилке: {formatMoney(balance, settings.currency)}</p>

          {error && <div className="error">{error}</div>}

          <div className="sheet-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Сохраняю…' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
