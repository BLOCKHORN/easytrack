// frontend/src/utils/fetcher.js
import { supabase } from './supabaseClient';

export async function apiFetch(url, init = {}) {
  const headers = {
    Accept: 'application/json',
    ...(init.headers || {}),
  };

  // 🔐 Adjunta automáticamente el Bearer si no lo han pasado ya
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token && !headers.Authorization && !headers.authorization) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {
    /* noop */
  }

  const opts = {
    credentials: 'include',
    ...init,
    headers,
  };

  const res = await fetch(url, opts);

  // ---- Suscripción inactiva -> 402 ----
  if (res.status === 402) {
    let payload = null;
    try { payload = await res.clone().json(); } catch {}

    const reason       = payload?.reason ?? 'inactive';
    const tenant_id    = payload?.tenant_id ?? null;
    const tenant_slug  = payload?.tenant_slug ?? payload?.tenantSlug ?? null;
    const portalUrl    = payload?.portal_url ?? payload?.portalUrl
                      ?? (tenant_slug ? `/${tenant_slug}/portal` : '/portal');

    const ctx = {
      reason,
      tenant_id,
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

    if (location.pathname.startsWith('/reactivar')) {
      return res; // deja continuar en esa página
    }

    throw new Error('SUBSCRIPTION_INACTIVE');
  }

  return res;
}
