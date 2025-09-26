'use strict';

const express = require('express');
const Stripe  = require('stripe');
const { supabase } = require('../utils/supabaseClient');

const router = express.Router();

const STRIPE_KEY  = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_KEY = process.env.STRIPE_WEBHOOK_SECRET;
const stripe      = STRIPE_KEY ? new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' }) : null;

/* --------------------------------- Helpers -------------------------------- */

// Buscar tenant por customerId (rápido)
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

// Extraer el primer priceId de una subscription (objeto Stripe)
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

// Asegurar que tenemos la subs con price expandido; si no, reconsultar a Stripe
async function ensureSubWithPrice(sub) {
  const hasPrice = !!getFirstPriceId(sub);
  if (hasPrice) return sub;
  // Re-fetch con expand
  return await stripe.subscriptions.retrieve(sub.id, { expand: ['items.data.price'] });
}

// Mapear priceId -> billing_plans.id
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

// Estado normalizado
const mapStatus = (s) => (s || '').toLowerCase();

// Timestamps Stripe (segundos) -> ISO
const toISO = (sec) => (sec ? new Date(sec * 1000).toISOString() : null);

/* ------------------------- Upsert de suscripción (DB) ---------------------- */

async function upsertSubscription(tenantId, stripeSub) {
  if (!tenantId || !stripeSub) return;

  // Garantiza que tenemos priceId disponible
  const sub = await ensureSubWithPrice(stripeSub);
  let priceId = getFirstPriceId(sub);

  // Si aún no hay priceId, intenta legacy (sub.plan?.id)
  if (!priceId) priceId = sub?.plan?.id || null;

  // 1) intenta mapear plan por priceId
  let planId = await resolvePlanIdFromPriceId(priceId);

  // 2) si no lo encuentra, reutiliza plan_id existente (si ya hay fila)
  if (!planId) {
    const { data: existing, error: exErr } = await supabase
      .from('subscriptions')
      .select('id, plan_id')
      .eq('provider', 'stripe')
      .eq('provider_subscription_id', sub.id)
      .limit(1)
      .maybeSingle();
    if (exErr) throw exErr;
    if (existing?.plan_id) planId = existing.plan_id;
  }

  // 3) si sigue sin planId, aborta (Stripe reintentará)
  if (!planId) {
    console.error('[stripe.webhook] PLAN_ID_REQUIRED', {
      subId: sub.id, priceId, itemsLen: sub?.items?.data?.length || 0
    });
    throw new Error('PLAN_ID_REQUIRED');
  }

  const row = {
    tenant_id: tenantId,
    plan_id: planId,                               // ✅ NOT NULL
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

  // Requiere índice único: (provider, provider_subscription_id)
  const { error } = await supabase
    .from('subscriptions')
    .upsert(row, { onConflict: 'provider,provider_subscription_id' });
  if (error) throw error;
}

/* --------------------------------- Router --------------------------------- */

async function handleEvent(evt) {
  switch (evt.type) {
    // Checkout completado: tenemos customer y subscription
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

    // Altas, cambios de plan, cancelaciones: viene la subscription en el evento
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

    // Pagos fallidos: refrescamos estado de la subs
    case 'invoice.payment_failed': {
      const inv = evt.data.object;
      const subId = inv.subscription;
      if (!subId) return;
      const sub = await stripe.subscriptions.retrieve(subId, { expand: ['items.data.price'] });
      const tenantId = await findTenantByCustomer(sub.customer);
      if (!tenantId) return;
      await upsertSubscription(tenantId, sub);
      return;
    }

    default:
      // Ignora eventos no usados
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
