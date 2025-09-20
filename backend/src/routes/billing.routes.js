// routes/billing.routes.js
'use strict';

const express = require('express');
const Stripe  = require('stripe');
const { supabase, supabaseAdmin } = require('../utils/supabaseClient');
const { getPlans, normalizePlan } = require('../utils/pricing');
const { slugifyBase, uniqueSlug } = require('../helpers/slug');
const requireAuth = require('../middlewares/requireAuth');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

/**
 * ⚠️ Importante: FRONTEND_URL siempre debe ser el FRONT.
 */
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/,'');
const TRIAL_DAYS = 30;

const toEmail = (v) => String(v || '').trim().toLowerCase();

/* -----------------------------------------------------------
   Helpers
----------------------------------------------------------- */
async function upsertTenantByEmail(email, businessName) {
  const low = toEmail(email);

  // ⛑️ Selección "segura": solo columnas que sabemos que existen
  const { data: exist, error: exErr } = await supabase
    .from('tenants')
    .select('id, slug, nombre_empresa, email, stripe_customer_id') // <- nada de stripe_status / plan_*
    .eq('email', low)
    .maybeSingle();

  if (exErr) throw exErr;
  if (exist?.id) return exist;

  const base = slugifyBase(businessName || low.split('@')[0]);
  const slug = await uniqueSlug(supabase, base);

  const { data, error } = await supabase
    .from('tenants')
    .insert([{ email: low, nombre_empresa: businessName || base, slug }])
    .select('id, slug, nombre_empresa, email, stripe_customer_id')
    .single();

  if (error) throw error;
  return data;
}

function makeIdemKey(req, tenantId, planCode) {
  const hdr = req.get && req.get('x-idem-key');
  if (hdr) return hdr;
  const bucket = Math.floor(Date.now() / 10000);
  return `co:${tenantId || 'anon'}:${planCode}:${bucket}`;
}

/* ========= Helpers Stripe <-> App para suscripciones ========= */

/** Devuelve un resumen estable de una suscripción de Stripe. */
function summarizeSubscription(sub) {
  if (!sub) return null;
  const item  = sub.items?.data?.[0] || null;
  const price = item?.price || null;
  const interval = price?.recurring?.interval;

  const planLabel =
    price?.nickname ||
    (interval === 'year' ? 'Anual' : interval === 'month' ? 'Mensual' : 'Plan');

  return {
    id: sub.id,
    status: sub.status,                              // active | trialing | past_due | canceled | unpaid | incomplete
    cancel_at_period_end: sub.cancel_at_period_end === true,
    current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
    price_cents: price?.unit_amount ?? null,
    plan_label: planLabel,
    interval_label: interval === 'year' ? 'pago anual' : 'pago mensual',
    customer: sub.customer || null,
  };
}

/** Busca la última suscripción del tenant en Stripe (por customer). */
async function fetchLatestStripeSubscriptionForTenant(tenantId) {
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, stripe_customer_id')
    .eq('id', tenantId)
    .maybeSingle();
  if (error) throw error;
  if (!tenant?.stripe_customer_id) return { tenant, subscription: null };

  // Traemos la más reciente (Stripe ordena desc por creación)
  const list = await stripe.subscriptions.list({
    customer: tenant.stripe_customer_id,
    status: 'all',
    limit: 1,
    expand: ['data.items.data.price'],
  });

  const sub = list.data?.[0] || null;
  return { tenant, subscription: sub };
}

/* -----------------------------------------------------------
   GET /billing/plans
----------------------------------------------------------- */
router.get('/plans', async (_req, res) => {
  try {
    const plans = await getPlans();
    return res.status(200).json({ ok: true, plans });
  } catch (err) {
    console.error('[GET /billing/plans] Error:', err);
    return res.status(500).json({ ok: false, error: 'Cannot load plans' });
  }
});

/* -----------------------------------------------------------
   POST /billing/checkout/start
----------------------------------------------------------- */
router.post('/checkout/start', async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ ok:false, error:'STRIPE_SECRET_KEY no configurado' });
    }

    const { plan_code, email, tenant_name } = req.body || {};
    const userEmail = toEmail(email);
    if (!plan_code) return res.status(400).json({ ok:false, error:'plan_code es requerido' });
    if (!userEmail) return res.status(400).json({ ok:false, error:'email es requerido' });

    const planCode = normalizePlan(plan_code);

    const { data: plan, error: perr } = await supabase
      .from('billing_plans')
      .select('id, code, stripe_price_id')
      .eq('code', planCode)
      .eq('active', true)
      .single();

    if (perr || !plan) return res.status(404).json({ ok:false, error:'Plan no encontrado' });
    if (!plan.stripe_price_id) return res.status(500).json({ ok:false, error:'stripe_price_id ausente en plan' });

    const tenant = await upsertTenantByEmail(userEmail, tenant_name);
    const tenantId = tenant.id;
    const stripeCustomerId = tenant.stripe_customer_id || undefined;

    // trial una sola vez por tenant
    let trialDays = TRIAL_DAYS;
    try {
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('tenant_id', tenantId)
        .limit(1);
      if (subs && subs.length > 0) trialDays = 0;
    } catch {}

    const meta = { tenant_id: tenantId, plan_code: plan.code, signup_email: userEmail, tenant_name: tenant_name || '' };

    const sessionParams = {
      mode: 'subscription',
      locale: 'es',

      // ⚠️ customer o customer_email (NO ambos)
      customer: stripeCustomerId,
      customer_email: stripeCustomerId ? undefined : userEmail,

      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      payment_method_collection: 'always',
      allow_promotion_codes: true,

      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },

      billing_address_collection: 'auto',

      success_url: `${FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/planes?plan=${encodeURIComponent(plan.code)}&cancel=1`,

      client_reference_id: String(tenantId),
      metadata: meta,
      subscription_data: {
        trial_period_days: trialDays || undefined,
        metadata: meta
      }
    };

    // 👇 Solo cuando enviamos `customer` (Customer existente)
    if (stripeCustomerId) {
      sessionParams.customer_update = { name: 'auto', address: 'auto' };
    }

    const idemKey = makeIdemKey(req, tenantId, plan.code);
    const session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey: idemKey });

    await supabase.from('subscriptions').insert([{
      tenant_id: tenantId,
      plan_id: plan.id,
      provider: 'stripe',
      status: 'incomplete',
      provider_session_id: session.id,
      current_period_start: new Date()
    }]);

    return res.status(200).json({ ok: true, checkout_url: session.url, session_id: session.id });
  } catch (err) {
    console.error('[POST /billing/checkout/start] Error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Internal Server Error' });
  }
});

/* -----------------------------------------------------------
   GET /billing/checkout/verify?session_id=cs_xxx
----------------------------------------------------------- */
router.get('/checkout/verify', async (req, res) => {
  const baseFail = (code, message) => {
    const urlsObj = { portal: '', dashboard: `${FRONTEND_URL}/app`, plans: `${FRONTEND_URL}/planes` };
    const urlsArr = [urlsObj.portal, urlsObj.dashboard, urlsObj.plans].filter(Boolean);
    return res.status(code).json({ ok: false, error: message, urls: urlsObj, checkoutUrls: urlsArr });
  };

  try {
    const sessionId = String(req.query.session_id || '').trim();
    if (!sessionId) return baseFail(400, 'session_id requerido');

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer']
    });
    if (!session) return baseFail(404, 'Sesión no encontrada');

    const sub      = session.subscription || null;
    const customer = session.customer || null;

    const { data: localSub } = await supabase
      .from('subscriptions')
      .select('id, tenant_id, plan_id, status, provider_subscription_id')
      .eq('provider', 'stripe')
      .eq('provider_session_id', session.id)
      .maybeSingle();

    let portalUrl = '';
    if (customer && customer.id) {
      try {
        const portal = await stripe.billingPortal.sessions.create({
          customer: customer.id,
          return_url: `${FRONTEND_URL}/app`
        });
        portalUrl = portal.url || '';
      } catch (e) {
        console.warn('[verify] no portal url:', e?.message);
      }
    }

    const urlsObj = {
      portal: portalUrl,
      dashboard: `${FRONTEND_URL}/app`,
      plans: `${FRONTEND_URL}/planes`
    };
    const urlsArr = [urlsObj.portal, urlsObj.dashboard, urlsObj.plans].filter(Boolean);

    const payload = {
      sessionId,
      tenantId: localSub?.tenant_id || session.client_reference_id || null,
      planCode: session.metadata?.plan_code || sub?.metadata?.plan_code || null,
      customerEmail: (customer && customer.email) || session.customer_email || null,
      status: sub?.status || 'incomplete',
      trialEndsAt: sub?.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      currentPeriodEnd: sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
      checkoutUrls: urlsArr,
      urls: urlsObj
    };

    return res.status(200).json({ ok: true, ...payload, data: payload });
  } catch (err) {
    console.error('[GET /billing/checkout/verify] Error:', err);
    return baseFail(500, err.message || 'Internal Server Error');
  }
});

/* -----------------------------------------------------------
   POST /billing/checkout/resend-invite
   (invite → reset fallback)
----------------------------------------------------------- */
router.post('/checkout/resend-invite', async (req, res) => {
  try {
    const email = toEmail(req.body?.email);
    if (!email) return res.status(400).json({ ok:false, error:'email requerido' });

    const admin = (supabaseAdmin?.auth?.admin) ? supabaseAdmin : supabase;
    if (!admin?.auth?.admin?.inviteUserByEmail) {
      return res.status(503).json({ ok:false, error:'Service role no configurado' });
    }

    const redirectTo = `${FRONTEND_URL}/crear-password`;

    // 1) Intentar INVITE
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (!error) {
      console.log('[resend-invite] invite sent to', email);
      return res.json({ ok:true, kind:'invite', data });
    }

    // 2) Si ya existe → fallback RESET
    const msg = String(error.message || '').toLowerCase();
    const already = msg.includes('already been registered') || msg.includes('user already registered');
    if (already) {
      const { error: rerr } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (rerr) {
        console.error('[resend-invite] reset fallback error:', rerr);
        return res.status(500).json({ ok:false, error: rerr.message || 'No se pudo enviar el email de restablecer contraseña.' });
      }
      console.log('[resend-invite] reset email sent to', email);
      return res.json({ ok:true, kind:'reset' });
    }

    console.error('[resend-invite] invite error:', error);
    return res.status(500).json({ ok:false, error: error.message || 'No se pudo enviar la invitación.' });
  } catch (e) {
    console.error('[resend-invite] error:', e);
    return res.status(500).json({ ok:false, error: e.message });
  }
});

/* -----------------------------------------------------------
   GET /billing/portal (USADO POR EL FRONT)
----------------------------------------------------------- */
async function portalHandler(req, res) {
  try {
    const tenantId = req.tenant?.id || null;
    if (!tenantId) return res.status(401).json({ ok:false, error:'UNAUTHENTICATED' });

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, slug, email, stripe_customer_id') // <- seguro
      .eq('id', tenantId)
      .maybeSingle();
    if (error) throw error;

    if (!tenant?.stripe_customer_id) {
      return res.status(404).json({ ok:false, error:'TENANT_WITHOUT_CUSTOMER' });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${FRONTEND_URL}/app`
    });

    return res.json({ ok:true, url: portal.url });
  } catch (e) {
    console.error('[GET/POST /billing/portal] error', e);
    return res.status(500).json({ ok:false, error: e.message || 'PORTAL_ERROR' });
  }
}
router.get('/portal', requireAuth, portalHandler);
router.post('/portal', requireAuth, portalHandler);

/* -----------------------------------------------------------
   GET /billing/self-status (diagnóstico)
----------------------------------------------------------- */
router.get('/self-status', requireAuth, async (req, res) => {
  try {
    const key = String(process.env.STRIPE_SECRET_KEY || '');
    const stripeMode = key.startsWith('sk_live') ? 'live' : key.startsWith('sk_test') ? 'test' : 'unknown';

    const tenantId = req.tenant?.id || null;
    if (!tenantId) {
      return res.status(200).json({
        ok: true,
        stripeMode,
        note: 'No hay req.tenant aún. Revisa requireAuth/tenant resolver.'
      });
    }

    // Selección segura para no romper si faltan columnas opcionales
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, slug, email, nombre_empresa, stripe_customer_id') // <- sin stripe_status/plan_*
      .eq('id', tenantId)
      .maybeSingle();
    if (error) throw error;

    return res.json({ ok:true, stripeMode, tenant: tenant || null });
  } catch (e) {
    console.error('[billing:self-status] error', e);
    return res.status(500).json({ ok:false, error:'SELF_STATUS_ERROR' });
  }
});

/* ============================================================
   🔥 NUEVO: Gestión de renovación (cancelar / reanudar)
   ============================================================ */

router.get('/subscription', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || null;
    if (!tenantId) return res.status(401).json({ ok:false, error:'UNAUTHENTICATED' });

    const { tenant, subscription } = await fetchLatestStripeSubscriptionForTenant(tenantId);
    if (!tenant?.stripe_customer_id) {
      return res.status(404).json({ ok:false, error:'TENANT_WITHOUT_CUSTOMER' });
    }

    const summary = summarizeSubscription(subscription);
    if (!summary) return res.json({ ok:true, subscription: null });

    return res.json({ ok:true, ...summary, subscription: summary, data: summary });
  } catch (e) {
    console.error('[GET /billing/subscription] error', e);
    return res.status(500).json({ ok:false, error: e.message || 'SUBSCRIPTION_ERROR' });
  }
});

router.post('/cancel-renewal', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || null;
    if (!tenantId) return res.status(401).json({ ok:false, error:'UNAUTHENTICATED' });

    const { tenant, subscription } = await fetchLatestStripeSubscriptionForTenant(tenantId);
    if (!tenant?.stripe_customer_id) {
      return res.status(404).json({ ok:false, error:'TENANT_WITHOUT_CUSTOMER' });
    }
    if (!subscription?.id) {
      return res.status(404).json({ ok:false, error:'NO_ACTIVE_SUBSCRIPTION' });
    }

    const updated = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });

    const summary = summarizeSubscription(updated);
    return res.json({ ok:true, ...summary, subscription: summary, data: summary });
  } catch (e) {
    console.error('[POST /billing/cancel-renewal] error', e);
    return res.status(500).json({ ok:false, error: e.message || 'CANCEL_RENEWAL_ERROR' });
  }
});

router.post('/resume', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || null;
    if (!tenantId) return res.status(401).json({ ok:false, error:'UNAUTHENTICATED' });

    const { tenant, subscription } = await fetchLatestStripeSubscriptionForTenant(tenantId);
    if (!tenant?.stripe_customer_id) {
      return res.status(404).json({ ok:false, error:'TENANT_WITHOUT_CUSTOMER' });
    }
    if (!subscription?.id) {
      return res.status(404).json({ ok:false, error:'NO_ACTIVE_SUBSCRIPTION' });
    }

    const updated = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: false,
    });

    const summary = summarizeSubscription(updated);
    return res.json({ ok:true, ...summary, subscription: summary, data: summary });
  } catch (e) {
    console.error('[POST /billing/resume] error', e);
    return res.status(500).json({ ok:false, error: e.message || 'RESUME_RENEWAL_ERROR' });
  }
});

module.exports = router;
