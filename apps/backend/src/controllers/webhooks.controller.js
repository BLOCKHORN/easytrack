'use strict';

const Stripe = require('stripe');
const { supabase } = require('../utils/supabaseClient');
const { isDirectPg, query } = require('../utils/db');
const { clearSubscriptionCache } = require('../utils/subscription');

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_KEY = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' }) : null;

async function safeLogEvent(provider, evt) {
  try {
    if (isDirectPg()) {
      await query(
        'INSERT INTO public.payment_events (provider, event_type, payload, event_id, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [provider, evt?.type || null, JSON.stringify(evt || {}), evt?.id || null]
      );
      return;
    }
    await supabase.from('payment_events').insert([{
      provider,
      event_type: evt?.type || null,
      payload: evt || {},
      event_id: evt?.id || null
    }]);
  } catch (e) {
    console.error('[safeLogEvent error]', e.message);
  }
}

async function findTenantByCustomer(customerId) {
  if (!customerId) return null;
  if (isDirectPg()) {
    try {
      const { rows } = await query('SELECT id FROM public.tenants WHERE stripe_customer_id = $1 LIMIT 1', [customerId]);
      return rows[0]?.id || null;
    } catch (e) {
      console.error('[findTenantByCustomer pg error]', e);
    }
  }
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
    return typeof item?.price === 'string' ? item.price : item?.price?.id || null;
  } catch { return null; }
}

async function resolvePlanIdFromPrice(priceId) {
  if (!priceId) return null;
  if (isDirectPg()) {
    try {
      const { rows } = await query('SELECT id FROM public.billing_plans WHERE stripe_price_id = $1 LIMIT 1', [priceId]);
      return rows[0]?.id || null;
    } catch (e) {
      console.error('[resolvePlanIdFromPrice pg error]', e);
    }
  }
  const { data } = await supabase
    .from('billing_plans')
    .select('id')
    .eq('stripe_price_id', priceId)
    .maybeSingle();
  return data?.id || null;
}

const mapStatus = (s) => (s || '').toLowerCase();
const toISO = (sec) => (sec ? new Date(sec * 1000).toISOString() : null);

async function upsertSubscription(tenantId, stripeSub) {
  if (!tenantId || !stripeSub) return;

  const priceId = getFirstPriceId(stripeSub) || stripeSub?.plan?.id || null;
  const subStatus = mapStatus(stripeSub.status);
  
  const isActive = ['active', 'trialing', 'past_due'].includes(subStatus);
  const planIdInternal = await resolvePlanIdFromPrice(priceId);
  const tenantPlanTier = isActive ? 'pro' : 'free';

  const subData = {
    tenant_id: tenantId,
    plan_id: planIdInternal, 
    provider: 'stripe',
    provider_customer_id: stripeSub.customer || null,
    provider_subscription_id: stripeSub.id,
    status: subStatus,
    current_period_start: toISO(stripeSub.current_period_start),
    current_period_end:   toISO(stripeSub.current_period_end),
    trial_ends_at:        toISO(stripeSub.trial_end),
    cancel_at_period_end: !!stripeSub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };

  if (isDirectPg()) {
    try {
      const { rows: existingRows } = await query(
        'SELECT id FROM public.subscriptions WHERE provider_subscription_id = $1 LIMIT 1',
        [stripeSub.id]
      );

      if (existingRows.length > 0) {
        await query(
          `UPDATE public.subscriptions SET
             plan_id = $1, status = $2, current_period_start = $3, current_period_end = $4,
             trial_ends_at = $5, cancel_at_period_end = $6, updated_at = NOW()
           WHERE id = $7`,
          [
            subData.plan_id, subData.status, subData.current_period_start, subData.current_period_end,
            subData.trial_ends_at, subData.cancel_at_period_end, existingRows[0].id
          ]
        );
      } else {
        await query(
          `INSERT INTO public.subscriptions (
             tenant_id, plan_id, provider, provider_customer_id, provider_subscription_id,
             status, current_period_start, current_period_end, trial_ends_at, cancel_at_period_end,
             created_at, updated_at
           ) VALUES ($1, $2, 'stripe', $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
          [
            subData.tenant_id, subData.plan_id, subData.provider_customer_id, subData.provider_subscription_id,
            subData.status, subData.current_period_start, subData.current_period_end, subData.trial_ends_at,
            subData.cancel_at_period_end
          ]
        );
      }

      // Actualizar Tenant
      if (isActive) {
        await query('UPDATE public.tenants SET plan_id = $1, trial_used = 0 WHERE id = $2', [tenantPlanTier, tenantId]);
      } else {
        await query('UPDATE public.tenants SET plan_id = $1 WHERE id = $2', [tenantPlanTier, tenantId]);
      }
      clearSubscriptionCache(tenantId);
      return;
    } catch (e) {
      console.error('[upsertSubscription pg error]', e);
    }
  }

  // Fallback Supabase si no hay pg directo
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('provider_subscription_id', stripeSub.id)
    .maybeSingle();

  if (existingSub) {
    await supabase.from('subscriptions').update(subData).eq('id', existingSub.id);
  } else {
    await supabase.from('subscriptions').insert([subData]);
  }

  const tenantUpdates = { plan_id: tenantPlanTier };
  if (isActive) tenantUpdates.trial_used = 0;

  await supabase.from('tenants').update(tenantUpdates).eq('id', tenantId);
}

async function handleEvent(evt) {
  await safeLogEvent('stripe', evt);

  switch (evt.type) {
    case 'checkout.session.completed': {
      const session = evt.data.object;
      const tenantId = session.metadata?.tenant_id || session.client_reference_id;
      if (!tenantId || !isId(session.subscription, 'sub')) return;
      const sub = await stripe.subscriptions.retrieve(session.subscription);
      await upsertSubscription(tenantId, sub);
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = evt.data.object;
      const tenantId = sub.metadata?.tenant_id || await findTenantByCustomer(sub.customer);
      if (tenantId) await upsertSubscription(tenantId, sub);
      break;
    }
    case 'invoice.paid': {
      const inv = evt.data.object;
      if (!isId(inv.subscription, 'sub')) return;
      const sub = await stripe.subscriptions.retrieve(inv.subscription);
      const tenantId = await findTenantByCustomer(sub.customer);
      if (tenantId) await upsertSubscription(tenantId, sub);

      // GESTIÓN DE REFERIDOS
      if (inv.amount_paid > 0 && tenantId) {
        try {
          let ref = null;
          if (isDirectPg()) {
            const { rows } = await query('SELECT id, status FROM public.tenant_referrals WHERE referred_tenant_id = $1 LIMIT 1', [tenantId]);
            ref = rows[0] || null;
          } else {
            const { data } = await supabase.from('tenant_referrals').select('id, status').eq('referred_tenant_id', tenantId).maybeSingle();
            ref = data;
          }

          if (ref) {
            const isAnnual = inv.lines?.data?.some(l => l.plan && l.plan.interval === 'year');
            let amount = 0;

            if (isAnnual) {
              if (ref.status === 'pending') amount = 6000; // 60€ primer año
            } else {
              amount = 500; // 5€ todos los meses
            }

            if (amount > 0) {
              const releaseDate = new Date();
              releaseDate.setDate(releaseDate.getDate() + 15);

              if (isDirectPg()) {
                await query(
                  'INSERT INTO public.pending_referral_credits (referral_id, amount_cents, release_at, stripe_invoice_id, created_at) VALUES ($1, $2, $3, $4, NOW())',
                  [ref.id, amount, releaseDate.toISOString(), inv.id]
                );
              } else {
                await supabase.from('pending_referral_credits').insert([{
                  referral_id: ref.id,
                  amount_cents: amount,
                  release_at: releaseDate.toISOString(),
                  stripe_invoice_id: inv.id
                }]);
              }
            }

            if (ref.status === 'pending') {
              if (isDirectPg()) {
                await query('UPDATE public.tenant_referrals SET status = $1 WHERE id = $2', ['active', ref.id]);
              } else {
                await supabase.from('tenant_referrals').update({ status: 'active' }).eq('id', ref.id);
              }
            }
          }
        } catch (refErr) {
          console.error('[invoice.paid referral error]', refErr);
        }
      }
      break;
    }
  }
}

exports.stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_KEY);
  } catch (err) {
    console.error('[stripeWebhook signature error]', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    await handleEvent(event);
    return res.json({ received: true });
  } catch (err) {
    console.error('[stripeWebhook processing error]', err);
    return res.status(500).send('Internal Server Error');
  }
};