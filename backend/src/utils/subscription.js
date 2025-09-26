// utils/subscription.js
'use strict';
const { supabaseAdmin } = require('./supabaseAdmin');

async function fetchSubscriptionForTenant(tenantId) {
  if (!tenantId) return null;
  const { data, error } = await supabaseAdmin
    .from('v_current_subscription') // 👈 usamos la vista
    .select(`
      id, tenant_id, plan_id, provider, status, trial_ends_at,
      current_period_start, current_period_end, cancel_at_period_end,
      created_at, updated_at, provider_subscription_id, provider_customer_id
    `)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    console.error('[fetchSubscriptionForTenant] error:', error);
    return null;
  }
  return data || null;
}

function isSubscriptionActive(sub) {
  if (!sub) return { active: false, reason: 'no_subscription' };

  const status = String(sub.status || '').toLowerCase();
  const untilTs =
    sub.current_period_end ? new Date(sub.current_period_end).getTime()
    : sub.trial_ends_at   ? new Date(sub.trial_ends_at).getTime()
    : null;

  const windowOk = (untilTs == null) || (untilTs > Date.now());

  if (status === 'active')   return { active: windowOk, reason: windowOk ? null : 'expired' };
  if (status === 'trialing') return { active: windowOk, reason: windowOk ? null : 'trial_expired' };
  if (status === 'canceled') return { active: windowOk, reason: windowOk ? null : 'canceled' };
  if (['past_due','unpaid','incomplete'].includes(status)) return { active: false, reason: status };
  return { active: false, reason: status || 'inactive' };
}

async function resolveTenantId(req) {
  if (req.tenant?.id) return req.tenant.id;

  const slug = req.params?.tenantSlug || req.query?.slug || null;
  if (slug) {
    const { data: t } = await supabaseAdmin
      .from('tenants').select('id, slug').eq('slug', slug).maybeSingle();
    if (t?.id) return t.id;
  }

  const headerTid = req.headers['x-tenant-id'];
  if (headerTid) return headerTid;

  const email = req.user?.email;
  if (email) {
    const { data: t } = await supabaseAdmin
      .from('tenants')
      .select('id, slug, updated_at')
      .ilike('email', email)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (t?.id) return t.id;
  }

  return null;
}

module.exports = {
  fetchSubscriptionForTenant,
  isSubscriptionActive,
  resolveTenantId,
};
