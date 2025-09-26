// src/utils/apiClient.js
import { supabase } from './supabaseClient';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function authedJson(path, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || null;

  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const ct = res.headers.get('content-type') || '';
  const text = await res.text();

  if (res.status === 401) {
    // reintenta 1 vez refrescando
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data?.session?.access_token) {
      return authedJson(path, opts); // recursion simple tras refresh
    }
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0,200)}`);
  if (!ct.includes('application/json')) {
    throw new Error(`Se esperaba JSON y llegó ${ct}: ${text.slice(0,200)}`);
  }
  return JSON.parse(text);
}
