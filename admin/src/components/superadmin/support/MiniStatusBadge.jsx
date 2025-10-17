export default function MiniStatusBadge({ estado }) {
  const e = String(estado || '').toLowerCase();
  const tone =
    e === 'pendiente' ? 'warn' :
    e === 'en_proceso' ? 'info' :
    e === 'esperando_cliente' ? 'ok' :
    e === 'cerrado' ? 'muted' : 'muted';

  const label =
    e === 'pendiente' ? 'Pendiente' :
    e === 'en_proceso' ? 'En proceso' :
    e === 'esperando_cliente' ? 'Esperando cliente' :
    e === 'cerrado' ? 'Cerrado' : (estado || '—');

  return <span className={`badge badge--${tone}`}>{label}</span>;
}
