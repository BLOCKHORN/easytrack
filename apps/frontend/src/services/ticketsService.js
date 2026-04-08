const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

async function authHeaders(extra = {}) {
  const { supabase } = await import('../utils/supabaseClient.js');
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token || ''}`, ...extra };
}

/* ========== Tickets ========== */
export async function listTickets({ estado, tipo, q, page = 1, pageSize = 10 } = {}) {
  const params = new URLSearchParams();
  if (estado) params.set('estado', estado);
  if (tipo) params.set('tipo', tipo);
  if (q) params.set('q', q);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));

  const r = await fetch(`${API}/api/support/tickets?${params.toString()}`, {
    headers: await authHeaders(),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status} al listar tickets`);
  return j;
}

export async function getTicket(id) {
  const r = await fetch(`${API}/api/support/tickets/${id}`, { headers: await authHeaders() });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status} al obtener ticket`);
  return j;
}

export async function createTicket({ tipo, asunto, descripcion }) {
  const r = await fetch(`${API}/api/support/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ tipo, asunto, descripcion }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status} al crear ticket`);
  return j;
}

/* ========== Mensajes ========== */
export async function listMessages(ticketId) {
  const r = await fetch(`${API}/api/support/tickets/${ticketId}/messages`, {
    headers: await authHeaders(),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status} al listar mensajes`);
  return j;
}

export async function postMessage(ticketId, payload = {}) {
  const texto = String(
    payload.texto ?? payload.text ?? payload.body ?? payload.mensaje ?? payload.descripcion ?? ""
  ).trim();
  if (!texto && !(Array.isArray(payload.adjuntos) && payload.adjuntos.length)
             && !(Array.isArray(payload.files) && payload.files.length)) {
    throw new Error('Mensaje vacío');
  }

  const adjuntos = Array.isArray(payload.adjuntos) ? payload.adjuntos
                   : Array.isArray(payload.files)  ? payload.files
                   : [];

  const r = await fetch(`${API}/api/support/tickets/${ticketId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ texto, adjuntos }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status} al enviar mensaje`);
  return j;
}

/* ========== Estado / Valoración ========== */
export async function updateStatus(ticketId, estado) {
  const r = await fetch(`${API}/api/support/tickets/${ticketId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ estado }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status} al actualizar estado`);
  return j;
}

export async function rateTicket(ticketId, { value, comentario, comment }) {
  const r = await fetch(`${API}/api/support/tickets/${ticketId}/rating`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ value, comentario: comentario ?? comment ?? null }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status} al valorar ticket`);
  return j;
}

/* ========== Uploads ========== */
export async function uploadFiles(files) {
  const fd = new FormData();
  [...files].forEach(f => fd.append('files', f));
  const r = await fetch(`${API}/api/support/uploads`, {
    method: 'POST',
    headers: await authHeaders(),
    body: fd,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status} subiendo archivos`);
  return j;
}
