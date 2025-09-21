'use strict';

const { supabase, supabaseAdmin } = require('../utils/supabaseClient');
const { slugifyBase, uniqueSlug } = require('../helpers/slug'); // si lo usas en otros sitios
const Stripe = require('stripe');

const PROVIDER     = process.env.PAYMENT_PROVIDER || 'stripe';
const STRIPE_KEY   = process.env.STRIPE_SECRET_KEY;
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const stripe       = STRIPE_KEY ? new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' }) : null;

const TRIAL_DAYS = 30;

function toEmail(v){ return String(v || '').toLowerCase().trim(); }
function makeIdemKey(req, keyA, keyB){
  const hdr = req.get && req.get('x-idem-key'); if (hdr) return hdr;
  const bucket = Math.floor(Date.now()/10000); return `co:${keyA || 'anon'}:${keyB || 'plan'}:${bucket}`;
}

/* ------------------------------- ENDPOINTS ------------------------------- */

async function listPlans(_req, res) {
  try {
    const { data, error } = await supabase
      .from('billing_plans')
      .select('*')
      .eq('active', true)
      .in('period_months', [1, 12, 24])
      .order('period_months', { ascending: true });
    if (error) throw error;
    return res.json({ ok: true, plans: data || [] });
  } catch (e) {
    console.error('[billing] listPlans:', e);
    return res.status(500).json({ ok: false, error: 'No se pudieron cargar los planes.' });
  }
}

/**
 * 🚫 Sin escrituras locales: no crea tenant ni subscription aquí.
 * Solo crea la Checkout Session en Stripe.
 */
async function startCheckout(req, res) {
  try {
    const email = toEmail(req.user?.email || req.body?.email);
    if (!email) return res.status(400).json({ ok:false, error:'email requerido' });

    const tenantName = String(req.body?.tenant_name || '').trim();

    // 1) Plan
    const planCode = String(req.body?.plan_code || '').trim();
    if (!planCode) return res.status(400).json({ ok:false, error:'plan_code requerido' });

    const { data: plan, error: perr } = await supabase
      .from('billing_plans')
      .select('*')
      .eq('code', planCode)
      .eq('active', true)
      .single();

    if (perr || !plan) return res.status(404).json({ ok:false, error:'Plan no encontrado' });
    if (PROVIDER !== 'stripe' || !stripe) {
      return res.status(503).json({ ok:false, error:'Proveedor de pago no configurado (Stripe).' });
    }
    if (!plan.stripe_price_id) {
      return res.status(500).json({ ok:false, error:'stripe_price_id ausente en el plan' });
    }

    // 2) Consultar si ya existe tenant por email (solo lectura)
    let stripeCustomerId;
    let trialDays = TRIAL_DAYS;
    try {
      const { data: existing } = await supabase
        .from('tenants')
        .select('stripe_customer_id')
        .eq('email', email)
        .maybeSingle();
      stripeCustomerId = existing?.stripe_customer_id || undefined;
      if (existing) trialDays = 0; // sin trial si ya fue cliente
    } catch {}

    // 3) Checkout Session (sin client_reference_id, sin escribir en BD)
    const meta = { signup_email: email, tenant_name: tenantName, plan_code: plan.code };

    const params = {
      mode: 'subscription',
      locale: 'es',
      customer: stripeCustomerId || undefined,
      customer_email: stripeCustomerId ? undefined : email,
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      payment_method_collection: 'always',
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'auto',
      allow_promotion_codes: true,
      success_url: `${FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/planes?plan=${encodeURIComponent(plan.code)}&cancel=1`,
      metadata: meta,
      subscription_data: {
        trial_period_days: trialDays || undefined,
        metadata: meta
      }
    };
    if (stripeCustomerId) {
      params.customer_update = { name: 'auto', address: 'auto' };
    }

    const idemKey = makeIdemKey(req, email, plan.code);
    const session = await stripe.checkout.sessions.create(params, { idempotencyKey: idemKey });

    // ✅ Nada de inserts locales aquí
    return res.json({ ok:true, flow:'checkout_redirect', url: session.url, session_id: session.id });
  } catch (e) {
    console.error('[billing] startCheckout:', e);
    return res.status(500).json({ ok:false, error: e?.message || 'No se pudo iniciar el checkout.' });
  }
}

/** GET /billing/checkout/verify?session_id=cs_xxx */
async function verifyCheckout(req, res) {
  const fail = (code, message) => {
    const urlsObj = { portal: '', dashboard: `${FRONTEND_URL}/app`, plans: `${FRONTEND_URL}/planes` };
    const urlsArr = [urlsObj.portal, urlsObj.dashboard, urlsObj.plans].filter(Boolean);
    return res.status(code).json({ ok: false, error: message, urls: urlsObj, checkoutUrls: urlsArr });
  };

  try {
    if (!stripe) return fail(503, 'Stripe no configurado');
    const sessionId = String(req.query.session_id || '').trim();
    if (!sessionId) return fail(400, 'session_id requerido');

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer']
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
      tenantId: localSub?.tenant_id || null, // ya no dependemos de client_reference_id
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
    return fail(500, err.message || 'Internal Server Error');
  }
}

async function getPortal(req, res) {
  try {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) return res.status(401).json({ ok:false, error:'No autenticado' });

    const { data: sub, error } = await supabase.from('subscriptions')
      .select('*, billing_plans(*)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle();
    if (error) throw error;

    return res.json({ ok:true, subscription: sub || null });
  } catch (e) {
    console.error('[billing] getPortal:', e);
    return res.status(500).json({ ok:false, error:'No se pudo cargar el portal.' });
  }
}

async function cancelAtPeriodEnd(req, res) {
  try {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) return res.status(401).json({ ok:false, error:'No autenticado' });

    const { data: sub, error: sErr } = await supabase.from('subscriptions')
      .select('id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle();
    if (sErr) throw sErr;
    if (!sub) return res.status(404).json({ ok:false, error:'Sin suscripción' });

    const { error } = await supabase.from('subscriptions')
      .update({ cancel_at_period_end: true, updated_at: new Date() })
      .eq('id', sub.id);
    if (error) throw error;

    return res.json({ ok:true });
  } catch (e) {
    console.error('[billing] cancelAtPeriodEnd]:', e);
    return res.status(500).json({ ok:false, error:'No se pudo programar la cancelación.' });
  }
}

/** 🔔 POST /billing/checkout/resend-invite (invite → reset fallback) */
async function resendInvite(req, res) {
  try {
    const email = toEmail(req.body?.email);
    if (!email) return res.status(400).json({ ok:false, error:'email es requerido' });

    const admin = (supabaseAdmin?.auth?.admin) ? supabaseAdmin : supabase;
    if (!admin?.auth?.admin?.inviteUserByEmail) {
      return res.status(503).json({ ok:false, error:'Service role no configurado en el servidor' });
    }

const redirectTo = `${FRONTEND_URL}/auth/email-confirmado`;
    // 1) INVITE
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (!error) return res.json({ ok:true, kind:'invite', data });

    // 2) Fallback RESET si ya existe
    const msg = String(error.message || '').toLowerCase();
    const already = msg.includes('already been registered') || msg.includes('user already registered');
    if (already) {
      const { error: rerr } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (rerr) {
        console.error('[billing] resendInvite reset fallback error:', rerr);
        return res.status(500).json({ ok:false, error: rerr.message || 'No se pudo enviar el email de restablecer contraseña.' });
      }
      return res.json({ ok:true, kind:'reset' });
    }

    // 3) Otro error
    console.error('[billing] resendInvite invite error:', error);
    return res.status(500).json({ ok:false, error: error.message || 'No se pudo enviar la invitación.' });
  } catch (e) {
    console.error('[billing] resendInvite unexpected:', e);
    return res.status(500).json({ ok:false, error: e?.message || 'No se pudo reenviar la invitación' });
  }
}

module.exports = {
  listPlans,
  startCheckout,
  verifyCheckout,
  getPortal,
  cancelAtPeriodEnd,
  resendInvite,
};
