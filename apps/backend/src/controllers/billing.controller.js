'use strict';

const Stripe = require('stripe');
const { supabase } = require('../utils/supabaseClient');
const { isDirectPg, query } = require('../utils/db');
const { slugifyBase, uniqueSlug } = require('../utils/slug');

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' }) : null;
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://easytrack.pro').replace(/\/$/, '');

const toEmail = (v) => String(v || '').trim().toLowerCase();

const PRICE_MAP = {
  'pro_monthly': process.env.STRIPE_PRICE_PRO_MONTHLY,
  'pro_annual': process.env.STRIPE_PRICE_PRO_ANNUAL
};

async function getTenantIdForUser(userId) {
  if (!userId) return null;
  if (isDirectPg()) {
    try {
      const { rows } = await query('SELECT tenant_id FROM public.memberships WHERE user_id = $1 LIMIT 1', [userId]);
      return rows[0]?.tenant_id || null;
    } catch (e) {
      console.error('[getTenantIdForUser pg error]', e);
    }
  }
  const { data } = await supabase.from('memberships').select('tenant_id').eq('user_id', userId).limit(1).maybeSingle();
  return data?.tenant_id || null;
}

async function ensureTenantForUser(user, hintedCompany) {
  if (!user?.id || !user?.email) return null;

  let tenantId = await getTenantIdForUser(user.id);
  if (tenantId) {
    if (isDirectPg()) {
      try {
        const { rows } = await query('SELECT id, slug, email, nombre_empresa, stripe_customer_id FROM public.tenants WHERE id = $1 LIMIT 1', [tenantId]);
        if (rows[0]) return rows[0];
      } catch (e) {
        console.error('[ensureTenantForUser pg error]', e);
      }
    }
    const { data: t } = await supabase.from('tenants').select('id, slug, email, nombre_empresa, stripe_customer_id').eq('id', tenantId).maybeSingle();
    return t || null;
  }

  const email = toEmail(user.email);
  if (isDirectPg()) {
    try {
      const { rows } = await query('SELECT id, slug, email, nombre_empresa, stripe_customer_id FROM public.tenants WHERE email = $1 LIMIT 1', [email]);
      if (rows[0]) {
        await query('INSERT INTO public.memberships (tenant_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (tenant_id, user_id) DO NOTHING', [rows[0].id, user.id, 'owner']);
        return rows[0];
      }
    } catch (e) {
      console.error('[ensureTenantForUser existing email pg error]', e);
    }
  }

  const { data: existing } = await supabase.from('tenants').select('id, slug, email, nombre_empresa, stripe_customer_id').eq('email', email).maybeSingle();

  if (existing?.id) {
    if (isDirectPg()) {
      await query('INSERT INTO public.memberships (tenant_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (tenant_id, user_id) DO NOTHING', [existing.id, user.id, 'owner']);
    } else {
      await supabase.from('memberships').upsert([{ tenant_id: existing.id, user_id: user.id, role: 'owner' }], { onConflict: 'tenant_id,user_id' });
    }
    return existing;
  }

  const base = slugifyBase(hintedCompany || email.split('@')[0] || 'org');
  let slug = base;
  if (isDirectPg()) {
    const { rows: slugRows } = await query('SELECT id FROM public.tenants WHERE slug = $1 LIMIT 1', [slug]);
    if (slugRows.length > 0) slug = `${base}-${Date.now().toString().slice(-4)}`;
  } else {
    slug = await uniqueSlug(supabase, base);
  }

  const insert = {
    email,
    nombre_empresa: hintedCompany || base,
    slug,
    trial_quota: 250,
    trial_used: 0,
    soft_blocked: false,
  };

  if (isDirectPg()) {
    const { rows: createdRows } = await query(
      'INSERT INTO public.tenants (email, nombre_empresa, slug, trial_quota, trial_used, soft_blocked, fecha_creacion) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id, slug, email, nombre_empresa, stripe_customer_id',
      [insert.email, insert.nombre_empresa, insert.slug, insert.trial_quota, insert.trial_used, insert.soft_blocked]
    );
    if (createdRows[0]) {
      await query('INSERT INTO public.memberships (tenant_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (tenant_id, user_id) DO NOTHING', [createdRows[0].id, user.id, 'owner']);
      return createdRows[0];
    }
  }

  const { data: created, error: cErr } = await supabase.from('tenants').insert([insert]).select('id, slug, email, nombre_empresa, stripe_customer_id').single();
  if (cErr || !created?.id) return null;

  await supabase.from('memberships').upsert([{ tenant_id: created.id, user_id: user.id, role: 'owner' }], { onConflict: 'tenant_id,user_id' });
  return created;
}

async function resolveStripeCustomer(tenantId, tenantData, email) {
  let customerId = tenantData?.stripe_customer_id;

  if (customerId === 'NULL' || customerId === 'null') customerId = null;

  if (customerId) {
    try {
      const existingCustomer = await stripe.customers.retrieve(customerId);
      if (existingCustomer.deleted) customerId = null;
    } catch (err) {
      if (err.code === 'resource_missing') customerId = null;
      else throw err;
    }
  }

  if (!customerId) {
    const c = await stripe.customers.create({
      email: email || tenantData?.email || undefined,
      name: tenantData?.nombre_empresa || undefined,
      metadata: { tenant_id: tenantId }
    });
    customerId = c.id;

    if (isDirectPg()) {
      try {
        await query('UPDATE public.tenants SET stripe_customer_id = $1 WHERE id = $2', [customerId, tenantId]);
      } catch (e) {
        console.error('[resolveStripeCustomer update pg error]', e);
      }
    } else {
      await supabase.from('tenants').update({ stripe_customer_id: customerId }).eq('id', tenantId);
    }
  }

  return customerId;
}

exports.getPlans = async (_req, res) => {
  try {
    if (isDirectPg()) {
      const { rows } = await query(
        'SELECT id, code, name, period_months, base_price_cents, discount_pct, stripe_price_id FROM public.billing_plans WHERE active = true ORDER BY period_months ASC'
      );
      return res.json({ ok: true, plans: rows || [] });
    }
    const { data, error } = await supabase
      .from('billing_plans')
      .select('id, code, name, period_months, base_price_cents, discount_pct, stripe_price_id')
      .eq('active', true)
      .order('period_months', { ascending: true });
    if (error) throw error;
    return res.json({ ok: true, plans: data || [] });
  } catch (e) {
    console.error('[getPlans error]', e);
    return res.status(500).json({ ok: false, error: 'ERROR_GET_PLANS' });
  }
};

exports.getPeriodOptions = async (req, res) => {
  return res.json([
    { key: 'm1', months: 1, label: 'Mensual' },
    { key: 'm12', months: 12, label: 'Anual' }
  ]);
};

exports.prefillCustomer = async (req, res) => {
  return res.json({ ok: true });
};

exports.createCheckout = async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ ok: false, error: 'STRIPE_NOT_CONFIGURED' });

    const ensured = await ensureTenantForUser(req.user);
    if (!ensured?.id) return res.status(400).json({ ok: false, error: 'TENANT_NOT_VERIFIED' });
    
    const tenantId = ensured.id;
    const email = toEmail(req.user?.email);

    const planCode = String(req.body?.plan_code || '').trim();
    const priceId = PRICE_MAP[planCode];

    if (!priceId) return res.status(400).json({ ok: false, error: 'INVALID_PLAN' });

    let tenant = ensured;
    if (isDirectPg()) {
      const { rows } = await query('SELECT id, email, nombre_empresa, stripe_customer_id, slug FROM public.tenants WHERE id = $1 LIMIT 1', [tenantId]);
      if (rows[0]) tenant = rows[0];
    }

    const stripeCustomerId = await resolveStripeCustomer(tenantId, tenant, email);

    if (stripeCustomerId) {
      const existingSubs = await stripe.subscriptions.list({ customer: stripeCustomerId, status: 'active', limit: 1 });
      if (existingSubs.data.length > 0) {
        return res.status(409).json({ ok: false, error: 'ACTIVE_SUBSCRIPTION_EXISTS', redirect_to_portal: true });
      }
    }

    let hasHadProBefore = false;
    if (isDirectPg()) {
      const { rows } = await query('SELECT id FROM public.subscriptions WHERE tenant_id = $1 LIMIT 1', [tenantId]);
      hasHadProBefore = rows.length > 0;
    } else {
      const { data: pastSubs } = await supabase.from('subscriptions').select('id').eq('tenant_id', tenantId).limit(1);
      hasHadProBefore = pastSubs && pastSubs.length > 0;
    }
    
    const shouldGiveTrial = !hasHadProBefore && planCode === 'pro_monthly';
    const metadata = { tenant_id: tenantId, signup_email: email, plan_code: planCode || '' };

    const subscriptionData = { metadata };
    if (shouldGiveTrial) subscriptionData.trial_period_days = 7;

    // Usar el dominio de origen del cliente para mantener la sesión
    const clientOrigin = (req.headers.origin || req.headers.referer ? new URL(req.headers.origin || req.headers.referer).origin : FRONTEND_URL).replace(/\/$/, '');

    const sessionConfig = {
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: subscriptionData,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'auto',
      customer_update: { name: 'auto', address: 'auto' },
      client_reference_id: String(tenantId),
      success_url: `${clientOrigin}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientOrigin}/${tenant.slug}/dashboard/facturacion`,
      locale: 'es',
      metadata
    };

    // INYECCIÓN DE CUPÓN REFERIDO
    let referral = null;
    if (isDirectPg()) {
      const { rows } = await query('SELECT id FROM public.tenant_referrals WHERE referred_tenant_id = $1 AND status = \'pending\' LIMIT 1', [tenantId]);
      referral = rows[0] || null;
    } else {
      const { data } = await supabase.from('tenant_referrals').select('id').eq('referred_tenant_id', tenantId).eq('status', 'pending').maybeSingle();
      referral = data;
    }

    if (referral) {
      sessionConfig.allow_promotion_codes = false;
      sessionConfig.discounts = [{ 
        coupon: planCode === 'pro_annual' ? 'REFERRAL_ANNUAL_50' : 'REFERRAL_MONTHLY_50' 
      }];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return res.json({ ok: true, url: session.url });
  } catch (e) {
    console.error('[createCheckout error]', e);
    return res.status(500).json({ ok: false, error: 'CHECKOUT_ERROR', message: e.message });
  }
};

exports.verifyCheckout = async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ ok: false, error: 'STRIPE_NOT_CONFIGURED' });
    const sessionId = String(req.query.session_id || '').trim();
    if (!sessionId) return res.status(400).json({ ok: false, error: 'MISSING_SESSION_ID' });

    const s = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription.items.data.price', 'customer'] });
    const priceId = s?.subscription?.items?.data?.[0]?.price?.id || null;
    let planCode = null;
    
    if (priceId) {
      const foundEntry = Object.entries(PRICE_MAP).find(([, value]) => value === priceId);
      if (foundEntry) planCode = foundEntry[0];
    }

    return res.json({
      ok: true,
      data: {
        sessionId,
        status: s.status,
        customerEmail: s.customer_details?.email || s.customer?.email || s.customer_email || null,
        planCode,
      }
    });
  } catch (e) {
    console.error('[verifyCheckout error]', e);
    return res.status(500).json({ ok: false, error: 'VERIFY_ERROR', message: e.message });
  }
};

exports.createPortal = async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ ok: false, error: 'STRIPE_NOT_CONFIGURED' });

    const ensured = await ensureTenantForUser(req.user);
    if (!ensured?.id) return res.status(400).json({ ok: false, error: 'TENANT_NOT_FOUND' });

    const tenantId = ensured.id;
    let t = ensured;
    if (isDirectPg()) {
      const { rows } = await query('SELECT id, email, nombre_empresa, slug, stripe_customer_id FROM public.tenants WHERE id = $1 LIMIT 1', [tenantId]);
      if (rows[0]) t = rows[0];
    } else {
      const { data, error: terr } = await supabase.from('tenants').select('id, email, nombre_empresa, slug, stripe_customer_id').eq('id', tenantId).maybeSingle();
      if (terr) throw terr;
      t = data;
    }

    const stripeCustomerId = await resolveStripeCustomer(tenantId, t, req.user?.email);

    const clientOrigin = (req.headers.origin || req.headers.referer ? new URL(req.headers.origin || req.headers.referer).origin : FRONTEND_URL).replace(/\/$/, '');

    const portal = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${clientOrigin}/${t.slug}/dashboard/facturacion`
    });

    return res.json({ ok: true, url: portal.url });
  } catch (e) {
    console.error('[createPortal error]', e);
    return res.status(500).json({ ok: false, error: 'PORTAL_ERROR', message: e.message });
  }
};

exports.getReferralStats = async (req, res) => {
  try {
    const ensured = await ensureTenantForUser(req.user);
    if (!ensured?.id) return res.status(400).json({ ok: false, error: 'TENANT_NOT_FOUND' });

    let refs = [];
    if (isDirectPg()) {
      const { rows } = await query('SELECT id, status, created_at, referred_tenant_id FROM public.tenant_referrals WHERE referrer_tenant_id = $1 ORDER BY created_at DESC', [ensured.id]);
      refs = rows || [];
    } else {
      const { data } = await supabase.from('tenant_referrals').select('id, status, created_at, referred_tenant_id').eq('referrer_tenant_id', ensured.id).order('created_at', { ascending: false });
      refs = data || [];
    }

    let referrals = [];
    if (refs && refs.length > 0) {
      const ids = refs.map(r => r.referred_tenant_id);
      let tenants = [];
      if (isDirectPg()) {
        const { rows } = await query('SELECT id, nombre_empresa FROM public.tenants WHERE id = ANY($1)', [ids]);
        tenants = rows || [];
      } else {
        const { data } = await supabase.from('tenants').select('id, nombre_empresa').in('id', ids);
        tenants = data || [];
      }
      
      referrals = refs.map(r => {
        const t = tenants?.find(x => x.id === r.referred_tenant_id);
        return {
          id: r.id,
          status: r.status,
          created_at: r.created_at,
          nombre_empresa: t ? t.nombre_empresa : 'Negocio'
        };
      });
    }

    return res.json({ ok: true, slug: ensured.slug, referrals });
  } catch (e) {
    console.error('[getReferralStats error]', e);
    return res.status(500).json({ ok: false, error: 'STATS_ERROR' });
  }
};