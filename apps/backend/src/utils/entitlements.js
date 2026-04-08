// utils/entitlements.js
'use strict';

function pickPlanName(sub) {
  return sub?.product?.name || sub?.price?.nickname || sub?.plan_name || null;
}

function deriveCadence(price, sub) {
  const rec = price?.recurring || {};
  const int = String(rec.interval || sub?.interval || '').toLowerCase();
  const count = Number(rec.interval_count || sub?.interval_count || 1);

  if (int === 'month' && count === 1) return { cadence: 'monthly', months: 1 };
  if (int === 'year' && count === 1) return { cadence: 'annual', months: 12 };
  return { cadence: 'custom', months: count || 1 };
}

function computeEntitlements({ tenant = null, subscription = null } = {}) {
  const subStatus = String(subscription?.status || '').toLowerCase();
  const subscriptionActive = ['active', 'trialing', 'past_due'].includes(subStatus);
  const softBlocked = !!tenant?.soft_blocked;

  // ==========================================
  // ESCUDO VIP (Cuentas en Producción)
  // ==========================================
  const VIP_TENANTS = [
    '463e2871-32de-4880-bddc-e1072acb7f59', // Estanco Benidoleig (Tu negocio - Lifetime)
    '9934a0b9-6603-42ed-8d32-9aa7d32de1e2'  // Kiosco hospital Dénia (Cliente 2 - Blindado temporalmente)
  ];
  const isVip = VIP_TENANTS.includes(tenant?.id);

  // Lógica de Límite Físico (250 default)
  const defaultQuota = (Number.isFinite(tenant?.trial_quota) && tenant.trial_quota > 0) ? tenant.trial_quota : 250;
  const trialQuota = isVip ? 10000000 : defaultQuota; 
  
  const trialUsed = Number(tenant?.trial_used ?? 0);
  const quotaOk = trialUsed < trialQuota;

  // Acceso y Creación
  const canUseApp = !softBlocked;
  const canCreatePackage = !softBlocked && (subscriptionActive || quotaOk);

  let reason = null;
  if (softBlocked) reason = 'blocked';
  else if (!subscriptionActive && !quotaOk) reason = 'quota_exceeded';
  else if (subscriptionActive && subStatus === 'past_due') reason = 'past_due';

  const price = subscription?.price || subscription?.items?.[0]?.price || null;
  const product = subscription?.product || price?.product || null;
  const { cadence, months } = deriveCadence(price, subscription);

  const plan = subscriptionActive ? {
    id: subscription?.provider_subscription_id || subscription?.id || null,
    name: pickPlanName({ ...subscription, price, product }) || 'Premium',
    status: subStatus,
    cancel_at_period_end: !!subscription?.cancel_at_period_end,
    currency: price?.currency || subscription?.currency || 'EUR',
    cadence,
    metadata: { ...(product?.metadata || {}), ...(price?.metadata || {}) },
  } : null;

  return {
    canUseApp,
    canCreatePackage,
    subscriptionActive,
    is_paid: subscriptionActive,
    showTrialBanner: !subscriptionActive && quotaOk && !isVip, 
    trial: {
      active: !subscriptionActive,
      quota: trialQuota,
      used: trialUsed,
      remaining: Math.max(0, trialQuota - trialUsed),
      quota_ok: quotaOk,
    },
    soft_blocked: softBlocked,
    reason,
    plan
  };
}

module.exports = { computeEntitlements };