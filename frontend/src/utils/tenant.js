// frontend/src/utils/tenant.js
import { supabase } from './supabaseClient';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

/** Devuelve el slug si la URL es /:tenantSlug/... */
export function getTenantSlugFromPath() {
  try {
    const m = window.location.pathname.match(/^\/([^/]+)(?:\/|$)/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

export function getTenantSlugOrThrow() {
  const s = getTenantSlugFromPath();
  if (!s) throw new Error('NO_SLUG_IN_PATH');
  return s;
}

/** Versión estricta: lanza si no hay sesión o tenant. */
export async function getTenantIdOrThrow() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('NO_SESSION');

  const r = await fetch(`${API}/api/tenants/me`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (r.status === 402) {
    const e = new Error('SUBSCRIPTION_INACTIVE');
    e.code = 402;
    throw e;
  }
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`TENANT_ME_FAILED ${r.status} ${txt}`);
  }

  const { tenant } = await r.json();
  if (!tenant?.id) throw new Error('TENANT_NOT_FOUND');
  return tenant.id;
}

/** Back-compat: misma API antigua; devuelve null si algo falla. */
export async function getTenantId() {
  try {
    return await getTenantIdOrThrow();
  } catch {
    return null;
  }
}
