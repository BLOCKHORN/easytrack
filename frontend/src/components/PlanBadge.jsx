import { useSubscription } from '../hooks/useSubscription';
import '../styles/PlanBadge.scss';

export default function PlanBadge() {
  const { loading, entitlements } = useSubscription();
  if (loading) return null;

  const paid = !!entitlements?.subscriptionActive;
  const trial = !!entitlements?.trial?.active;
  const left = entitlements?.trial?.remaining ?? null;
  const planName = entitlements?.plan?.name || entitlements?.plan?.key;

  if (paid && planName) {
    return <span className="plan-badge plan-badge--paid">Plan {planName} activo</span>;
  }
  if (trial) {
    return <span className="plan-badge plan-badge--trial">Versión de prueba · quedan {left ?? '—'}</span>;
  }
  return <span className="plan-badge plan-badge--free">Sin plan activo</span>;
}
