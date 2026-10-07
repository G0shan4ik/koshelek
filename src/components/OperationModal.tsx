import { FormEvent, useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { todayISO } from '../lib/format'
import { Operation, OperationType } from '../lib/types'

export function OperationModal({ operation, onClose }: { operation: Operation | null; onClose: () => void }) {
  const { categories, addOperation, updateOperation, deleteOperation, stashes, addStashMove } = useApp()
  const [type, setType] = useState<OperationType>(operation?.type ?? 'expense')
  const [amount, setAmount] = useState(operation ? String(operation.amount).replace('.', ',') : '')
  const [categoryId, setCategoryId] = useState<string | null>(operation?.category_id ?? null)
  const [date, setDate] = useState(operation?.date ?? todayISO())
  const [note, setNote] = useState(operation?.note ?? '')
  const [safeAmount, setSafeAmount] = useState('')
  const [piggyId, setPiggyId] = useState<string | null>(null)
  const [piggyAmount, setPiggyAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const cats = categories.filter(c => c.type === type)
  const safe = stashes.find(s => s.kind === 'safe')
  const piggies = stashes.filter(s => s.kind === 'piggy')

  useEffect(() => {
    if (categoryId && !categories.some(c => c.id === categoryId && c.type === type)) {
      setCategoryId(null)
    }
  }, [type, categoryId, categories])

  const parseSide = (s: string): number => (s.trim() === '' ? 0 : Number(s.replace(',', '.')))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const value = Number(amount.replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) {
      setError('Введи сумму больше нуля')
      return
    }
    const safeVal = parseSide(safeAmount)
    const piggyVal = parseSide(piggyAmount)
    if (!Number.isFinite(safeVal) || safeVal < 0 || !Number.isFinite(piggyVal) || piggyVal < 0) {
      setError('Некорректная сумма отложения')
      return
    }
    if (!operation && type === 'income' && safeVal + piggyVal > value) {
      setError('Отложить можно не больше суммы дохода')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const input = {
        type,
        amount: Math.round(value * 100) / 100,
        category_id: categoryId,
        note: note.trim() || null,
        date
      }
      if (operation) {
        await updateOperation(operation.id, input)
      } else {
        await addOperation(input)
        if (safe && safeVal > 0) {
          await addStashMove({
            stash_id: safe.id,
            type: 'in',
            amount: Math.round(safeVal * 100) / 100,
            note: 'С дохода',
            date
          })
        }
        if (piggyId && piggyVal > 0) {
          await addStashMove({
            stash_id: piggyId,
            type: 'in',
            amount: Math.round(piggyVal * 100) / 100,
            note: 'С дохода',
            date
          })
        }
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!operation) return
    if (!window.confirm('Удалить операцию?')) return
    setBusy(true)
    try {
      await deleteOperation(operation.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить')
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{operation ? 'Редактирование' : 'Новая операция'}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <form onSubmit={submit}>
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

          <div className="amount-field">
            <input
              className="amount-input"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^\d.,]/g, '').slice(0, 15))}
              autoFocus={!operation}
            />
          </div>

          {type === 'income' && !operation && (
            <>
              <label className="field-label">Отложить с дохода</label>
              <div className="setaside">
                <div className="setaside-row">
                  <span className="op-icon" style={{ background: (safe?.color ?? '#ffd60a') + '26' }}>
                    {safe?.icon ?? '🔐'}
                  </span>
                  <span className="setaside-name">В сейф</span>
                  <input
                    className="input setaside-input"
                    inputMode="decimal"
                    placeholder="0"
                    value={safeAmount}
                    onChange={e => setSafeAmount(e.target.value.replace(/[^\d.,]/g, '').slice(0, 15))}
                  />
                </div>
                {piggies.length > 0 && (
                  <div className="setaside-row">
                    <select
                      className="input setaside-select"
                      value={piggyId ?? ''}
                      onChange={e => setPiggyId(e.target.value || null)}
                    >
                      <option value="">В копилку…</option>
                      {piggies.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.icon} {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      className="input setaside-input"
                      inputMode="decimal"
                      placeholder="0"
                      value={piggyAmount}
                      onChange={e => setPiggyAmount(e.target.value.replace(/[^\d.,]/g, '').slice(0, 15))}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          <label className="field-label">Категория</label>
          <div className="cat-grid">
            <button
              type="button"
              className={'cat-chip' + (categoryId === null ? ' active' : '')}
              onClick={() => setCategoryId(null)}
            >
              <span className="cat-emoji">❔</span>
              <span>Без категории</span>
            </button>
            {cats.map(c => (
              <button
                type="button"
                key={c.id}
                className={'cat-chip' + (categoryId === c.id ? ' active' : '')}
                style={categoryId === c.id ? { borderColor: c.color, background: c.color + '1f' } : undefined}
                onClick={() => setCategoryId(c.id)}
              >
                <span className="cat-emoji">{c.icon}</span>
                <span>{c.name}</span>
              </button>
            ))}
          </div>

          <label className="field-label">Дата</label>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required />

          <label className="field-label">Заметка</label>
          <input
            className="input"
            placeholder="Например: продукты на неделю"
            value={note}
            onChange={e => setNote(e.target.value)}
            maxLength={200}
          />

          {error && <div className="error">{error}</div>}

          <div className="sheet-actions">
            {operation && (
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
