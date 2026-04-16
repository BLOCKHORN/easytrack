'use strict';

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:3001';

export function buildAreaApiBase(pathname) {
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length >= 2 && (segs[1] === 'dashboard' || segs[1] === 'area-personal')) {
    return `${API_URL}/${segs[0]}/api/area-personal`;
  }
  return `${API_URL}/api/area-personal`;
}

async function authFetch(url, token, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const getFinanceData = (apiBase, token) => Promise.all([
  authFetch(`${apiBase}/resumen`, token),
  authFetch(`${apiBase}/mensual`, token),
  authFetch(`${apiBase}/por-empresa`, token),
  authFetch(`${apiBase}/top-clientes`, token),
  authFetch(`${apiBase}/diario`, token)
]);

export const getFinanceSettings = (apiBase, token) => authFetch(`${apiBase}/settings`, token);

export const updateFinanceSettings = (apiBase, token, goal) => 
  authFetch(`${apiBase}/settings`, token, {
    method: 'PATCH',
    body: JSON.stringify({ goal_annual_eur: goal })
  });

export const getSnapshots = (apiBase, token, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return authFetch(`${apiBase}/snapshots${qs ? `?${qs}` : ''}`, token);
};

export const createSnapshot = (apiBase, token) => authFetch(`${apiBase}/snapshots`, token, { method: 'POST' });