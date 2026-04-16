'use strict';

import { supabase } from '../utils/supabaseClient';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
const API = `${API_BASE}/api`;

async function authFetch(path, opts = {}) {
  const { data: sdata } = await supabase.auth.getSession();
  const token = sdata?.session?.access_token;

  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  });

  const body = await res.json().catch(() => null);

  if (!res.ok || body?.ok === false) {
    const err = new Error(body?.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

export async function getPlans() {
  const r = await authFetch('/billing/plans');
  return r?.plans || [];
}

export async function startCheckout(planCode) {
  const r = await authFetch('/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ plan_code: planCode }),
  });
  if (!r?.url) throw new Error('No se pudo obtener la URL de pago');
  return r.url;
}

export async function openBillingPortal() {
  const r = await authFetch('/billing/portal', { method: 'POST' });
  return r?.url || null;
}

export async function verifyCheckout(sessionId) {
  return await authFetch(`/billing/checkout/verify?session_id=${encodeURIComponent(sessionId)}`);
}