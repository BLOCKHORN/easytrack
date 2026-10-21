const isLocal = /^(localhost|127\.0\.0\.1|100\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|.*\.ngrok-free\.dev|.*\.devtunnels\.ms|.*easytrack\.pro|.*easytrack\.es)$/.test(window.location.hostname);
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

let refreshPromise = null;

async function silentRefresh() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(apiPath('/api/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        return !!data?.ok;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function apiFetch(url, init = {}) {
  const headers = {
    Accept: 'application/json',
    ...(init.headers || {}),
  };

  ensureJsonHeaders(init, headers);
  
  const finalUrl = apiPath(url);

  let res = await fetch(finalUrl, {
    credentials: 'include',
    ...init,
    headers,
  });

  // Interceptor de expiración transparente (HTTP 401 -> silent refresh y reintento)
  if (
    res.status === 401 &&
    !url.includes('/api/auth/login') &&
    !url.includes('/api/auth/refresh') &&
    !url.includes('/api/auth/me') &&
    !url.includes('/api/auth/logout')
  ) {
    const refreshed = await silentRefresh();
    if (refreshed) {
      // Reintentar la petición original con la nueva cookie ya establecida
      res = await fetch(finalUrl, {
        credentials: 'include',
        ...init,
        headers,
      });
    }
  }

  // Interceptor de suscripción requerida (HTTP 402)
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