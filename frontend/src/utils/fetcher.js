// frontend/src/utils/fetcher.js
import { supabase } from './supabaseClient';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// Activa logs en consola si necesitas depurar rutas calculadas
const DEBUG_FETCHER = false;

const RESERVED = new Set([
  'app',
  'dashboard',        // 👈 NUEVO: evita tratar "dashboard" como slug
  'planes',
  'precios',
  'portal',
  'reactivar',
  'login',
  'register',
  'signup',
  'crear-password',   // 👈 NUEVO
  'admin',
  'api',
  'billing',
]);

// Rutas de API donde NO debes inyectar slug (porque tu backend NO espera /:slug/api/...)
const SLUG_EXCLUDES = [
  '/api/auth',
  '/api/billing',
  '/api/metrics',
  '/api/tenants',
  // Si tus rutas de imágenes NO están montadas como '/:slug/api/imagenes',
  // déjala excluida. Si SÍ aceptan slug, borra esta línea.
  // '/api/imagenes',
];

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

  // Si estamos en '/:slug/...', y la ruta es '/api/...'
  // y NO está excluida -> añade el slug
  const slug = getCurrentSlug();
  if (slug && path.startsWith('/api/') && !shouldExcludeSlug(path)) {
    path = `/${slug}${path}`;
  }

  const abs = API_BASE ? `${API_BASE}${path}` : path; // dev con proxy si no hay API_BASE

  if (DEBUG_FETCHER) {
    // Log discreto para ver cómo resolvió la URL
    console.debug('[fetcher] toAbs:', { in: url, out: abs, slug, path, API_BASE });
  }

  return abs;
}

function ensureJsonHeaders(init, headers) {
  // Si el body es un objeto plano, serialízalo y marca JSON
  if (init && typeof init.body === 'object' && !(init.body instanceof FormData)) {
    try {
      init.body = JSON.stringify(init.body);
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
      }
    } catch { /* noop */ }
  }
}

export async function apiFetch(url, init = {}) {
  const headers = {
    Accept: 'application/json',
    ...(init.headers || {}),
  };

  // Bearer de Supabase si no lo pasaron (en mayúsculas o minúsculas)
  try {
    const { data: { session} } = await supabase.auth.getSession();
    if (session?.access_token && !headers.Authorization && !headers.authorization) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {}

  // Añade Content-Type si estás mandando JSON sin FormData
  ensureJsonHeaders(init, headers);

  const absUrl = toAbs(url);

  const res = await fetch(absUrl, {
    credentials: 'include', // ok mantenerlo; si no usas cookies, puedes quitarlo
    ...init,
    headers,
  });

  // Manejo de suscripción 402 → redirigir a /reactivar con contexto
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
