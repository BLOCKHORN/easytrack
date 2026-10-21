'use strict';

const supa = require('../utils/supabaseClient');
const supabase = supa?.supabase || supa?.default || supa;
const { isDirectPg, query } = require('../utils/db');

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

  const num_rows = Math.ceil(N / C);
  const colIdx = Math.floor(i / num_rows);
  const rowIdx = i % num_rows;
  return { r: rowIdx + 1, c: colIdx + 1 };
}

async function resolveTenantId(req) {
  const q = req?.query?.tenant_id;
  if (q && isValidUUID(q)) return String(q);
  if (req.tenant?.id) return req.tenant.id;
  if (req.tenant_id) return req.tenant_id;

  const slug = req.params?.tenantSlug;
  if (slug) {
    if (isDirectPg()) {
      const { rows } = await query('SELECT id FROM public.tenants WHERE slug = $1 LIMIT 1', [slug]);
      if (rows[0]?.id) return rows[0].id;
    }
    const { data, error } = await supabase.from('tenants').select('id').eq('slug', slug).maybeSingle();
    if (!error && data?.id) return data.id;
  }

  const email = String(req.user?.email || '').toLowerCase().trim();
  if (email) {
    if (isDirectPg()) {
      const { rows } = await query('SELECT id FROM public.tenants WHERE lower(email) = lower($1) ORDER BY fecha_creacion DESC LIMIT 1', [email]);
      if (rows[0]?.id) return rows[0].id;
    }
    const { data, error } = await supabase.from('tenants').select('id').ilike('email', email).maybeSingle();
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

  return null;
}

exports.obtenerEstructura = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    let metaData = null;
    let ubiData = [];
    let pkgsData = [];

    if (isDirectPg()) {
      const [metaRes, ubiRes, pkgsRes] = await Promise.all([
        query('SELECT cols, num_rows, orden FROM public.ubicaciones_meta WHERE tenant_id = $1 LIMIT 1', [tenantId]),
        query('SELECT id, label, orden, activo FROM public.ubicaciones WHERE tenant_id = $1 AND activo = true ORDER BY orden ASC', [tenantId]),
        query('SELECT id, ubicacion_id, nombre_cliente, empresa_transporte, fecha_llegada, entregado FROM public.packages WHERE tenant_id = $1 AND entregado = false', [tenantId])
      ]);
      metaData = metaRes.rows[0] || null;
      ubiData = ubiRes.rows || [];
      pkgsData = pkgsRes.rows || [];
    } else {
      const [metaRes, ubiRes, pkgsRes] = await Promise.all([
        supabase.from('ubicaciones_meta').select('cols, num_rows, orden').eq('tenant_id', tenantId).maybeSingle(),
        supabase.from('ubicaciones').select('id, label, orden, activo').eq('tenant_id', tenantId).eq('activo', true).order('orden', { ascending: true }),
        supabase.from('packages').select('id, ubicacion_id, nombre_cliente, empresa_transporte, fecha_llegada, entregado').eq('tenant_id', tenantId).eq('entregado', false)
      ]);

      if (ubiRes.error) throw ubiRes.error;
      if (pkgsRes.error) throw pkgsRes.error;
      metaData = metaRes.data;
      ubiData = ubiRes.data || [];
      pkgsData = pkgsRes.data || [];
    }

    let cols = 5;
    let num_rows = 5; // Valor por defecto pro
    let orden = 'horizontal';
    
    if (metaData) {
      cols = Number.isFinite(+metaData.cols) ? Math.min(12, Math.max(1, +metaData.cols)) : 5;
      orden = metaData.orden === 'vertical' ? 'vertical' : 'horizontal';
      
      const dbRows = metaData.num_rows;
      const maxOrd = ubiData.reduce((max, u) => Math.max(max, u.orden ?? 0), -1);
      const neededRows = Math.ceil((maxOrd + 1) / cols);
      
      if (Number.isFinite(+dbRows)) {
        num_rows = Math.max(neededRows, +dbRows);
      } else {
        num_rows = Math.max(2, neededRows);
      }
    } else {
       // Fallback total si ni siquiera hay fila en meta
       const maxOrd = ubiData.reduce((max, u) => Math.max(max, u.orden ?? 0), -1);
       num_rows = Math.max(2, Math.ceil((maxOrd + 1) / cols));
    }

    const ubicaciones = ubiData.map((u, i) => ({
      id: u.id,
      label: up(u.label || `B${i + 1}`),
      orden: Number.isFinite(+u.orden) ? +u.orden : i,
      activo: true,
    }));

    return res.json({
      mode: 'lanes',
      meta: { cols, num_rows, orden, order: orden },
      lanes: ubicaciones.map((u, idx) => {
        const { r, c } = indexToRowCol(idx, ubicaciones.length, cols, orden);
        return {
          id: idx + 1,
          codigo: u.label,
          name: u.label,
          r, c,
          color: null,
          ubicacion_id: u.id,
        };
      }),
      ubicaciones,
      racks: [],
      packagesByLane: {}, // Simplified for now since we use packagesByUbicacion mostly
      packagesByUbicacion: {}, 
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
  const num_rows = Math.max(1, Math.min(50, parseInt(mIn.num_rows ?? 2, 10) || 2));
  const order = (mIn.order === 'vertical' || mIn.orden === 'vertical') ? 'vertical' : 'horizontal';

  const rowsIn = Array.isArray(req.body?.ubicaciones) ? req.body.ubicaciones : [];

  try {
    if (isDirectPg()) {
      await query(
        `INSERT INTO public.ubicaciones_meta (tenant_id, cols, num_rows, orden)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (tenant_id)
         DO UPDATE SET cols = EXCLUDED.cols, num_rows = EXCLUDED.num_rows, orden = EXCLUDED.orden, updated_at = NOW()`,
        [tenantId, cols, num_rows, order]
      );

      const existRes = await query('SELECT id, label, orden, activo FROM public.ubicaciones WHERE tenant_id = $1', [tenantId]);
      const existRows = existRes.rows || [];
      const byLabel = new Map(existRows.map(r => [up(r.label), r]));
      const incomingLabels = new Set();

      let reactivated = 0;
      for (let i = 0; i < rowsIn.length; i++) {
        const u = rowsIn[i];
        const labelUpper = up(u?.label || u?.codigo || `B${i + 1}`);
        incomingLabels.add(labelUpper);

        const targetOrden = Number.isFinite(Number(u?.orden)) ? Number(u.orden) : i;
        const exists = byLabel.get(labelUpper);

        if (exists) {
          const mustUpdate = (exists.orden !== targetOrden) || (up(exists.label) !== labelUpper) || (!exists.activo);
          if (mustUpdate) {
            await query(
              'UPDATE public.ubicaciones SET label = $1, orden = $2, activo = true, updated_at = NOW() WHERE id = $3 AND tenant_id = $4',
              [labelUpper, targetOrden, exists.id, tenantId]
            );
            if (!exists.activo) reactivated++;
          }
        } else {
          await query(
            `INSERT INTO public.ubicaciones (tenant_id, label, orden, activo, created_at, updated_at)
             VALUES ($1, $2, $3, true, NOW(), NOW())
             ON CONFLICT (tenant_id, label)
             DO UPDATE SET orden = EXCLUDED.orden, activo = true, updated_at = NOW()`,
            [tenantId, labelUpper, targetOrden]
          );
        }
      }

      const missingRows = existRows.filter(r => !incomingLabels.has(up(r.label)));
      const missingLabels = missingRows.map(r => up(r.label));
      const missingSet = new Set(missingLabels);
      const targets = deletions.length ? deletions.filter(lbl => missingSet.has(lbl)) : missingLabels.slice();

      let archived = 0, packagesDeleted = 0;
      let affectedIds = [];

      if (targets.length > 0) {
        const affectedRes = await query(
          'SELECT id, ubicacion_label FROM public.packages WHERE tenant_id = $1 AND entregado = false AND ubicacion_label = ANY($2::text[])',
          [tenantId, targets]
        );
        const affectedPkgs = affectedRes.rows || [];

        if (affectedPkgs.length > 0) {
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
          const delRes = await query('DELETE FROM public.packages WHERE tenant_id = $1 AND id = ANY($2::uuid[])', [tenantId, affectedIds]);
          packagesDeleted = delRes.rowCount || 0;
        }
      }

      if (missingRows.length > 0) {
        const idsToArchive = missingRows.map(m => m.id);
        const archRes = await query('UPDATE public.ubicaciones SET activo = false, updated_at = NOW() WHERE tenant_id = $1 AND id = ANY($2::uuid[])', [tenantId, idsToArchive]);
        archived = archRes.rowCount || 0;
      }

      const payload = {
        ok: true,
        ...(dbg ? { debug: { reactivated, archived, packagesDeleted, targets, deletedPackageIds: packagesDeleted ? affectedIds : [], meta: { cols, order } } } : {})
      };
      return res.json(payload);
    }

    const [metaRes, existRes] = await Promise.all([
      supabase.from('ubicaciones_meta').upsert({ tenant_id: tenantId, cols, num_rows, orden: order }, { onConflict: 'tenant_id' }),
      supabase.from('ubicaciones').select('id, label, orden, activo').eq('tenant_id', tenantId)
    ]);

    if (metaRes.error) throw metaRes.error;
    if (existRes.error) throw existRes.error;

    const existRows = existRes.data || [];
    const byLabel = new Map(existRows.map(r => [up(r.label), r]));
    const incomingLabels = new Set();

    const toInsert = [];
    const toUpdate = [];
    
    let reactivated = 0;

    for (let i = 0; i < rowsIn.length; i++) {
      const u = rowsIn[i];
      const labelUpper = up(u?.label || u?.codigo || `B${i + 1}`);
      incomingLabels.add(labelUpper);

      const targetOrden = Number.isFinite(Number(u?.orden)) ? Number(u.orden) : i;
      const exists = byLabel.get(labelUpper);

      if (exists) {
        const mustUpdate = (exists.orden !== targetOrden) || (up(exists.label) !== labelUpper) || (!exists.activo);
        if (mustUpdate) {
          toUpdate.push({ id: exists.id, tenant_id: tenantId, label: labelUpper, orden: targetOrden, activo: true });
          if (!exists.activo) reactivated++;
        }
      } else {
        toInsert.push({ tenant_id: tenantId, label: labelUpper, orden: targetOrden, activo: true });
      }
    }

    if (toUpdate.length > 0) {
      const { error: updErr } = await supabase.from('ubicaciones').upsert(toUpdate, { onConflict: 'id' });
      if (updErr) throw updErr;
    }

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from('ubicaciones').insert(toInsert);
      if (insErr) throw insErr;
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
        .eq('entregado', false)
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
      ...(dbg ? { debug: { inserted: toInsert.length, updated: toUpdate.length, reactivated, archived, packagesDeleted, targets, deletedPackageIds: packagesDeleted ? affectedIds : [], meta: { cols, order } } } : {})
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
  const num_rows = Math.max(1, Math.min(50, parseInt(mIn.num_rows ?? 2, 10) || 2));
  const order = (mIn.order === 'vertical' || mIn.orden === 'vertical') ? 'vertical' : 'horizontal';

  try {
    if (isDirectPg()) {
      await query(
        `INSERT INTO public.ubicaciones_meta (tenant_id, cols, num_rows, orden)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (tenant_id)
         DO UPDATE SET cols = EXCLUDED.cols, num_rows = EXCLUDED.num_rows, orden = EXCLUDED.orden, updated_at = NOW()`,
        [tenantId, cols, num_rows, order]
      );
      return res.json({ ok: true, ...(dbg ? { debug: { cols, order } } : {}) });
    }

    const { error } = await supabase
      .from('ubicaciones_meta')
      .upsert({ tenant_id: tenantId, cols, num_rows, orden: order }, { onConflict: 'tenant_id' });
      
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
    
    if (!Array.isArray(carriers)) {
      return res.status(400).json({ error: 'Payload inválido: carriers no es un array' });
    }

    if (isDirectPg()) {
      const { rows: existing } = await query('SELECT id, nombre FROM public.empresas_transporte_tenant WHERE tenant_id = $1', [tenantId]);

      for (const c of carriers) {
        const nombreLimpio = String(c?.nombre || '').trim();
        if (!nombreLimpio) continue;
        const ingreso = Number.isFinite(+c?.ingreso_por_entrega) ? +c.ingreso_por_entrega : 0;
        const activo = typeof c?.activo === 'boolean' ? c.activo : true;
        const color = typeof c?.color === 'string' ? c.color.trim().slice(0, 7) : null;
        const notas = typeof c?.notas === 'string' ? c.notas.trim() : null;

        await query(
          `INSERT INTO public.empresas_transporte_tenant (tenant_id, nombre, ingreso_por_entrega, activo, color, notas)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (tenant_id, nombre)
           DO UPDATE SET ingreso_por_entrega = EXCLUDED.ingreso_por_entrega, activo = EXCLUDED.activo, color = EXCLUDED.color, notas = EXCLUDED.notas`,
          [tenantId, nombreLimpio, ingreso, activo, color, notas]
        );
      }

      if (sync) {
        const keep = new Set(carriers.map(r => String(r.nombre || '').trim()).filter(Boolean));
        const toDelete = (existing || []).map(e => e.nombre).filter(n => !keep.has(n));
        if (toDelete.length > 0) {
          await query('DELETE FROM public.empresas_transporte_tenant WHERE tenant_id = $1 AND nombre = ANY($2::text[])', [tenantId, toDelete]);
        }
      }

      return res.json({ ok: true, msg: "Carriers guardados con éxito" });
    }

    const { data: existing } = await supabase
      .from('empresas_transporte_tenant')
      .select('id, nombre')
      .eq('tenant_id', tenantId);
      
    const idMap = new Map((existing || []).map(e => [e.nombre, e.id]));

    const toInsert = [];
    const toUpdate = [];

    carriers.forEach(c => {
      const nombreLimpio = String(c?.nombre || '').trim();
      if (!nombreLimpio) return;

      const payload = {
        tenant_id: tenantId,
        nombre: nombreLimpio,
        ingreso_por_entrega: Number.isFinite(+c?.ingreso_por_entrega) ? +c.ingreso_por_entrega : 0,
        activo: typeof c?.activo === 'boolean' ? c.activo : true,
        color: typeof c?.color === 'string' ? c.color.trim().slice(0, 7) : null,
        notas: typeof c?.notas === 'string' ? c.notas.trim() : null,
      };

      const existingId = idMap.get(nombreLimpio);
      
      if (existingId) {
        payload.id = existingId; 
        toUpdate.push(payload);
      } else {
        toInsert.push(payload); 
      }
    });

    if (toUpdate.length > 0) {
      const { error: upErr } = await supabase
        .from('empresas_transporte_tenant')
        .upsert(toUpdate, { onConflict: 'id' }); 
      if (upErr) throw upErr;
    }

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase
        .from('empresas_transporte_tenant')
        .insert(toInsert);
      if (insErr) throw insErr;
    }

    if (sync) {
      const keep = new Set(carriers.map(r => String(r.nombre || '').trim()).filter(Boolean));
      const toDelete = (existing || []).map(e => e.nombre).filter(n => !keep.has(n));
      
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from('empresas_transporte_tenant')
          .delete()
          .eq('tenant_id', tenantId)
          .in('nombre', toDelete);
          
        if (delErr) throw delErr;
      }
    }

    res.json({ ok: true, msg: "Carriers guardados con éxito" });
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron guardar los carriers' });
  }
};

exports.obtenerCarriers = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    if (isDirectPg()) {
      const [tCarriers, gCarriers] = await Promise.all([
        query('SELECT * FROM public.empresas_transporte_tenant WHERE tenant_id = $1 ORDER BY nombre', [tenantId]),
        query('SELECT * FROM public.empresas_transporte ORDER BY nombre')
      ]);
      return res.json({
        empresas: tCarriers.rows || [],
        disponibles: gCarriers.rows || []
      });
    }

    const { data: tenantCarriers, error: errTenant } = await supabase
      .from('empresas_transporte_tenant')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('nombre');

    if (errTenant) throw errTenant;

    const { data: globalCarriers, error: errGlobal } = await supabase
      .from('empresas_transporte')
      .select('*')
      .order('nombre');

    if (errGlobal) throw errGlobal;

    return res.json({ 
      empresas: tenantCarriers || [],
      disponibles: globalCarriers || []
    });
  } catch (error) {
    console.error('[obtenerCarriers Error]', error);
    return res.status(500).json({ error: 'Error interno al cargar empresas de transporte' });
  }
};