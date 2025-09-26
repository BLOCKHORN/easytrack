'use strict';

/**
 * Cálculo unificado de permisos.
 * - canUseApp: puede entrar y ver la app (dashboard, historial, etc.)
 * - canCreatePackage: puede crear paquetes (trial con remaining > 0 o sub activa)
 * - reason: motivo informativo para UI (e.g. 'trial_exhausted')
 */
function computeEntitlements({ tenant = null, subscription = null } = {}) {
  const subStatus = String(subscription?.status || '').toLowerCase();
  const subscriptionActive = ['active', 'trialing', 'past_due'].includes(subStatus);

  const trialActive  = !!tenant?.trial_active;
  const trialQuota   = Number(tenant?.trial_quota ?? 0);
  const trialUsed    = Number(tenant?.trial_used ?? 0);
  const remaining    = Math.max(0, trialQuota - trialUsed);
  const softBlocked  = !!tenant?.soft_blocked;

  // ❗️Regla clave:
  // - Aunque el trial esté agotado, se puede "usar la app" (ver panel, histórico…)
  // - Lo que se bloquea es CREAR más paquetes si no hay sub activa.
  const canCreatePackage = subscriptionActive || (trialActive && remaining > 0);

  // Puedes decidir si el soft_blocked debe bloquear la app entera. Aquí NO bloquea.
  // Úsalo como “pausa suave” para limitar otras acciones si alguna vez lo necesitas.
  const canUseApp = subscriptionActive || trialActive || !softBlocked;

  let reason = null;
  if (!subscriptionActive) {
    if (trialActive && remaining === 0) reason = 'trial_exhausted';
    else if (!trialActive) reason = 'inactive';
  }

  return {
    canUseApp,
    canCreatePackage,
    subscriptionActive,
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
