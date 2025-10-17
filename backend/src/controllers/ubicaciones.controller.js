'use strict';

// Cliente Supabase robusto (admite export default o named)
const supa = require('../utils/supabaseClient');
const supabase = supa?.supabase || supa?.default || supa;

const DEFAULT_META = { cols: 5, order: 'horizontal' };

// ===== Utils =====
const up = (s = '') => String(s || '').trim().toUpperCase();
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

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

  if (!token) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;
    const userId = data.user.id;

    try {
      const { data: map, error: mErr } = await supabase
        .from('memberships')
        .select('tenant_id')
        .eq('user_id', userId)
        .limit(1);
      if (!mErr && map?.[0]?.tenant_id) return String(map[0].tenant_id);
    } catch {}

    try {
      const { data: owned } = await supabase
        .from('tenants')
        .select('id')
        .eq('accepted_by', userId)
        .limit(1);
      if (owned?.[0]?.id) return String(owned[0].id);
    } catch {}

    return null;
  } catch { return null; }
}

// ===== GET
async function listUbicaciones(req, res) {
  const tenantId = await resolveTenantId(req);
  const dbg = wantDebug(req);
  if (!tenantId) return res.json({ ubicaciones: [], meta: DEFAULT_META, ...(dbg ? { debug:{ reason:'no-tenant' } } : {}) });

  try {
    // Meta
    let meta = DEFAULT_META;
    const { data: metaRow } = await supabase
      .from('ubicaciones_meta')
      .select('cols, orden')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (metaRow) {
      meta = {
        cols: num(metaRow.cols, 5),
        order: (metaRow.orden === 'vertical') ? 'vertical' : 'horizontal',
      };
    }

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

    return res.json({ ubicaciones, meta, ...(dbg ? { debug: { count: ubicaciones.length } } : {}) });
  } catch (e) {
    return res.json({ ubicaciones: [], meta: DEFAULT_META, ...(dbg ? { debug: { error: e?.message } } : {}) });
  }
}

// ===== POST
async function upsertUbicaciones(req, res) {
  const dbg = wantDebug(req);
  const tenantId = (req.body?.tenant_id) || (await resolveTenantId(req)) || null;

  const deletions = (Array.isArray(req.body?.deletions) ? req.body.deletions : []).map(up);
  const forceDeletePackages = !!req.body?.forceDeletePackages;

  if (!tenantId) {
    const payload = { ok: false, message: 'No se pudo resolver el tenant.' };
    return dbg ? res.status(400).json({ ...payload, debug: { reason: 'no-tenant' } }) : res.status(400).json(payload);
  }

  const mIn = req.body?.meta || {};
  const cols = Math.max(1, Math.min(12, parseInt(mIn.cols ?? 5, 10) || 5));
  const order = (mIn.order === 'vertical' || mIn.orden === 'vertical') ? 'vertical' : 'horizontal';

  const rowsIn = Array.isArray(req.body?.ubicaciones) ? req.body.ubicaciones : [];
  const nowRows = rowsIn.map((u, i) => ({
    tenant_id: tenantId,
    label: up(u?.label || u?.codigo || `B${i + 1}`),
    orden: Number.isFinite(Number(u?.orden)) ? Number(u.orden) : i,
    activo: true,
  }));

  try {
    // META
    const { error: metaErr } = await supabase
      .from('ubicaciones_meta')
      .upsert({ tenant_id: tenantId, cols, orden: order }, { onConflict: 'tenant_id' });
    if (metaErr) throw metaErr;

    // EXISTENTES
    const { data: existRows, error: existErr } = await supabase
      .from('ubicaciones')
      .select('id, label, orden, activo')
      .eq('tenant_id', tenantId);
    if (existErr) throw existErr;

    const byLabel = new Map((existRows || []).map(r => [up(r.label), r]));
    const incomingLabels = new Set(nowRows.map(r => r.label));

    let inserted = 0, updated = 0, reactivated = 0, archived = 0, packagesDeleted = 0;

    // UPSERT / REACTIVATE
    for (const r of nowRows) {
      const exists = byLabel.get(r.label);
      if (exists) {
        const mustUpdate = (exists.orden !== r.orden) || (up(exists.label) !== r.label) || (!exists.activo);
        if (mustUpdate) {
          const { error: upErr } = await supabase
            .from('ubicaciones')
            .update({ orden: r.orden, label: r.label, activo: true })
            .eq('id', exists.id)
            .eq('tenant_id', tenantId);
          if (upErr) throw upErr;
          if (!exists.activo) reactivated++; else updated++;
        }
      } else {
        const { error: insErr } = await supabase
          .from('ubicaciones')
          .insert({ tenant_id: tenantId, label: r.label, orden: r.orden, activo: true });
        if (insErr) throw insErr;
        inserted++;
      }
    }

    // MISSING
    const missingRows = (existRows || []).filter(r => !incomingLabels.has(up(r.label)));
    const missingLabels = missingRows.map(r => up(r.label));

    const missingSet = new Set(missingLabels);
    const targets = deletions.length ? deletions.filter(lbl => missingSet.has(lbl)) : missingLabels.slice();

    let affectedIds = [];
    let counts = {};
    if (targets.length) {
      const { data: pkgRows, error: pkgErr } = await supabase
        .from('packages')
        .select('id, ubicacion_label')
        .eq('tenant_id', tenantId);
      if (pkgErr) throw pkgErr;

      const trg = new Set(targets);
      const affected = (pkgRows || []).filter(p => trg.has(up(p.ubicacion_label)));
      affectedIds = affected.map(p => p.id);

      for (const p of affected) {
        const lbl = up(p.ubicacion_label);
        counts[lbl] = (counts[lbl] || 0) + 1;
      }

      const withPackages = Object.entries(counts).filter(([, c]) => (c || 0) > 0);

      if (withPackages.length && !forceDeletePackages) {
        const detail = withPackages.map(([code, c]) => `${code}: ${c} paquete${c === 1 ? '' : 's'}`).join(', ');
        const payload = { ok: false, message: `No se pueden eliminar ubicaciones con paquetes. Afectadas: ${detail}.`, affected: withPackages.map(([code]) => code), counts };
        return dbg ? res.status(400).json({ ...payload, debug: { reason: 'has-packages' } }) : res.status(400).json(payload);
      }

      if (withPackages.length && forceDeletePackages && affectedIds.length) {
        const { error: delErr, count } = await supabase
          .from('packages')
          .delete({ count: 'exact' })
          .in('id', affectedIds)
          .eq('tenant_id', tenantId);
        if (delErr) throw delErr;
        packagesDeleted = num(count, 0);
      }
    }

    // ARCHIVAR missing
    if (missingRows.length) {
      const idsToArchive = missingRows.map(m => m.id);
      const { error: archErr } = await supabase
        .from('ubicaciones')
        .update({ activo: false })
        .in('id', idsToArchive)
        .eq('tenant_id', tenantId);
      if (archErr) throw archErr;
      archived = idsToArchive.length;
    }

    const payload = {
      ok: true,
      ...(dbg ? { debug: { inserted, updated, reactivated, archived, packagesDeleted, targets, deletedPackageIds: packagesDeleted ? affectedIds : [], meta: { cols, order } } } : {})
    };
    return res.json(payload);
  } catch (e) {
    const payload = { ok: false, message: e?.message || 'Error al guardar ubicaciones.' };
    return dbg ? res.status(500).json({ ...payload, debug: { stack: e?.stack } }) : res.status(500).json(payload);
  }
}

// ===== PATCH
async function patchMeta(req, res) {
  const dbg = wantDebug(req);
  const tenantId = (req.body?.tenant_id) || (await resolveTenantId(req)) || null;

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
    return res.json({ ok: true, ...(dbg ? { debug: { cols, order } } : {}) });
  } catch (e) {
    const payload = { ok: false, message: e?.message || 'Error al guardar meta.' };
    return dbg ? res.status(500).json({ ...payload, debug: { stack: e?.stack } }) : res.status(500).json(payload);
  }
}

module.exports = { listUbicaciones, upsertUbicaciones, patchMeta };
