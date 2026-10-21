// src/services/ubicacionesService.js
import { debugLog, isDebug } from '../utils/logger';
import { apiFetch } from '../utils/fetcher';

const isLocal = /^(localhost|127\.0\.0\.1|100\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|.*\.ngrok-free\.dev|.*\.devtunnels\.ms|.*easytrack\.pro|.*easytrack\.es)$/.test(window.location.hostname);
const PROD_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const API = isLocal ? '' : PROD_URL;

function ensureOk(res, text) {
  if (res.ok) return;
  let msg = 'Error de red al guardar/cargar ubicaciones';
  try {
    const j = JSON.parse(text || '{}');
    msg = j?.message || j?.error || msg;
  } catch {}
  const e = new Error(msg);
  e.status = res.status;
  e.raw = text;
  throw e;
}

function asJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

function normalizePayloadAndToken(a, b, c, d) {
  const looksLikeToken = (v) => typeof v === 'string' && v.split('.').length >= 2 && v.length > 20;

  if (looksLikeToken(a)) {
    const token = a;
    const tenantId = b;
    const ubicaciones = Array.isArray(c) ? c : [];
    const metaIn = d || {};
    const meta = {
      cols: Number.isFinite(Number(metaIn.cols)) ? Number(metaIn.cols) : 5,
      rows: Number.isFinite(Number(metaIn.rows)) ? Number(metaIn.rows) : undefined,
      order: (metaIn.order || metaIn.orden) === 'vertical' ? 'vertical' : 'horizontal',
    };
    return [{ tenantId, ubicaciones, meta, deletions: [], forceDeletePackages: false }, token];
  }

  const payload = a || {};
  const token = b;
  const meta = {
    cols: Number.isFinite(Number(payload?.meta?.cols)) ? Number(payload.meta.cols) : 5,
    rows: Number.isFinite(Number(payload?.meta?.rows)) ? Number(payload.meta.rows) : undefined,
    order: (payload?.meta?.order || payload?.meta?.orden) === 'vertical' ? 'vertical' : 'horizontal',
  };
  return [{
    tenantId: payload?.tenantId,
    ubicaciones: payload?.ubicaciones || [],
    meta,
    deletions: Array.isArray(payload?.deletions) ? payload.deletions : [],
    forceDeletePackages: !!payload?.forceDeletePackages,
  }, token];
}

export async function cargarUbicaciones(token, tenantId) {
  const qp = new URLSearchParams();
  if (tenantId) qp.set('tenant_id', tenantId);
  if (isDebug) qp.set('debug', '1');

  const finalUrl = `/api/ubicaciones?${qp.toString()}`;
  debugLog('[ubicacionesService.cargarUbicaciones] GET', finalUrl);

  const r = await apiFetch(finalUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const text = await r.text();
  if (!r.ok) ensureOk(r, text);

  const body = asJson(text) || {};
  debugLog('[ubicacionesService.cargarUbicaciones] RES', body);

  const ubicaciones = Array.isArray(body?.ubicaciones)
    ? body.ubicaciones
    : (Array.isArray(body?.rows) ? body.rows : []);

  const metaRaw = body?.meta || {};
  const meta = {
    cols: Number.isFinite(Number(metaRaw.cols)) ? Number(metaRaw.cols) : (Number(body?.cols) || 5),
    rows: Number.isFinite(Number(metaRaw.rows)) ? Number(metaRaw.rows) : undefined,
    order: (metaRaw.order || metaRaw.orden || body?.order || body?.orden || 'horizontal'),
  };

  return { ubicaciones, meta, debug: body?.debug || null };
}

export async function guardarUbicaciones(a, b, c, d) {
  const [payload, token] = normalizePayloadAndToken(a, b, c, d);

  const body = {
    tenant_id: payload?.tenantId || undefined,
    meta: payload?.meta || {},
    ubicaciones: (payload?.ubicaciones || []).map((u, i) => ({
      ...u,
      label : u?.label || u?.codigo || `B${i + 1}`,
      codigo: u?.codigo || u?.label || `B${i + 1}`,
      orden : Number.isFinite(Number(u?.orden)) ? Number(u.orden) : i,
      activo: u?.activo ?? true,
    })),
    deletions: Array.isArray(payload?.deletions) ? payload.deletions : [],
    forceDeletePackages: !!payload?.forceDeletePackages,
  };

  const finalUrl = `/api/ubicaciones${isDebug ? '?debug=1' : ''}`;
  debugLog('[ubicacionesService.guardarUbicaciones] POST', finalUrl, body);

  const r = await apiFetch(finalUrl, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });

  const text = await r.text();
  if (!r.ok) ensureOk(r, text);

  const json = asJson(text) || {};
  debugLog('[ubicacionesService.guardarUbicaciones] RES', json);

  if (json?.ok !== true) {
    const msg = json?.message || 'No se pudieron guardar las ubicaciones.';
    const e = new Error(msg);
    e.response = json;
    throw e;
  }

  return json; 
}

export async function patchUbicacionesMeta(token, tenantId, meta) {
  const finalUrl = `/api/ubicaciones/meta${isDebug ? '?debug=1' : ''}`;
  debugLog('[ubicacionesService.patchMeta] PATCH', finalUrl, { tenant_id: tenantId, meta });

  const r = await apiFetch(finalUrl, {
    method: 'PATCH',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: { tenant_id: tenantId, meta },
  });

  const text = await r.text();
  if (!r.ok) ensureOk(r, text);

  const json = asJson(text) || {};
  debugLog('[ubicacionesService.patchMeta] RES', json);

  if (json?.ok !== true) {
    const msg = json?.message || 'No se pudo guardar la configuración visual';
    const e = new Error(msg);
    e.response = json;
    throw e;
  }
  return json;
}