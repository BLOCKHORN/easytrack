// backend/src/webhooks/stripe.webhook.js
'use strict';

/**
 * IMPORTANTE en app.js/server.js:
 * app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhook);
 */

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

const { supabase, supabaseAdmin } = require('../utils/supabaseClient');
const { normalizePlan } = require('../utils/pricing');
const { slugifyBase, uniqueSlug } = require('../helpers/slug');

/* ----------------------------- helpers ----------------------------- */

function mapStripeStatus(s) {
  switch (s) {
    case 'trialing': return 'trialing';
    case 'active': return 'active';
    case 'past_due': return 'past_due';
    case 'canceled': return 'canceled';
    case 'incomplete': return 'incomplete';
    case 'incomplete_expired': return 'incomplete_expired';
    case 'unpaid': return 'unpaid';
    case 'paused': return 'paused';
    default: return 'incomplete';
  }
}

const tsToISO = (unix) =>
  (typeof unix === 'number' && !Number.isNaN(unix)) ? new Date(unix * 1000).toISOString() : null;

const toEmail = (v) => String(v || '').toLowerCase().trim();

async function ensureTenantByEmail(email, tenantNameHint = '') {
  const em = toEmail(email);
  if (!em) return null;

  const { data: tExist, error: exErr } = await supabase
    .from('tenants')
    .select('id, slug, email, stripe_customer_id')
    .eq('email', em)
    .maybeSingle();
  if (exErr) throw exErr;
  if (tExist?.id) return tExist;

  const base = slugifyBase(tenantNameHint || em.split('@')[0]);
  const slug = await uniqueSlug(supabase, base);

  const { data: tNew, error } = await supabase
    .from('tenants')
    .insert([{ email: em, nombre_empresa: tenantNameHint || base, slug }])
    .select('id, slug, email, stripe_customer_id')
    .single();

  if (error) throw error;
  return tNew;
}

async function upsertTenantStripeCustomer(tenantId, stripeCustomerId) {
  if (!tenantId || !stripeCustomerId) return;
  try {
    const { data: t } = await supabase
      .from('tenants')
      .select('id, stripe_customer_id')
      .eq('id', tenantId)
      .maybeSingle();
    if (!t) return;
    if (t.stripe_customer_id === stripeCustomerId) return;
    await supabase
      .from('tenants')
      .update({ stripe_customer_id: String(stripeCustomerId) })
      .eq('id', tenantId);
  } catch (e) {
    console.warn('[tenant stripe id] aviso:', e.message);
  }
}

async function getPlanIdByCode(planCodeRaw) {
  const code = normalizePlan(planCodeRaw || '');
  if (!code) return null;
  const { data, error } = await supabase
    .from('billing_plans')
    .select('id')
    .eq('code', code)
    .maybeSingle();
  if (error || !data) return null;
  return data.id;
}

async function getPlanByStripePriceId(priceId) {
  if (!priceId) return null;
  const { data, error } = await supabase
    .from('billing_plans')
    .select('id, code')
    .eq('stripe_price_id', priceId)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

function getBasePriceIdFromSubscription(sub) {
  const items = sub?.items?.data || [];
  const base = items.find(i => i?.price?.recurring?.usage_type !== 'metered') || items[0];
  return base?.price?.id || null;
}

async function upsertSubscriptionRow({ tenantId, planId, subscription, customerId }) {
  // Construimos la fila y hacemos upsert idempotente por provider_subscription_id
  const row = {
    tenant_id: tenantId || null,
    plan_id: planId || null,
    provider: 'stripe',
    provider_customer_id: String(customerId || subscription.customer || ''),
    provider_subscription_id: subscription.id,
    status: mapStripeStatus(subscription.status),
    trial_ends_at: tsToISO(subscription.trial_end),
    current_period_start: tsToISO(subscription.current_period_start),
    current_period_end: tsToISO(subscription.current_period_end),
    cancel_at_period_end: !!subscription.cancel_at_period_end,
    updated_at: new Date().toISOString()
  };

  // ⚠️ NO incluimos provider_session_id para evitar errores si tu tabla no lo tiene.
  const { error } = await supabase
    .from('subscriptions')
    .upsert([row], { onConflict: 'provider_subscription_id' });
  if (error) throw error;
}

async function dedupeEventOrThrow(event) {
  if (!event?.id) return;
  try {
    const { data: exists } = await supabase
      .from('payment_events')
      .select('event_id')
      .eq('event_id', event.id)
      .maybeSingle();
    if (exists?.event_id) throw new Error(`EVENT_DUPLICATE:${event.id}`);
  } catch (e) {
    if (String(e.message || '').startsWith('EVENT_DUPLICATE:')) throw e;
  }
  const insert = {
    provider: 'stripe',
    event_type: event.type,
    event_id: event.id,
    payload: event
  };
  const { error } = await supabase.from('payment_events').insert(insert);
  if (error) {
    if (error.code === '23505') throw new Error(`EVENT_DUPLICATE:${event.id}`);
    throw error;
  }
}

async function inviteUserIfPossible(email) {
  try {
    const em = toEmail(email);
    if (!em) return;

    const admin = (supabaseAdmin?.auth?.admin) ? supabaseAdmin : supabase;
    if (!admin?.auth?.admin?.inviteUserByEmail) return;

    const redirectTo = `${process.env.FRONTEND_URL || process.env.APP_BASE_URL || ''}/billing/success`;

    const { error } = await admin.auth.admin.inviteUserByEmail(em, { redirectTo });
    if (!error) return;

    const msg = String(error.message || '').toLowerCase();
    const already = msg.includes('already been registered') || msg.includes('user already registered');
    if (already) {
      const { error: rerr } = await supabase.auth.resetPasswordForEmail(em, { redirectTo });
      if (rerr) console.warn('[inviteUserIfPossible] reset fallback failed:', rerr.message);
    } else {
      console.warn('[inviteUserIfPossible] invite error:', error.message);
    }
  } catch (e) {
    console.warn('[inviteUserIfPossible] aviso:', e.message);
  }
}

/* --------------------------------- handler -------------------------------- */

async function stripeWebhook(req, res) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[Stripe webhook] Falta STRIPE_WEBHOOK_SECRET');
    return res.status(500).send('Misconfigured webhook secret');
  }

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Stripe webhook] verify failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    await dedupeEventOrThrow(event);
  } catch (e) {
    if (String(e.message || '').startsWith('EVENT_DUPLICATE:')) {
      return res.json({ received: true, duplicate: true });
    }
    console.error('[Stripe webhook] dedupe error:', e);
    return res.status(500).send('Webhook dedupe failed');
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (!session.subscription) break;

        // Expandimos la suscripción para conocer status/price
        const subscription = await stripe.subscriptions.retrieve(session.subscription, {
          expand: ['items.data.price']
        });

        // Solo invitamos si está pagado/activa/trial, pero SIEMPRE upserteamos la fila.
        const paidEnough =
          session.payment_status === 'paid' ||
          (subscription && ['active', 'trialing'].includes(subscription.status));

        const signupEmail =
          session.customer_details?.email ||
          session.customer_email ||
          session.metadata?.signup_email ||
          '';
        const tenantName = session.metadata?.tenant_name || '';

        // Tenant
        const tenant = await ensureTenantByEmail(signupEmail, tenantName);
        await upsertTenantStripeCustomer(tenant?.id, subscription.customer);

        // Plan
        let planId = null;
        const metaCode = normalizePlan(subscription.metadata?.plan_code || session.metadata?.plan_code || '');
        if (metaCode) planId = await getPlanIdByCode(metaCode);
        if (!planId) {
          const basePriceId = getBasePriceIdFromSubscription(subscription);
          const planByPrice = await getPlanByStripePriceId(basePriceId);
          planId = planByPrice?.id || null;
        }

        // Upsert robusto de la suscripción (idempotente)
        await upsertSubscriptionRow({
          tenantId: tenant?.id || null,
          planId,
          subscription,
          customerId: subscription.customer
        });

        // Invitación solo cuando está pagado/activa/trial
        if (paidEnough) await inviteUserIfPossible(signupEmail);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const s = event.data.object;

        // Plan
        let planId = null;
        const metaCode = normalizePlan(s.metadata?.plan_code || '');
        if (metaCode) planId = await getPlanIdByCode(metaCode);
        if (!planId) {
          const sub = typeof s.items?.data?.[0]?.price?.id === 'string'
            ? s
            : await stripe.subscriptions.retrieve(s.id, { expand: ['items.data.price'] });
          const basePriceId = getBasePriceIdFromSubscription(sub);
          const planByPrice = await getPlanByStripePriceId(basePriceId);
          planId = planByPrice?.id || null;
        }

        // Tenant
        let tenantId = null;
        try {
          const { data: subRow } = await supabase
            .from('subscriptions')
            .select('tenant_id')
            .eq('provider', 'stripe')
            .eq('provider_subscription_id', s.id)
            .maybeSingle();
          tenantId = subRow?.tenant_id || null;
        } catch {}

        if (!tenantId) {
          const customer = typeof s.customer === 'string'
            ? await stripe.customers.retrieve(s.customer)
            : s.customer;
          const emailForTenant = customer?.email || s.metadata?.signup_email || '';
          const tenant = await ensureTenantByEmail(emailForTenant, s.metadata?.tenant_name || '');
          tenantId = tenant?.id || null;
          await upsertTenantStripeCustomer(tenantId, s.customer);
        } else {
          await upsertTenantStripeCustomer(tenantId, s.customer);
        }

        // Upsert de la fila
        await upsertSubscriptionRow({
          tenantId,
          planId,
          subscription: s,
          customerId: s.customer
        });

        // Invitación opcional si ya está activa/trial
        if (['active', 'trialing'].includes(s.status)) {
          try {
            const cust = typeof s.customer === 'string'
              ? await stripe.customers.retrieve(s.customer)
              : s.customer;
            const emailOK = cust?.email || s.metadata?.signup_email || '';
            if (emailOK) await inviteUserIfPossible(emailOK);
          } catch (e) {
            console.warn('[webhook] optional invite on subscription.updated failed:', e.message);
          }
        }
        break;
      }

      default:
        // otros eventos: ignorar
        break;
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('[Stripe webhook] handler error:', err);
    return res.status(500).send('Webhook handler failed');
  }
}

module.exports = { stripeWebhook };
