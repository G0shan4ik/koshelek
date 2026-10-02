import { ChangeEvent, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { CURRENCIES } from '../lib/format'
import { exportCsv, exportJson, importJson } from '../lib/files'
import { Category } from '../lib/types'
import { CategoryModal } from './CategoryModal'

type Section = 'categories' | 'data' | 'profile'

export function SettingsTab() {
  const {
    categories,
    operations,
    settings,
    setCurrency,
    mode,
    email,
    signOut,
    resetLocalData,
    importLocalData
  } = useApp()
  const [section, setSection] = useState<Section>('categories')
  const [editingCat, setEditingCat] = useState<Category | 'new' | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const expenseCats = categories.filter(c => c.type === 'expense')
  const incomeCats = categories.filter(c => c.type === 'income')

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = await importJson(file)
      if (window.confirm('Заменить текущие данные данными из файла?')) {
        importLocalData(data.categories, data.operations)
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Ошибка импорта')
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

  return (
    <div className="page">
      <header className="page-head">
        <h1>Ещё</h1>
      </header>

      <div className="segmented">
        <button className={section === 'categories' ? 'active' : ''} onClick={() => setSection('categories')}>
          Категории
        </button>
        <button className={section === 'data' ? 'active' : ''} onClick={() => setSection('data')}>
          Данные
        </button>
        <button className={section === 'profile' ? 'active' : ''} onClick={() => setSection('profile')}>
          Аккаунт
        </button>
      </div>

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

      {section === 'data' && (
        <>
          <section className="card">
            <h3>Валюта</h3>
            <select
              className="input"
              value={settings.currency}
              onChange={e => setCurrency(e.target.value)}
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </section>

          <section className="card">
            <h3>Экспорт</h3>
            <div className="btn-col">
              <button className="btn btn-secondary" onClick={() => exportCsv(operations, settings.currency)}>
                Скачать CSV (для Excel)
              </button>
              <button className="btn btn-secondary" onClick={() => exportJson(operations, categories)}>
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

      {section === 'profile' && (
        <>
          <section className="card">
            <h3>Режим работы</h3>
            {mode === 'cloud' ? (
              <div className="profile-info">
                <div className="profile-badge">☁️ Облако</div>
                <p className="muted">{email}</p>
                <p className="muted small">
                  Данные синхронизируются между устройствами через Supabase. Входи под этим email на телефоне и ПК.
                </p>
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

          {mode === 'cloud' && (
            <section className="card">
              <div className="btn-col">
                <button className="btn btn-danger" onClick={() => signOut()}>
                  Выйти из аккаунта
                </button>
              </div>
            </section>
          )}

          <footer className="app-footer">Кошелёк · v0.1</footer>
        </>
      )}

      {editingCat && (
        <CategoryModal category={editingCat === 'new' ? null : editingCat} onClose={() => setEditingCat(null)} />
      )}
    </div>
  )
}
