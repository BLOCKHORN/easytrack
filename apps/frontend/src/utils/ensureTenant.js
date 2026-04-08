import { supabase } from './supabaseClient';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

export async function ensureTenantResolved() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('NO_SESSION');

  const r = await fetch(`${API}/api/tenants/me`, {
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