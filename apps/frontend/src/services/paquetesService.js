// src/services/paquetesService.js
// 📦 Servicio de paquetes (compatible con esquema nuevo y legacy)
import { getTenantIdOrThrow } from '../utils/tenant';
import { apiFetch } from '../utils/fetcher';

const isLocal = /^(localhost|127\.0\.0\.1|100\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|.*\.ngrok-free\.dev|.*\.devtunnels\.ms|.*easytrack\.pro|.*easytrack\.es)$/.test(window.location.hostname);
const PROD_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const API_BASE = isLocal ? '' : PROD_URL;
const API_URL = `${API_BASE}/api`;

function authHeaders(token) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
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
    telefono: row.telefono ?? null,

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

// Llamada a la IA para escanear etiquetas
export async function escanearEtiquetaIA(imageBase64, token) {
  const resp = await apiFetch('/api/ia/scan-label', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: { imageBase64 },
  });
  const body = await parseMaybeJson(resp);
  ensureOk(resp, body, 'POST /ia/scan-label');
  return body;
}

// Crear un nuevo paquete (el backend devuelve { paquete })
export async function crearPaqueteBackend(datos, token) {
  const tid = datos?.tenant_id || await getTenantIdOrThrow();

  const payload = {
    tenant_id: tid,
    nombre_cliente: datos.nombre_cliente,
    empresa_transporte: datos.empresa_transporte,
    telefono: datos.telefono || null,
  };

  if (datos.ubicacion_id != null)    payload.ubicacion_id = datos.ubicacion_id;
  if (datos.ubicacion_label != null) payload.ubicacion_label = datos.ubicacion_label;

  if (payload.ubicacion_id == null && payload.ubicacion_label == null) {
    if (datos.balda_id != null)      payload.ubicacion_id = datos.balda_id;
    if (datos.compartimento != null) payload.ubicacion_label = datos.compartimento;
  }

  const resp = await apiFetch('/api/paquetes/crear', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: payload,
  });
  const body = await parseMaybeJson(resp);
  ensureOk(resp, body, 'POST /paquetes/crear');

  const created = body?.paquete ?? body;
  return normalizePaquete(created);
}

export async function obtenerPaquetesBackend(token, params = {}) {
  const tid = await getTenantIdOrThrow();
  const qp = new URLSearchParams();

  const query = {
    tenant_id: tid,
    all: params.all ?? 1,
    limit: params.limit,
    offset: params.offset,
    estado: params.estado,
    compania: params.compania,
    ubicacion: params.ubicacion,
    search: params.search,
    recientes: params.recientes,
    order: params.order,
    dir: params.dir,
  };
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') qp.set(k, v);
  }

  const resp = await apiFetch(`/api/paquetes/listar?${qp.toString()}`, { 
    method: 'GET', 
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  const body = await parseMaybeJson(resp);
  ensureOk(resp, body, 'GET /paquetes/listar');
  const arr = pickArray(body);
  return arr.map(normalizePaquete);
}

export async function contarPaquetesBackend(token, params = {}) {
  const tid = await getTenantIdOrThrow();
  const qp = new URLSearchParams();

  const query = {
    tenantId: tid,
    estado: params.estado,
    compania: params.compania,
    ubicacion: params.ubicacion,
    search: params.search,
  };
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') qp.set(k, v);
  }

  const resp = await apiFetch(`/api/paquetes/count?${qp.toString()}`, { 
    method: 'GET', 
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  const body = await parseMaybeJson(resp);
  ensureOk(resp, body, 'GET /paquetes/count');
  return {
    total: Number(body?.total ?? 0),
    entregados: Number(body?.entregados ?? 0),
    pendientes: Number(body?.pendientes ?? 0),
  };
}

export async function eliminarPaqueteBackend(id, token) {
  const tid = await getTenantIdOrThrow();
  const resp = await apiFetch(`/api/paquetes/${id}?tenantId=${encodeURIComponent(tid)}`, { 
    method: 'DELETE', 
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  const body = await parseMaybeJson(resp);
  ensureOk(resp, body, `DELETE /paquetes/${id}`);
  return { ok: true };
}

export async function entregarPaqueteBackend(id, token) {
  const tid = await getTenantIdOrThrow();
  const resp = await apiFetch(`/api/paquetes/entregar/${id}?tenantId=${encodeURIComponent(tid)}`, { 
    method: 'PATCH', 
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  const body = await parseMaybeJson(resp);
  ensureOk(resp, body, `PATCH /paquetes/entregar/${id}`);
  const updated = body?.paquete ?? body;
  return updated?.id ? normalizePaquete(updated) : { ok: true };
}

export async function editarPaqueteBackend(paquete, token) {
  const tid = await getTenantIdOrThrow();
  const id = paquete?.id;
  if (!id) throw new Error('[paquetesService] Falta id en editarPaqueteBackend');

  const patch = {
    nombre_cliente: paquete?.nombre_cliente,
    empresa_transporte: paquete?.empresa_transporte,
    telefono: paquete?.telefono || null,
    ubicacion_id: paquete?.ubicacion_id ?? paquete?.balda_id ?? null,
    ubicacion_label: paquete?.ubicacion_label ?? paquete?.compartimento ?? null,
    entregado: paquete?.entregado,
    fecha_entregado: paquete?.fecha_entregado
  };

  const resp = await apiFetch(`/api/paquetes/${id}?tenantId=${encodeURIComponent(tid)}`, {
    method: 'PUT',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: patch,
  });
  const body = await parseMaybeJson(resp);
  ensureOk(resp, body, `PUT /paquetes/${id}`);
  const updated = body?.paquete ?? body;
  return normalizePaquete(updated);
}