'use strict';

const { fetchSubscriptionForTenant, resolveTenantId } = require('../utils/subscription');
const { supabaseAdmin } = require('../utils/supabaseClient');
const { computeEntitlements } = require('../utils/entitlements');
const { isDirectPg, query } = require('../utils/db');

async function getTenantById(id) {
  if (isDirectPg()) {
    try {
      const { rows } = await query(
        'SELECT id, slug, nombre_empresa, email, plan_id, trial_quota, trial_used, soft_blocked, stripe_customer_id, fecha_creacion FROM public.tenants WHERE id = $1 LIMIT 1',
        [id]
      );
      return rows[0] || null;
    } catch (e) {
      console.error('[requireActiveSubscription getTenantById directPg error]', e);
    }
  }

  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('id, slug, nombre_empresa, email, plan_id, trial_quota, trial_used, soft_blocked, stripe_customer_id, fecha_creacion')
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
        fetchSubscriptionForTenant(tenantId)
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