// src/components/PlanBadge.jsx
import { useSubscription } from '../hooks/useSubscription';
import '../styles/PlanBadge.scss';

function money(cents, currency = 'EUR') {
  if (cents == null) return '';
  return (cents / 100).toLocaleString('es-ES', {
    style: 'currency',
    currency: (currency || 'EUR').toUpperCase(),
    maximumFractionDigits: 2
  });
}

export default function PlanBadge() {
  const { loading, entitlements } = useSubscription();
  if (loading) return null;

  const paid  = !!entitlements?.subscriptionActive;
  const trial = !!entitlements?.trial?.active;

  if (paid) {
    const p   = entitlements.plan || {};
    const cad = p.cadence || 'custom'; // monthly | annual | biennial | custom
    const perMonth = typeof p.per_month_amount === 'number' ? money(p.per_month_amount, p.currency) : null;

    const variant = {
      monthly:  'monthly',
      annual:   'annual',
      biennial: 'biennial',
      custom:   'paid'
    }[cad] || 'paid';

    const label = {
      monthly:  'MENSUAL ACTIVO',
      annual:   'ANUAL ACTIVO',
      biennial: 'BIANUAL ACTIVO',
      custom:   'PLAN ACTIVO'
    }[cad] || 'PLAN ACTIVO';

    // Detalle para tooltip
    const firstMonthFree =
      String(p?.metadata?.first_month_free || '').toLowerCase() === 'true' || cad === 'monthly';

    let tail = '';
    if (cad === 'monthly') {
      // 29 €/mes · 1er mes gratis
      tail = `${money(p.unit_amount, p.currency)} / mes${firstMonthFree ? ' · 1er mes gratis' : ''}`;
    } else if (cad === 'annual') {
      // 24 €/mes · facturación anual
      tail = perMonth ? `${perMonth} / mes · facturación anual` : 'Facturación anual';
    } else if (cad === 'biennial') {
      // 19 €/mes · facturación bianual
      tail = perMonth ? `${perMonth} / mes · facturación bianual` : 'Facturación bianual';
    } else {
      tail = p.unit_amount != null ? `${money(p.unit_amount, p.currency)} · ${p.interval_count || 1} × ${p.interval || ''}` : '';
    }

    const tip = `${p.name || 'Plan activo'} · ${tail}`.trim();

    return (
      <span
        className={`plan-badge plan-badge--paid plan-badge--${variant}`}
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
        title="Versión de prueba activa"
        aria-label="Versión de prueba activa"
      >
        VERSIÓN DE PRUEBA
      </span>
    );
  }

  return (
    <span className="plan-badge plan-badge--free" title="Sin plan activo" aria-label="Sin plan activo">
      SIN PLAN ACTIVO
    </span>
  );
}
