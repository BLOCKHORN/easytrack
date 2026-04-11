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

export async function getPlans() {
  const r = await authFetch('/billing/plans');
  return Array.isArray(r?.plans) ? r.plans : (Array.isArray(r) ? r : []);
}

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
    if (e?.status === 404) return true; 
    throw e;
  }
}

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

export async function openBillingPortal() {
  const r = await authFetch('/billing/portal', { method: 'POST' });
  return r?.url || null;
}

export async function getSubscription() {
  const r = await authFetch('/billing/subscription');
  return r?.subscription || null;
}

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

export async function getPeriodOptions() {
  try {
    const r = await authFetch('/billing/period-options');
    if (Array.isArray(r)) return r;
    if (Array.isArray(r?.options)) return r.options;
    return null;
  } catch (e) {
    if (e?.status === 404) return null;
    throw e;
  }
}

export async function choosePeriod(period) {
  const r = await authFetch('/billing/choose-period', {
    method: 'POST',
    body: JSON.stringify({ period }),
  });
  if (typeof r === 'string') return r;
  if (r?.url && typeof r.url === 'string') return r.url;
  if (r?.data?.url && typeof r.data.url === 'string') return r.data.url;
  throw new Error('No se pudo iniciar el cambio de periodo (sin URL).');
}

export async function cancelRenewal() {
  const r = await authFetch('/billing/cancel-renewal', { method: 'POST' });
  return r?.ok !== false;
}

export async function resumeRenewal() {
  const r = await authFetch('/billing/resume', { method: 'POST' });
  return r?.ok !== false;
}