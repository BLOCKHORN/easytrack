'use strict';

const Stripe = require('stripe');
const { supabase } = require('../utils/supabaseClient');
const { slugifyBase, uniqueSlug } = require('../helpers/slug');

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' }) : null;

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
const toISO = (sec) => (sec ? new Date(sec * 1000).toISOString() : null);

async function upsertTenantByEmail({ email, businessName }) {
  if (!email) throw new Error('email requerido');
  const low = email.trim().toLowerCase();

  const { data: exist, error: exErr } = await supabase
    .from('tenants')
    .select('id, slug, nombre_empresa, email')
    .eq('email', low)
    .maybeSingle();

  if (exErr) throw exErr;
  if (exist?.id) return exist;

  const base = slugifyBase(businessName || low.split('@')[0]);
  const slug = await uniqueSlug(supabase, base);

  const { data, error } = await supabase
    .from('tenants')
    .insert([{ email: low, nombre_empresa: businessName || base, slug }])
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function findPlanId({ planCode, stripePriceId }) {
  let q = supabase.from('billing_plans').select('id').limit(1);
  if (stripePriceId) q = q.eq('stripe_price_id', stripePriceId);
  else if (planCode) q = q.eq('code', planCode);
  else throw new Error('planCode o stripePriceId requerido');

  const { data, error } = await q.single();
  if (error) throw new Error(`No se encontró billing_plans para ${stripePriceId || planCode}`);
  return data.id;
}

async function upsertSubscriptionFromStripe({ tenantId, planId, stripeSub, stripeCustomerId }) {
  if (!stripeSub?.id) throw new Error('stripeSub.id requerido');

  const { data: existing, error: exErr } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('provider', 'stripe')
    .eq('provider_subscription_id', stripeSub.id)
    .maybeSingle();
  if (exErr) throw exErr;

  const payload = {
    tenant_id: tenantId || null,
    plan_id: planId || null,
    provider: 'stripe',
    provider_customer_id: stripeCustomerId || stripeSub.customer || null,
    provider_subscription_id: stripeSub.id,
    status: mapStripeStatus(stripeSub.status),
    trial_ends_at: toISO(stripeSub.trial_end),
    current_period_start: toISO(stripeSub.current_period_start),
    current_period_end: toISO(stripeSub.current_period_end),
    cancel_at_period_end: !!stripeSub.cancel_at_period_end,
    updated_at: new Date().toISOString()
  };

  if (existing?.id) {
    const { error } = await supabase
      .from('subscriptions')
      .update(payload)
      .eq('id', existing.id);
    if (error) throw error;
    return existing.id;
  } else {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert([payload])
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }
}

async function updateSubscriptionStatus({ stripeSub }) {
  if (!stripeSub?.id) throw new Error('stripeSub.id requerido');

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: mapStripeStatus(stripeSub.status),
      trial_ends_at: toISO(stripeSub.trial_end),
      current_period_start: toISO(stripeSub.current_period_start),
      current_period_end: toISO(stripeSub.current_period_end),
      cancel_at_period_end: !!stripeSub.cancel_at_period_end,
      updated_at: new Date().toISOString()
    })
    .eq('provider', 'stripe')
    .eq('provider_subscription_id', stripeSub.id);

  if (error) throw error;
}

async function logPaymentEvent({ eventType, payload, eventId }) {
  const insert = {
    provider: 'stripe',
    event_type: eventType,
    payload
  };
  if (eventId) insert.event_id = eventId;
  await supabase.from('payment_events').insert(insert);
}

/** Invitación con redirect unificado al puente. */
async function inviteUser(email) {
  try {
    if (!email) return;
    if (!supabase?.auth?.admin?.inviteUserByEmail) return;
    await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.APP_BASE_URL || process.env.FRONTEND_URL || ''}/auth/email-confirmado`
    });
  } catch (e) {
    console.warn('[inviteUser] error:', e?.message || e);
  }
}

module.exports = {
  stripe,
  upsertTenantByEmail,
  findPlanId,
  upsertSubscriptionFromStripe,
  updateSubscriptionStatus,
  logPaymentEvent,
  inviteUser
};
