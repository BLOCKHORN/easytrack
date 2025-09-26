'use strict';

const express = require('express');
const Stripe  = require('stripe');
const { supabase } = require('../utils/supabaseClient');

const router = express.Router();

const STRIPE_KEY  = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_KEY = process.env.STRIPE_WEBHOOK_SECRET;
const stripe      = STRIPE_KEY ? new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' }) : null;

/* --------------------------------- Helpers -------------------------------- */

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

const isId = (id, pref) => typeof id === 'string' && id.startsWith(pref + '_');

function getFirstPriceId(sub) {
  try {
    const item = sub?.items?.data?.[0];
    if (!item) return null;
    const price = item.price;
    return typeof price === 'string' ? price : price?.id || null;
  } catch { return null; }
}

async function ensureSubWithPrice(sub) {
  if (!sub?.id) return sub;
  const hasPrice = !!getFirstPriceId(sub) || !!sub?.plan?.id;
  if (hasPrice) return sub;
  return await stripe.subscriptions.retrieve(sub.id, { expand: ['items.data.price'] });
}

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

  const sub = await ensureSubWithPrice(stripeSub);
  let priceId = getFirstPriceId(sub) || sub?.plan?.id || null;

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
    throw new Error('PLAN_ID_REQUIRED');
  }

  const row = {
    tenant_id: tenantId,
    plan_id: planId,
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

  const { error } = await supabase
    .from('subscriptions')
    .upsert(row, { onConflict: 'provider,provider_subscription_id' });
  if (error) throw error;

  if (['active','trialing','past_due'].includes(row.status)) {
    await supabase.from('tenants').update({ trial_active: false }).eq('id', tenantId);
  }
}

/* --------------------------------- Router --------------------------------- */

async function handleEvent(evt) {
  switch (evt.type) {
    case 'checkout.session.completed': {
      const cs = evt.data.object;
      const tenantId = await findTenantByCustomer(cs.customer);
      if (!tenantId || !isId(cs.subscription, 'sub')) return;
      const sub = await stripe.subscriptions.retrieve(cs.subscription, { expand: ['items.data.price'] });
      await upsertSubscription(tenantId, sub);
      return;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const rawSub = evt.data.object;
      const tenantId = await findTenantByCustomer(rawSub.customer);
      if (!tenantId || !isId(rawSub.id, 'sub')) return;
      await upsertSubscription(tenantId, rawSub);
      return;
    }

    // ⚠️ SOLO procesamos si el invoice trae subscription (id sub_...)
    case 'invoice.payment_failed':
    case 'invoice.paid': {
      const inv = evt.data.object;
      const subId = inv?.subscription;
      if (!isId(subId, 'sub')) {
        console.warn('[stripe.webhook] invoice.* sin subscription asociada. Ignoro.', {
          evt: evt.type, invoiceId: inv?.id, subscription: subId
        });
        return;
      }
      const sub = await stripe.subscriptions.retrieve(subId, { expand: ['items.data.price'] });
      const tenantId = await findTenantByCustomer(sub.customer);
      if (!tenantId) return;
      await upsertSubscription(tenantId, sub);
      return;
    }

    default:
      return;
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
