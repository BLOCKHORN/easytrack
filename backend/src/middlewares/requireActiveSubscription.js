'use strict';

const {
  fetchSubscriptionForTenant,
  resolveTenantId,
} = require('../utils/subscription');

const { supabaseAdmin } = require('../utils/supabaseAdmin');  // ⬅️ admin
const { computeEntitlements } = require('../utils/entitlements');

// Lee tenant con campos de trial/soft_blocked (sin RLS)
async function getTenantById(id) {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('id, slug, nombre_empresa, email, trial_active, trial_quota, trial_used, soft_blocked')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

/**
 * Bloquea solo si NO hay sub activa NI queda trial.
 * Devuelve 402 JSON con entitlements cuando bloquea.
 */
module.exports = function requireActiveSubscription() {
  return async (req, res, next) => {
    try {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ ok: false, error: 'TENANT_NOT_RESOLVED' });
      }

      const [tenant, sub] = await Promise.all([
        getTenantById(tenantId),
        fetchSubscriptionForTenant(tenantId)
      ]);

      const ent = computeEntitlements({ tenant, subscription: sub });

      try {
        res.setHeader('X-SubFirewall', 'active-required');
        res.setHeader('X-CanUseApp', ent.canUseApp ? '1' : '0');
        res.setHeader('X-Ent-Reason', String(ent.reason || ''));
        res.setHeader('Cache-Control', 'no-store');
      } catch {}

      if (!ent.canUseApp) {
        return res.status(402).json({
          ok: false,
          error: 'PAYMENT_REQUIRED',
          reason: ent.reason || 'inactive',
          entitlements: ent,
          tenant_id: tenantId,
        });
      }

      req.tenantId = tenantId;
      req.subscription = sub;
      req.entitlements = ent;
      if (!req.tenant) req.tenant = tenant || { id: tenantId };

      return next();
    } catch (err) {
      console.error('requireActiveSubscription error:', err);
      return res.status(500).json({ ok: false, error: 'SUBSCRIPTION_CHECK_FAILED' });
    }
  };
};
