// admin/src/services/adminService.js
import { supabase } from '../utils/supabaseClient';

const API = import.meta.env.VITE_API_URL;

/* ============== helpers ============== */
async function getHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || null;
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function withParams(url, params = {}) {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, v);
  }
  return u.toString();
}

/* ============== Tenants ============== */
export async function listTenants({ q = '', page = 1, pageSize = 20 } = {}) {
  const url = withParams(`${API}/admin/tenants`, { q, page, pageSize });
  const res = await fetch(url, { headers: await getHeaders() });
  if (!res.ok) throw new Error('TENANTS_LIST_FAILED');
  return res.json();
}

export async function getTenant(id) {
  const res = await fetch(`${API}/admin/tenants/${id}`, { headers: await getHeaders() });
  if (!res.ok) throw new Error('TENANT_DETAIL_FAILED');
  return res.json();
}

export async function extendSubscription(id, days = 30) {
  const res = await fetch(`${API}/admin/tenants/${id}/subscription/extend`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ days })
  });
  if (!res.ok) throw new Error('SUBSCRIPTION_EXTEND_FAILED');
  return res.json();
}

/** payload: { plan_id, status } | { plan_code, status } | { plan, status } */
export async function setPlan(id, payload = {}) {
  const body = { ...payload };
  if (body.plan && !body.plan_code && !body.plan_id) { body.plan_code = body.plan; delete body.plan; }
  const res = await fetch(`${API}/admin/tenants/${id}/subscription/set-plan`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('SUBSCRIPTION_SET_PLAN_FAILED');
  return res.json();
}

export async function assumeTenant(tenant_id, reason, minutes = 60) {
  const res = await fetch(`${API}/admin/assume-tenant`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ tenant_id, reason, minutes })
  });
  if (!res.ok) throw new Error('ASSUME_TENANT_FAILED');
  return res.json();
}

export async function endAssume(session_id) {
  const res = await fetch(`${API}/admin/end-assume`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ session_id })
  });
  if (!res.ok) throw new Error('END_ASSUME_FAILED');
  return res.json();
}

/* ============== Data Explorer ============== */
export async function listTables() {
  const r = await fetch(`${API}/admin/data/tables`, { headers: await getHeaders() });
  if (!r.ok) throw new Error('TABLES_FAILED');
  return r.json();
}

export async function queryTable(table, { q = '', page = 1, pageSize = 20, orderBy, orderDir } = {}) {
  const url = withParams(`${API}/admin/data/${table}`, { q, page, pageSize, orderBy, orderDir });
  const r = await fetch(url, { headers: await getHeaders() });
  if (!r.ok) throw new Error('DATA_QUERY_FAILED');
  return r.json();
}

export async function patchRow(table, id, payload) {
  const r = await fetch(`${API}/admin/data/${table}/${id}`, {
    method: 'PATCH',
    headers: await getHeaders(),
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error('DATA_PATCH_FAILED');
  return r.json();
}

/* ============== Audit ============== */
export async function listAudit(params = {}) {
  const url = withParams(`${API}/admin/audit`, params);
  const r = await fetch(url, { headers: await getHeaders() });
  if (!r.ok) throw new Error('AUDIT_LIST_FAILED');
  return r.json();
}

/* ============== Auth (Supabase Admin) ============== */
export async function searchUsers(q = '') {
  const url = withParams(`${API}/admin/auth/users`, { q });
  const r = await fetch(url, { headers: await getHeaders() });
  if (!r.ok) throw new Error('AUTH_USERS_FAILED');
  return r.json();
}

export async function sendReset(email) {
  const r = await fetch(`${API}/admin/auth/users/send-reset`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ email })
  });
  if (!r.ok) throw new Error('AUTH_SEND_RESET_FAILED');
  return r.json();
}

export async function makeImpersonateLink(email, tenant_id = null, minutes = 30) {
  const r = await fetch(`${API}/admin/auth/users/impersonate-link`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ email, tenant_id, minutes })
  });
  if (!r.ok) throw new Error('AUTH_IMPERSONATE_FAILED');
  return r.json();
}
export async function cancelSubscription(id, at_period_end = true) {
  const res = await fetch(`${API}/admin/tenants/${id}/subscription/cancel`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ at_period_end })
  });
  if (!res.ok) throw new Error('SUBSCRIPTION_CANCEL_FAILED');
  return res.json();
}

export async function resumeSubscription(id) {
  const res = await fetch(`${API}/admin/tenants/${id}/subscription/resume`, {
    method: 'POST',
    headers: await getHeaders()
  });
  if (!res.ok) throw new Error('SUBSCRIPTION_RESUME_FAILED');
  return res.json();
}

export async function setSubscriptionDates(id, payload) {
  const res = await fetch(`${API}/admin/tenants/${id}/subscription/set-dates`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('SUBSCRIPTION_SET_DATES_FAILED');
  return res.json();
}
// === DEMO REQUESTS ===
export async function listDemoRequests({ q = '', status = '', page = 1, pageSize = 20 } = {}) {
  const url = withParams(`${API}/admin/demo-requests`, { q, status, page, pageSize });
  const r = await fetch(url, { headers: await getHeaders() });
  if (!r.ok) throw new Error('DEMO_LIST_FAILED');
  return r.json();
}

export async function getDemoRequest(id) {
  const r = await fetch(`${API}/admin/demo-requests/${id}`, { headers: await getHeaders() });
  if (!r.ok) throw new Error('DEMO_DETAIL_FAILED');
  return r.json();
}

export async function acceptDemoRequest(id, { token_ttl = '7 days', frontend_url } = {}) {
  const r = await fetch(`${API}/admin/demo-requests/${id}/accept`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ token_ttl, frontend_url }),
  });
  if (!r.ok) throw new Error('DEMO_ACCEPT_FAILED');
  return r.json();
}

export async function declineDemoRequest(id, { reason = '', purge = false } = {}) {
  const r = await fetch(`${API}/admin/demo-requests/${id}/decline`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ reason, purge }),
  });
  if (!r.ok) throw new Error('DEMO_DECLINE_FAILED');
  return r.json();
}
export async function resendDemoRequest(id, { frontend_url } = {}) {
  const r = await fetch(`${API}/admin/demo-requests/${id}/resend`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ frontend_url }),
  });
  if (!r.ok) throw new Error('DEMO_RESEND_FAILED');
  return r.json();
}

export async function deleteDemoRequest(id) {
  const r = await fetch(`${API}/admin/demo-requests/${id}`, {
    method: 'DELETE',
    headers: await getHeaders(),
  });
  if (!r.ok) throw new Error('DEMO_DELETE_FAILED');
  return r.json();
}

export async function getDemoCounters() {
  const r = await fetch(`${API}/admin/demo-requests/counters`, {
    headers: await getHeaders()
  });
  if (!r.ok) throw new Error('DEMO_COUNTERS_FAILED');
  return r.json(); // -> { ok:true, total, pending, pending_unseen, accepted, declined }
}
