import { supabase } from './supabaseClient';

const isLocal = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
const PROD_URL = (import.meta.env?.VITE_API_URL || '').trim().replace(/\/$/, '');

export const API_BASE = isLocal ? '' : PROD_URL;

export function apiPath(p = '') {
  const path = String(p || '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (isLocal) return cleanPath;
  return `${API_BASE}${cleanPath}`;
}

function ensureJsonHeaders(init, headers) {
  if (init && typeof init.body === 'object' && !(init.body instanceof FormData)) {
    try {
      init.body = JSON.stringify(init.body);
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
      }
    } catch (e) {}
  }
}

export async function apiFetch(url, init = {}) {
  const headers = {
    Accept: 'application/json',
    ...(init.headers || {}),
  };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token && !headers.Authorization && !headers.authorization) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (err) {}

  ensureJsonHeaders(init, headers);
  
  const finalUrl = apiPath(url);

  const res = await fetch(finalUrl, {
    credentials: 'include',
    ...init,
    headers,
  });

  if (res.status === 402) {
    let payload = null;
    try { payload = await res.clone().json(); } catch (e) {}
    
    const reason = payload?.reason ?? 'inactive';
    const tenant_slug = payload?.tenant_slug ?? payload?.tenantSlug ?? null;
    const portalUrl = payload?.portal_url ?? payload?.portalUrl ?? (tenant_slug ? `/${tenant_slug}/portal` : '/portal');

    const ctx = {
      reason,
      tenant_id: payload?.tenant_id ?? null,
      tenantSlug: tenant_slug || undefined,
      portalUrl,
      ts: Date.now(),
      returnTo: window.location.pathname + window.location.search,
    };
    
    sessionStorage.setItem('sub_block', JSON.stringify(ctx));

    if (!window.location.pathname.startsWith('/reactivar')) {
      const qp = new URLSearchParams({ reason });
      window.location.assign(`/reactivar?${qp.toString()}`);
    }
    return res;
  }

  return res;
}