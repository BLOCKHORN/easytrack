'use strict';

import { apiFetch } from '../utils/fetcher';

async function authFetch(path, opts = {}) {
  const res = await apiFetch(`/api${path}`, opts);
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

export async function getLimits() {
  return await authFetch('/limits/me');
}

export async function startCheckout(planCode) {
  const r = await authFetch('/billing/checkout', {
    method: 'POST',
    body: { plan_code: planCode },
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