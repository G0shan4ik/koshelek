import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatDateLong, formatMoney, formatOrig } from '../lib/format'
import { stashBalance } from '../lib/stats'
import { Stash } from '../lib/types'
import { PiggyModal } from './PiggyModal'
import { StashMoveModal } from './StashMoveModal'

export function PiggiesTab() {
  const { stashes, stashMoves, settings, deleteStash } = useApp()
  const cur = settings.currency
  const allPiggies = stashes.filter(s => s.kind === 'piggy')
  const piggies = allPiggies.filter(s => (s.status ?? 'open') === 'open')
  const closed = allPiggies.filter(s => s.status === 'closed')
  const [editing, setEditing] = useState<Stash | 'new' | null>(null)
  const [moving, setMoving] = useState<{ stash: Stash; type: 'in' | 'out' } | null>(null)

  const piggyMoves = stashMoves.filter(m => allPiggies.some(p => p.id === m.stash_id))
  const totalSaved = piggies.reduce((s, p) => s + stashBalance(stashMoves, p.id), 0)

  const removeClosed = async (p: Stash) => {
    if (!window.confirm(`Удалить закрытую копилку «${p.name}» вместе с историей движений?`)) return
    await deleteStash(p.id)
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Копилка</h1>
      </header>

      {piggies.length > 0 && (
        <section className="card balance-card">
          <span className="balance-label">Отложено в копилках</span>
          <span className="balance-value">{formatMoney(totalSaved, cur)}</span>
        </section>
      )}

      {piggies.length === 0 ? (
        <div className="card empty">
          <span>🐷</span>
          <p>Пока нет копилок. Создай первую цель — например, «Ноутбук» или «Отпуск».</p>
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            Новая копилка
          </button>
        </div>
      ) : (
        <>
          {piggies.map(p => {
            const bal = stashBalance(stashMoves, p.id)
            const pct = p.goal && p.goal > 0 ? Math.min(100, Math.round((bal / p.goal) * 100)) : null
            return (
              <section className="card piggy-card" key={p.id}>
                <div className="piggy-head">
                  <span className="op-icon" style={{ background: p.color + '26' }}>
                    {p.icon}
                  </span>
                  <div className="piggy-title">
                    <span className="piggy-name">{p.name}</span>
                    <span className="muted small">
                      {p.goal ? `${formatMoney(bal, cur)} из ${formatMoney(p.goal, cur)}` : formatMoney(bal, cur)}
                    </span>
                  </div>
                  <button className="icon-btn" onClick={() => setEditing(p)} aria-label="Изменить копилку">
                    ✎
                  </button>
                </div>
                {pct !== null && (
                  <>
                    <div className="goal-bar">
                      <div className="goal-fill" style={{ width: pct + '%', background: p.color }} />
                    </div>
                    <div className="muted small goal-pct">
                      {pct}%{bal >= (p.goal ?? 0) ? ' · цель достигнута 🎉' : ''}
                    </div>
                  </>
                )}
                <div className="piggy-actions">
                  <button className="btn btn-secondary" onClick={() => setMoving({ stash: p, type: 'in' })}>
                    Пополнить
                  </button>
                  <button className="btn btn-secondary" onClick={() => setMoving({ stash: p, type: 'out' })}>
                    Снять
                  </button>
                </div>
              </section>
            )
          })}

          <button className="btn btn-primary wide" onClick={() => setEditing('new')}>
            + Новая копилка
          </button>

          {piggyMoves.length > 0 && (
            <section className="card">
              <h3>История движений</h3>
              <div className="op-list">
                {piggyMoves.slice(0, 20).map(m => {
                  const p = allPiggies.find(x => x.id === m.stash_id)
                  return (
                    <div className="move-row" key={m.id}>
                      <span className="move-date">{formatDateLong(m.date)}</span>
                      <span className="move-note">
                        {p?.icon} {m.note ?? p?.name}
                      </span>
                      <span className="op-amount-col">
                        <span className={m.type === 'in' ? 'green' : 'red'}>
                          {m.type === 'in' ? '+' : '−'}
                          {m.currency !== cur ? formatOrig(m.amount_orig, m.currency) : formatMoney(m.amount, cur)}
                        </span>
                        {m.currency !== cur && <span className="op-sub">≈ {formatMoney(m.amount, cur)}</span>}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}

      {closed.length > 0 && (
        <section className="card">
          <h3>Закрытые копилки</h3>
          {closed.map(p => (
            <div className="closed-row" key={p.id}>
              <span className="op-icon" style={{ background: p.color + '26' }}>
                {p.icon}
              </span>
              <div className="piggy-title">
                <span className="piggy-name">{p.name}</span>
                <span className="muted small">
                  {p.closed_reason === 'spent' ? '💥 разбита' : '↩️ возвращено в баланс'}
                  {p.closed_at ? ` · ${new Date(p.closed_at).toLocaleDateString('ru-RU')}` : ''}
                </span>
              </div>
              <button className="icon-btn" onClick={() => removeClosed(p)} aria-label="Удалить навсегда">
                ✕
              </button>
            </div>
          ))}
        </section>
      )}

      {editing && <PiggyModal piggy={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {moving && <StashMoveModal stash={moving.stash} initialType={moving.type} onClose={() => setMoving(null)} />}
    </div>
  )
}
