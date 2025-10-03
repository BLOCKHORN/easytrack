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

// (sin funciones legacy de estantes)
