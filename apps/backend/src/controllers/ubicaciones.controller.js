'use strict';

const supa = require('../utils/supabaseClient');
const supabase = supa?.supabase || supa?.default || supa;

const up = (s = '') => String(s || '').trim().toUpperCase();
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

const wantDebug = (req) =>
  (req?.query?.debug === '1') || (String(req?.headers?.['x-debug'] || '') === '1');

function isValidUUID(uuid) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(uuid));
}

function indexToRowCol(i, total, cols, order) {
  const C = Math.max(1, parseInt(cols || 5, 10));
  const N = Math.max(0, parseInt(total || 0, 10));
  const horizontal = order !== 'vertical';

  if (horizontal) {
    const r = Math.floor(i / C) + 1;
    const c = (i % C) + 1;
    return { r, c };
  }

  const rows = Math.ceil(N / C);
  const colIdx = Math.floor(i / rows);
  const rowIdx = i % rows;
  return { r: rowIdx + 1, c: colIdx + 1 };
}

async function resolveTenantId(req) {
  const q = req?.query?.tenant_id;
  if (q && isValidUUID(q)) return String(q);
  if (req.tenant?.id) return req.tenant.id;
  if (req.tenant_id) return req.tenant_id;

  const slug = req.params?.tenantSlug;
  if (slug) {
    const { data, error } = await supabase.from('tenants').select('id').eq('slug', slug).maybeSingle();
    if (!error && data?.id) return data.id;
  }

  const auth = req?.headers?.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (token) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        const userId = data.user.id;
        const { data: map } = await supabase.from('memberships').select('tenant_id').eq('user_id', userId).limit(1);
        if (map?.[0]?.tenant_id) return String(map[0].tenant_id);
        const { data: owned } = await supabase.from('tenants').select('id').eq('accepted_by', userId).limit(1);
        if (owned?.[0]?.id) return String(owned[0].id);
      }
    } catch {}
  }

  const email = String(req.user?.email || '').toLowerCase().trim();
  if (email) {
    const { data, error } = await supabase.from('tenants').select('id').ilike('email', email).maybeSingle();
    if (!error && data?.id) return data.id;
  }

  return null;
}

exports.obtenerEstructura = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const [metaRes, ubiRes, pkgsRes] = await Promise.all([
      supabase.from('ubicaciones_meta').select('cols, orden').eq('tenant_id', tenantId).maybeSingle(),
      supabase.from('ubicaciones').select('id, label, orden, activo').eq('tenant_id', tenantId).eq('activo', true).order('orden', { ascending: true }),
      supabase.from('packages').select('id, ubicacion_id, nombre_cliente, empresa_transporte, fecha_llegada, entregado').eq('tenant_id', tenantId).eq('entregado', false)
    ]);

    if (ubiRes.error) throw ubiRes.error;
    if (pkgsRes.error) throw pkgsRes.error;

    let cols = 5;
    let orden = 'horizontal';
    if (metaRes.data) {
      cols = Number.isFinite(+metaRes.data.cols) ? Math.min(12, Math.max(1, +metaRes.data.cols)) : 5;
      orden = metaRes.data.orden === 'vertical' ? 'vertical' : 'horizontal';
    }

    const ubicaciones = (ubiRes.data || []).map((u, i) => ({
      id: u.id,
      label: up(u.label || `B${i + 1}`),
      orden: Number.isFinite(+u.orden) ? +u.orden : i,
      activo: true,
    }));

    const lanes = ubicaciones.map((u, idx) => {
      const { r, c } = indexToRowCol(idx, ubicaciones.length, cols, orden);
      return {
        id: idx + 1,
        codigo: u.label,
        name: u.label,
        r, c,
        color: null,
        ubicacion_id: u.id,
      };
    });

    const packagesByUbicacion = {};
    const packagesByLane = {};
    
    if (ubicaciones.length && pkgsRes.data) {
      const byUbiIdx = new Map(ubicaciones.map((u, idx) => [u.id, idx + 1]));

      pkgsRes.data.forEach((p) => {
        const uId = p.ubicacion_id;
        if (!uId) return;
        
        if (!packagesByUbicacion[uId]) packagesByUbicacion[uId] = [];
        packagesByUbicacion[uId].push(p);

        const laneId = byUbiIdx.get(uId);
        if (laneId) {
          if (!packagesByLane[laneId]) packagesByLane[laneId] = [];
          packagesByLane[laneId].push({
            id: p.id,
            nombre_cliente: p.nombre_cliente,
            empresa_transporte: p.empresa_transporte,
            fecha_llegada: p.fecha_llegada,
            entregado: p.entregado,
            ubicacion_id: uId,
          });
        }
      });
    }

    return res.json({
      mode: 'lanes',
      meta: { cols, orden, order: orden },
      lanes,
      ubicaciones,
      racks: [],
      packagesByLane,
      packagesByUbicacion,
      packagesByBalda: packagesByUbicacion,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener estructura del almacén' });
  }
};

exports.upsertUbicaciones = async (req, res) => {
  const dbg = wantDebug(req);
  const tenantId = (req.body?.tenant_id) || (await resolveTenantId(req)) || null;

  if (!tenantId) {
    const payload = { ok: false, message: 'No se pudo resolver el tenant.' };
    return dbg ? res.status(400).json({ ...payload, debug: { reason: 'no-tenant' } }) : res.status(400).json(payload);
  }

  const deletions = (Array.isArray(req.body?.deletions) ? req.body.deletions : []).map(up);
  const forceDeletePackages = !!req.body?.forceDeletePackages;

  const mIn = req.body?.meta || {};
  const cols = Math.max(1, Math.min(12, parseInt(mIn.cols ?? 5, 10) || 5));
  const order = (mIn.order === 'vertical' || mIn.orden === 'vertical') ? 'vertical' : 'horizontal';

  const rowsIn = Array.isArray(req.body?.ubicaciones) ? req.body.ubicaciones : [];

  try {
    const [metaRes, existRes] = await Promise.all([
      supabase.from('ubicaciones_meta').upsert({ tenant_id: tenantId, cols, orden: order }, { onConflict: 'tenant_id' }),
      supabase.from('ubicaciones').select('id, label, orden, activo').eq('tenant_id', tenantId)
    ]);

    if (metaRes.error) throw metaRes.error;
    if (existRes.error) throw existRes.error;

    const existRows = existRes.data || [];
    const byLabel = new Map(existRows.map(r => [up(r.label), r]));
    const incomingLabels = new Set();

    const upsertPayload = [];
    let inserted = 0, updated = 0, reactivated = 0;

    for (let i = 0; i < rowsIn.length; i++) {
      const u = rowsIn[i];
      const labelUpper = up(u?.label || u?.codigo || `B${i + 1}`);
      incomingLabels.add(labelUpper);

      const targetOrden = Number.isFinite(Number(u?.orden)) ? Number(u.orden) : i;
      const exists = byLabel.get(labelUpper);

      if (exists) {
        const mustUpdate = (exists.orden !== targetOrden) || (up(exists.label) !== labelUpper) || (!exists.activo);
        if (mustUpdate) {
          upsertPayload.push({ id: exists.id, tenant_id: tenantId, label: labelUpper, orden: targetOrden, activo: true });
          if (!exists.activo) reactivated++; else updated++;
        }
      } else {
        upsertPayload.push({ tenant_id: tenantId, label: labelUpper, orden: targetOrden, activo: true });
        inserted++;
      }
    }

    if (upsertPayload.length > 0) {
      const { error: upsertErr } = await supabase.from('ubicaciones').upsert(upsertPayload, { onConflict: 'id' });
      if (upsertErr) throw upsertErr;
    }

    const missingRows = existRows.filter(r => !incomingLabels.has(up(r.label)));
    const missingLabels = missingRows.map(r => up(r.label));
    const missingSet = new Set(missingLabels);
    const targets = deletions.length ? deletions.filter(lbl => missingSet.has(lbl)) : missingLabels.slice();

    let archived = 0, packagesDeleted = 0;
    let affectedIds = [];

    if (targets.length > 0) {
      const { data: affectedPkgs, error: pkgErr } = await supabase
        .from('packages')
        .select('id, ubicacion_label')
        .eq('tenant_id', tenantId)
        .in('ubicacion_label', targets);

      if (pkgErr) throw pkgErr;

      if (affectedPkgs && affectedPkgs.length > 0) {
        if (!forceDeletePackages) {
          const counts = {};
          affectedPkgs.forEach(p => {
            const lbl = up(p.ubicacion_label);
            counts[lbl] = (counts[lbl] || 0) + 1;
          });
          
          const withPackages = Object.entries(counts);
          const detail = withPackages.map(([code, c]) => `${code}: ${c} paquete${c === 1 ? '' : 's'}`).join(', ');
          const payload = { ok: false, message: `No se pueden eliminar ubicaciones con paquetes. Afectadas: ${detail}.`, affected: withPackages.map(([code]) => code), counts };
          return dbg ? res.status(400).json({ ...payload, debug: { reason: 'has-packages' } }) : res.status(400).json(payload);
        }

        affectedIds = affectedPkgs.map(p => p.id);
        const { error: delErr, count } = await supabase
          .from('packages')
          .delete({ count: 'exact' })
          .in('id', affectedIds)
          .eq('tenant_id', tenantId);

        if (delErr) throw delErr;
        packagesDeleted = num(count, 0);
      }
    }

    if (missingRows.length > 0) {
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
};

exports.patchMeta = async (req, res) => {
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
};

exports.guardarCarriers = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const { carriers, sync = true } = req.body || {};
    
    // Solo comprobamos que sea un Array. Permitimos que esté vacío (length === 0).
    if (!Array.isArray(carriers)) {
      return res.status(400).json({ error: 'Payload inválido: carriers no es un array' });
    }

    const rows = carriers
      .map(c => ({
        tenant_id: tenantId,
        nombre: String(c?.nombre || '').trim(),
        ingreso_por_entrega: Number.isFinite(+c?.ingreso_por_entrega) ? +c.ingreso_por_entrega : 0,
        activo: typeof c?.activo === 'boolean' ? c.activo : true,
        color: typeof c?.color === 'string' ? c.color.trim().slice(0, 7) : null,
        notas: typeof c?.notas === 'string' ? c.notas.trim() : null,
      }))
      .filter(r => !!r.nombre);

    // Si el usuario nos envía agencias, hacemos el upsert
    if (rows.length > 0) {
      const { error: upErr } = await supabase
        .from('empresas_transporte_tenant')
        .upsert(rows, { onConflict: 'tenant_id, nombre' });
      if (upErr) throw upErr;
    }

    // Proceso Sync: Borrar de la BD las agencias que el usuario quitó del frontend
    if (sync) {
      const keep = new Set(rows.map(r => r.nombre));
      
      const { data: existentes, error: exErr } = await supabase
        .from('empresas_transporte_tenant')
        .select('nombre')
        .eq('tenant_id', tenantId);
        
      if (exErr) throw exErr;

      const toDelete = (existentes || []).map(e => e.nombre).filter(n => !keep.has(n));
      
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from('empresas_transporte_tenant')
          .delete()
          .eq('tenant_id', tenantId)
          .in('nombre', toDelete);
          
        if (delErr) throw delErr;
      }
    }

    res.json({ ok: true, carriers: rows });
  } catch (error) {
    console.error("Error en guardarCarriers:", error);
    res.status(500).json({ error: 'No se pudieron guardar los carriers' });
  }
};