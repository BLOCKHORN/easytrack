// src/services/billingService.js
import { supabase } from '../utils/supabaseClient';

const API_BASE =
  (import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:3001')
    .replace(/\/+$/, '');
const API = `${API_BASE}/api`;

/* --------------------------- helpers --------------------------- */
async function authFetch(path, opts = {}) {
  const { data: sdata } = await supabase.auth.getSession();
  const token = sdata?.session?.access_token;

  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });

  const txt = await res.text();
  let body = null;
  try { body = txt ? JSON.parse(txt) : null; } catch { body = txt; }

  if (!res.ok || body?.ok === false) {
    const err = new Error(body?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

/* ----------------------------- API ----------------------------- */

// Planes activos (para UI)
export async function getPlans() {
  const r = await authFetch('/billing/plans');
  return Array.isArray(r?.plans) ? r.plans : (Array.isArray(r) ? r : []);
}

/**
 * Prefill opcional de datos de facturación.
 * Si tu backend no implementa /billing/prefill todavía, devolvemos true en 404
 * para no romper el flujo (el modal seguirá funcionando).
 */
export async function prefillBilling(payload) {
  try {
    const body = {
      ...payload,
      save_to_customer: payload?.save_to_customer !== false,
    };
    const r = await authFetch('/billing/prefill', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return r?.ok !== false;
  } catch (e) {
    if (e?.status === 404) return true; // tolerante si no existe el endpoint
    throw e;
  }
}

/** Arranca el Checkout y devuelve SIEMPRE un string URL válido */
export async function startCheckout(payload) {
  const r = await authFetch('/billing/checkout', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });
  if (typeof r === 'string') return r;
  if (r?.url && typeof r.url === 'string') return r.url;
  if (r?.data?.url && typeof r.data.url === 'string') return r.data.url;
  throw new Error('No se pudo iniciar el checkout (sin URL).');
}

/** Abre Stripe Billing Portal (URL) */
export async function openBillingPortal() {
  const r = await authFetch('/billing/portal', { method: 'POST' });
  return r?.url || null;
}

/** Resumen de suscripción (Stripe → simplificado) */
export async function getSubscription() {
  const r = await authFetch('/billing/subscription');
  return r?.subscription || null;
}

/**
 * Verifica una Checkout Session por ID (no requiere sesión)
 * Devuelve { sessionId, status, customerEmail, planCode, trialEndsAt, currentPeriodEnd }
 */
export async function verifyCheckout(sessionId) {
  const url = `${API}/billing/checkout/verify?session_id=${encodeURIComponent(sessionId)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const txt = await res.text();
  let body = null;
  try { body = txt ? JSON.parse(txt) : null; } catch { body = txt; }
  if (!res.ok || body?.ok === false) {
    const err = new Error(body?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body?.data || body;
}
