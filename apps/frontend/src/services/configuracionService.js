// src/services/configuracionService.js
import { apiFetch } from '../utils/fetcher';

/**
 * Guardar empresas de transporte del tenant (vía backend con cookies/apiFetch).
 */
export async function guardarCarriers(carriersPayload, token, { sync = true } = {}) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await apiFetch('/api/ubicaciones/carriers', {
    method: 'POST',
    headers,
    body: { carriers: carriersPayload, sync },
  });

  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out?.error || 'No se pudieron guardar los carriers');
  return out;
}

export async function cargarCarriers() {
  try {
    const res = await apiFetch('/api/ubicaciones/carriers');
    if (!res.ok) throw new Error('Error al cargar empresas configuradas');
    const out = await res.json();
    return out.empresas || [];
  } catch (error) {
    console.error('[cargarCarriers] Error', error);
    return [];
  }
}