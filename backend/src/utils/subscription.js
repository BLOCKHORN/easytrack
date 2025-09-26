'use strict';
const { supabaseAdmin } = require('./supabaseAdmin');

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

async function fetchSubscriptionForTenant(tenantId) {
  if (!tenantId) return null;

  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select(`
      id, tenant_id, plan_id, provider, status, trial_ends_at,
      current_period_start, current_period_end, cancel_at_period_end,
      created_at, updated_at, provider_subscription_id, provider_customer_id
    `)
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })
    .order('current_period_end', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[fetchSubscriptionForTenant] error:', error);
    return null;
  }
  return data || null;
}

function isSubscriptionActive(sub) {
  if (!sub) return { active: false, reason: 'no_subscription' };

  const status   = String(sub.status || '').toLowerCase();
  const now      = Date.now();
  const cpe      = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  const trialEnd = sub.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : null;

  // Ventana válida: fin de periodo o, si no hay, fin de trial
  const untilTs = (cpe ?? trialEnd ?? null);
  const windowValid = (untilTs == null) || (untilTs > now);

  if (status === 'active')    return { active: windowValid, reason: windowValid ? null : 'expired' };
  if (status === 'trialing')  return { active: windowValid, reason: (untilTs && untilTs <= now) ? 'trial_expired' : null };
  if (status === 'canceled')  return { active: windowValid, reason: (untilTs && untilTs <= now) ? 'canceled' : null };
  if (['past_due','unpaid','incomplete'].includes(status)) return { active: false, reason: status };

  return { active: false, reason: status || 'inactive' };
}

module.exports = {
  resolveTenantId,
  fetchSubscriptionForTenant,
  isSubscriptionActive,
};
