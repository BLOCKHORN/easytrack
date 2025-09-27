// utils/subscription.js
'use strict';

const { supabaseAdmin } = require('./supabaseAdmin');
const Stripe = require('stripe');

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || '';
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' }) : null;

/**
 * Enriquecer una fila de suscripción con datos reales de Stripe
 * (price/product/fechas). Si no hay Stripe o falla, devolvemos tal cual.
 */
async function enrichWithStripe(row) {
  if (!row) return row;
  if (!stripe) return row;
  if (row.provider !== 'stripe') return row;
  if (!row.provider_subscription_id) return row;

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
      trial_end: toIso(s.trial_end) || row.trial_end || row.trial_ends_at,

      // anidamos price/product para que computeEntitlements pueda sacar plan
      price: price
        ? {
            id: price.id,
            nickname: price.nickname,
            currency: price.currency,
            unit_amount: price.unit_amount,
            unit_amount_decimal: price.unit_amount_decimal,
            recurring: price.recurring,
            metadata: price.metadata,
          }
        : null,
      product: product
        ? {
            id: product.id,
            name: product.name,
            metadata: product.metadata,
          }
        : null,
    };
  } catch (e) {
    console.warn('[fetchSubscriptionForTenant] enrich Stripe falló:', e?.message || e);
    return row;
  }
}

/**
 * Trae la suscripción “actual” desde tu vista y la enriquece con Stripe.
 */
async function fetchSubscriptionForTenant(tenantId) {
  if (!tenantId) return null;

  const { data, error } = await supabaseAdmin
    .from('v_current_subscription')
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
  if (!data) return null;

  // Enriquecemos con Stripe (si procede) y devolvemos
  return enrichWithStripe(data);
}

/**
 * Helpers existentes (sin cambios)
 */
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
