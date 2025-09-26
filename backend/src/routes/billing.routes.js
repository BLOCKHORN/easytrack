'use strict';

const express = require('express');
const Stripe  = require('stripe');
const requireAuth = require('../middlewares/requireAuth');
const { supabase } = require('../utils/supabaseClient');
const { slugifyBase, uniqueSlug } = require('../helpers/slug');

const router = express.Router();

const STRIPE_KEY   = process.env.STRIPE_SECRET_KEY;
const stripe       = STRIPE_KEY ? new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' }) : null;
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const TRIAL_DAYS   = Number(process.env.UPGRADE_TRIAL_DAYS || 30);
const TRIAL_QUOTA  = Number(process.env.TRIAL_QUOTA || 20);

// helpers
const toEmail = (v) => String(v || '').trim().toLowerCase();

async function getTenantIdForUser(userId) {
  if (!userId) return null;
  const { data } = await supabase
    .from('memberships')
    .select('tenant_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return data?.tenant_id || null;
}

/**
 * Asegura que el usuario tenga tenant y membership (owner).
 * Devuelve { id, slug } o null si falla.
 */
async function ensureTenantForUser(user, hintedCompany) {
  if (!user?.id || !user?.email) return null;

  // 1) membership existente
  let tenantId = await getTenantIdForUser(user.id);
  if (tenantId) {
    const { data: t } = await supabase.from('tenants').select('id, slug').eq('id', tenantId).maybeSingle();
    return t || null;
  }

  const email = toEmail(user.email);

  // 2) tenant por email
  const { data: existing } = await supabase
    .from('tenants')
    .select('id, slug')
    .eq('email', email)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from('memberships')
      .upsert([{ tenant_id: existing.id, user_id: user.id, role: 'owner' }], { onConflict: 'tenant_id,user_id' });
    return existing;
  }

  // 3) crear tenant + membership
  const base = slugifyBase(hintedCompany || email.split('@')[0] || 'org');
  const slug = await uniqueSlug(supabase, base);

  const insert = {
    email,
    nombre_empresa: hintedCompany || base,
    slug,
    trial_active: true,
    trial_quota: TRIAL_QUOTA,
    trial_used: 0,
    soft_blocked: false,
  };

  const { data: created, error: cErr } = await supabase
    .from('tenants')
    .insert([insert])
    .select('id, slug')
    .single();

  if (cErr || !created?.id) return null;

  await supabase
    .from('memberships')
    .upsert([{ tenant_id: created.id, user_id: user.id, role: 'owner' }], { onConflict: 'tenant_id,user_id' });

  return created;
}

/* =========================================================
   📋 Planes activos (para mostrar en UI)
   ========================================================= */
router.get('/plans', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('billing_plans')
      .select('id, code, name, period_months, base_price_cents, discount_pct, stripe_price_id')
      .eq('active', true)
      .order('period_months', { ascending: true });
    if (error) throw error;
    return res.json({ ok: true, plans: data || [] });
  } catch (e) {
    console.error('[GET /billing/plans]', e);
    return res.status(500).json({ ok: false, error: 'No se pudieron cargar los planes.' });
  }
});

/* =========================================================
   🧾 Prefill de datos de facturación
   ========================================================= */
router.post('/prefill', requireAuth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ ok:false, error:'Stripe no configurado' });

    // Asegura tenant (por si no existe; idempotente)
    const ensured = await ensureTenantForUser(req.user, req.body?.nombre_empresa);
    if (!ensured?.id) return res.status(400).json({ ok:false, error:'No se pudo preparar el tenant.' });

    const tenantId = ensured.id;
    const email    = toEmail(req.user?.email);

    const {
      nombre_empresa,
      country,
      line1, line2, city, state, postal_code,
      tax_id
    } = req.body || {};

    // Leer tenant
    const { data: t } = await supabase
      .from('tenants')
      .select('id, email, nombre_empresa, stripe_customer_id')
      .eq('id', tenantId)
      .maybeSingle();

    // Actualizar nombre en BD si llega uno nuevo
    if (nombre_empresa && nombre_empresa !== t?.nombre_empresa) {
      await supabase.from('tenants')
        .update({ nombre_empresa: nombre_empresa })
        .eq('id', tenantId);
    }

    // Asegurar Customer en Stripe
    let stripeCustomerId = t?.stripe_customer_id || null;
    if (!stripeCustomerId) {
      const created = await stripe.customers.create({
        email: email || t?.email || undefined,
        name:  nombre_empresa || t?.nombre_empresa || undefined,
        metadata: { tenant_id: tenantId }
      });
      stripeCustomerId = created.id;
      await supabase.from('tenants').update({ stripe_customer_id: stripeCustomerId }).eq('id', tenantId);
    }

    // Construir actualización de Customer
    const update = {};
    if (nombre_empresa) update.name = nombre_empresa;
    const addr = {};
    if (country)      addr.country     = String(country).toUpperCase();
    if (line1)        addr.line1       = line1;
    if (line2)        addr.line2       = line2;
    if (city)         addr.city        = city;
    if (state)        addr.state       = state;
    if (postal_code)  addr.postal_code = postal_code;
    if (Object.keys(addr).length) update.address = addr;

    if (Object.keys(update).length) {
      await stripe.customers.update(stripeCustomerId, update);
    }

    // Tax ID (opcional)
    if (tax_id) {
      try {
        await stripe.customers.createTaxId(stripeCustomerId, { type: 'eu_vat', value: String(tax_id).trim() });
      } catch (e) {
        console.warn('[billing/prefill] createTaxId warning:', e?.message || e);
      }
    }

    return res.json({ ok:true, customer_id: stripeCustomerId });
  } catch (e) {
    console.error('[POST /billing/prefill] error', e);
    return res.status(500).json({ ok:false, error: e.message || 'PREFILL_ERROR' });
  }
});

/* =========================================================
   💳 Iniciar Checkout (desde sesión logueada)
   ========================================================= */
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ ok:false, error:'Stripe no está configurado en el servidor.' });

    // 🔐 Asegura tenant + membership (si falta)
    const ensured = await ensureTenantForUser(req.user, req.body?.billing?.name);
    if (!ensured?.id) return res.status(400).json({ ok:false, error:'No se encontró o creó el tenant del usuario.' });
    const tenantId = ensured.id;

    const email = toEmail(req.user?.email);

    // 1) price a partir de plan_code (o directo)
    const planCode = String(req.body?.plan_code || '').trim();
    let priceId = String(req.body?.price_id || '').trim();
    if (!priceId) {
      if (!planCode) return res.status(400).json({ ok:false, error:'Debes indicar plan_code o price_id.' });
      const { data: plan, error: perr } = await supabase
        .from('billing_plans')
        .select('stripe_price_id, code')
        .eq('code', planCode)
        .eq('active', true)
        .single();
      if (perr || !plan?.stripe_price_id) {
        return res.status(404).json({ ok:false, error:'Plan no encontrado o sin price en Stripe.' });
      }
      priceId = plan.stripe_price_id;
    }

    // 2) guardar billing preliminar del body (opcional)
    const b = req.body?.billing || {};
    const billingUpdate = {
      billing_name     : b.name?.trim() || null,
      tax_id           : b.tax_id?.trim() || null,
      billing_country  : (b.country || 'ES').slice(0,2).toUpperCase(),
      billing_state    : b.state?.trim() || null,
      billing_city     : b.city?.trim() || null,
      billing_zip      : b.postal_code?.trim() || null,
      billing_address1 : b.address1?.trim() || null,
      billing_address2 : b.address2?.trim() || null,
      billing_email    : email || null,
      is_business      : true
    };
    await supabase.from('tenants').update(billingUpdate).eq('id', tenantId);

    // 3) asegurar/actualizar Stripe Customer con esos datos
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, nombre_empresa, stripe_customer_id, billing_name, billing_country, billing_state, billing_city, billing_zip, billing_address1, billing_address2, tax_id, billing_email')
      .eq('id', tenantId)
      .maybeSingle();

    let stripeCustomerId = tenant?.stripe_customer_id || null;
    const customerPayload = {
      email: tenant?.billing_email || email || undefined,
      name:  tenant?.billing_name || tenant?.nombre_empresa || undefined,
      address: {
        country: tenant?.billing_country || undefined,
        state:   tenant?.billing_state   || undefined,
        city:    tenant?.billing_city    || undefined,
        postal_code: tenant?.billing_zip || undefined,
        line1: tenant?.billing_address1 || undefined,
        line2: tenant?.billing_address2 || undefined,
      },
      metadata: { tenant_id: tenantId }
    };

    if (!stripeCustomerId) {
      const c = await stripe.customers.create(customerPayload);
      stripeCustomerId = c.id;
      await supabase.from('tenants').update({ stripe_customer_id: stripeCustomerId }).eq('id', tenantId);
    } else {
      await stripe.customers.update(stripeCustomerId, customerPayload);
    }

    // VAT opcional
    if (tenant?.tax_id) {
      try { await stripe.customers.createTaxId(stripeCustomerId, { type: 'eu_vat', value: tenant.tax_id }); } catch {}
    }

    const metadata = { tenant_id: tenantId, signup_email: email, plan_code: planCode || '' };

    // 4) success_url con session_id → /upgrade/success
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: TRIAL_DAYS || undefined,
        metadata
      },
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'auto',
      customer_update: { name: 'auto', address: 'auto' },
      client_reference_id: String(tenantId),
      success_url: `${FRONTEND_URL}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/precios?cancel=1`,
      locale: 'es',
      metadata
    });

    return res.json({ ok:true, url: session.url });
  } catch (e) {
    console.error('[POST /billing/checkout] Error:', e);
    return res.status(500).json({ ok:false, error: e.message || 'No se pudo iniciar el checkout.' });
  }
});

/* =========================================================
   ✅ Verificación de una Checkout Session
   ========================================================= */
router.get('/checkout/verify', async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ ok:false, error:'Stripe no configurado' });
    const sessionId = String(req.query.session_id || '').trim();
    if (!sessionId) return res.status(400).json({ ok:false, error:'Falta session_id' });

    const s = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription.items.data.price', 'customer']
    });

    const priceId = s?.subscription?.items?.data?.[0]?.price?.id || null;
    let planCode = null;
    if (priceId) {
      const { data: bp } = await supabase
        .from('billing_plans')
        .select('code').eq('stripe_price_id', priceId).maybeSingle();
      planCode = bp?.code || null;
    }

    const trialEndsAt = s?.subscription?.trial_end ? new Date(s.subscription.trial_end * 1000).toISOString() : null;
    const currentPeriodEnd = s?.subscription?.current_period_end ? new Date(s.subscription.current_period_end * 1000).toISOString() : null;

    return res.json({
      ok: true,
      data: {
        sessionId,
        status: s.status,
        customerEmail: s.customer_details?.email || s.customer?.email || s.customer_email || null,
        planCode,
        trialEndsAt,
        currentPeriodEnd
      }
    });
  } catch (e) {
    console.error('[GET /billing/checkout/verify] error', e);
    return res.status(500).json({ ok:false, error: e.message || 'VERIFY_ERROR' });
  }
});

/* =========================================================
   🔁 Portal de facturación (Stripe Portal)
   ========================================================= */
router.post('/portal', requireAuth, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ ok:false, error:'Stripe no configurado' });

    const ensured = await ensureTenantForUser(req.user);
    if (!ensured?.id) return res.status(400).json({ ok:false, error:'No se encontró el tenant del usuario.' });

    const { data: t } = await supabase
      .from('tenants')
      .select('stripe_customer_id')
      .eq('id', ensured.id)
      .maybeSingle();

    if (!t?.stripe_customer_id) return res.status(404).json({ ok:false, error:'TENANT_WITHOUT_CUSTOMER' });

    const portal = await stripe.billingPortal.sessions.create({
      customer: t.stripe_customer_id,
      return_url: `${FRONTEND_URL}/dashboard`
    });

    return res.json({ ok:true, url: portal.url });
  } catch (e) {
    console.error('[POST /billing/portal] error', e);
    return res.status(500).json({ ok:false, error: e.message || 'PORTAL_ERROR' });
  }
});

module.exports = router;
