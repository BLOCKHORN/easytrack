// src/services/configuracionService.js
import { supabase } from '../utils/supabaseClient';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/,'');
const API_URL = `${API_BASE}/api`;

export async function guardarCarriers(carriersPayload, token, { sync = true } = {}) {
  const res = await fetch(`${API_URL}/estantes/carriers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ carriers: carriersPayload, sync })
  });
  const out = await res.json();
  if (!res.ok) throw new Error(out?.error || 'No se pudieron guardar los carriers');
  return out;
}

/**
 * (Opcional) Si quieres usar la RPC de estructura desde otros puntos
 */
export async function syncEstructuraSecure(tenantId, estructura) {
  const payload = (Array.isArray(estructura) ? estructura : []).map(e => ({
    estante: Number(e.estante),
    baldas : Math.max(1, Number(e.baldas) || 1),
  }));
  const { error } = await supabase.rpc('sync_estructura_secure', {
    p_tenant: tenantId,
    p_data  : payload,
  });
  if (error) throw new Error(error.message || 'Fallo en sync_estructura_secure');
  return { ok: true };
}
