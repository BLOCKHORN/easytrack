// src/controllers/stripeSync.controller.js
'use strict';

const Stripe = require('stripe');
const { supabase } = require('../utils/supabaseClient');
const { slugifyBase, uniqueSlug } = require('../helpers/slug');

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY, { apiVersion: '2024-06-20' }) : null;

/* ------------------------------ Helpers ------------------------------ */

// Stripe puede ampliar el enum en el futuro; mapea lo que te interesa y
// devuelve 'incomplete' para lo demás (fallback seguro).
function mapStripeStatus(s) {
  switch (s) {
    case 'trialing': return 'trialing';
    case 'active': return 'active';
    case 'past_due': return 'past_due';
    case 'canceled': return 'canceled';
    case 'incomplete': return 'incomplete';
    case 'incomplete_expired': return 'incomplete_expired';
    case 'unpaid': return 'unpaid';
    case 'paused': return 'paused'; // por si lo habilitas en el futuro
    default: return 'incomplete';
  }
}

// Convierte epoch seconds → ISO, devolviendo null si no hay valor
const toISO = (sec) => (sec ? new Date(sec * 1000).toISOString() : null);

/* Crea/actualiza tenant por email. Devuelve la fila completa. */
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

/* Busca el plan_id: primero por price de Stripe (si lo tienes guardado), si no por code. */
async function findPlanId({ planCode, stripePriceId }) {
  let q = supabase.from('billing_plans').select('id').limit(1);
  if (stripePriceId) q = q.eq('stripe_price_id', stripePriceId);
  else if (planCode) q = q.eq('code', planCode);
  else throw new Error('planCode o stripePriceId requerido');

  const { data, error } = await q.single();
  if (error) throw new Error(`No se encontró billing_plans para ${stripePriceId || planCode}`);
  return data.id;
}

/**
 * Inserta/actualiza la suscripción local a partir de la de Stripe.
 * Idempotente por provider_subscription_id.
 */
async function upsertSubscriptionFromStripe({ tenantId, planId, stripeSub, stripeCustomerId }) {
  if (!stripeSub?.id) throw new Error('stripeSub.id requerido');

  // ¿existe ya?
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

    // Timestamps (conversión segura)
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
    // Sugerencia: crea un unique index en (provider, provider_subscription_id)
    // y usa upsert({ onConflict: 'provider,provider_subscription_id' })
    const { data, error } = await supabase
      .from('subscriptions')
      .insert([payload])
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }
}

/** Actualiza una suscripción ya creada, por provider_subscription_id, sin tocar tenant/plan. */
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

/** Log de evento (recomendado guardar también event_id para deduplicar reintentos). */
async function logPaymentEvent({ eventType, payload, eventId }) {
  const insert = {
    provider: 'stripe',
    event_type: eventType,
    payload
  };
  if (eventId) insert.event_id = eventId; // si tu tabla lo tiene con UNIQUE, perfecto
  await supabase.from('payment_events').insert(insert);
}

/** Envía invitación de Supabase para que el usuario fije su contraseña. */
async function inviteUser(email) {
  try {
    if (!email) return;
    if (!supabase?.auth?.admin?.inviteUserByEmail) return; // si no es service-role
    await supabase.auth.admin.inviteUserByEmail(email, {
  redirectTo: `${process.env.APP_BASE_URL || process.env.FRONTEND_URL || ''}/auth/email-confirmado`
});

  } catch (e) {
    // No abortes el flujo por un fail de invitación; déjalo logueado.
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
