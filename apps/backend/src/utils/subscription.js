'use strict';

const { supabaseAdmin } = require('./supabaseClient');
const { isDirectPg, query } = require('./db');
const Stripe = require('stripe');

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || '';
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' }) : null;

// Cache en memoria para suscripciones Stripe (TTL 5 minutos para eliminar latencia síncrona en cada petición)
const __SUB_CACHE = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function clearSubscriptionCache(tenantId) {
  if (tenantId) __SUB_CACHE.delete(tenantId);
  else __SUB_CACHE.clear();
}

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
    if (e.statusCode === 404) {
      return { ...row, status: 'canceled' };
    }
    return row;
  }
}

async function fetchSubscriptionForTenant(tenantId) {
  if (!tenantId) return null;

  const cached = __SUB_CACHE.get(tenantId);
  if (cached && (Date.now() - cached.ts < CACHE_TTL_MS)) {
    return cached.val;
  }

  const fields = 'id, tenant_id, plan_id, provider, status, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at, provider_subscription_id, provider_customer_id';
  
  let result = null;

  if (isDirectPg()) {
    try {
      let { rows } = await query(`SELECT ${fields} FROM public.v_current_subscription WHERE tenant_id = $1 LIMIT 1`, [tenantId]);
      if (rows.length === 0) {
        const resRaw = await query(`SELECT ${fields} FROM public.subscriptions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`, [tenantId]);
        rows = resRaw.rows;
      }
      if (rows.length > 0) {
        result = await enrichWithStripe(rows[0]);
      }
    } catch (e) {
      console.error('[fetchSubscription DirectPg error]', e);
    }
  }

  if (!result) {
    let { data } = await supabaseAdmin.from('v_current_subscription').select(fields).eq('tenant_id', tenantId).maybeSingle();
    
    if (!data) {
      const { data: raw } = await supabaseAdmin.from('subscriptions').select(fields).eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      data = raw;
    }

    if (data) {
      result = await enrichWithStripe(data);
    }
  }

  __SUB_CACHE.set(tenantId, { val: result, ts: Date.now() });
  return result;
}

async function resolveTenantId(req) {
  if (req.tenant?.id) return req.tenant.id;
  const slug = req.params?.tenantSlug || req.query?.slug || null;
  if (slug) {
    if (isDirectPg()) {
      try {
        const { rows } = await query('SELECT id FROM public.tenants WHERE slug = $1 LIMIT 1', [slug]);
        if (rows[0]?.id) return rows[0].id;
      } catch (e) {
        console.error('[resolveTenantId slug DirectPg error]', e);
      }
    } else {
      const { data: t } = await supabaseAdmin.from('tenants').select('id').eq('slug', slug).maybeSingle();
      if (t?.id) return t.id;
    }
  }
  const email = req.user?.email;
  if (email) {
    if (isDirectPg()) {
      try {
        const { rows } = await query('SELECT id FROM public.tenants WHERE email ILIKE $1 ORDER BY fecha_creacion DESC LIMIT 1', [email]);
        if (rows[0]?.id) return rows[0].id;
      } catch (e) {
        console.error('[resolveTenantId email DirectPg error]', e);
      }
    } else {
      const { data: t } = await supabaseAdmin.from('tenants').select('id').ilike('email', email).order('fecha_creacion', { ascending: false }).limit(1).maybeSingle();
      if (t?.id) return t.id;
    }
  }
  return null;
}

module.exports = { fetchSubscriptionForTenant, resolveTenantId, clearSubscriptionCache };