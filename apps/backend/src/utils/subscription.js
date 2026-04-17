'use strict';

const { supabaseAdmin } = require('./supabaseClient');
const Stripe = require('stripe');

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || '';
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' }) : null;

async function enrichWithStripe(row) {
  if (!row || !stripe || row.provider !== 'stripe' || !row.provider_subscription_id) return row;
  try {
    const s = await stripe.subscriptions.retrieve(row.provider_subscription_id, {
      expand: ['items.data.price.product'],
    });
    const price = s.items?.data?.[0]?.price || null;
    const product = price?.product || null;
    const toIso = (sec) => (sec ? new Date(sec * 1000).toISOString() : null);
    return {
      ...row,
      status: s.status || row.status,
      cancel_at_period_end: s.cancel_at_period_end ?? row.cancel_at_period_end,
      current_period_start: toIso(s.current_period_start) || row.current_period_start,
      current_period_end: toIso(s.current_period_end) || row.current_period_end,
      price: price ? { id: price.id, nickname: price.nickname, currency: price.currency, unit_amount: price.unit_amount, recurring: price.recurring } : null,
      product: product ? { id: product.id, name: product.name } : null,
    };
  } catch (e) {
    console.warn('[fetchSubscriptionForTenant] enrich falló:', e?.message);
    return row;
  }
}

async function fetchSubscriptionForTenant(tenantId) {
  if (!tenantId) return null;
  const fields = 'id, tenant_id, plan_id, provider, status, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at, provider_subscription_id, provider_customer_id';
  
  let { data } = await supabaseAdmin.from('v_current_subscription').select(fields).eq('tenant_id', tenantId).maybeSingle();
  
  if (!data) {
    const { data: raw } = await supabaseAdmin.from('subscriptions').select(fields).eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    data = raw;
  }

  if (!data) return null;
  return enrichWithStripe(data);
}

async function resolveTenantId(req) {
  if (req.tenant?.id) return req.tenant.id;
  const slug = req.params?.tenantSlug || req.query?.slug || null;
  if (slug) {
    const { data: t } = await supabaseAdmin.from('tenants').select('id').eq('slug', slug).maybeSingle();
    if (t?.id) return t.id;
  }
  const email = req.user?.email;
  if (email) {
    const { data: t } = await supabaseAdmin.from('tenants').select('id').ilike('email', email).order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (t?.id) return t.id;
  }
  return null;
}

module.exports = { fetchSubscriptionForTenant, resolveTenantId };