'use strict';

import { supabase } from './supabaseClient';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

export function getTenantSlugFromPath() {
  try {
    const m = window.location.pathname.match(/^\/([^/]+)(?:\/|$)/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

export async function getTenantData() {
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

  const { tenant, entitlements } = await r.json();
  if (!tenant?.id) throw new Error('TENANT_NOT_FOUND');
  
  return { tenant, entitlements };
}

export async function getTenantIdOrThrow() {
  const { tenant } = await getTenantData();
  return tenant.id;
}