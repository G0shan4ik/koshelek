interface Props {
  message: string
  actionLabel: string
  onAction: () => void
}

export function Snackbar({ message, actionLabel, onAction }: Props) {
  return (
    <div className="snackbar">
      <span className="snackbar-text">{message}</span>
      <button className="snackbar-action" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  )
}
