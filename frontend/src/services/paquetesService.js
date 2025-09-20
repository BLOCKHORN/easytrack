// src/services/paquetesService.js
// 📦 Funciones relacionadas con la gestión de paquetes (robustas y normalizadas)

// Preferimos VITE_API_URL (tu proyecto) y aceptamos VITE_API_BASE_URL como alias.
const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001')
  .replace(/\/+$/, '');
const API_URL = `${API_BASE}/api`;

/* ===== Helpers ===== */
function authHeaders(token) {
  if (!token) throw new Error('[paquetesService] Falta token JWT de Supabase');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

async function parseMaybeJson(resp) {
  const text = await resp.text();
  try { return text ? JSON.parse(text) : null; } catch { return text; }
}

function ensureOk(resp, body, ctx) {
  if (!resp.ok) {
    const msg = body?.error || body?.message || `${ctx} ${resp.status}`;
    const e = new Error(msg);
    e.status = resp.status;
    e.body = body;
    throw e;
  }
}

function pickArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.paquetes)) return payload.paquetes;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

// Normaliza cada paquete para que el front siempre tenga los mismos campos
function normalizePaquete(row = {}) {
  // Compatibiliza nombres: empresa_transporte vs compania, created_at vs fecha_llegada
  const empresa = row.empresa_transporte ?? row.compania ?? '';
  return {
    id: row.id,
    nombre_cliente: row.nombre_cliente ?? '',
    empresa_transporte: empresa,
    compania: empresa, // por compat
    entregado: !!row.entregado,
    fecha_llegada: row.fecha_llegada ?? row.created_at ?? null,

    // ubicación
    balda_id: row.balda_id ?? null,
    lane_id: (row.lane_id != null ? Number(row.lane_id) : null),
    compartimento: typeof row.compartimento === 'string' ? row.compartimento : null,

    // extras opcionales que algunas vistas utilizan
    estante: (row.estante != null ? Number(row.estante) : null),
    balda: (row.balda != null ? Number(row.balda) : null),
    baldas: row.baldas ?? null, // {id,estante,balda,codigo} si viene anidado
    ubicacion_hist: row.ubicacion_hist ?? null,
  };
}

/* ===== API ===== */

// Crear un nuevo paquete (tu backend devuelve { paquete }).
export async function crearPaqueteBackend(datos, token) {
  const url = `${API_URL}/paquetes/crear`;
  console.debug('[paquetesService] POST', url, datos);
  const resp = await fetch(url, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(datos),
  });
  const body = await parseMaybeJson(resp);
  ensureOk(resp, body, 'POST /paquetes/crear');

  // Soporta tanto { paquete } como el objeto plano
  const created = body?.paquete ?? body;
  return normalizePaquete(created);
}

// Obtener lista de paquetes (tu backend: GET /paquetes/listar)
export async function obtenerPaquetesBackend(token) {
  const url = `${API_URL}/paquetes/listar`;
  console.debug('[paquetesService] GET', url);
  const resp = await fetch(url, {
    method: 'GET',
    headers: authHeaders(token),
  });
  const body = await parseMaybeJson(resp);
  ensureOk(resp, body, 'GET /paquetes/listar');

  const arr = pickArray(body);
  return arr.map(normalizePaquete);
}

// Eliminar un paquete (DELETE /paquetes/:id)
export async function eliminarPaqueteBackend(id, token) {
  if (!id) throw new Error('[paquetesService] Falta id en eliminarPaqueteBackend');
  const url = `${API_URL}/paquetes/${id}`;
  console.debug('[paquetesService] DELETE', url);
  const resp = await fetch(url, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  const body = await parseMaybeJson(resp);
  ensureOk(resp, body, `DELETE /paquetes/${id}`);
  return { ok: true };
}

// Marcar un paquete como entregado (PATCH /paquetes/entregar/:id)
export async function entregarPaqueteBackend(id, token) {
  if (!id) throw new Error('[paquetesService] Falta id en entregarPaqueteBackend');
  const url = `${API_URL}/paquetes/entregar/${id}`;
  console.debug('[paquetesService] PATCH', url);
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
  const body = await parseMaybeJson(resp);
  ensureOk(resp, body, `PATCH /paquetes/entregar/${id}`);

  // si el backend devuelve el paquete actualizado, normalizamos; si no, devolvemos ack
  const updated = body?.paquete ?? body;
  return updated?.id ? normalizePaquete(updated) : { ok: true };
}

// Editar un paquete existente (PUT /paquetes/:id)
export async function editarPaqueteBackend(paquete, token) {
  const id = paquete?.id;
  if (!id) throw new Error('[paquetesService] Falta id en editarPaqueteBackend');
  const url = `${API_URL}/paquetes/${id}`;
  console.debug('[paquetesService] PUT', url, paquete);
  const resp = await fetch(url, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(paquete),
  });
  const body = await parseMaybeJson(resp);
  ensureOk(resp, body, `PUT /paquetes/${id}`);

  // El backend suele devolver el paquete actualizado; normalizamos
  const updated = body?.paquete ?? body;
  return normalizePaquete(updated);
}

// 🗂 Estructura de estantes (GET /estantes/estructura)
export async function obtenerEstructuraEstantesYPaquetes(token) {
  const url = `${API_URL}/estantes/estructura`;
  console.debug('[paquetesService] GET', url);
  const resp = await fetch(url, {
    method: 'GET',
    headers: authHeaders(token),
  });
  const body = await parseMaybeJson(resp);
  ensureOk(resp, body, 'GET /estantes/estructura');

  // Esperado: { estructura: [...], paquetesPorBalda: {...} }
  return body;
}
