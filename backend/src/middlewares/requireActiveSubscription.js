'use strict';

const {
  fetchSubscriptionForTenant,
  isSubscriptionActive,
  resolveTenantId,
} = require('../utils/subscription');

/**
 * Bloquea el acceso a endpoints de la app si la suscripción no está activa.
 * Devuelve 402 (Payment Required) con un motivo.
 */
module.exports = function requireActiveSubscription() {
  return async (req, res, next) => {
    try {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ ok: false, error: 'TENANT_NOT_RESOLVED' });
      }

      const sub = await fetchSubscriptionForTenant(tenantId);
      const { active, reason } = isSubscriptionActive(sub);

      if (!active) {
        return res.status(402).json({
          ok: false,
          error: 'SUBSCRIPTION_INACTIVE',
          reason,
          tenant_id: tenantId,
        });
      }

      // Propaga info por si la necesitas en controladores
      req.tenantId = tenantId;
      req.subscription = sub;
      if (!req.tenant) req.tenant = { id: tenantId };

      return next();
    } catch (err) {
      console.error('requireActiveSubscription error:', err);
      return res.status(500).json({ ok: false, error: 'SUBSCRIPTION_CHECK_FAILED' });
    }
  };
};
