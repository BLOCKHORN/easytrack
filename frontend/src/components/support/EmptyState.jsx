export default function EmptyState({ title, body, actionLabel, onAction }) {
  return (
    <div className="empty">
      <div className="empty__art" aria-hidden />
      <h3>{title}</h3>
      <p>{body}</p>
      {onAction && (
        <button className="btn btn--primary" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}
