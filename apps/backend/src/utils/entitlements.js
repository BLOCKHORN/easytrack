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
  const planId = tenant?.plan_id || 'free';
  const softBlocked = !!tenant?.soft_blocked;
  
  // Cálculo de los 14 días (si no hay fecha_creacion, asume 0 para no regalar trials a cuentas legacy sin fecha)
  const createdAt = tenant?.fecha_creacion ? new Date(tenant.fecha_creacion).getTime() : 0;
  const daysSinceCreation = (Date.now() - createdAt) / 86400000;
  const isFirst14Days = daysSinceCreation <= 14;
  
  const VIP_TENANTS = ['463e2871-32de-4880-bddc-e1072acb7f59'];
  const isVip = VIP_TENANTS.includes(tenant?.id);
  
  const trialQuota = isVip ? 1000000 : (Number.isFinite(tenant?.trial_quota) ? tenant.trial_quota : 250);
  const trialUsed = Number(tenant?.trial_used ?? 0);
  const quotaOk = trialUsed < trialQuota;

  const isPaidPlan = planId === 'pro' || isVip;

  const subStatus = String(subscription?.status || '').toLowerCase();
  const hasActiveStripeSub = ['active', 'trialing', 'past_due'].includes(subStatus);
  const subscriptionActive = hasActiveStripeSub || isPaidPlan;

  const aiStatus = subscriptionActive ? 'unlimited' : 'locked';

  const features = {
    canViewFinancialArea: subscriptionActive,
    canUseWhatsAppClient: subscriptionActive,
    aiStatus,
    supportType: subscriptionActive ? 'direct_whatsapp' : 'none',
    unlimitedPackages: subscriptionActive || isFirst14Days // <-- BARRA LIBRE ACTIVADA
  };

  const hasStripeInvolved = !!tenant?.stripe_customer_id || !!subscription?.provider_subscription_id;
  const isManualOverride = isPaidPlan && !hasStripeInvolved;

  const price = subscription?.price || null;
  const product = subscription?.product || null;
  const { cadence } = deriveCadence(price, subscription);
  
  const planInfo = subscriptionActive ? {
    id: subscription?.provider_subscription_id || subscription?.id || 'manual-override',
    name: pickPlanName({ ...subscription, price, product }) || (planId === 'pro' ? 'Pro' : 'VIP'),
    status: isManualOverride ? 'manual' : (subStatus || 'active'),
    cancel_at_period_end: !!subscription?.cancel_at_period_end,
    currency: price?.currency || subscription?.currency || 'EUR',
    cadence: isManualOverride ? 'manual' : cadence,
    current_period_end: subscription?.current_period_end || null,
  } : null;

  return {
    plan_id: subscriptionActive ? 'pro' : 'free',
    canUseApp: !softBlocked,
    canCreatePackage: !softBlocked && (features.unlimitedPackages || quotaOk),
    features,
    subscriptionActive,
    is_paid: subscriptionActive,
    trial: { 
      active: !subscriptionActive && !isVip, 
      is_unlimited_phase: isFirst14Days, // Mandamos estado al front
      days_remaining: isFirst14Days ? Math.max(0, 14 - Math.floor(daysSinceCreation)) : 0, // Días exactos
      quota: trialQuota, 
      used: trialUsed, 
      remaining: Math.max(0, trialQuota - trialUsed), 
      quota_ok: quotaOk 
    },
    soft_blocked: softBlocked,
    reason: softBlocked ? 'blocked' : (!(features.unlimitedPackages || quotaOk) ? 'quota_exceeded' : null),
    plan: planInfo
  };
}

module.exports = { computeEntitlements };