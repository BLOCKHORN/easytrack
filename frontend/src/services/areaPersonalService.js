// frontend/src/services/areaPersonalService.js
const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:3001';

export function buildAreaApiBase(pathname) {
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length >= 2 && (segs[1] === 'dashboard' || segs[1] === 'area-personal')) {
    const slug = segs[0];
    return `${API_URL}/${slug}/api/area-personal`;
  }
  return `${API_URL}/api/area-personal`;
}

async function getJSON(url, token) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  });
  const ct = res.headers.get('content-type') || '';
  const payload = ct.includes('application/json') ? await res.json() : { error: await res.text() };
  if (!res.ok) throw new Error(payload?.error || `HTTP ${res.status}`);
  return payload;
}

export async function getFinanceSettings(apiBase, token) {
  return getJSON(`${apiBase}/settings`, token);
}

export async function updateFinanceSettings(apiBase, token, goalAnnualEUR, currency) {
  const res = await fetch(`${apiBase}/settings`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      currency ? { goal_annual_eur: goalAnnualEUR, currency } : { goal_annual_eur: goalAnnualEUR }
    ),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data; // { settings: {...} }
}

// Si usas snapshots:
export async function getSnapshots(apiBase, token, { from, to } = {}) {
  const qs = new URLSearchParams();
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  const url = `${apiBase}/snapshots${qs.toString() ? `?${qs.toString()}` : ''}`;
  return getJSON(url, token);
}
export async function createSnapshot(apiBase, token) {
  const res = await fetch(`${apiBase}/snapshots`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}
