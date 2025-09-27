import { useSubscription } from '../hooks/useSubscription';
import '../styles/PlanBadge.scss';

/* -------- helpers de visual -------- */
function formatPrice(cents, currency = 'EUR', interval) {
  if (cents == null) return '';
  const money = (cents / 100).toLocaleString('es-ES', {
    style: 'currency',
    currency: (currency || 'EUR').toUpperCase(),
    maximumFractionDigits: 2
  });
  const iv =
    interval === 'month' ? ' / mes'
    : interval === 'year' ? ' / año'
    : (interval ? ` / ${interval}` : '');
  return `${money}${iv}`;
}

/** Devuelve un "tier" visual a partir de entitlements.plan */
function inferTier(ent) {
  const key = String(ent?.plan?.key || '').toLowerCase();
  const name = String(ent?.plan?.name || '').toLowerCase();
  const s = `${key} ${name}`;

  // Si en Stripe pones metadata plan_key = premium|plus|basic, esto quedará perfecto.
  if (/(premium|pro|growth|scale)/.test(s)) return 'premium';
  if (/(plus|standard|advanced)/.test(s))   return 'plus';

  // Algunos alias/planes tuyos
  if (/(basic|starter|essential)/.test(s))  return 'basic';
  if (/(único|unico|punto pack|puntopack)/.test(s)) return 'basic';

  // Fallback: activo sin distinguir tier
  return 'paid';
}

export default function PlanBadge() {
  const { loading, entitlements } = useSubscription();
  if (loading) return null;

  const paid  = !!entitlements?.subscriptionActive;
  const trial = !!entitlements?.trial?.active;
  const left  = entitlements?.trial?.remaining ?? null;

  if (paid) {
    const tier      = inferTier(entitlements); // 'premium' | 'plus' | 'basic' | 'paid'
    const labelMap  = {
      premium: 'PREMIUM ACTIVO',
      plus:    'PLUS ACTIVO',
      basic:   'BÁSICO ACTIVO',
      paid:    'PLAN ACTIVO',
    };
    const label     = labelMap[tier];

    // Detalle para tooltip/title
    const longName  = entitlements?.plan?.name || 'Plan activo';
    const priceText = formatPrice(
      entitlements?.plan?.unit_amount,
      entitlements?.plan?.currency,
      entitlements?.plan?.interval
    );
    const tip = priceText ? `${longName} · ${priceText}` : longName;

    return (
      <span
        className={`plan-badge plan-badge--paid plan-badge--${tier}`}
        title={tip}
        aria-label={tip}
      >
        {label}
      </span>
    );
  }

  if (trial) {
    return (
      <span
        className="plan-badge plan-badge--trial"
        title={`Versión de prueba · ${left ?? '—'} restantes`}
      >
        VERSIÓN DE PRUEBA
        {Number.isFinite(left) ? <span className="plan-badge__meta">· quedan {left}</span> : null}
      </span>
    );
  }

  return (
    <span className="plan-badge plan-badge--free" title="Sin plan activo">
      SIN PLAN ACTIVO
    </span>
  );
}
