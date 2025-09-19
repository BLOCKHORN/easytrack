// frontend/src/utils/fetcher.js
import { supabase } from './supabaseClient';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const RESERVED = new Set([
  'app','planes','precios','portal','reactivar','login','register','signup',
  'admin','api','billing'
]);

const SLUG_EXCLUDES = ['/api/auth', '/api/billing', '/api/metrics', '/api/tenants'];

function getCurrentSlug() {
  try {
    const seg = window.location.pathname.split('/').filter(Boolean)[0];
    if (seg && !RESERVED.has(seg) && /^[a-z0-9-]{3,}$/.test(seg)) return seg;
  } catch {}
  return null;
}

function shouldExcludeSlug(path) {
  return SLUG_EXCLUDES.some(p => path.startsWith(p));
}

function toAbs(url) {
  if (/^https?:\/\//i.test(url)) return url;
  let path = url.startsWith('/') ? url : `/${url}`;

  // si estamos dentro de /:slug/... y la ruta es /api/... (no excluida) => añade el slug
  const slug = getCurrentSlug();
  if (slug && path.startsWith('/api/') && !shouldExcludeSlug(path)) {
    path = `/${slug}${path}`;
  }

  if (API_BASE) return `${API_BASE}${path}`;
  return path; // dev con proxy
}

export async function apiFetch(url, init = {}) {
  const headers = {
    Accept: 'application/json',
    ...(init.headers || {}),
  };

  // Bearer de Supabase si no lo pasaron
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token && !headers.Authorization && !headers.authorization) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {}

  const res = await fetch(toAbs(url), {
    credentials: 'include',
    ...init,
    headers,
  });

  if (res.status === 402) {
    let payload = null;
    try { payload = await res.clone().json(); } catch {}
    const reason      = payload?.reason ?? 'inactive';
    const tenant_slug = payload?.tenant_slug ?? payload?.tenantSlug ?? null;
    const portalUrl   = payload?.portal_url ?? payload?.portalUrl
                      ?? (tenant_slug ? `/${tenant_slug}/portal` : '/portal');

    const ctx = {
      reason,
      tenant_id: payload?.tenant_id ?? null,
      tenantSlug: tenant_slug || undefined,
      portalUrl,
      ts: Date.now(),
      returnTo: window.location.pathname + window.location.search,
    };
    sessionStorage.setItem('sub_block', JSON.stringify(ctx));

    if (!location.pathname.startsWith('/reactivar')) {
      const qp = new URLSearchParams({ reason });
      location.assign(`/reactivar?${qp.toString()}`);
    }
    return res;
  }

  return res;
}
