// backend/src/controllers/estantes.controller.js
'use strict';
const { supabase } = require('../utils/supabaseClient');

/* ────────────────────────────────────────────────────────────── */
/* Helpers                                                       */
/* ────────────────────────────────────────────────────────────── */
const up = (s = '') => String(s).trim().toUpperCase();

async function resolveTenantId(req) {
  // 1) Ya resuelto por middlewares
  if (req.tenant?.id) return req.tenant.id;
  if (req.tenant_id) return req.tenant_id;

  // 2) Por slug en la URL (mergeParams:true en el router)
  const slug = req.params?.tenantSlug;
  if (slug) {
    const { data, error } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    if (data?.id) return data.id;
  }

  // 3) Por email del usuario
  const email = String(req.user?.email || '').toLowerCase().trim();
  if (email) {
    const { data, error } = await supabase
      .from('tenants')
      .select('id')
      .ilike('email', email)
      .maybeSingle();
    if (error) throw error;
    if (data?.id) return data.id;
  }

  return null;
}

// Calcula posición (row,col) para el índice i según grid (cols, orden)
function indexToRowCol(i, total, cols, order /* 'horizontal'|'vertical' */) {
  const C = Math.max(1, parseInt(cols || 5, 10));
  const N = Math.max(0, parseInt(total || 0, 10));
  const horizontal = order !== 'vertical';

  if (horizontal) {
    const r = Math.floor(i / C) + 1;
    const c = (i % C) + 1;
    return { r, c };
  }

  // vertical: se rellena por columnas
  const rows = Math.ceil(N / C);
  const colIdx = Math.floor(i / rows);
  const rowIdx = i % rows;
  const r = rowIdx + 1;
  const c = colIdx + 1;
  return { r, c };
}

/* ────────────────────────────────────────────────────────────── */
/* GET /api/estantes/estructura                                  */
/* Devuelve la estructura basada en `ubicaciones` (+ meta)        */
/* ────────────────────────────────────────────────────────────── */
exports.obtenerEstructura = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    // Meta (grid): columnas y orientación
    let cols = 5;
    let orden = 'horizontal';
    try {
      const { data: meta } = await supabase
        .from('ubicaciones_meta')
        .select('cols, orden')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (meta) {
        cols = Number.isFinite(+meta.cols) ? Math.min(12, Math.max(1, +meta.cols)) : 5;
        orden = meta.orden === 'vertical' ? 'vertical' : 'horizontal';
      }
    } catch {}

    // Ubicaciones (ordenadas por `orden`)
    const { data: uRows, error: uErr } = await supabase
      .from('ubicaciones')
      .select('id, label, orden, activo')
      .eq('tenant_id', tenantId)
      .order('orden', { ascending: true });
    if (uErr) throw uErr;

    const ubicaciones = (uRows || []).map((u, i) => ({
      id: u.id,
      label: up(u.label || `B${i + 1}`),
      orden: Number.isFinite(+u.orden) ? +u.orden : i,
      activo: u.activo !== false,
    }));

    // Construye lanes sencillos a partir de la grid meta
    const lanes = ubicaciones.map((u, idx) => {
      const { r, c } = indexToRowCol(idx, ubicaciones.length, cols, orden);
      return {
        id: idx + 1,                 // id secuencial para el layout
        codigo: u.label,             // visible
        name: u.label,               // visible
        r, c,                        // posición en grid
        color: null,                 // opcional (no usamos color ahora)
        ubicacion_id: u.id,          // referencia real
      };
    });

    // Paquetes PENDIENTES agrupados por ubicacion_id
    const packagesByUbicacion = {};
    const packagesByLane = {};
    if (ubicaciones.length) {
      const { data: pkgs, error: pErr } = await supabase
        .from('packages')
        .select('id, ubicacion_id, nombre_cliente, empresa_transporte, fecha_llegada, entregado')
        .eq('tenant_id', tenantId)
        .eq('entregado', false);
      if (pErr) throw pErr;

      const byUbiIdx = new Map(ubicaciones.map((u, idx) => [u.id, idx + 1])); // laneId = idx+1

      (pkgs || []).forEach((p) => {
        const uId = p.ubicacion_id;
        if (!uId) return;
        (packagesByUbicacion[uId] ||= []).push(p);

        const laneId = byUbiIdx.get(uId);
        if (laneId) {
          (packagesByLane[laneId] ||= []).push({
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

    // Compat: algunas vistas legacy esperan `packagesByBalda`
    const packagesByBalda = packagesByUbicacion;

    return res.json({
      mode: 'lanes',
      meta: { cols, orden },
      lanes,
      racks: [],
      packagesByLane,
      packagesByUbicacion,
      packagesByBalda, // compat
    });
  } catch (error) {
    console.error('[obtenerEstructura] Error:', error);
    res.status(500).json({ error: 'Error al obtener estructura del almacén' });
  }
};

/* ────────────────────────────────────────────────────────────── */
/* POST /api/estantes/estructura                                  */
/* Guarda ubicaciones + meta.                                      */
/* body: { ubicaciones:[{label,orden,activo?}], meta:{cols,order}, */
/*         sync?:boolean }                                         */
/* ────────────────────────────────────────────────────────────── */
exports.guardarEstructura = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const metaIn = req.body?.meta || {};
    const rowsIn = Array.isArray(req.body?.ubicaciones) ? req.body.ubicaciones : [];
    const sync = req.body?.sync !== false; // por defecto true

    if (!rowsIn.length) {
      return res.status(400).json({ error: 'Payload inválido: ubicaciones vacío' });
    }

    // 1) Guardar meta (cols + orden)
    try {
      const mCols = Math.min(12, Math.max(1, parseInt(metaIn.cols ?? 5, 10) || 5));
      const mOrden = metaIn.order === 'vertical' ? 'vertical' : 'horizontal';

      await supabase
        .from('ubicaciones_meta')
        .upsert({ tenant_id: tenantId, cols: mCols, orden: mOrden }, { onConflict: 'tenant_id' });
    } catch (e) {
      console.warn('[estantes.guardarEstructura] meta warn:', e?.message);
    }

    // 2) Normalizar filas
    const nowRows = rowsIn.map((u, i) => ({
      tenant_id: tenantId,
      label: up(u?.label || `B${i + 1}`),
      orden: Number.isFinite(Number(u?.orden)) ? Number(u.orden) : i,
      activo: typeof u?.activo === 'boolean' ? u.activo : true,
    }));

    // 3) Guardar ubicaciones:
    //    Como no hay unique sobre (tenant_id,label), hacemos "update o insert" por fila.
    for (const r of nowRows) {
      // UPDATE por (tenant_id,label)
      const { data: upd, error: upErr } = await supabase
        .from('ubicaciones')
        .update({ orden: r.orden, activo: r.activo, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('label', r.label)
        .select('id')
        .maybeSingle();

      if (upErr) throw upErr;

      if (!upd?.id) {
        // INSERT si no existía
        const { error: insErr } = await supabase
          .from('ubicaciones')
          .insert({
            tenant_id: tenantId,
            label: r.label,
            orden: r.orden,
            activo: r.activo,
          });
        if (insErr) throw insErr;
      }
    }

    // 4) Sync opcional: eliminar ubicaciones que no vienen (si NO tienen paquetes)
    if (sync) {
      const keep = new Set(nowRows.map(r => r.label));
      const { data: existentes, error: exErr } = await supabase
        .from('ubicaciones')
        .select('id, label')
        .eq('tenant_id', tenantId);
      if (exErr) throw exErr;

      for (const u of (existentes || [])) {
        if (keep.has(up(u.label))) continue;

        // ¿Tiene paquetes?
        const { count, error: cErr } = await supabase
          .from('packages')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('ubicacion_id', u.id);
        if (cErr) throw cErr;

        if ((count || 0) === 0) {
          // eliminar segura
          const { error: delErr } = await supabase
            .from('ubicaciones')
            .delete()
            .eq('id', u.id)
            .eq('tenant_id', tenantId);
          if (delErr) throw delErr;
        }
      }
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('[guardarEstructura] Error:', error);
    res.status(500).json({ error: 'No se pudo guardar la estructura' });
  }
};

/* ────────────────────────────────────────────────────────────── */
/* POST /api/estantes/carriers                                    */
/* body: { carriers:[{ nombre, ingreso_por_entrega, activo?,      */
/*         color?, notas? }], sync?:boolean }                      */
/* ────────────────────────────────────────────────────────────── */
exports.guardarCarriers = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const { carriers, sync = true } = req.body || {};
    if (!Array.isArray(carriers) || carriers.length === 0) {
      return res.status(400).json({ error: 'Payload inválido: carriers vacío' });
    }

    const rows = carriers
      .map(c => ({
        tenant_id: tenantId,
        nombre: String(c?.nombre || '').trim(),
        ingreso_por_entrega: Number.isFinite(+c?.ingreso_por_entrega) ? +c.ingreso_por_entrega : 0,
        activo: typeof c?.activo === 'boolean' ? c.activo : true,
        color: typeof c?.color === 'string' ? c.color.trim().slice(0, 7) : null, // "#RRGGBB"
        notas: typeof c?.notas === 'string' ? c.notas.trim() : null,
      }))
      .filter(r => !!r.nombre);

    if (!rows.length) return res.status(400).json({ error: 'No hay carriers válidos' });

    const { data: upserted, error: upErr } = await supabase
      .from('empresas_transporte_tenant')
      .upsert(rows, { onConflict: 'tenant_id, nombre' })
      .select('*');
    if (upErr) throw upErr;

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

    res.json({ ok: true, carriers: upserted || [] });
  } catch (error) {
    console.error('[guardarCarriers] Error:', error);
    res.status(500).json({ error: 'No se pudieron guardar los carriers' });
  }
};
