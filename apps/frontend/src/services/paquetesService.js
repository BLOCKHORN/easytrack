// src/services/paquetesService.js
// 📦 Servicio de paquetes (compatible con esquema nuevo y legacy)
import { getTenantIdOrThrow } from '../utils/tenant';

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001')
  .replace(/\/+$/, '');
const API_URL = `${API_BASE}/api`;

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
    const msg = body?.error || body?.message || body?.detail || `${ctx} ${resp.status}`;
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

// 🔄 Normaliza salida de 'packages' (nuevo) y 'paquetes' (legacy)
function normalizePaquete(row = {}) {
  const empresa = row.empresa_transporte ?? row.compania ?? '';

  const ubiIdNew    = row.ubicacion_id ?? null;
  const ubiLabelNew = row.ubicacion_label ?? null;

  const ubiIdLegacy    = row.balda_id ?? null;
  const ubiLabelLegacy = row.compartimento ?? row?.baldas?.codigo ?? null;

  const ubiId    = ubiIdNew ?? ubiIdLegacy ?? null;
  const ubiLabel = ubiLabelNew ?? ubiLabelLegacy ?? null;

  return {
    id: row.id,
    nombre_cliente: row.nombre_cliente ?? '',
    empresa_transporte: empresa,
    compania: empresa,
    entregado: !!row.entregado,
    fecha_llegada: row.fecha_llegada ?? row.created_at ?? null,

    ubicacion_id: ubiId,
    ubicacion_label: typeof ubiLabel === 'string' ? ubiLabel : null,

    // compat
    balda_id: ubiId,
    compartimento: typeof ubiLabel === 'string' ? ubiLabel : null,

    estante: (row.estante != null ? Number(row.estante) : row?.baldas?.estante ?? null),
    balda: (row.balda != null ? Number(row.balda) : row?.baldas?.balda ?? null),
    baldas: row.baldas ?? null,
    ubicacion_hist: row.ubicacion_hist ?? null,
  };
}

/* ===== API ===== */

// Crear un nuevo paquete (el backend devuelve { paquete })
export async function crearPaqueteBackend(datos, token) {
  const tid = datos?.tenant_id || await getTenantIdOrThrow();

  const payload = {
    tenant_id: tid,
    nombre_cliente: datos.nombre_cliente,
    empresa_transporte: datos.empresa_transporte,
  };

  // Preferimos NUEVO esquema
  if (datos.ubicacion_id != null)    payload.ubicacion_id = datos.ubicacion_id;
  if (datos.ubicacion_label != null) payload.ubicacion_label = datos.ubicacion_label;

  // Compat legacy si no vino lo nuevo
  if (payload.ubicacion_id == null && payload.ubicacion_label == null) {
    if (datos.balda_id != null)      payload.ubicacion_id = datos.balda_id;
    if (datos.compartimento != null) payload.ubicacion_label = datos.compartimento;
  }

  const url = `${API_URL}/paquetes/crear`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const body = await parseMaybeJson(resp);
  ensureOk(resp, body, 'POST /paquetes/crear');

  const created = body?.paquete ?? body;
  return normalizePaquete(created);
}

/**
 * Obtener lista de paquetes (por tenant) con soporte de:
 * - all=1 (trae todo desde backend, paginado interno de 1000)
 * - o paginación client: limit/offset
 * - filtros: estado ('pendiente'|'entregado'|'todos'), compania, ubicacion, search
 * - orden: order (campo), dir ('asc'|'desc')
 *
 * DEFAULT: all=1 para evitar el cap de 1000 sin tocar el resto del frontend.
 */
export async function obtenerPaquetesBackend(token, params = {}) {
  const tid = await getTenantIdOrThrow();
  const url = new URL(`${API_URL}/paquetes/listar`);

  const query = {
    tenantId: tid,
    all: params.all ?? 1,               // ← por defecto trae TODO
    limit: params.limit,
    offset: params.offset,
    estado: params.estado,
    compania: params.compania,
    ubicacion: params.ubicacion,
    search: params.search,
    order: params.order,
    dir: params.dir,
  };
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }

  const resp = await fetch(url.toString(), { method: 'GET', headers: authHeaders(token) });
  const body = await parseMaybeJson(resp);
  ensureOk(resp, body, 'GET /paquetes/listar');
  const arr = pickArray(body);
  return arr.map(normalizePaquete);
}

/**
 * Conteo exacto para KPI (no depende de la lista)
 * Acepta los mismos filtros que el listado.
 * Devuelve: { total, entregados, pendientes }
 */
export async function contarPaquetesBackend(token, params = {}) {
  const tid = await getTenantIdOrThrow();
  const url = new URL(`${API_URL}/paquetes/count`);

  const query = {
    tenantId: tid,
    estado: params.estado,
    compania: params.compania,
    ubicacion: params.ubicacion,
    search: params.search,
  };
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }

  const resp = await fetch(url.toString(), { method: 'GET', headers: authHeaders(token) });
  const body = await parseMaybeJson(resp);
  ensureOk(resp, body, 'GET /paquetes/count');
  return {
    total: Number(body?.total ?? 0),
    entregados: Number(body?.entregados ?? 0),
    pendientes: Number(body?.pendientes ?? 0),
  };
}

// Eliminar un paquete
export async function eliminarPaqueteBackend(id, token) {
  const tid = await getTenantIdOrThrow();
  const url = `${API_URL}/paquetes/${id}?tenantId=${encodeURIComponent(tid)}`;
  const resp = await fetch(url, { method: 'DELETE', headers: authHeaders(token) });
  const body = await parseMaybeJson(resp);
  ensureOk(resp, body, `DELETE /paquetes/${id}`);
  return { ok: true };
}

// Marcar como entregado
export async function entregarPaqueteBackend(id, token) {
  const tid = await getTenantIdOrThrow();
  const url = `${API_URL}/paquetes/entregar/${id}?tenantId=${encodeURIComponent(tid)}`;
  const resp = await fetch(url, { method: 'PATCH', headers: authHeaders(token) });
  const body = await parseMaybeJson(resp);
  ensureOk(resp, body, `PATCH /paquetes/entregar/${id}`);
  const updated = body?.paquete ?? body;
  return updated?.id ? normalizePaquete(updated) : { ok: true };
}

// Editar (mover de ubicación, cambiar nombre/compañía, etc.)
export async function editarPaqueteBackend(paquete, token) {
  const tid = await getTenantIdOrThrow();
  const id = paquete?.id;
  if (!id) throw new Error('[paquetesService] Falta id en editarPaqueteBackend');

  const patch = {
    nombre_cliente: paquete?.nombre_cliente,
    empresa_transporte: paquete?.empresa_transporte,
    ubicacion_id: paquete?.ubicacion_id ?? paquete?.balda_id ?? null,
    ubicacion_label: paquete?.ubicacion_label ?? paquete?.compartimento ?? null,
  };

  const url = `${API_URL}/paquetes/${id}?tenantId=${encodeURIComponent(tid)}`;
  const resp = await fetch(url, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(patch),
  });
  const body = await parseMaybeJson(resp);
  ensureOk(resp, body, `PUT /paquetes/${id}`);
  const updated = body?.paquete ?? body;
  return normalizePaquete(updated);
}
