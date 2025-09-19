// frontend/src/utils/tenant.js
import { supabase } from './supabaseClient';

const RESERVED = new Set([
  'app','planes','precios','portal','reactivar','login','register','signup',
  'admin','api','billing','sobre-nosotros','soporte','contacto','legal','docs',
]);

function firstPathSeg() {
  try {
    const seg = window.location.pathname.split('/').filter(Boolean)[0] || '';
    return seg || null;
  } catch { return null; }
}

export function currentTenantSlug() {
  const seg = firstPathSeg();
  if (!seg) return null;
  if (RESERVED.has(seg)) return null;
  if (!/^[a-z0-9-]{3,}$/.test(seg)) return null;
  return seg;
}

async function getTenantIdBySlug(slug) {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, slug')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

async function getTenantIdByEmail() {
  const { data: { user } } = await supabase.auth.getUser();
  const email = String(user?.email || '').toLowerCase().trim();
  if (!email) return null;
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .ilike('email', email)
    .maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

/**
 * Devuelve el tenant UUID resolviendo por prioridad:
 *   1) slug de la URL (si existe)
 *   2) email del usuario autenticado (fallback)
 * Cachea el resultado por sesión.
 */
export async function getTenantIdOrThrow(slugFromRoute) {
  const slug = slugFromRoute || currentTenantSlug();
  const cacheKey = slug ? `TENANT_ID:${slug}` : 'TENANT_ID:byEmail';
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) return cached;

  let id = null;
  if (slug) id = await getTenantIdBySlug(slug);
  if (!id) id = await getTenantIdByEmail();

  if (!id) throw new Error('Tenant no resuelto');
  sessionStorage.setItem(cacheKey, id);
  return id;
}
