// middlewares/requireActiveSubscription.js
'use strict';

const { fetchSubscriptionForTenant, resolveTenantId } = require('../utils/subscription');
const { supabaseAdmin } = require('../utils/supabaseAdmin');
const { computeEntitlements } = require('../utils/entitlements');

// SERVICE ROLE para leer tenant sin RLS
async function getTenantById(id) {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('id, slug, nombre_empresa, email, trial_active, trial_quota, trial_used, soft_blocked')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

module.exports = function requireActiveSubscription() {
  return async (req, res, next) => {
    try {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');

      const tenantId = await resolveTenantId(req);
      if (!tenantId) return res.status(400).json({ ok:false, error:'TENANT_NOT_RESOLVED' });

      const [tenant, sub] = await Promise.all([
        getTenantById(tenantId),
        fetchSubscriptionForTenant(tenantId)     // ver #2 más abajo
      ]);

      const ent = computeEntitlements({ tenant, subscription: sub });
      res.setHeader('X-SubFirewall', 'active-required');
      res.setHeader('X-CanUseApp', ent.canUseApp ? '1' : '0');
      res.setHeader('X-Ent-Reason', String(ent.reason || ''));

      if (!ent.canUseApp) {
        return res.status(402).json({ ok:false, error:'PAYMENT_REQUIRED', reason: ent.reason || 'inactive', entitlements: ent, tenant_id: tenantId });
      }

      req.tenantId = tenantId;
      req.subscription = sub;
      req.entitlements = ent;
      if (!req.tenant) req.tenant = tenant || { id: tenantId };
      next();
    } catch (err) {
      console.error('requireActiveSubscription error:', err);
      return res.status(500).json({ ok:false, error:'SUBSCRIPTION_CHECK_FAILED' });
    }
  };
};
