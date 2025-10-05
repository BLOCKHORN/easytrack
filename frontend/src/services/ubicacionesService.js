// src/services/ubicacionesService.js
const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

/* ==============================
   Helpers
   ============================== */
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

/**
 * Firma admitida:
 *  - NUEVA: guardarUbicaciones({ tenantId, ubicaciones, meta }, token)
 *  - ANTIGUA: guardarUbicaciones(token, tenantId, ubicaciones, meta)
 */
function normalizePayloadAndToken(a, b, c, d) {
  const looksLikeToken = (v) => typeof v === 'string' && v.split('.').length >= 2 && v.length > 20;

  if (looksLikeToken(a)) {
    // Firma antigua
    const token = a;
    const tenantId = b;
    const ubicaciones = Array.isArray(c) ? c : [];
    const metaIn = d || {};
    const meta = {
      cols: Number.isFinite(Number(metaIn.cols)) ? Number(metaIn.cols) : 5,
      order: (metaIn.order || metaIn.orden) === 'vertical' ? 'vertical' : 'horizontal',
    };
    return [{ tenantId, ubicaciones, meta }, token];
  }

  // Firma nueva
  const payload = a || {};
  const token = b;
  const meta = {
    cols: Number.isFinite(Number(payload?.meta?.cols)) ? Number(payload.meta.cols) : 5,
    order: (payload?.meta?.order || payload?.meta?.orden) === 'vertical' ? 'vertical' : 'horizontal',
  };
  return [{ tenantId: payload?.tenantId, ubicaciones: payload?.ubicaciones || [], meta }, token];
}

/* ==============================
   API
   ============================== */

// GET ubicaciones + meta
export async function cargarUbicaciones(token, tenantId) {
  const url = new URL(`${API}/api/ubicaciones`);
  if (tenantId) url.searchParams.set('tenant_id', tenantId);
  url.searchParams.set('debug', '1'); // queremos ver el debug en respuesta

  console.log('[ubicacionesService.cargarUbicaciones] GET', url.toString());

  const r = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const text = await r.text();
  if (!r.ok) ensureOk(r, text);

  const body = asJson(text) || {};
  console.log('[ubicacionesService.cargarUbicaciones] RES', body);

  const ubicaciones = Array.isArray(body?.ubicaciones)
    ? body.ubicaciones
    : (Array.isArray(body?.rows) ? body.rows : []);

  const metaRaw = body?.meta || {};
  const meta = {
    cols: Number.isFinite(Number(metaRaw.cols)) ? Number(metaRaw.cols) : (Number(body?.cols) || 5),
    order: (metaRaw.order || metaRaw.orden || body?.order || body?.orden || 'horizontal'),
  };

  return { ubicaciones, meta, debug: body?.debug || null };
}

// POST full (estructura + meta)
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
  };

  const url = `${API}/api/ubicaciones?debug=1`; // pedimos debug
  console.log('[ubicacionesService.guardarUbicaciones] POST', url, body);

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await r.text();
  if (!r.ok) ensureOk(r, text);

  const json = asJson(text) || {};
  console.log('[ubicacionesService.guardarUbicaciones] RES', json);

  if (json?.ok !== true) {
    const msg = json?.message || 'No se pudieron guardar las ubicaciones.';
    const e = new Error(msg);
    e.response = json;
    throw e;
  }

  return json; // { ok: true, debug: {...} }
}

// PATCH meta (solo presentación)
export async function patchUbicacionesMeta(token, tenantId, meta) {
  const url = `${API}/api/ubicaciones/meta?debug=1`;
  console.log('[ubicacionesService.patchMeta] PATCH', url, { tenant_id: tenantId, meta });

  const r = await fetch(url, {
    method: 'PATCH',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tenant_id: tenantId, meta }),
  });

  const text = await r.text();
  if (!r.ok) ensureOk(r, text);

  const json = asJson(text) || {};
  console.log('[ubicacionesService.patchMeta] RES', json);

  if (json?.ok !== true) {
    const msg = json?.message || 'No se pudo guardar la configuración visual';
    const e = new Error(msg);
    e.response = json;
    throw e;
  }
  return json;
}
