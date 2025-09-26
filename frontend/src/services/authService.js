// src/services/authService.js
import { supabase } from '../utils/supabaseClient';

const API_BASE =
  (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001')
    .replace(/\/+$/, '');
const API = `${API_BASE}/api`;

async function parse(res) {
  const txt = await res.text();
  try { return txt ? JSON.parse(txt) : null; } catch { return txt; }
}

/**
 * Registro robusto:
 *  - Devuelve { ok:true, kind, message, debug_link? }
 *  - kind: 'signup_sent' | 'resend_signup' | 'reset_sent'
 */
export async function register({ email, password, nombre_empresa, termsAccepted, marketingOptIn }) {
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ email, password, nombre_empresa, termsAccepted, marketingOptIn })
  });
  const body = await parse(res);
  if (!res.ok || body?.ok === false) {
    const err = new Error(body?.error || `HTTP ${res.status}`);
    err.body = body; err.status = res.status;
    throw err;
  }
  return body;
}

/** Reenviar correo (confirmación o recuperación) */
export async function resend({ email, type = 'signup' }) {
  const res = await fetch(`${API}/auth/resend`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ email, type })
  });
  const body = await parse(res);
  if (!res.ok || body?.ok === false) {
    const err = new Error(body?.error || `HTTP ${res.status}`);
    err.body = body; err.status = res.status;
    throw err;
  }
  return body; // { ok:true, kind, debug_link? }
}

/** (Opcional) Crear/normalizar tenant tras confirmar */
export async function bootstrapTenant(nombre_empresa) {
  const { data: sdata } = await supabase.auth.getSession();
  const token = sdata?.session?.access_token;
  if (!token) throw new Error('UNAUTHENTICATED');

  const res = await fetch(`${API}/auth/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ nombre_empresa })
  });
  const body = await parse(res);
  if (!res.ok || body?.ok === false) {
    const err = new Error(body?.error || `HTTP ${res.status}`);
    err.body = body; err.status = res.status;
    throw err;
  }
  return body;
}

// Export explícito (por si algún editor pierde intellisense)
export { register as authRegister, resend as authResend };
