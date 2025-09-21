'use strict';

const express = require('express');
const Stripe  = require('stripe');
const { supabase, supabaseAdmin } = require('../utils/supabaseClient');
const { getPlans, normalizePlan } = require('../utils/pricing');
const requireAuth = require('../middlewares/requireAuth');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/,'');
const TRIAL_DAYS = 30;

const toEmail = (v) => String(v || '').trim().toLowerCase();

function makeIdemKey(req, keyA, keyB) {
  const hdr = req.get && req.get('x-idem-key');
  if (hdr) return hdr;
  const bucket = Math.floor(Date.now() / 10000);
  return `co:${keyA || 'anon'}:${keyB || 'plan'}:${bucket}`;
}

router.get('/plans', async (_req, res) => {
  try {
    const plans = await getPlans();
    res.json({ ok: true, plans });
  } catch (err) {
    console.error('[GET /billing/plans]', err);
    res.status(500).json({ ok: false, error: 'Cannot load plans' });
  }
});

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

    let stripeCustomerId;
    let trialDays = TRIAL_DAYS;
    try {
      const { data: existent } = await supabase
        .from('tenants')
        .select('stripe_customer_id')
        .eq('email', userEmail)
        .maybeSingle();
      stripeCustomerId = existent?.stripe_customer_id || undefined;
      if (existent) trialDays = 0;
    } catch {}

    const meta = { signup_email: userEmail, tenant_name: tenant_name || '', plan_code: plan.code };

    const sessionParams = {
      mode: 'subscription',
      locale: 'es',
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
      metadata: meta,
      subscription_data: { trial_period_days: trialDays || undefined, metadata: meta }
    };
    if (stripeCustomerId) {
      sessionParams.customer_update = { name: 'auto', address: 'auto' };
    }

    const idemKey = makeIdemKey(req, userEmail, plan.code);
    const session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey: idemKey });

    return res.json({ ok: true, checkout_url: session.url, session_id: session.id });
  } catch (err) {
    console.error('[POST /billing/checkout/start]', err);
    res.status(500).json({ ok: false, error: err.message || 'Internal Server Error' });
  }
});

router.get('/checkout/verify', async (req, res) => {
  const fail = (code, msg) => {
    const urlsObj = { portal: '', dashboard: `${FRONTEND_URL}/dashboard`, plans: `${FRONTEND_URL}/planes` };
    const urlsArr = [urlsObj.portal, urlsObj.dashboard, urlsObj.plans].filter(Boolean);
    return res.status(code).json({ ok:false, error: msg, urls: urlsObj, checkoutUrls: urlsArr });
  };

  try {
    const sessionId = String(req.query.session_id || '').trim();
    if (!sessionId) return fail(400, 'session_id requerido');

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer', 'subscription.items.data.price']
    });
    if (!session) return fail(404, 'Sesión no encontrada');

    const sub      = session.subscription || null;
    const customer = session.customer || null;

    const { data: localSub } = await supabase
      .from('subscriptions')
      .select('id, tenant_id, plan_id, status, provider_subscription_id')
      .eq('provider', 'stripe')
      .eq('provider_session_id', session.id)
      .maybeSingle();

    const tenantId = localSub?.tenant_id || null;

    if (tenantId && customer?.id) {
      try {
        const { data: t } = await supabase.from('tenants').select('stripe_customer_id').eq('id', tenantId).maybeSingle();
        if (!t || t.stripe_customer_id !== customer.id) {
          await supabase.from('tenants').update({ stripe_customer_id: customer.id }).eq('id', tenantId);
        }
      } catch (e) { console.warn('[verify] update tenants.stripe_customer_id:', e.message); }
    }

    let portalUrl = '';
    if (customer?.id) {
      try {
        const portal = await stripe.billingPortal.sessions.create({
          customer: customer.id,
          return_url: `${FRONTEND_URL}/dashboard`
        });
        portalUrl = portal.url || '';
      } catch (e) { console.warn('[verify] portal url:', e.message); }
    }

    const urlsObj = { portal: portalUrl, dashboard: `${FRONTEND_URL}/dashboard`, plans: `${FRONTEND_URL}/planes` };
    const urlsArr = [urlsObj.portal, urlsObj.dashboard, urlsObj.plans].filter(Boolean);

    const payload = {
      sessionId,
      tenantId: tenantId || null,
      planCode: session.metadata?.plan_code || sub?.metadata?.plan_code || null,
      customerEmail: (customer && customer.email) || session.customer_email || null,
      status: sub?.status || 'incomplete',
      trialEndsAt: sub?.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      currentPeriodEnd: sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
      checkoutUrls: urlsArr,
      urls: urlsObj
    };

    return res.json({ ok: true, ...payload, data: payload });
  } catch (err) {
    console.error('[GET /billing/checkout/verify]', err);
    return fail(500, err.message || 'Internal Server Error');
  }
});

router.post('/checkout/resend-invite', async (req, res) => {
  try {
    const email = toEmail(req.body?.email);
    if (!email) return res.status(400).json({ ok:false, error:'email requerido' });

    const admin = (supabaseAdmin?.auth?.admin) ? supabaseAdmin : supabase;
    if (!admin?.auth?.admin?.inviteUserByEmail) {
      return res.status(503).json({ ok:false, error:'Service role no configurado' });
    }

    const redirectTo = `${FRONTEND_URL}/auth/email-confirmado`;

    const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (!error) return res.json({ ok:true, kind:'invite' });

    const { error: rerr } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (rerr) return res.status(500).json({ ok:false, error: rerr.message || 'No se pudo enviar el email de restablecer contraseña.' });
    return res.json({ ok:true, kind:'reset' });
  } catch (e) {
    console.error('[resend-invite]', e);
    return res.status(500).json({ ok:false, error: e.message });
  }
});

/* ---------- Portal ---------- */
async function portalHandler(req, res) {
  try {
    const tenantId = req.tenant?.id || null;
    if (!tenantId) return res.status(401).json({ ok:false, error:'UNAUTHENTICATED' });

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, slug, email, stripe_customer_id')
      .eq('id', tenantId)
      .maybeSingle();
    if (error) throw error;

    if (!tenant?.stripe_customer_id) {
      return res.status(404).json({ ok:false, error:'TENANT_WITHOUT_CUSTOMER' });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${FRONTEND_URL}/dashboard`
    });

    return res.json({ ok:true, url: portal.url });
  } catch (e) {
    console.error('[billing/portal]', e);
    return res.status(500).json({ ok:false, error: e.message || 'PORTAL_ERROR' });
  }
}
router.get('/portal', requireAuth, portalHandler);
router.post('/portal', requireAuth, portalHandler);

router.get('/self-status', requireAuth, async (req, res) => {
  try {
    const key = String(process.env.STRIPE_SECRET_KEY || '');
    const stripeMode = key.startsWith('sk_live') ? 'live' : key.startsWith('sk_test') ? 'test' : 'unknown';

    const tenantId = req.tenant?.id || null;
    if (!tenantId) {
      return res.json({ ok:true, stripeMode, note: 'No hay req.tenant aún.' });
    }

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, slug, email, nombre_empresa, stripe_customer_id')
      .eq('id', tenantId)
      .maybeSingle();
    if (error) throw error;

    return res.json({ ok:true, stripeMode, tenant: tenant || null });
  } catch (e) {
    console.error('[billing:self-status]', e);
    return res.status(500).json({ ok:false, error:'SELF_STATUS_ERROR' });
  }
});

router.get('/subscription', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || null;
    if (!tenantId) return res.status(401).json({ ok:false, error:'UNAUTHENTICATED' });

    const { data: t } = await supabase.from('tenants').select('stripe_customer_id').eq('id', tenantId).maybeSingle();
    if (!t?.stripe_customer_id) return res.status(404).json({ ok:false, error:'TENANT_WITHOUT_CUSTOMER' });

    const list = await stripe.subscriptions.list({
      customer: t.stripe_customer_id,
      status: 'all',
      limit: 1,
      expand: ['data.items.data.price'],
    });
    const sub = list.data?.[0] || null;

    const summary = sub ? {
      id: sub.id,
      status: sub.status,
      cancel_at_period_end: !!sub.cancel_at_period_end,
      current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
      customer: sub.customer
    } : null;

    return res.json({ ok:true, subscription: summary, data: summary });
  } catch (e) {
    console.error('[GET /billing/subscription] error', e);
    return res.status(500).json({ ok:false, error: e.message || 'SUBSCRIPTION_ERROR' });
  }
});

router.post('/cancel-renewal', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || null;
    if (!tenantId) return res.status(401).json({ ok:false, error:'UNAUTHENTICATED' });

    const { data: t } = await supabase.from('tenants').select('stripe_customer_id').eq('id', tenantId).maybeSingle();
    if (!t?.stripe_customer_id) return res.status(404).json({ ok:false, error:'TENANT_WITHOUT_CUSTOMER' });

    const list = await stripe.subscriptions.list({ customer: t.stripe_customer_id, status: 'all', limit: 1 });
    const sub = list.data?.[0];
    if (!sub?.id) return res.status(404).json({ ok:false, error:'NO_ACTIVE_SUBSCRIPTION' });

    const updated = await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
    return res.json({ ok:true, id: updated.id, status: updated.status, cancel_at_period_end: !!updated.cancel_at_period_end });
  } catch (e) {
    console.error('[POST /billing/cancel-renewal] error', e);
    return res.status(500).json({ ok:false, error: e.message || 'CANCEL_RENEWAL_ERROR' });
  }
});

router.post('/resume', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenant?.id || null;
    if (!tenantId) return res.status(401).json({ ok:false, error:'UNAUTHENTICATED' });

    const { data: t } = await supabase.from('tenants').select('stripe_customer_id').eq('id', tenantId).maybeSingle();
    if (!t?.stripe_customer_id) return res.status(404).json({ ok:false, error:'TENANT_WITHOUT_CUSTOMER' });

    const list = await stripe.subscriptions.list({ customer: t.stripe_customer_id, status: 'all', limit: 1 });
    const sub = list.data?.[0];
    if (!sub?.id) return res.status(404).json({ ok:false, error:'NO_ACTIVE_SUBSCRIPTION' });

    const updated = await stripe.subscriptions.update(sub.id, { cancel_at_period_end: false });
    return res.json({ ok:true, id: updated.id, status: updated.status, cancel_at_period_end: !!updated.cancel_at_period_end });
  } catch (e) {
    console.error('[POST /billing/resume] error', e);
    return res.status(500).json({ ok:false, error: e.message || 'RESUME_RENEWAL_ERROR' });
  }
});

module.exports = router;
