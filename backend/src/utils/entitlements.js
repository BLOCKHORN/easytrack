'use strict';

/**
 * Cálculo unificado de permisos + flags de UI.
 */
function computeEntitlements({ tenant = null, subscription = null } = {}) {
  const subStatus = String(subscription?.status || '').toLowerCase();
  const subscriptionActive = ['active', 'trialing', 'past_due'].includes(subStatus);

  const trialActive  = !!tenant?.trial_active;
  const trialQuota   = Number(tenant?.trial_quota ?? 0);
  const trialUsed    = Number(tenant?.trial_used ?? 0);
  const remaining    = Math.max(0, trialQuota - trialUsed);
  const softBlocked  = !!tenant?.soft_blocked;

  // Crear paquetes si hay sub activa o trial con saldo
  const canCreatePackage = subscriptionActive || (trialActive && remaining > 0);

  // Entrar a la app (no bloqueamos por soft_blocked aquí)
  const canUseApp = subscriptionActive || trialActive || !softBlocked;

  let reason = null;
  if (!subscriptionActive) {
    if (trialActive && remaining === 0) reason = 'trial_exhausted';
    else if (!trialActive) reason = 'inactive';
  }

  // Banner de “versión de prueba”: solo si NO hay suscripción activa
  const showTrialBanner = !subscriptionActive && trialActive;

  // Campo de conveniencia para UI
  const is_paid = subscriptionActive; // “de pago” (incluye trialing del plan contratado)

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
    reason
  };
}

module.exports = { computeEntitlements };
