import { ChangeEvent, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { CURRENCIES, formatDateLong, formatMoney, formatOrig } from '../lib/format'
import { exportCsv, exportJson, importJson } from '../lib/files'
import { Category, Stash, StashMove } from '../lib/types'
import { CategoryModal } from './CategoryModal'
import { StashMoveModal } from './StashMoveModal'

type Section = 'profile' | 'categories' | 'safe' | 'data'

export function SettingsTab() {
  const {
    categories,
    operations,
    settings,
    setCurrency,
    mode,
    email,
    profile,
    signOut,
    changePassword,
    resetLocalData,
    importLocalData,
    stashes,
    stashMoves,
    fx,
    manualRates,
    overrideRate,
    addCurrency,
    removeCurrency,
    rateFor
  } = useApp()
  const [newCur, setNewCur] = useState('')
  const [section, setSection] = useState<Section>('profile')
  const [editingCat, setEditingCat] = useState<Category | 'new' | null>(null)
  const [moving, setMoving] = useState<{ stash: Stash; type: 'in' | 'out' } | null>(null)
  const [newPass, setNewPass] = useState('')
  const [passMsg, setPassMsg] = useState<string | null>(null)
  const [passErr, setPassErr] = useState<string | null>(null)
  const [passBusy, setPassBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cur = settings.currency

  const expenseCats = categories.filter(c => c.type === 'expense')
  const incomeCats = categories.filter(c => c.type === 'income')
  const safe = stashes.find(s => s.kind === 'safe')
  const safeMoves = safe ? stashMoves.filter(m => m.stash_id === safe.id) : []
  const safeHoldings = (() => {
    const map = new Map<string, { orig: number; base: number }>()
    for (const m of safeMoves) {
      const e = map.get(m.currency) ?? { orig: 0, base: 0 }
      e.orig += m.type === 'in' ? m.amount_orig : -m.amount_orig
      e.base += m.type === 'in' ? m.amount : -m.amount
      map.set(m.currency, e)
    }
    return [...map.entries()].filter(([, v]) => Math.abs(v.orig) > 0.004)
  })()
  const safeRateOf = (code: string, v: { orig: number; base: number }): number =>
    rateFor(code) ?? (v.orig !== 0 ? v.base / v.orig : 1)
  const safeTotal = safeHoldings.reduce((s, [code, v]) => s + v.orig * safeRateOf(code, v), 0)

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = await importJson(file)
      if (window.confirm('Заменить текущие данные данными из файла?')) {
        importLocalData(data.categories, data.operations, data.stashes, data.stashMoves)
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Ошибка импорта')
    }
  }

  const submitPass = async () => {
    setPassErr(null)
    setPassMsg(null)
    if (newPass.length < 6) {
      setPassErr('Пароль должен быть не короче 6 символов')
      return
    }
    setPassBusy(true)
    try {
      await changePassword(newPass)
      setPassMsg('Пароль обновлён')
      setNewPass('')
    } catch (err) {
      setPassErr(err instanceof Error ? err.message : 'Не удалось сменить пароль')
    } finally {
      setPassBusy(false)
    }
  }

  const usageCount = (id: string) => operations.filter(o => o.category_id === id).length

  const catRow = (c: Category) => (
    <button className="cat-row" key={c.id} onClick={() => setEditingCat(c)}>
      <span className="op-icon" style={{ background: c.color + '26' }}>
        {c.icon}
      </span>
      <span className="cat-row-name">{c.name}</span>
      <span className="cat-row-count">{usageCount(c.id)}</span>
    </button>
  )

  const moveRow = (m: StashMove) => {
    const foreign = m.currency !== cur
    return (
      <div className="move-row" key={m.id}>
        <span className="move-date">{formatDateLong(m.date)}</span>
        <span className="move-note">{m.note ?? (m.type === 'in' ? 'Пополнение' : 'Снятие')}</span>
        <span className="op-amount-col">
          <span className={m.type === 'in' ? 'green' : 'red'}>
            {m.type === 'in' ? '+' : '−'}
            {foreign ? formatOrig(m.amount_orig, m.currency) : formatMoney(m.amount, cur)}
          </span>
          {foreign && <span className="op-sub">≈ {formatMoney(m.amount, cur)}</span>}
        </span>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Настройки</h1>
      </header>

      <div className="segmented">
        <button className={section === 'profile' ? 'active' : ''} onClick={() => setSection('profile')}>
          Профиль
        </button>
        <button className={section === 'categories' ? 'active' : ''} onClick={() => setSection('categories')}>
          Категории
        </button>
        <button className={section === 'safe' ? 'active' : ''} onClick={() => setSection('safe')}>
          Сейф
        </button>
        <button className={section === 'data' ? 'active' : ''} onClick={() => setSection('data')}>
          Данные
        </button>
      </div>

      {section === 'profile' && (
        <>
          <section className="card">
            <h3>Пользователь</h3>
            {mode === 'cloud' ? (
              <div className="profile-info">
                <div className="profile-badge">☁️ Облако</div>
                <p className="muted">{profile?.email ?? email}</p>
                {profile?.createdAt && (
                  <p className="muted small">В приложении с {new Date(profile.createdAt).toLocaleDateString('ru-RU')}</p>
                )}
              </div>
            ) : (
              <div className="profile-info">
                <div className="profile-badge">💾 Локальный режим</div>
                <p className="muted">
                  Данные хранятся только в этом браузере. Чтобы синхронизировать их между ПК и телефоном, подключи
                  Supabase — инструкция в README проекта.
                </p>
              </div>
            )}
          </section>

          <section className="card">
            <h3>Валюта и курсы</h3>
            <select className="input" value={settings.currency} onChange={e => setCurrency(e.target.value)}>
              {[...new Set([...CURRENCIES.map(c => c.code), ...settings.currencies])].map(code => (
                <option key={code} value={code}>
                  {CURRENCIES.find(c => c.code === code)?.label ?? code}
                </option>
              ))}
            </select>
            {settings.currencies.length > 0 && (
              <div className="rate-rows">
                {settings.currencies.map(code => {
                  const manual = manualRates.find(r => r.code === code)
                  const auto = fx[code]
                  return (
                    <div className="rate-row" key={code}>
                      <span className="rate-code">{code}</span>
                      <input
                        className="input rate-input"
                        inputMode="decimal"
                        defaultValue={manual ? String(manual.rate).replace('.', ',') : ''}
                        placeholder={`авто: ${auto !== undefined ? String(auto).replace('.', ',') : '—'}`}
                        onBlur={e => {
                          const raw = e.target.value.trim().replace(',', '.')
                          if (raw === '') {
                            if (manual) void overrideRate(code, null)
                            return
                          }
                          const num = Number(raw)
                          if (Number.isFinite(num) && num > 0 && num !== manual?.rate) void overrideRate(code, num)
                        }}
                      />
                      <button
                        className="icon-btn"
                        aria-label={`Убрать ${code}`}
                        onClick={() => {
                          if (window.confirm(`Убрать валюту ${code}? Операции в ней сохранятся.`)) {
                            void overrideRate(code, null)
                            removeCurrency(code)
                          }
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="rate-add">
              <input
                className="input"
                placeholder="Добавить валюту (USD, EUR…)"
                value={newCur}
                onChange={e => setNewCur(e.target.value.toUpperCase().slice(0, 3))}
              />
              <button
                className="btn btn-secondary"
                onClick={() => {
                  addCurrency(newCur)
                  setNewCur('')
                }}
              >
                +
              </button>
            </div>
            <p className="muted small">
              Курсы НБРБ к базовой валюте обновляются автоматически; любое значение можно переписать вручную.
            </p>
          </section>

          {mode === 'cloud' && (
            <section className="card">
              <h3>Смена пароля</h3>
              <div className="btn-col">
                <input
                  className="input"
                  type="password"
                  placeholder="Новый пароль (минимум 6 символов)"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                />
                <button className="btn btn-secondary" onClick={submitPass} disabled={passBusy}>
                  {passBusy ? 'Меняю…' : 'Сменить пароль'}
                </button>
                {passMsg && <div className="info">{passMsg}</div>}
                {passErr && <div className="error">{passErr}</div>}
              </div>
            </section>
          )}

          {mode === 'cloud' && (
            <section className="card">
              <div className="btn-col">
                <button className="btn btn-danger" onClick={() => signOut()}>
                  Выйти из аккаунта
                </button>
              </div>
            </section>
          )}

          <footer className="app-footer">Кошелёк · v0.2</footer>
        </>
      )}

      {section === 'categories' && (
        <>
          <section className="card">
            <div className="card-head">
              <h3>Расходы</h3>
            </div>
            {expenseCats.map(catRow)}
          </section>
          <section className="card">
            <div className="card-head">
              <h3>Доходы</h3>
            </div>
            {incomeCats.map(catRow)}
          </section>
          <button className="btn btn-primary wide" onClick={() => setEditingCat('new')}>
            + Добавить категорию
          </button>
        </>
      )}

      {section === 'safe' && (
        <>
          <section className="card balance-card">
            <span className="balance-label">🔐 В сейфе</span>
            <span className="balance-value">{formatMoney(safeTotal, cur)}</span>
            {safeHoldings.length > 0 && (
              <div className="safe-holdings">
                {safeHoldings.map(([code, v]) => (
                  <div className="safe-holding" key={code}>
                    <span>{formatOrig(v.orig, code)}</span>
                    <span className="safe-holding-base">≈ {formatMoney(v.orig * safeRateOf(code, v), cur)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="piggy-actions">
              <button className="btn btn-secondary" onClick={() => safe && setMoving({ stash: safe, type: 'in' })}>
                Пополнить
              </button>
              <button className="btn btn-secondary" onClick={() => safe && setMoving({ stash: safe, type: 'out' })}>
                Достать
              </button>
            </div>
          </section>

          <section className="card">
            <h3>История сейфа</h3>
            {safeMoves.length > 0 ? (
              <div className="op-list">{safeMoves.map(m => moveRow(m))}</div>
            ) : (
              <div className="empty">
                <span></span>
                <p>Движений пока нет. Откладывай с дохода или пополняй вручную.</p>
              </div>
            )}
          </section>
        </>
      )}

      {section === 'data' && (
        <>
          <section className="card">
            <h3>Экспорт</h3>
            <div className="btn-col">
              <button className="btn btn-secondary" onClick={() => exportCsv(operations, settings.currency)}>
                Скачать CSV (для Excel)
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => exportJson(operations, categories, stashes, stashMoves)}
              >
                Скачать резервную копию (JSON)
              </button>
            </div>
          </section>

          {mode === 'local' && (
            <section className="card">
              <h3>Импорт и сброс</h3>
              <div className="btn-col">
                <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
                  Восстановить из копии (JSON)
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    if (window.confirm('Удалить ВСЕ локальные данные безвозвратно?')) resetLocalData()
                  }}
                >
                  Удалить все данные
                </button>
              </div>
              <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onFile} />
            </section>
          )}
        </>
      )}

      {editingCat && (
        <CategoryModal category={editingCat === 'new' ? null : editingCat} onClose={() => setEditingCat(null)} />
      )}
      {moving && <StashMoveModal stash={moving.stash} initialType={moving.type} onClose={() => setMoving(null)} />}
    </div>
  )
}
