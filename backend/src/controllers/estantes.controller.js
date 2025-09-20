'use strict';
const { supabase } = require('../utils/supabaseClient');

/* ──────────────────────────────────────────────────────────────────── */
/* Helpers                                                             */
/* ──────────────────────────────────────────────────────────────────── */
async function resolveTenantId(req) {
  const direct = req.tenant?.id || req.tenant_id;
  if (direct) return direct;

  const email = String(req.user?.email || '').toLowerCase().trim();
  if (!email) return null;

  const { data, error } = await supabase
    .from('tenants').select('id').ilike('email', email).maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

async function getLayoutMeta(tenantId) {
  try {
    const { data } = await supabase
      .from('layouts_meta')
      .select('mode, rows, cols, payload')
      .eq('org_id', tenantId)
      .maybeSingle();

    if (!data) return { mode: null, rows: 0, cols: 0, payload: null };
    const mode    = data.mode || data?.payload?.layout_mode || null;
    const rows    = data.rows || data?.payload?.grid?.rows || 0;
    const cols    = data.cols || data?.payload?.grid?.cols || 0;
    const payload = data.payload || null;
    return { mode, rows, cols, payload };
  } catch {
    return { mode: null, rows: 0, cols: 0, payload: null };
  }
}

const normHex = (s = '') => {
  const x = String(s).trim().replace(/^#/, '').toUpperCase();
  return /^[0-9A-F]{6}$/.test(x) ? `#${x}` : null;
};

/* ──────────────────────────────────────────────────────────────────── */
/* GET /api/estantes/estructura                                        */
/* Respuesta unificada para lanes o racks.                              */
/* ──────────────────────────────────────────────────────────────────── */
exports.obtenerEstructura = async (req, res) => {
  try {
    const tenantId = (req.tenant && req.tenant.id) || await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    // Lee baldas (sirve para ocupar y para fallbacks)
    const { data: baldasRows, error: eBaldas } = await supabase
      .from('baldas')
      .select('id, estante, balda, codigo')
      .eq('id_negocio', tenantId)
      .order('estante', { ascending: true })
      .order('balda', { ascending: true });
    if (eBaldas) throw eBaldas;
    const baldas = baldasRows || [];

    // 1) META: si hay payload guardado, es la verdad absoluta
    const meta = await getLayoutMeta(tenantId);
    let mode = meta.mode; // 'lanes' | 'racks' | null
    let lanes = [];
    let racks = [];

    if (meta.payload && (Array.isArray(meta.payload.lanes) || Array.isArray(meta.payload.racks))) {
      if ((meta.payload.layout_mode || meta.mode) === 'lanes') {
        const arr = meta.payload.lanes || [];
        lanes = arr.map(l => ({
          id: Number(l.id),
          codigo: String(l.name || l.id),
          name: String(l.name || l.id),
          r: Number(l.position?.row ?? l.row ?? l.r ?? 1) || 1,
          c: Number(l.position?.col ?? l.col ?? l.c ?? 1) || 1,
          color: normHex(l.color || '') || null,
        }))
        .sort((a, b) => (a.r - b.r) || (a.c - b.c) || (a.id - b.id));
        mode = 'lanes';
      } else {
        const arr = meta.payload.racks || [];
        racks = arr.map(r => ({
          estante: Number(r.id),
          nombre: String(r.name || r.id),
          baldas: (Array.isArray(r.shelves) ? r.shelves : [])
            .map(s => ({
              id: null,
              balda: Number(s.index),
              codigo: String(s.name || `${r.name || r.id}${s.index}`),
            }))
            .sort((a, b) => a.balda - b.balda),
        }))
        .sort((a, b) => a.estante - b.estante);
        mode = 'racks';
      }
    }

    // 2) Fallbacks solo si no hay payload válido
    if (lanes.length === 0 && racks.length === 0) {
      // 2.1 Lanes desde tabla 'lanes'
      if (!mode || mode === 'lanes') {
        try {
          const { data: rows, error: eLanes } = await supabase
            .from('lanes')
            .select('lane_id, id, name, color, row, col')
            .eq('tenant_id', tenantId);
          if (eLanes) throw eLanes;
          const lrows = rows || [];
          if (lrows.length) {
            lanes = lrows.map(l => ({
              id: Number(l.lane_id ?? l.id),
              codigo: String(l.name ?? l.lane_id ?? l.id),
              name: String(l.name ?? l.lane_id ?? l.id),
              r: Number(l.row ?? 1) || 1,
              c: Number(l.col ?? 1) || 1,
              color: normHex(l.color || '') || null,
            }))
            .sort((a, b) => (a.r - b.r) || (a.c - b.c) || (a.id - b.id));
          }
        } catch (e) {
          console.warn('[estructura] lanes select fallback:', e?.message || e);
        }

        // 2.2 Fallback 'carriles'
        if (lanes.length === 0) {
          try {
            const { data } = await supabase
              .from('carriles')
              .select('id, codigo, color, fila, columna')
              .eq('tenant_id', tenantId);
            const carr = data || [];
            if (carr.length) {
              lanes = carr.map(r => ({
                id: Number(r.id),
                codigo: r.codigo ?? String(r.id),
                name: r.codigo ?? String(r.id),
                r: Number(r.fila ?? 1) || 1,
                c: Number(r.columna ?? 1) || 1,
                color: normHex(r.color || '') || null,
              }))
              .sort((a, b) => (a.r - b.r) || (a.c - b.c) || (a.id - b.id));
            }
          } catch {}
        }

        // 2.3 Derivar lanes agrupando baldas
        if (lanes.length === 0 && baldas.length > 0) {
          const byEst = new Map();
          baldas.forEach(b => {
            if (!byEst.has(b.estante)) byEst.set(b.estante, []);
            byEst.get(b.estante).push(b);
          });
          lanes = Array.from(byEst.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([est, list], i) => {
              const sample = (list[0]?.codigo || '').trim();
              const pretty = sample || `Carril ${est}`;
              return { id: Number(est), codigo: sample || String(est), name: pretty, r: 1, c: i + 1, color: null };
            });
        }
      }

      // 2.4 Racks desde baldas
      if (!mode || mode === 'racks') {
        const byEstante = new Map();
        baldas.forEach(b => {
          if (!byEstante.has(b.estante)) byEstante.set(b.estante, []);
          byEstante.get(b.estante).push(b);
        });
        racks = Array.from(byEstante.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([est, list]) => ({
            estante: Number(est),
            nombre: String(est),
            baldas: list
              .slice()
              .sort((a, b) => a.balda - b.balda)
              .map(({ id, balda, codigo }) => ({ id, balda, codigo })),
          }));
      }
    }

    // 3) Paquetes pendientes agrupados
    //    a) por balda
    const packagesByBalda = {};
    if (baldas.length > 0) {
      const ids = baldas.map(b => b.id);
      if (ids.length) {
        const { data: pkgsB } = await supabase
          .from('paquetes')
          .select('id, nombre_cliente, empresa_transporte, fecha_llegada, entregado, balda_id')
          .eq('tenant_id', tenantId)
          .eq('entregado', false)
          .in('balda_id', ids);
        (pkgsB || []).forEach(p => {
          if (!p.balda_id) return;
          (packagesByBalda[p.balda_id] ||= []).push(p);
        });
      }
    }
    //    b) por lane (estante de la balda)
    const packagesByLane = {};
    {
      const { data: pkgsL } = await supabase
        .from('paquetes')
        .select('id, nombre_cliente, empresa_transporte, fecha_llegada, entregado, balda_id, baldas (estante)')
        .eq('tenant_id', tenantId)
        .eq('entregado', false);
      (pkgsL || []).forEach(p => {
        const laneId = p?.baldas?.estante;
        if (!laneId) return;
        (packagesByLane[laneId] ||= []).push({
          id: p.id,
          nombre_cliente: p.nombre_cliente,
          empresa_transporte: p.empresa_transporte,
          fecha_llegada: p.fecha_llegada,
          entregado: p.entregado,
          balda_id: p.balda_id,
        });
      });
    }

    // 4) Resolver modo efectivo si no había meta
    if (!mode) mode = lanes.length > 0 ? 'lanes' : 'racks';

    return res.json({
      mode,               // 'lanes' | 'racks'
      lanes,              // [{ id, name, codigo, r, c, color }]
      racks,              // [{ estante, nombre, baldas:[{id, balda, codigo}]}]
      packagesByLane,
      packagesByBalda,
    });
  } catch (error) {
    console.error('[obtenerEstructura] Error:', error);
    res.status(500).json({ error: 'Error al obtener estructura del almacén' });
  }
};

/* ──────────────────────────────────────────────────────────────────── */
/* POST /api/estantes/estructura (upsert de baldas)                    */
/* body: { estantes:[{ estante, baldas:[{balda, codigo},...] }], sync } */
/* ──────────────────────────────────────────────────────────────────── */
exports.guardarEstructura = async (req, res) => {
  try {
    const tenantId = (req.tenant && req.tenant.id) || await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    // Asegura nomenclatura por si esta ruta se usa sin pasar por el front
    const { error: ensureErr } = await supabase.rpc('ensure_nomenclatura_secure_v2', { p_tenant: tenantId });
    if (ensureErr) throw ensureErr;

    const { estantes, sync = true } = req.body || {};
    if (!Array.isArray(estantes) || estantes.length === 0) {
      return res.status(400).json({ error: 'Payload inválido: estantes vacío' });
    }

    const rows = [];
    for (const e of estantes) {
      const nEstante = Number(e?.estante);
      const baldas = Array.isArray(e?.baldas) ? e.baldas : [];
      for (const b of baldas) {
        const nBalda = Number(b?.balda);
        const codigo = String(b?.codigo || '').trim();
        if (!codigo || !Number.isFinite(nEstante) || !Number.isFinite(nBalda)) continue;
        rows.push({ id_negocio: tenantId, estante: nEstante, balda: nBalda, codigo });
      }
    }
    if (rows.length === 0) return res.status(400).json({ error: 'No hay baldas válidas' });

    // upsert por (id_negocio, codigo) para no duplicar códigos (requiere unique)
    const { data: upserted, error: upErr } = await supabase
      .from('baldas')
      .upsert(rows, { onConflict: 'id_negocio, codigo' })
      .select('id, estante, balda, codigo');
    if (upErr) throw upErr;

    if (sync) {
      const keep = new Set(rows.map(r => r.codigo));
      const { data: existentes, error: exErr } = await supabase
        .from('baldas')
        .select('id, codigo')
        .eq('id_negocio', tenantId);
      if (exErr) throw exErr;

      const toDelete = (existentes || []).filter(x => !keep.has(x.codigo)).map(x => x.codigo);
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from('baldas')
          .delete()
          .eq('id_negocio', tenantId)
          .in('codigo', toDelete);
        if (delErr) throw delErr;
      }
    }

    res.json({ ok: true, baldas: upserted || [] });
  } catch (error) {
    console.error('[guardarEstructura] Error:', error);
    res.status(500).json({ error: 'No se pudo guardar la estructura' });
  }
};

/* ──────────────────────────────────────────────────────────────────── */
/* POST /api/estantes/carriers                                         */
/* body: { carriers:[{ nombre, ingreso_por_entrega, activo?, color?,   */
/*         notas? }], sync:true|false }                                 */
/* ──────────────────────────────────────────────────────────────────── */
exports.guardarCarriers = async (req, res) => {
  try {
    const tenantId = (req.tenant && req.tenant.id) || await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const { carriers, sync = true } = req.body || {};
    if (!Array.isArray(carriers) || carriers.length === 0) {
      return res.status(400).json({ error: 'Payload inválido: carriers vacío' });
    }

    const rows = (carriers || [])
      .map(c => ({
        tenant_id: tenantId,
        nombre: String(c?.nombre || '').trim(),
        ingreso_por_entrega: Number.isFinite(+c?.ingreso_por_entrega) ? +c.ingreso_por_entrega : 0,
        activo: typeof c?.activo === 'boolean' ? c.activo : true,
        color: typeof c?.color === 'string' ? c.color.trim().slice(0, 7) : null, // "#RRGGBB"
        notas: typeof c?.notas === 'string' ? c.notas.trim() : null,
      }))
      .filter(r => !!r.nombre);

    if (rows.length === 0) return res.status(400).json({ error: 'No hay carriers válidos' });

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
