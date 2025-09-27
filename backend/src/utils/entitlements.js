'use strict';

/**
 * Normaliza timestamps de Stripe (segundos) o ISO a ms.
 */
function toMs(v) {
  if (!v) return null;
  if (typeof v === 'number') {
    // Stripe manda segundos en muchos campos (trial_end/current_period_end)
    return v > 1e12 ? v : v * 1000;
  }
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
}

/**
 * Cálculo unificado de permisos + flags de UI + datos de plan.
 */
function computeEntitlements({ tenant = null, subscription = null } = {}) {
  const now = Date.now();

  // ---------- Estado de suscripción ----------
  const subStatus = String(subscription?.status || '').toLowerCase();
  const subscriptionActive = ['active', 'trialing', 'past_due'].includes(subStatus);

  const currentPeriodEndMs =
    toMs(subscription?.current_period_end) ??
    toMs(subscription?.current_period_end_iso);

  const trialEndMs =
    toMs(subscription?.trial_end) ??
    toMs(subscription?.trial_end_iso);

  const cancelAtPeriodEnd = !!subscription?.cancel_at_period_end;

  // ---------- Trial del tenant ----------
  const trialActive  = !!tenant?.trial_active;
  const trialQuota   = Number(tenant?.trial_quota ?? 0);
  const trialUsed    = Number(tenant?.trial_used ?? 0);
  const remaining    = Math.max(0, trialQuota - trialUsed);
  const softBlocked  = !!tenant?.soft_blocked;

  // ---------- Permisos principales ----------
  // Crear paquetes si hay sub activa o trial con saldo
  const canCreatePackage = subscriptionActive || (trialActive && remaining > 0);

  // Entrar a la app (no bloqueamos por soft_blocked aquí)
  const canUseApp = subscriptionActive || trialActive || !softBlocked;

  // ---------- Motivo para puertas/banners ----------
  let reason = null;
  if (!subscriptionActive) {
    if (trialActive && remaining === 0) reason = 'trial_exhausted';
    else if (!trialActive)             reason = 'inactive';
  } else {
    // Si hay suscripción pero con incidencias, puede interesar exponer
    if (subStatus === 'past_due')           reason = 'past_due';
    if (cancelAtPeriodEnd)                  reason = 'cancel_at_period_end';
    if (subStatus === 'canceled')           reason = 'canceled';
    if (subStatus === 'incomplete')         reason = 'incomplete';
    if (subStatus === 'incomplete_expired') reason = 'incomplete_expired';
  }

  // ---------- Datos del plan (si hay suscripción) ----------
  const price   = subscription?.price   || subscription?.items?.[0]?.price || null;
  const product = subscription?.product || price?.product || null;

  const plan_key =
    product?.metadata?.plan_key ||
    price?.metadata?.plan_key   ||
    price?.nickname ||
    product?.name   ||
    null;

  const plan_name =
    product?.name ||
    price?.nickname ||
    (plan_key ? String(plan_key).toUpperCase() : null);

  const interval = price?.recurring?.interval || null;     // 'month' | 'year' ...
  const currency = price?.currency || null;                // 'eur' ...
  const amount   = typeof price?.unit_amount === 'number'
    ? price.unit_amount
    : (typeof price?.unit_amount_decimal === 'string'
        ? Number(price.unit_amount_decimal)
        : null);

  const plan = subscriptionActive ? {
    key: plan_key,
    name: plan_name,
    interval,
    currency,
    unit_amount: amount,           // en centavos si viene de Stripe
    current_period_end: currentPeriodEndMs ? new Date(currentPeriodEndMs).toISOString() : null,
    trial_end: trialEndMs ? new Date(trialEndMs).toISOString() : null,
    status: subStatus,
    cancel_at_period_end: cancelAtPeriodEnd,
  } : null;

  // ---------- Flags de UI ----------
  const showTrialBanner = !subscriptionActive && trialActive;
  const is_paid = subscriptionActive; // “de pago” (incluye trialing/past_due)

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
