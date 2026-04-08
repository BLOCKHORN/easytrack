// backend/src/routes/admin.billing.routes.js
'use strict';

const express = require('express');
const Stripe  = require('stripe');
const requireAuth = require('../middlewares/requireAuth');
const { supabase } = require('../utils/supabaseClient');

const router = express.Router();

const STRIPE_KEY   = process.env.STRIPE_SECRET_KEY;
const stripe       = STRIPE_KEY ? new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' }) : null;
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const TRIAL_DAYS   = Number(process.env.UPGRADE_TRIAL_DAYS || 30);
const CURRENCY     = (process.env.BILLING_CURRENCY || 'eur').toLowerCase();

/* ---- permisos admin (stub) ---- */
async function requireAdmin(_req, _res, next) { return next(); }

/* ---- helpers ---- */
const bad = (res, code, msg, extra = {}) => res.status(code).json({ ok:false, error: msg, ...extra });
const ok  = (res, payload={}) => res.json({ ok:true, ...payload });
const norm = (v) => String(v || '').trim();

function mapKnownErrorToHttp(eMsg) {
  if (!eMsg) return { code: 500, msg: 'UNEXPECTED' };
  const m = String(eMsg);
  if (m.includes('STRIPE_NOT_CONFIGURED'))         return { code: 503, msg: 'Stripe no configurado' };
  if (m.includes('TENANT_NOT_FOUND'))              return { code: 404, msg: 'TENANT_NOT_FOUND' };
  if (m.includes('PLAN_NOT_FOUND_OR_INACTIVE'))    return { code: 404, msg: 'PLAN_NOT_FOUND_OR_INACTIVE' };
  if (m.includes('PLAN_WITHOUT_STRIPE_PRICE'))     return { code: 400, msg: 'PLAN_WITHOUT_STRIPE_PRICE' };
  if (m.includes('SUB_NOT_FOUND_OR_NOT_STRIPE'))   return { code: 404, msg: 'SUB_NOT_FOUND_OR_NOT_STRIPE' };
  if (m.includes('SUBSCRIPTION_ITEM_NOT_FOUND'))   return { code: 404, msg: 'SUBSCRIPTION_ITEM_NOT_FOUND' };
  if (m.includes('PLAN_NOT_ALLOWED_FOR_TIER'))     return { code: 400, msg: 'PLAN_NOT_ALLOWED_FOR_TIER' };
  if (m.includes('NO_TIER_ASSIGNED'))              return { code: 400, msg: 'NO_TIER_ASSIGNED' };
  if (m.includes('NO_TENANT_FOR_USER'))            return { code: 403, msg: 'NO_TENANT_FOR_USER' };
  return { code: 400, msg: m };
}

function intervalFromMonths(months) {
  const m = Number(months) || 1;
  if (m === 12) return { interval: 'year',  interval_count: 1 };
  return { interval: 'month', interval_count: m };
}

function tierOfCode(code) {
  if (!code) return null;
  const c = String(code).toLowerCase();
  if (c.startsWith('basic')) return 'basic';
  if (c.startsWith('pro'))   return 'pro';
  if (c.startsWith('elite')) return 'elite';
  return null;
}

/** Asegura Customer de Stripe para el tenant y devuelve su id */
async function ensureStripeCustomerForTenant(tenantId) {
  const { data: t, error } = await supabase
    .from('tenants')
    .select('id, email, nombre_empresa, stripe_customer_id, billing_email, billing_name, billing_country, billing_state, billing_city, billing_zip, billing_address1, billing_address2, tax_id')
    .eq('id', tenantId)
    .maybeSingle();
  if (error || !t) throw error || new Error('TENANT_NOT_FOUND');

  if (t.stripe_customer_id) return t.stripe_customer_id;

  if (!stripe) throw new Error('STRIPE_NOT_CONFIGURED');
  const customer = await stripe.customers.create({
    email: t.billing_email || t.email || undefined,
    name : t.billing_name  || t.nombre_empresa || undefined,
    address: {
      country: t.billing_country || undefined,
      state:   t.billing_state   || undefined,
      city:    t.billing_city    || undefined,
      postal_code: t.billing_zip || undefined,
      line1: t.billing_address1 || undefined,
      line2: t.billing_address2 || undefined
    },
    metadata: { tenant_id: tenantId }
  });

  if (t.tax_id) {
    try { await stripe.customers.createTaxId(customer.id, { type: 'eu_vat', value: t.tax_id }); } catch {}
  }

  await supabase.from('tenants').update({ stripe_customer_id: customer.id }).eq('id', tenantId);
  return customer.id;
}

/** Busca el plan por code/name. Si no tiene price en Stripe, lo crea y guarda. */
async function ensureStripePriceForPlan(planCodeRaw) {
  if (!stripe) throw new Error('STRIPE_NOT_CONFIGURED');

  const key = norm(planCodeRaw);

  let { data: plan, error } = await supabase
    .from('billing_plans')
    .select('id, code, name, active, base_price_cents, period_months, stripe_price_id')
    .ilike('code', key)
    .maybeSingle();
  if (error) throw error;

  if (!plan) {
    const byName = await supabase
      .from('billing_plans')
      .select('id, code, name, active, base_price_cents, period_months, stripe_price_id')
      .ilike('name', key)
      .maybeSingle();
    if (byName.error) throw byName.error;
    plan = byName.data || null;
  }

  if (!plan || !plan.active) throw new Error(`PLAN_NOT_FOUND_OR_INACTIVE: ${key}`);

  if (plan.stripe_price_id) {
    return { priceId: plan.stripe_price_id, resolvedCode: plan.code, planRow: plan };
  }

  const { interval, interval_count } = intervalFromMonths(plan.period_months || 1);

  const product = await stripe.products.create({
    name: plan.name || plan.code,
    metadata: { plan_code: plan.code, period_months: String(plan.period_months || 1) },
  });

  const price = await stripe.prices.create({
    currency: CURRENCY,
    unit_amount: Number(plan.base_price_cents || 0),
    product: product.id,
    nickname: plan.code,
    recurring: { interval, interval_count, usage_type: 'licensed' },
    tax_behavior: 'unspecified',
  });

  await supabase.from('billing_plans').update({ stripe_price_id: price.id }).eq('id', plan.id);
  return { priceId: price.id, resolvedCode: plan.code, planRow: plan };
}

/* ===================== RUTAS (SIN prefijos internos) ===================== */
/* Nota: en app.js ya lo montas con app.use('/admin', adminBillingRoutes)   */

/* GET /admin/tenants/:tenantId/billing-state */
router.get('/tenants/:tenantId/billing-state', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tenantId = req.params.tenantId;

    const { data: t, error: tErr } = await supabase
      .from('tenants')
      .select('id, email, nombre_empresa, slug, stripe_customer_id, billing_tier, trial_active, trial_quota, trial_used, soft_blocked')
      .eq('id', tenantId)
      .maybeSingle();
    if (tErr) throw tErr;

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, plan_id, provider, status, trial_ends_at, current_period_start, current_period_end, cancel_at_period_end, provider_subscription_id')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return ok(res, { tenant: t || null, subscription: sub || null });
  } catch (e) {
    const { code, msg } = mapKnownErrorToHttp(e.message);
    return bad(res, code, msg);
  }
});

/* POST /admin/billing/assign-tier */
router.post('/billing/assign-tier', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { tenantId, tier } = req.body || {};
    if (!tenantId || !['basic','pro','elite'].includes(String(tier))) {
      return bad(res, 400, 'Parámetros inválidos');
    }

    const { data: ten, error: et } = await supabase
      .from('tenants').select('id').eq('id', tenantId).maybeSingle();
    if (et || !ten) throw et || new Error('TENANT_NOT_FOUND');

    const { error: eu } = await supabase
      .from('tenants').update({ billing_tier: tier }).eq('id', tenantId);
    if (eu) throw eu;

    // Pre-provisionar prices de ese tier si Stripe está configurado
    if (stripe) {
      const { data: plans, error: ep } = await supabase
        .from('billing_plans')
        .select('id, code, name, active, base_price_cents, period_months, stripe_price_id')
        .ilike('code', `${tier}_m%`)
        .eq('active', true);
      if (ep) throw ep;

      for (const p of (plans || [])) {
        try { await ensureStripePriceForPlan(p.code); } catch {}
      }
    }

    return ok(res, { tenantId, tier });
  } catch (e) {
    console.error('[assign-tier] ERROR', e?.message || e, { body: req.body });
    const { code, msg } = mapKnownErrorToHttp(e.message);
    return bad(res, code, msg);
  }
});

/* POST /admin/billing/assign-plan */
router.post('/billing/assign-plan', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!stripe) throw new Error('STRIPE_NOT_CONFIGURED');

    const { tenant_id, plan_code } = req.body || {};
    if (!tenant_id || !plan_code) {
      return bad(res, 400, 'tenant_id y plan_code son requeridos');
    }

    const tenantId = norm(tenant_id);

    const { priceId, resolvedCode } = await ensureStripePriceForPlan(plan_code);
    const customerId = await ensureStripeCustomerForTenant(tenantId);
    const metadata = { tenant_id: tenantId, plan_code: resolvedCode };

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: false,
      subscription_data: { trial_period_days: TRIAL_DAYS || undefined, metadata },
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'auto',
      customer_update: { name: 'auto', address: 'auto' },
      client_reference_id: tenantId,
      success_url: `${FRONTEND_URL}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${FRONTEND_URL}/dashboard`,
      locale: 'es',
      metadata
    });

    return ok(res, { url: session.url });
  } catch (e) {
    console.error('[assign-plan] ERROR', e?.message || e, { body: req.body });
    const { code, msg } = mapKnownErrorToHttp(e.message);
    return bad(res, code, msg);
  }
});

/* POST /admin/billing/swap-subscription */
router.post('/billing/swap-subscription', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!stripe) throw new Error('STRIPE_NOT_CONFIGURED');

    const { tenant_id, plan_code } = req.body || {};
    if (!tenant_id || !plan_code) return bad(res, 400, 'tenant_id y plan_code requeridos');

    const tenantId = norm(tenant_id);

    const { priceId, resolvedCode } = await ensureStripePriceForPlan(plan_code);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('provider, provider_subscription_id, status')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.provider_subscription_id || sub.provider !== 'stripe') {
      throw new Error('SUB_NOT_FOUND_OR_NOT_STRIPE');
    }

    const stripeSub = await stripe.subscriptions.retrieve(sub.provider_subscription_id, { expand: ['items.data.price'] });
    const item = stripeSub?.items?.data?.[0];
    if (!item?.id) throw new Error('SUBSCRIPTION_ITEM_NOT_FOUND');

    await stripe.subscriptionItems.update(item.id, {
      price: priceId,
      proration_behavior: 'create_prorations',
      quantity: 1,
    });

    return ok(res);
  } catch (e) {
    console.error('[swap-subscription] ERROR', e?.message || e, { body: req.body });
    const { code, msg } = mapKnownErrorToHttp(e.message);
    return bad(res, code, msg);
  }
});

/* POST /admin/billing/subscription/:subId/trial/end */
router.post('/billing/subscription/:subId/trial/end', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!stripe) throw new Error('STRIPE_NOT_CONFIGURED');
    const { subId } = req.params;
    const updated = await stripe.subscriptions.update(subId, { trial_end: 'now' });
    return ok(res, { subscription: { id: updated.id, status: updated.status, trial_end: updated.trial_end } });
  } catch (e) {
    console.error('[trial/end] ERROR', e?.message || e);
    const { code, msg } = mapKnownErrorToHttp(e.message);
    return bad(res, code, msg);
  }
});

/* POST /admin/billing/subscription/:subId/trial/extend */
router.post('/billing/subscription/:subId/trial/extend', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!stripe) throw new Error('STRIPE_NOT_CONFIGURED');
    const { subId } = req.params;
    const { days } = req.body || {};
    const addDays = Number(days || 0);
    if (!addDays) return bad(res, 400, 'DAYS_REQUIRED');

    const sub = await stripe.subscriptions.retrieve(subId);
    if (String(sub.status).toLowerCase() !== 'trialing') {
      return bad(res, 400, 'SUBSCRIPTION_NOT_IN_TRIAL');
    }
    const base = sub.trial_end || Math.floor(Date.now()/1000);
    const newTrialEnd = base + (addDays * 24 * 60 * 60);
    const updated = await stripe.subscriptions.update(subId, { trial_end: newTrialEnd });
    return ok(res, { subscription: { id: updated.id, status: updated.status, trial_end: updated.trial_end } });
  } catch (e) {
    console.error('[trial/extend] ERROR', e?.message || e);
    const { code, msg } = mapKnownErrorToHttp(e.message);
    return bad(res, code, msg);
  }
});

/* POST /admin/billing/sync-from-stripe/:tenantId */
router.post('/billing/sync-from-stripe/:tenantId', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!stripe) throw new Error('STRIPE_NOT_CONFIGURED');
    const tenantId = req.params.tenantId;

    const { data: subRow, error: subErr } = await supabase
      .from('subscriptions')
      .select('id, provider, provider_subscription_id, provider_customer_id, plan_id')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subErr) throw subErr;
    if (!subRow || subRow.provider !== 'stripe' || !subRow.provider_subscription_id) {
      return res.status(404).json({ ok:false, error: 'SUB_NOT_FOUND_OR_NOT_STRIPE' });
    }

    const stripeSub = await stripe.subscriptions.retrieve(subRow.provider_subscription_id, {
      expand: ['items.data.price']
    });

    const toISO = (sec) => (sec ? new Date(sec * 1000).toISOString() : null);
    const status = String(stripeSub.status || '').toLowerCase();

    const row = {
      tenant_id: tenantId,
      plan_id: subRow.plan_id || null,
      provider: 'stripe',
      provider_customer_id: stripeSub.customer || null,
      provider_subscription_id: stripeSub.id,
      status,
      current_period_start: toISO(stripeSub.current_period_start),
      current_period_end:   toISO(stripeSub.current_period_end),
      trial_ends_at:        toISO(stripeSub.trial_end),
      cancel_at_period_end: !!stripeSub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    };

    const { error: upErr } = await supabase
      .from('subscriptions')
      .upsert(row, { onConflict: 'provider,provider_subscription_id' });
    if (upErr) throw upErr;

    return res.json({ ok:true, subscription: row });
  } catch (e) {
    console.error('[sync-from-stripe] ERROR', e?.message || e);
    return res.status(400).json({ ok:false, error: e?.message || 'SYNC_FAILED' });
  }
});

module.exports = router;
