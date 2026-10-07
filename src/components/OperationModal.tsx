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
  const [sideAmounts, setSideAmounts] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const cats = categories.filter(c => c.type === type)
  const safe = stashes.find(s => s.kind === 'safe')
  const piggies = stashes.filter(s => s.kind === 'piggy' && (s.status ?? 'open') === 'open')

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
    const piggyEntries = piggies.map(p => ({ piggy: p, val: parseSide(sideAmounts[p.id] ?? '') }))
    const sideTotal = safeVal + piggyEntries.reduce((s, e) => s + e.val, 0)
    if (!Number.isFinite(safeVal) || safeVal < 0 || piggyEntries.some(e => !Number.isFinite(e.val) || e.val < 0)) {
      setError('Некорректная сумма отложения')
      return
    }
    if (!operation && type === 'income' && sideTotal > value) {
      setError('Отложить можно не больше суммы дохода')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const parts: string[] = []
      if (!operation && type === 'income' && safe && safeVal > 0) parts.push(`${safeVal} в сейф`)
      if (!operation && type === 'income') {
        for (const e of piggyEntries) {
          if (e.val > 0) parts.push(`${e.val} в копилку «${e.piggy.name}»`)
        }
      }
      const fullNote = [note.trim(), parts.length > 0 ? `из них ${parts.join(', ')}` : '']
        .filter(Boolean)
        .join(' · ')
      const input = {
        type,
        amount: Math.round(value * 100) / 100,
        category_id: categoryId,
        note: fullNote || null,
        date
      }
      if (operation) {
        await updateOperation(operation.id, input)
      } else {
        const created = await addOperation(input)
        if (safe && safeVal > 0) {
          await addStashMove({
            stash_id: safe.id,
            type: 'in',
            amount: Math.round(safeVal * 100) / 100,
            note: 'С дохода',
            date,
            operation_id: created.id
          })
        }
        for (const e of piggyEntries) {
          if (e.val > 0) {
            await addStashMove({
              stash_id: e.piggy.id,
              type: 'in',
              amount: Math.round(e.val * 100) / 100,
              note: 'С дохода',
              date,
              operation_id: created.id
            })
          }
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
                {piggies.map(p => (
                  <div className="setaside-row" key={p.id}>
                    <span className="op-icon" style={{ background: p.color + '26' }}>
                      {p.icon}
                    </span>
                    <span className="setaside-name">{p.name}</span>
                    <input
                      className="input setaside-input"
                      inputMode="decimal"
                      placeholder="0"
                      value={sideAmounts[p.id] ?? ''}
                      onChange={e =>
                        setSideAmounts(prev => ({
                          ...prev,
                          [p.id]: e.target.value.replace(/[^\d.,]/g, '').slice(0, 15)
                        }))
                      }
                    />
                  </div>
                ))}
                {piggies.length === 0 && (
                  <span className="setaside-hint muted small">
                    копилок пока нет — создать можно во вкладке «Копилка»
                  </span>
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
