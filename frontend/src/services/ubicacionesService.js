// src/services/ubicacionesService.js
const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

/* ==============================
   Helpers
   ============================== */
function ensureOk(res, text) {
  if (res.ok) return;
  let msg = 'No se pudieron guardar las ubicaciones';
  try {
    const j = JSON.parse(text || '{}');
    msg = j?.message || j?.error || msg;
  } catch {}
  const e = new Error(msg);
  e.status = res.status;
  throw e;
}

/** Normaliza el payload, soporta firma nueva y antigua.
 *  - NUEVA: guardarUbicaciones({ tenantId, ubicaciones, meta }, token)
 *  - ANTIGUA: guardarUbicaciones(token, tenantId, ubicaciones, meta)
 */
function normalizePayloadAndToken(a, b, c, d) {
  // Firma antigua detectada cuando el primer argumento es el token (string largo con puntos)
  const looksLikeToken = (v) => typeof v === 'string' && v.split('.').length >= 2 && v.length > 20;

  if (looksLikeToken(a)) {
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
    order:
      (payload?.meta?.order ||
        payload?.meta?.orden) === 'vertical'
        ? 'vertical'
        : 'horizontal',
  };
  return [
    {
      tenantId: payload?.tenantId,
      ubicaciones: Array.isArray(payload?.ubicaciones) ? payload.ubicaciones : [],
      meta,
    },
    token,
  ];
}

/* ==============================
   API
   ============================== */

// GET ubicaciones + meta
export async function cargarUbicaciones(token, tenantId) {
  try {
    const url = new URL(`${API}/api/ubicaciones`);
    if (tenantId) url.searchParams.set('tenant_id', tenantId);

    const r = await fetch(url.toString(), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!r.ok) {
      // Fallback silencioso (no romper la UI ni spamear la consola)
      return { ubicaciones: [], meta: { cols: 5, order: 'horizontal' } };
    }

    const body = await r.json().catch(() => ({}));
    const ubicaciones = Array.isArray(body?.ubicaciones)
      ? body.ubicaciones
      : (Array.isArray(body?.rows) ? body.rows : []);

    const metaRaw = body?.meta || {};
    const meta = {
      cols: Number.isFinite(Number(metaRaw.cols)) ? Number(metaRaw.cols) : (Number(body?.cols) || 5),
      order: (metaRaw.order || metaRaw.orden || body?.order || body?.orden || 'horizontal'),
    };

    return { ubicaciones, meta };
  } catch {
    return { ubicaciones: [], meta: { cols: 5, order: 'horizontal' } };
  }
}

// POST full (estructura + meta)
// NUEVA firma preferida: guardarUbicaciones({ tenantId, ubicaciones, meta }, token)
// Compatibilidad: guardarUbicaciones(token, tenantId, ubicaciones, meta)
export async function guardarUbicaciones(a, b, c, d) {
  const [payload, token] = normalizePayloadAndToken(a, b, c, d);

  const body = {
    tenant_id: payload?.tenantId || undefined,
    meta: payload?.meta || {},
    // Forzamos 'codigo' y orden numérico (ayuda al legacy 'baldas')
    ubicaciones: (payload?.ubicaciones || []).map((u, i) => ({
      ...u,
      label : u?.label || u?.codigo || `B${i + 1}`,
      codigo: u?.codigo || u?.label || `B${i + 1}`,
      orden : Number.isFinite(Number(u?.orden)) ? Number(u.orden) : i,
      activo: u?.activo ?? true,
    })),
  };

  const r = await fetch(`${API}/api/ubicaciones`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await r.text();
  ensureOk(r, text);

  try { return JSON.parse(text); } catch { return { ok: true }; }
}

// PATCH solo meta (si tu backend lo soporta)
export async function guardarSoloMeta({ tenantId, meta }, token) {
  const r = await fetch(`${API}/api/ubicaciones/meta`, {
    method: 'PATCH',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tenant_id: tenantId, meta }),
  });

  if (!r.ok) {
    const err = new Error('No se pudo guardar la configuración visual');
    err.status = r.status;
    throw err;
  }
  return { ok: true };
}
