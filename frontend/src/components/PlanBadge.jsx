// frontend/src/components/PlanBadge.jsx
import { useSubscription } from '../hooks/useSubscription';
import '../styles/PlanBadge.scss';

function formatPrice(cents, currency = 'EUR', interval) {
  if (cents == null) return '';
  const money = (cents / 100).toLocaleString('es-ES', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2
  });
  const iv = interval === 'month' ? ' / mes' : interval === 'year' ? ' / año' : (interval ? ` / ${interval}` : '');
  return ` · ${money}${iv}`;
}

export default function PlanBadge() {
  const { loading, entitlements } = useSubscription();
  if (loading) return null;

  const paid   = !!entitlements?.subscriptionActive;
  const trial  = !!entitlements?.trial?.active;
  const left   = entitlements?.trial?.remaining ?? null;

  const planName   = entitlements?.plan?.name || (paid ? 'activo' : null);
  const interval   = entitlements?.plan?.interval || null;
  const currency   = entitlements?.plan?.currency || 'EUR';
  const unitAmount = entitlements?.plan?.unit_amount;

  if (paid) {
    const tail = formatPrice(unitAmount, currency, interval);
    return <span className="plan-badge plan-badge--paid">{planName}{tail}</span>;
  }
  if (trial) {
    return <span className="plan-badge plan-badge--trial">Versión de prueba · quedan {left ?? '—'}</span>;
  }
  return <span className="plan-badge plan-badge--free">Sin plan activo</span>;
}
