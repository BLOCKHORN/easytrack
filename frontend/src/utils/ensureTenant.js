// frontend/src/utils/ensureTenant.js
import { supabase } from './supabaseClient';

export async function ensureTenantResolved() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('NO_SESSION');

  const r = await fetch('/api/tenants/me', {
    headers: { Authorization: `Bearer ${session.access_token}` }
  });
  if (!r.ok) {
    const txt = await r.text().catch(()=>'');
    throw new Error(`TENANT_ME_FAILED ${r.status} ${txt}`);
  }
  const j = await r.json();
  if (!j?.tenant?.id) throw new Error('TENANT_NOT_FOUND');
  return { tenant: j.tenant, entitlements: j.entitlements ?? null };
}
