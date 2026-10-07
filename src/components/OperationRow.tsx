import { useApp } from '../context/AppContext'
import { formatMoney, formatOrig } from '../lib/format'
import { Operation } from '../lib/types'

export function OperationRow({ op, onClick }: { op: Operation; onClick: () => void }) {
  const { settings } = useApp()
  const cat = op.category
  const color = cat?.color ?? '#98989d'
  const foreign = op.currency !== settings.currency

  return (
    <button className="op-row" onClick={onClick}>
      <span className="op-icon" style={{ background: color + '26' }}>
        {cat?.icon ?? '❔'}
      </span>
      <span className="op-info">
        <span className="op-name">{cat?.name ?? 'Без категории'}</span>
        {op.note && <span className="op-note">{op.note}</span>}
      </span>
      <span className="op-amount-col">
        <span className={'op-amount ' + (op.type === 'income' ? 'green' : 'red')}>
          {op.type === 'income' ? '+' : '−'}
          {foreign ? formatOrig(op.amount_orig, op.currency) : formatMoney(op.amount, settings.currency)}
        </span>
        {foreign && <span className="op-sub">≈ {formatMoney(op.amount, settings.currency)}</span>}
      </span>
    </button>
  )
}
