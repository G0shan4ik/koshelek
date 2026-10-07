import { FormEvent, useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatMoney, formatOrig, todayISO } from '../lib/format'
import { stashBalance } from '../lib/stats'
import { Stash } from '../lib/types'

interface Props {
  stash: Stash
  initialType: 'in' | 'out'
  onClose: () => void
}

export function StashMoveModal({ stash, initialType, onClose }: Props) {
  const { stashMoves, addStashMove, settings, rateFor } = useApp()
  const [type, setType] = useState<'in' | 'out'>(initialType)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [currency, setCurrency] = useState(settings.currency)
  const [rateStr, setRateStr] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const balance = stashBalance(stashMoves, stash.id)
  const title = stash.kind === 'safe' ? 'Сейф' : stash.name ?? 'Копилка'
  const entered = Number(amount.replace(',', '.'))
  const isForeign = currency !== settings.currency
  const heldOrig =
    stash.kind === 'safe'
      ? stashMoves
          .filter(m => m.stash_id === stash.id && m.currency === currency)
          .reduce((s, m) => s + (m.type === 'in' ? m.amount_orig : -m.amount_orig), 0)
      : null
  const currencyOptions = [settings.currency, ...settings.currencies]

  useEffect(() => {
    if (currency === settings.currency) {
      setRateStr('')
      return
    }
    const auto = rateFor(currency)
    setRateStr(auto !== null ? String(auto).replace('.', ',') : '')
  }, [currency, settings.currency, rateFor])

  const parsedRate = (): number => {
    if (!isForeign) return 1
    const r = Number(rateStr.replace(',', '.'))
    return Number.isFinite(r) && r > 0 ? r : NaN
  }

  const fxHint = (code: string): string => {
    const r = rateFor(code)
    return r !== null ? String(r).replace('.', ',') : 'курс'
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const value = Number(amount.replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) {
      setError('Введи сумму больше нуля')
      return
    }
    const rate = parsedRate()
    if (isForeign && !Number.isFinite(rate)) {
      setError('Укажи курс больше нуля')
      return
    }
    const baseValue = Math.round(value * (Number.isFinite(rate) ? rate : 1) * 100) / 100
    if (type === 'out' && heldOrig !== null && value > heldOrig + 0.004) {
      setError(`В сейфе этой валютой только ${formatOrig(Math.max(heldOrig, 0), currency)}`)
      return
    }
    if (type === 'out' && heldOrig === null && baseValue > balance) {
      setError(`Недостаточно средств: доступно ${formatMoney(balance, settings.currency)}`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await addStashMove({
        stash_id: stash.id,
        type,
        amount: baseValue,
        note: note.trim() || null,
        date: todayISO(),
        operation_id: null,
        currency,
        amount_orig: Math.round(value * 100) / 100,
        rate: Number.isFinite(rate) ? rate : 1
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

          {currencyOptions.length > 1 && (
            <>
              <label className="field-label">Валюта</label>
              <select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
                {currencyOptions.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </>
          )}

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

          {isForeign && (
            <div className="rate-block">
              <label className="field-label">Курс, {settings.currency} за 1 {currency}</label>
              <input
                className="input"
                inputMode="decimal"
                placeholder={fxHint(currency)}
                value={rateStr}
                onChange={e => setRateStr(e.target.value.replace(/[^\d.,]/g, '').slice(0, 15))}
              />
              {entered > 0 && Number.isFinite(parsedRate()) && (
                <p className="muted small rate-preview">
                  ≈ {formatMoney(Math.round(entered * parsedRate() * 100) / 100, settings.currency)}
                </p>
              )}
            </div>
          )}

          <label className="field-label">Заметка</label>
          <input
            className="input"
            placeholder="Например: на отпуск"
            value={note}
            onChange={e => setNote(e.target.value)}
            maxLength={200}
          />

          <p className="muted small stash-hint">
            {heldOrig !== null
              ? `Сейчас в сейфе этой валютой: ${formatOrig(heldOrig, currency)}`
              : `Сейчас в копилке: ${formatMoney(balance, settings.currency)}`}
          </p>

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
