'use strict';

const express = require('express');
const Stripe  = require('stripe');
const { supabase } = require('../utils/supabaseClient');

const router = express.Router();

const STRIPE_KEY  = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_KEY = process.env.STRIPE_WEBHOOK_SECRET;
const stripe      = STRIPE_KEY ? new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' }) : null;

async function safeLogEvent(provider, evt) {
  try {
    await supabase.from('payment_events').insert([{
      provider,
      event_type: evt?.type || null,
      payload: evt || {},
      event_id: evt?.id || null
    }]);
  } catch (e) {
    console.warn('[stripe.webhook] Fallo al guardar en payment_events:', e?.message || e);
  }
}

async function findTenantByCustomer(customerId) {
  if (!customerId) return null;
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('[stripe.webhook] Error buscando tenant por customer:', error);
    throw error;
  }
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

async function resolvePlanIdFromPrice(priceId) {
  if (!priceId) return null;
  const { data, error } = await supabase
    .from('billing_plans')
    .select('id')
    .eq('stripe_price_id', priceId)
    .maybeSingle();
  if (error) console.error('[stripe.webhook] Error resolviendo Plan ID:', error);
  return data?.id || null;
}

const mapStatus = (s) => (s || '').toLowerCase();
const toISO = (sec) => (sec ? new Date(sec * 1000).toISOString() : null);

async function upsertSubscription(tenantId, stripeSub, forcedPlanTier = null) {
  if (!tenantId || !stripeSub) {
    console.warn('[stripe.webhook] Faltan datos para el upsert');
    return;
  }

  const priceId = getFirstPriceId(stripeSub) || stripeSub?.plan?.id || null;
  const subStatus = mapStatus(stripeSub.status);
  const isActive = ['active', 'trialing', 'past_due'].includes(subStatus);

  let planIdInternal = await resolvePlanIdFromPrice(priceId);

  let tenantPlanTier = 'free';
  if (isActive) {
    const { data: planData } = await supabase.from('billing_plans').select('code').eq('id', planIdInternal).maybeSingle();
    
    if (planData?.code) {
      tenantPlanTier = planData.code.includes('pro') ? 'pro' : 'plus';
    } else if (forcedPlanTier) {
      tenantPlanTier = forcedPlanTier.includes('pro') ? 'pro' : 'plus';
    }
  }

  const row = {
    tenant_id: tenantId,
    plan_id: planIdInternal, 
    provider: 'stripe',
    provider_customer_id: stripeSub.customer || null,
    provider_subscription_id: stripeSub.id,
    status: subStatus,
    current_period_start: toISO(stripeSub.current_period_start),
    current_period_end:   toISO(stripeSub.current_period_end),
    trial_ends_at:         toISO(stripeSub.trial_end),
    cancel_at_period_end: !!stripeSub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertErr } = await supabase.from('subscriptions').upsert(row, { onConflict: 'provider,provider_subscription_id' });
  if (upsertErr) {
    console.error('[stripe.webhook] Error al insertar en tabla subscriptions:', upsertErr);
    throw upsertErr;
  }

  const { error: tenantErr } = await supabase
    .from('tenants')
    .update({ plan_id: tenantPlanTier, trial_used: 0 })
    .eq('id', tenantId);
    
  if (tenantErr) {
    console.error('[stripe.webhook] Error al actualizar plan_id en tabla tenants:', tenantErr);
    throw tenantErr;
  }
  
  console.log(`[stripe.webhook] Tenant ${tenantId} actualizado a plan: ${tenantPlanTier}`);
}

async function handleEvent(evt) {
  await safeLogEvent('stripe', evt);
  console.log(`[stripe.webhook] Procesando evento: ${evt.type}`);

  switch (evt.type) {
    case 'checkout.session.completed': {
      const session = evt.data.object;
      const tenantId = session.metadata?.tenant_id || session.client_reference_id;
      const planCode = session.metadata?.plan_code; 

      if (!tenantId || !isId(session.subscription, 'sub')) {
        console.warn('[stripe.webhook] Sesion completada, pero falta tenantId o subscription ID.');
        return;
      }

      const sub = await stripe.subscriptions.retrieve(session.subscription);
      await upsertSubscription(tenantId, sub, planCode);
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = evt.data.object;
      const tenantId = sub.metadata?.tenant_id || await findTenantByCustomer(sub.customer);
      const planCode = sub.metadata?.plan_code;

      if (!tenantId) {
        console.warn(`[stripe.webhook] Subscripcion actualizada, no se encontro tenant: ${sub.customer}`);
        return;
      }
      await upsertSubscription(tenantId, sub, planCode);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = evt.data.object;
      const tenantId = await findTenantByCustomer(sub.customer);
      if (!tenantId) return;
      const { error: delErr } = await supabase.from('tenants').update({ plan_id: 'free' }).eq('id', tenantId);
      if (delErr) {
        console.error('[stripe.webhook] Error al devolver tenant a free tras cancelacion:', delErr);
      } else {
        console.log(`[stripe.webhook] Tenant ${tenantId} devuelto a Freemium por cancelacion.`);
      }
      break;
    }

    case 'invoice.paid': {
      const inv = evt.data.object;
      if (!isId(inv.subscription, 'sub')) return;
      const sub = await stripe.subscriptions.retrieve(inv.subscription);
      const tenantId = await findTenantByCustomer(sub.customer);
      if (tenantId) await upsertSubscription(tenantId, sub);
      break;
    }
  }
}

async function stripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_KEY);
  } catch (err) {
    console.error(`[stripe.webhook] Fallo de verificacion de firma: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    await handleEvent(event);
    return res.json({ received: true });
  } catch (err) {
    console.error(`[stripe.webhook] Fallo procesando el evento: ${err.message}`);
    return res.status(200).send('Event received but processing failed');
  }
}

module.exports = { router, stripeWebhook };