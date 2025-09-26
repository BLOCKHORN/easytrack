'use strict';

const express = require('express');
const Stripe  = require('stripe');
const { supabase } = require('../utils/supabaseClient');

const router = express.Router();

const STRIPE_KEY   = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_KEY  = process.env.STRIPE_WEBHOOK_SECRET;
const stripe       = STRIPE_KEY ? new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' }) : null;

// Buscar tenant por customerId (rápido)
async function findTenantByCustomer(customerId) {
  if (!customerId) return null;
  const { data } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}

// Upsert básico en subscriptions
async function upsertSubscription(tenantId, stripeSub) {
  if (!tenantId || !stripeSub) return;

  const mapStatus = (s) => (s || '').toLowerCase();
  const status = mapStatus(stripeSub.status);

  const row = {
    tenant_id: tenantId,
    plan_id: null, // opcional si mapeas your-plan-id; si no, déjalo null
    provider: 'stripe',
    provider_customer_id: stripeSub.customer || null,
    provider_subscription_id: stripeSub.id,
    status,
    current_period_start: stripeSub.current_period_start ? new Date(stripeSub.current_period_start * 1000).toISOString() : null,
    current_period_end:   stripeSub.current_period_end   ? new Date(stripeSub.current_period_end   * 1000).toISOString() : null,
    trial_ends_at:        stripeSub.trial_end            ? new Date(stripeSub.trial_end            * 1000).toISOString() : null,
    cancel_at_period_end: !!stripeSub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };

  // upsert por provider_subscription_id (y/o tenant_id)
  const { error } = await supabase
    .from('subscriptions')
    .upsert(row, { onConflict: 'provider,provider_subscription_id' });
  if (error) throw error;
}

async function handleEvent(evt) {
  switch (evt.type) {
    case 'checkout.session.completed': {
      const cs = evt.data.object;
      const customerId = cs.customer;
      const subId = cs.subscription;
      const tenantId = await findTenantByCustomer(customerId);
      if (!tenantId || !subId) return;

      const sub = await stripe.subscriptions.retrieve(subId, { expand: ['items.data.price'] });
      await upsertSubscription(tenantId, sub);
      return;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = evt.data.object;
      const customerId = sub.customer;
      const tenantId = await findTenantByCustomer(customerId);
      if (!tenantId) return;
      await upsertSubscription(tenantId, sub);
      return;
    }
    case 'invoice.payment_failed': {
      const inv = evt.data.object;
      const subId = inv.subscription;
      if (!subId) return;
      const sub = await stripe.subscriptions.retrieve(subId);
      const tenantId = await findTenantByCustomer(sub.customer);
      if (!tenantId) return;
      await upsertSubscription(tenantId, sub);
      return;
    }
    default:
      return;
  }
}

// Exporta handler usable por app.js con express.raw()
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
