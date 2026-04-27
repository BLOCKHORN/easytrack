// src/services/configuracionService.js
import { supabase } from '../utils/supabaseClient';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const API_URL  = `${API_BASE}/api`;

/**
 * Guardar empresas de transporte del tenant (vía backend).
 * Si no pasas `token`, lo obtenemos automáticamente de Supabase.
 */
export async function guardarCarriers(carriersPayload, token, { sync = true } = {}) {
  let auth = token;
  if (!auth) {
    try {
      const { data: sdata } = await supabase.auth.getSession();
      auth = sdata?.session?.access_token || null;
    } catch {}
  }

  const res = await fetch(`${API_URL}/ubicaciones/carriers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
    },
    body: JSON.stringify({ carriers: carriersPayload, sync }),
  });

  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out?.error || 'No se pudieron guardar los carriers');
  return out;
}

export async function cargarCarriers({ tenantId }) {
  try {
    const { data: sdata } = await supabase.auth.getSession();
    const token = sdata?.session?.access_token || null;
    
    const res = await fetch(`${API_URL}/ubicaciones/carriers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
    });

    if (!res.ok) throw new Error('Error al cargar empresas configuradas');
    const out = await res.json();
    return out.empresas || [];
  } catch (error) {
    console.error('[cargarCarriers] Error', error);
    return [];
  }
}