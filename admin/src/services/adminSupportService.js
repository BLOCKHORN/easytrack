const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

async function authHeaders(extra = {}) {
  const { supabase } = await import('../utils/supabaseClient.js');
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token || ''}`, ...extra };
}

/* ===========================
   LISTADOS / CRUD TICKETS
   =========================== */

export async function adminListTickets({ estado, tipo, q, page=1, pageSize=20 } = {}) {
  const params = new URLSearchParams();
  if (estado) params.set('estado', estado);
  if (tipo)   params.set('tipo', tipo);
  if (q)      params.set('q', q);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  const r = await fetch(`${API}/admin/support/tickets?${params.toString()}`, { headers: await authHeaders() });
  const j = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status} listando tickets`);
  return j;
}

export async function adminGetTicket(id) {
  const r = await fetch(`${API}/admin/support/tickets/${id}`, { headers: await authHeaders() });
  const j = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status} obteniendo ticket`);
  return j;
}

export async function adminListMessages(id) {
  const r = await fetch(`${API}/admin/support/tickets/${id}/messages`, { headers: await authHeaders() });
  const j = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status} listando mensajes`);
  return j;
}

export async function adminPostMessage(id, { texto, adjuntos }) {
  const r = await fetch(`${API}/admin/support/tickets/${id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ texto, adjuntos }),
  });
  const j = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status} enviando mensaje`);
  return j;
}

export async function adminUpdateStatus(id, estado) {
  const r = await fetch(`${API}/admin/support/tickets/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ estado }),
  });
  const j = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status} actualizando estado`);
  return j;
}

export async function adminAssignAgent(id, { agente_id, agente_email }) {
  const r = await fetch(`${API}/admin/support/tickets/${id}/assign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ agente_id, agente_email }),
  });
  const j = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status} asignando agente`);
  return j;
}

/* ===========================
   SUBIDA DE FICHEROS
   =========================== */

export async function uploadFiles(files) {
  const fd = new FormData();
  [...files].forEach(f => fd.append('files', f));
  const r = await fetch(`${API}/api/support/uploads`, {
    method: 'POST',
    headers: await authHeaders(),
    body: fd,
  });
  const j = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status} subiendo archivos`);
  return j;
}

/* ===========================
   CONTADORES / BUBBLE (opcional)
   =========================== */

// Contadores soporte (acepta since para limpiar burbuja al ver la bandeja)
export async function adminSupportCounters({ since } = {}) {
  const params = new URLSearchParams();
  if (since) {
    const v = typeof since === 'number' ? new Date(since).toISOString() : since;
    params.set('since', v);
  }
  const qs = params.toString();
  const r = await fetch(`${API}/admin/support/counters${qs ? `?${qs}` : ''}`, {
    headers: await authHeaders(),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'no-counters');
  return j; // { unread_total, latest_message_at, unread_since }
}


// Fallback ligero: último timestamp global de mensaje
export async function adminSupportLatestTs() {
  const r = await fetch(`${API}/admin/support/latest-ts`, { headers: await authHeaders() });
  const j = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(j.error || 'no-latest');
  return j; // { latest_message_at }
}
// ===========================
// DEMO REQUESTS (formularios)
// ===========================
export async function adminDemoCounters({ since } = {}) {
  const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
  const params = new URLSearchParams();
  if (since) {
    const v = typeof since === 'number' ? new Date(since).toISOString() : since;
    params.set('since', v);
  }
  const qs = params.toString();
  const r = await fetch(`${API}/admin/demo-requests/counters${qs ? `?${qs}` : ''}`, {
    headers: await authHeaders(),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'no-demo-counters');
  return j; // { pending_total, latest_created_at, new_since }
}

export async function adminDemoLatestTs() {
  const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
  const r = await fetch(`${API}/admin/demo-requests/latest-ts`, { headers: await authHeaders() });
  const j = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(j.error || 'no-demo-latest');
  return j; // { latest_created_at }
}
