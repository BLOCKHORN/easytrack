// utils/entitlements.js
'use strict';

/* ---------- helpers ---------- */
function toMs(v) {
  if (!v) return null;
  if (typeof v === 'number') return v > 1e12 ? v : v * 1000;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
}

function pickPlanName(sub) {
  return (
    sub?.product?.name ||
    sub?.price?.nickname ||
    sub?.plan_name ||
    sub?.price_nickname ||
    sub?.plan_key ||
    null
  );
}
function pickPlanKey(sub) {
  return (
    sub?.price?.metadata?.plan_key ||
    sub?.product?.metadata?.plan_key ||
    sub?.plan_key ||
    null
  );
}

function deriveCadence(price, sub) {
  const rec   = price?.recurring || {};
  const int   = String(rec.interval || sub?.interval || '').toLowerCase();
  const count = Number(rec.interval_count || sub?.interval_count || 1);

  if (int === 'month' && count === 1) return { cadence: 'monthly', months: 1, label: 'mensual' };
  if (int === 'year'  && count === 1) return { cadence: 'annual',  months: 12, label: 'anual' };
  if ((int === 'year' && count === 2) || (int === 'month' && count === 24)) {
    return { cadence: 'biennial', months: 24, label: 'bianual' };
  }
  // fallback genérico
  if (int === 'month') return { cadence: 'custom', months: count || 1, label: `${count} meses` };
  if (int === 'year')  return { cadence: 'custom', months: (count || 1) * 12, label: `${count} años` };
  return { cadence: 'custom', months: null, label: 'personalizado' };
}

/**
 * Cálculo de permisos + flags de UI + datos de plan (con cadencia).
 */
function computeEntitlements({ tenant = null, subscription = null } = {}) {
  const subStatus = String(subscription?.status || '').toLowerCase();
  const subscriptionActive = ['active', 'trialing', 'past_due'].includes(subStatus);

  const currentPeriodEndMs =
    toMs(subscription?.current_period_end) ?? toMs(subscription?.current_period_end_iso);
  const trialEndMs =
    toMs(subscription?.trial_end) ?? toMs(subscription?.trial_end_iso) ?? toMs(subscription?.trial_ends_at);

  const cancelAtPeriodEnd = !!subscription?.cancel_at_period_end;

  // Trial del tenant
  const trialActive  = !!tenant?.trial_active;
  const trialQuota   = Number(tenant?.trial_quota ?? 0);
  const trialUsed    = Number(tenant?.trial_used ?? 0);
  const remaining    = Math.max(0, trialQuota - trialUsed);
  const softBlocked  = !!tenant?.soft_blocked;

  // Permisos
  const canCreatePackage = subscriptionActive || (trialActive && remaining > 0);
  const canUseApp        = subscriptionActive || trialActive || !softBlocked;

  // Razón
  let reason = null;
  if (!subscriptionActive) {
    if (trialActive && remaining === 0) reason = 'trial_exhausted';
    else if (!trialActive)             reason = 'inactive';
  } else {
    if (subStatus === 'past_due')           reason = 'past_due';
    if (cancelAtPeriodEnd)                  reason = 'cancel_at_period_end';
    if (subStatus === 'canceled')           reason = 'canceled';
    if (subStatus === 'incomplete')         reason = 'incomplete';
    if (subStatus === 'incomplete_expired') reason = 'incomplete_expired';
  }

  // Datos del plan
  const price   = subscription?.price   || subscription?.items?.[0]?.price || null;
  const product = subscription?.product || price?.product || null;

  const plan_name = pickPlanName({ ...subscription, price, product }) || (subscriptionActive ? 'Plan activo' : null);
  const plan_key  = pickPlanKey({ ...subscription, price, product })  || null;

  const interval = price?.recurring?.interval || subscription?.interval || null;
  const interval_count = Number(price?.recurring?.interval_count || subscription?.interval_count || 1);
  const currency = price?.currency || subscription?.currency || 'EUR';

  const unit_amount = typeof price?.unit_amount === 'number'
    ? price.unit_amount
    : (typeof price?.unit_amount_decimal === 'string' ? Number(price.unit_amount_decimal) : null);

  const { cadence, months } = deriveCadence(price, subscription);

  // precio/mes (en céntimos) si se puede calcular
  const per_month_amount = (unit_amount != null && months)
    ? Math.round(unit_amount / months)
    : null;

  // metadatos combinados (útil para "first_month_free")
  const metadata = {
    ...(product?.metadata || {}),
    ...(price?.metadata || {}),
  };

  const plan = subscriptionActive ? {
    id: subscription?.provider_subscription_id || subscription?.id || null,
    key: plan_key,
    name: plan_name,
    status: subStatus,
    cancel_at_period_end: cancelAtPeriodEnd,
    current_period_end: currentPeriodEndMs ? new Date(currentPeriodEndMs).toISOString() : null,
    trial_end: trialEndMs ? new Date(trialEndMs).toISOString() : null,
    provider: subscription?.provider || null,
    plan_id: subscription?.plan_id || null,

    // $$$
    currency,
    unit_amount,
    interval,
    interval_count,

    // Cadencia normalizada
    cadence,              // 'monthly' | 'annual' | 'biennial' | 'custom'
    per_month_amount,     // céntimos/mes si se puede
    metadata,             // merge product/price metadata
  } : null;

  // Flags UI
  const showTrialBanner = !subscriptionActive && trialActive;
  const is_paid = subscriptionActive;

  return {
    canUseApp,
    canCreatePackage,
    subscriptionActive,
    is_paid,
    showTrialBanner,
    trial: {
      active: trialActive,
      quota: trialQuota,
      used: trialUsed,
      remaining
    },
    soft_blocked: softBlocked,
    reason,
    plan
  };
}

module.exports = { computeEntitlements };
