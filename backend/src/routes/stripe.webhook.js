'use strict';

const express = require('express');
const Stripe  = require('stripe');
const { supabase } = require('../utils/supabaseClient');

const router = express.Router();

const STRIPE_KEY  = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_KEY = process.env.STRIPE_WEBHOOK_SECRET;
const stripe      = STRIPE_KEY ? new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' }) : null;

/* --------------------------------- Helpers -------------------------------- */

// tenant por customerId de Stripe
async function findTenantByCustomer(customerId) {
  if (!customerId) return null;
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

// primer priceId de una Subscription (con o sin expand)
function getFirstPriceId(sub) {
  try {
    const item = sub?.items?.data?.[0];
    if (!item) return null;
    const price = item.price; // puede ser string o objeto expandido
    return typeof price === 'string' ? price : price?.id || null;
  } catch {
    return null;
  }
}

// garantiza que la sub trae price expandido
async function ensureSubWithPrice(sub) {
  if (!sub?.id) return sub;
  const hasPrice = !!getFirstPriceId(sub) || !!sub?.plan?.id;
  if (hasPrice) return sub;
  return await stripe.subscriptions.retrieve(sub.id, { expand: ['items.data.price'] });
}

// map priceId -> billing_plans.id
async function resolvePlanIdFromPriceId(priceId) {
  if (!priceId) return null;
  const { data, error } = await supabase
    .from('billing_plans')
    .select('id')
    .eq('stripe_price_id', priceId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

const mapStatus = (s) => (s || '').toLowerCase();
const toISO = (sec) => (sec ? new Date(sec * 1000).toISOString() : null);

/* ------------------------- Upsert de suscripción (DB) ---------------------- */

async function upsertSubscription(tenantId, stripeSub) {
  if (!tenantId || !stripeSub) return;

  // 1) asegurar priceId
  const sub = await ensureSubWithPrice(stripeSub);
  let priceId = getFirstPriceId(sub) || sub?.plan?.id || null;

  // 2) calcular plan_id (por priceId o reusar el existente)
  let planId = await resolvePlanIdFromPriceId(priceId);
  if (!planId) {
    const { data: existing, error: exErr } = await supabase
      .from('subscriptions')
      .select('plan_id')
      .eq('provider', 'stripe')
      .eq('provider_subscription_id', sub.id)
      .limit(1)
      .maybeSingle();
    if (exErr) throw exErr;
    if (existing?.plan_id) planId = existing.plan_id;
  }
  if (!planId) {
    console.error('[stripe.webhook] PLAN_ID_REQUIRED', { subId: sub.id, priceId });
    throw new Error('PLAN_ID_REQUIRED'); // 500 => Stripe reintenta
  }

  // 3) payload normalizado
  const row = {
    tenant_id: tenantId,
    plan_id: planId, // NOT NULL
    provider: 'stripe',
    provider_customer_id: sub.customer || null,
    provider_subscription_id: sub.id,
    status: mapStatus(sub.status),
    current_period_start: toISO(sub.current_period_start),
    current_period_end:   toISO(sub.current_period_end),
    trial_ends_at:        toISO(sub.trial_end),
    cancel_at_period_end: !!sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };

  // 4) upsert idempotente por (provider, provider_subscription_id)
  const { error } = await supabase
    .from('subscriptions')
    .upsert(row, { onConflict: 'provider,provider_subscription_id' });
  if (error) throw error;

  // 5) desactivar “trial” del tenant cuando hay sub válida
  if (['active', 'trialing', 'past_due'].includes(row.status)) {
    await supabase.from('tenants').update({ trial_active: false }).eq('id', tenantId);
  }
}

/* --------------------------------- Router --------------------------------- */

async function handleEvent(evt) {
  switch (evt.type) {
    // Checkout completado
    case 'checkout.session.completed': {
      const cs = evt.data.object;
      const tenantId = await findTenantByCustomer(cs.customer);
      const sub = cs.subscription
        ? await stripe.subscriptions.retrieve(cs.subscription, { expand: ['items.data.price'] })
        : null;
      if (!tenantId || !sub) return;
      await upsertSubscription(tenantId, sub);
      return;
    }

    // Altas / cambios / cancelaciones
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const rawSub = evt.data.object;
      const tenantId = await findTenantByCustomer(rawSub.customer);
      if (!tenantId) return;
      await upsertSubscription(tenantId, rawSub); // upsert hará ensureSubWithPrice si falta price
      return;
    }

    // Pago fallido: refrescar estado y fechas
    case 'invoice.payment_failed': {
      const inv = evt.data.object;
      if (!inv?.subscription) return;
      const sub = await stripe.subscriptions.retrieve(inv.subscription, { expand: ['items.data.price'] });
      const tenantId = await findTenantByCustomer(sub.customer);
      if (!tenantId) return;
      await upsertSubscription(tenantId, sub);
      return;
    }

    // (Opcional) cuando se paga y pasa a active
    case 'invoice.paid':
    case 'customer.subscription.resumed': {
      const obj = evt.data.object;
      const subId = obj?.subscription || obj?.id;
      if (!subId) return;
      const sub = await stripe.subscriptions.retrieve(subId, { expand: ['items.data.price'] });
      const tenantId = await findTenantByCustomer(sub.customer);
      if (!tenantId) return;
      await upsertSubscription(tenantId, sub);
      return;
    }

    default:
      return; // ignoramos el resto
  }
}

// Handler para usar con express.raw() en app.js
async function stripeWebhook(req, res) {
  try {
    if (!stripe || !WEBHOOK_KEY) return res.status(503).send('Stripe no configurado');

    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_KEY);
    } catch (err) {
      console.error('[stripe.webhook] signature error', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    await handleEvent(event);
    return res.json({ received: true });
  } catch (e) {
    console.error('[stripe.webhook] error', e);
    return res.status(500).send('Webhook handler failed');
  }
}

module.exports = { router, stripeWebhook };
