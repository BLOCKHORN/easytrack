// src/services/configuracionService.js
import { supabase } from '../utils/supabaseClient';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const API_URL  = `${API_BASE}/api`;

/**
 * Guardar empresas de transporte del tenant.
 */
export async function guardarCarriers(carriersPayload, token, { sync = true } = {}) {
  const res = await fetch(`${API_URL}/estantes/carriers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ carriers: carriersPayload, sync }),
  });
  const out = await res.json();
  if (!res.ok) throw new Error(out?.error || 'No se pudieron guardar los carriers');
  return out;
}

/**
 * Sincroniza la estructura de estantes/baldas.
 * Antes de llamar a la RPC principal, garantizamos la fila en tenant_nomenclatura.
 */
export async function syncEstructuraSecure(tenantId, estructura) {
  if (!tenantId) throw new Error('Falta tenantId en syncEstructuraSecure');

  const payload = (Array.isArray(estructura) ? estructura : []).map(e => ({
    estante: Number(e.estante),
    baldas : Math.max(1, Number(e.baldas) || 1),
  }));

  // 1) Garantiza nomenclatura para tenants nuevos
  const { error: ensureErr } = await supabase.rpc('ensure_nomenclatura_secure_v2', { p_tenant: tenantId });
  if (ensureErr) throw new Error(ensureErr.message || 'Fallo en ensure_nomenclatura_secure_v2');

  // 2) Ejecuta la sync principal (tu RPC actual)
  const { error } = await supabase.rpc('sync_estructura_secure', {
    p_tenant: tenantId,
    p_data  : payload,
  });
  if (error) throw new Error(error.message || 'Fallo en sync_estructura_secure');

  return { ok: true };
}
