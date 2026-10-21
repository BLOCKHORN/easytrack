'use strict';

import { apiFetch } from './fetcher';

export function getTenantSlugFromPath() {
  try {
    const m = window.location.pathname.match(/^\/([^/]+)(?:\/|$)/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

export async function getTenantData() {
  const r = await apiFetch('/api/tenants/me');

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