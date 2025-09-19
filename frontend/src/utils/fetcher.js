// frontend/src/utils/fetcher.js
import { supabase } from './supabaseClient';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function toAbs(url) {
  if (/^https?:\/\//i.test(url)) return url;                 // ya absoluta
  if (API_BASE) return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
  return url;                                                // dev con proxy
}

export async function apiFetch(url, init = {}) {
  const headers = {
    Accept: 'application/json',
    ...(init.headers || {}),
  };

  // Bearer de Supabase si no lo pasaron ya
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token && !headers.Authorization && !headers.authorization) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch { /* noop */ }

  const res = await fetch(toAbs(url), {
    credentials: 'include',   // cookies (si las hubiera)
    ...init,
    headers,
  });

  // 402 => bloque por suscripción (no confundir con errores de red)
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
    return res; // deja continuar si ya estás en /reactivar
  }

  return res;
}
