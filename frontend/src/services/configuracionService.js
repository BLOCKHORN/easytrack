// src/services/configuracionService.js
import { supabase } from '../utils/supabaseClient';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const API_URL  = `${API_BASE}/api`;

/**
 * Guardar empresas de transporte del tenant (vía backend).
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
 * Cargar empresas de transporte configuradas para el tenant (lectura directa Supabase).
 * Devuelve: [{ id, tenant_id, nombre, ingreso_por_entrega, activo, color, notas }]
 */
export async function cargarCarriers({ tenantId }) {
  const { data, error } = await supabase
    .from('empresas_transporte_tenant')
    .select('id, tenant_id, nombre, ingreso_por_entrega, activo, color, notas')
    .eq('tenant_id', tenantId)
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) {
    console.error('[cargarCarriers] Error', error);
    throw new Error('No se pudo obtener la lista de empresas configuradas');
  }
  return Array.isArray(data) ? data : [];
}
