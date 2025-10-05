'use strict';

// Cliente Supabase robusto (admite export default o named)
const supa = require('../utils/supabaseClient');
const supabase = supa?.supabase || supa?.default || supa;

const DEFAULT_META = { cols: 5, order: 'horizontal' };

// ===== Utils =====
const up = (s = '') => String(s || '').trim().toUpperCase();
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const bool = (v, d = true) => (typeof v === 'boolean' ? v : d);

const wantDebug = (req) =>
  (req?.query?.debug === '1') || (String(req?.headers?.['x-debug'] || '') === '1');

function log(ctx, obj) {
  try { console.log(`[ubicaciones.${ctx}]`, JSON.stringify(obj)); }
  catch { console.log(`[ubicaciones.${ctx}]`, obj); }
}

// ===== Tenancy =====
async function resolveTenantId(req) {
  const q = req?.query?.tenant_id;
  if (q) return String(q);

  const auth = req?.headers?.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  log('resolveTenantId.in', { hasAuth: !!token, hasQueryTenant: !!q });

  if (!token) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      log('resolveTenantId.authError', { error: error?.message || error || null });
      return null;
    }
    const userId = data.user.id;

    // memberships
    try {
      const { data: map, error: mErr } = await supabase
        .from('memberships')
        .select('tenant_id')
        .eq('user_id', userId)
        .limit(1);
      if (!mErr && map?.[0]?.tenant_id) {
        const tid = String(map[0].tenant_id);
        log('resolveTenantId.ok.membership', { tenantId: tid });
        return tid;
      }
    } catch (e) { log('resolveTenantId.membershipCatch', { msg: e?.message }); }

    // fallback opcional por accepted_by
    try {
      const { data: owned, error: oErr } = await supabase
        .from('tenants')
        .select('id')
        .eq('accepted_by', userId)
        .limit(1);
      if (!oErr && owned?.[0]?.id) {
        const tid = String(owned[0].id);
        log('resolveTenantId.ok.owner', { tenantId: tid });
        return tid;
      }
    } catch (e) { log('resolveTenantId.ownerCatch', { msg: e?.message }); }

    log('resolveTenantId.none', {});
    return null;
  } catch (e) {
    log('resolveTenantId.fatal', { msg: e?.message });
    return null;
  }
}

// ===== GET: solo ubicaciones activas + meta =====
async function listUbicaciones(req, res) {
  const tenantId = await resolveTenantId(req);
  const dbg = wantDebug(req);

  log('list.in', { url: req.originalUrl, tenantId });

  if (!tenantId) {
    if (dbg) return res.json({ ubicaciones: [], meta: DEFAULT_META, debug: { reason: 'no-tenant' } });
    return res.json({ ubicaciones: [], meta: DEFAULT_META });
  }

  try {
    // Meta
    let meta = DEFAULT_META;
    const { data: metaRow, error: metaErr } = await supabase
      .from('ubicaciones_meta')
      .select('cols, orden')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!metaErr && metaRow) {
      meta = {
        cols: num(metaRow.cols, 5),
        order: (metaRow.orden === 'vertical') ? 'vertical' : 'horizontal',
      };
    }

    // SOLO activas
    const { data: rows, error: uErr } = await supabase
      .from('ubicaciones')
      .select('id, label, orden, activo')
      .eq('tenant_id', tenantId)
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (uErr) throw uErr;

    const ubicaciones = (rows || []).map(r => ({
      id: r.id,
      label: up(r.label),
      orden: num(r.orden, 0),
      activo: true,
    }));

    log('list.out', { count: ubicaciones.length, meta });

    if (dbg) return res.json({ ubicaciones, meta, debug: { count: ubicaciones.length } });
    return res.json({ ubicaciones, meta });
  } catch (e) {
    log('list.error', { msg: e?.message });
    if (dbg) return res.json({ ubicaciones: [], meta: DEFAULT_META, debug: { error: e?.message } });
    return res.json({ ubicaciones: [], meta: DEFAULT_META });
  }
}

// ===== POST: upsert + ARCHIVAR (activo=false) las que no mandas =====
async function upsertUbicaciones(req, res) {
  const dbg = wantDebug(req);

  const explicitTenant = req.body?.tenant_id;
  const resolvedTenant = await resolveTenantId(req);
  const tenantId = explicitTenant || resolvedTenant || null;

  log('upsert.in', {
    hasTenantInBody: !!explicitTenant,
    resolvedTenant: resolvedTenant || null,
    finalTenant: tenantId || null,
    bodyMeta: req.body?.meta || null,
    bodyUbiLen: Array.isArray(req.body?.ubicaciones) ? req.body.ubicaciones.length : 0,
  });

  if (!tenantId) {
    const payload = { ok: false, message: 'No se pudo resolver el tenant.' };
    return dbg ? res.status(400).json({ ...payload, debug: { reason: 'no-tenant' } }) : res.status(400).json(payload);
  }

  const mIn = req.body?.meta || {};
  const cols = Math.max(1, Math.min(12, parseInt(mIn.cols ?? 5, 10) || 5));
  const order = (mIn.order === 'vertical' || mIn.orden === 'vertical') ? 'vertical' : 'horizontal';

  const rowsIn = Array.isArray(req.body?.ubicaciones) ? req.body.ubicaciones : [];
  const nowRows = rowsIn.map((u, i) => {
    const label = up(u?.label || u?.codigo || `B${i + 1}`);
    const orden = Number.isFinite(Number(u?.orden)) ? Number(u.orden) : i;
    return {
      tenant_id: tenantId,
      label,
      orden,
      activo: true, // LAS QUE ENVÍAS QUEDAN ACTIVAS
    };
  });

  try {
    // 1) Guardar meta
    const { error: metaErr } = await supabase
      .from('ubicaciones_meta')
      .upsert({ tenant_id: tenantId, cols, orden: order }, { onConflict: 'tenant_id' });
    if (metaErr) throw metaErr;

    // 2) Traer actuales (activas e inactivas)
    const { data: existRows, error: existErr } = await supabase
      .from('ubicaciones')
      .select('id, label, orden, activo')
      .eq('tenant_id', tenantId);
    if (existErr) throw existErr;

    const byLabel = new Map((existRows || []).map(r => [up(r.label), r]));
    const incomingLabels = new Set(nowRows.map(r => r.label));

    let inserted = 0, updated = 0, reactivated = 0, archived = 0;

    // 3) Upsert/Reactivate lo enviado
    for (const r of nowRows) {
      const exists = byLabel.get(r.label);
      if (exists) {
        // Si estaba inactiva → reactivar
        if (!exists.activo) {
          const { error: reErr } = await supabase
            .from('ubicaciones')
            .update({ activo: true })
            .eq('id', exists.id)
            .eq('tenant_id', tenantId);
          if (reErr) throw reErr;
          reactivated++;
        }
        // Actualiza orden/label si cambió
        if (exists.orden !== r.orden || up(exists.label) !== r.label) {
          const { error: upErr } = await supabase
            .from('ubicaciones')
            .update({ orden: r.orden, label: r.label, activo: true })
            .eq('id', exists.id)
            .eq('tenant_id', tenantId);
          if (upErr) throw upErr;
          updated++;
        } else {
          // asegura activo=true aunque no cambie nada
          if (!exists.activo) {
            const { error: actErr } = await supabase
              .from('ubicaciones')
              .update({ activo: true })
              .eq('id', exists.id)
              .eq('tenant_id', tenantId);
            if (actErr) throw actErr;
            reactivated++;
          }
        }
      } else {
        const { error: insErr } = await supabase
          .from('ubicaciones')
          .insert({ tenant_id: tenantId, label: r.label, orden: r.orden, activo: true });
        if (insErr) throw insErr;
        inserted++;
      }
    }

    // 4) ARCHIVAR (activo=false) las que ya no mandas
    const missing = (existRows || []).filter(r => !incomingLabels.has(up(r.label)));
    if (missing.length) {
      const idsToArchive = missing.map(m => m.id);
      const { error: archErr } = await supabase
        .from('ubicaciones')
        .update({ activo: false })
        .in('id', idsToArchive)
        .eq('tenant_id', tenantId);
      if (archErr) throw archErr;
      archived = idsToArchive.length;
    }

    log('upsert.out', { inserted, updated, reactivated, archived, cols, order });

    const payload = { ok: true, debug: { inserted, updated, reactivated, archived, meta: { cols, order } } };
    return dbg ? res.json(payload) : res.json({ ok: true });
  } catch (e) {
    log('upsert.error', { msg: e?.message });
    const payload = { ok: false, message: e?.message || 'Error al guardar ubicaciones.' };
    return dbg ? res.status(500).json({ ...payload, debug: { stack: e?.stack } }) : res.status(500).json(payload);
  }
}

// ===== PATCH: meta solo =====
async function patchMeta(req, res) {
  const dbg = wantDebug(req);

  const explicitTenant = req.body?.tenant_id;
  const resolvedTenant = await resolveTenantId(req);
  const tenantId = explicitTenant || resolvedTenant || null;

  log('patchMeta.in', {
    hasTenantInBody: !!explicitTenant,
    resolvedTenant: resolvedTenant || null,
    finalTenant: tenantId || null,
    bodyMeta: req.body?.meta || null,
  });

  if (!tenantId) {
    const payload = { ok: false, message: 'No se pudo resolver el tenant.' };
    return dbg ? res.status(400).json({ ...payload, debug: { reason: 'no-tenant' } }) : res.status(400).json(payload);
  }

  const mIn = req.body?.meta || {};
  const cols = Math.max(1, Math.min(12, parseInt(mIn.cols ?? 5, 10) || 5));
  const order = (mIn.order === 'vertical' || mIn.orden === 'vertical') ? 'vertical' : 'horizontal';

  try {
    const { error } = await supabase
      .from('ubicaciones_meta')
      .upsert({ tenant_id: tenantId, cols, orden: order }, { onConflict: 'tenant_id' });
    if (error) throw error;

    log('patchMeta.out', { cols, order });

    return dbg ? res.json({ ok: true, debug: { cols, order } }) : res.json({ ok: true });
  } catch (e) {
    log('patchMeta.error', { msg: e?.message });
    const payload = { ok: false, message: e?.message || 'Error al guardar meta.' };
    return dbg ? res.status(500).json({ ...payload, debug: { stack: e?.stack } }) : res.status(500).json(payload);
  }
}

module.exports = {
  listUbicaciones,
  upsertUbicaciones,
  patchMeta,
};
