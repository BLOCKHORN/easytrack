'use strict';

const { supabase } = require('../utils/supabaseClient');
const { computeEntitlements } = require('../utils/entitlements');
const { fetchSubscriptionForTenant } = require('../utils/subscription');
const { pool, isDirectPg, query } = require('../utils/db');

const up = (s = '') => String(s || '').trim().toUpperCase();

async function resolveTenantId(req) {
  // Prioridad 1: Resuelto por Middleware (URL Slug)
  if (req.tenant?.id) return String(req.tenant.id);
  if (req.tenantId) return String(req.tenantId);

  // Prioridad 2: Query Params (tenant_id o tenantId)
  const qId = req.query?.tenant_id || req.query?.tenantId;
  if (qId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(qId)) {
    return String(qId);
  }

  return null;
}

async function getEmpresaId(tenantId, nombre) {
  if (isDirectPg()) {
    try {
      const { rows } = await query('SELECT id FROM public.empresas_transporte_tenant WHERE tenant_id = $1 AND nombre = $2 LIMIT 1', [tenantId, nombre]);
      return rows[0]?.id || null;
    } catch (e) {
      console.error('[getEmpresaId directPg error]', e);
    }
  }
  const { data } = await supabase.from('empresas_transporte_tenant').select('id').eq('tenant_id', tenantId).eq('nombre', nombre).maybeSingle();
  return data?.id || null;
}

async function getTarifaPorEmpresaId(empresaId) {
  if (!empresaId) return 0;
  if (isDirectPg()) {
    try {
      const { rows } = await query('SELECT ingreso_por_entrega FROM public.empresas_transporte_tenant WHERE id = $1 LIMIT 1', [empresaId]);
      return Number(rows[0]?.ingreso_por_entrega || 0);
    } catch (e) {
      console.error('[getTarifa directPg error]', e);
    }
  }
  const { data } = await supabase.from('empresas_transporte_tenant').select('ingreso_por_entrega').eq('id', empresaId).maybeSingle();
  return Number(data?.ingreso_por_entrega || 0);
}

async function resolveUbiIdByLabel(tenantId, label) {
  if (isDirectPg()) {
    try {
      const { rows } = await query('SELECT id FROM public.ubicaciones WHERE tenant_id = $1 AND label = $2 LIMIT 1', [tenantId, up(label)]);
      return rows[0]?.id || null;
    } catch (e) {
      console.error('[resolveUbiId directPg error]', e);
    }
  }
  const { data } = await supabase.from('ubicaciones').select('id').eq('tenant_id', tenantId).eq('label', up(label)).maybeSingle();
  return data?.id || null;
}

async function ensureUbiBelongsToTenant(tenantId, ubiId) {
  if (isDirectPg()) {
    try {
      const { rows } = await query('SELECT id FROM public.ubicaciones WHERE tenant_id = $1 AND id = $2 LIMIT 1', [tenantId, ubiId]);
      return rows.length > 0;
    } catch (e) {
      console.error('[ensureUbiBelongs directPg error]', e);
    }
  }
  const { data } = await supabase.from('ubicaciones').select('id').eq('tenant_id', tenantId).eq('id', ubiId).maybeSingle();
  return !!data?.id;
}

function applyCommonFilters(qb, { estado, compania, ubicacion, search }) {
  if (estado === 'pendiente') qb = qb.eq('entregado', false);
  else if (estado === 'entregado') qb = qb.eq('entregado', true);
  
  if (compania && compania !== 'todos') qb = qb.eq('empresa_transporte', compania);
  if (ubicacion && ubicacion !== 'todas') qb = qb.eq('ubicacion_label', up(ubicacion));
  
  if (search && search.trim()) {
    const s = search.trim();
    qb = qb.or(`nombre_cliente.ilike.%${s}%,empresa_transporte.ilike.%${s}%,telefono.ilike.%${s}%`);
  }
  
  return qb;
}

exports.listarPaquetes = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    console.log('[DEBUG] listarPaquetes resolved tenantId:', tenantId);
    if (!tenantId) return res.status(403).json({ error: 'No autorizado' });
    
    const { limit, offset, all, estado, compania, ubicacion, search, order = 'fecha_llegada', dir = 'desc' } = req.query || {};
    if (isDirectPg()) {
      let sql = `
        SELECT id, tenant_id, nombre_cliente, empresa_transporte, empresa_id, 
               fecha_llegada, entregado, fecha_entregado, ingreso_generado, 
               ubicacion_id, ubicacion_label, telefono, created_at, updated_at
        FROM public.packages
        WHERE tenant_id = $1
      `;
      const params = [tenantId];
      let pIdx = 2;

      if (estado === 'pendiente') {
        sql += ` AND entregado = false`;
      } else if (estado === 'entregado') {
        sql += ` AND entregado = true`;
      }

      if (compania && compania !== 'todos') {
        sql += ` AND empresa_transporte = $${pIdx++}`;
        params.push(compania);
      }

      if (ubicacion && ubicacion !== 'todas') {
        sql += ` AND ubicacion_label = $${pIdx++}`;
        params.push(up(ubicacion));
      }

      if (search && search.trim()) {
        sql += ` AND (nombre_cliente ILIKE $${pIdx} OR empresa_transporte ILIKE $${pIdx} OR telefono ILIKE $${pIdx})`;
        params.push(`%${search.trim()}%`);
        pIdx++;
      }

      const validOrders = ['fecha_llegada', 'nombre_cliente', 'empresa_transporte', 'ubicacion_label', 'created_at', 'updated_at'];
      const safeOrder = validOrders.includes(order) ? order : 'fecha_llegada';
      const safeDir = String(dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      sql += ` ORDER BY ${safeOrder} ${safeDir}`;

      if (String(all) !== '1') {
        const lim = Math.max(1, Math.min(1000, Number(limit ?? 50)));
        const off = Math.max(0, Number(offset ?? 0));
        sql += ` LIMIT $${pIdx++} OFFSET $${pIdx++}`;
        params.push(lim, off);
      } else {
        sql += ` LIMIT 50000`;
      }

      const { rows } = await query(sql, params);
      return res.json({ paquetes: rows || [] });
    }

    const cols = `id, tenant_id, nombre_cliente, empresa_transporte, empresa_id, fecha_llegada, entregado, fecha_entregado, ingreso_generado, ubicacion_id, ubicacion_label, telefono`;
    
    let qb = supabase.from('packages').select(cols).eq('tenant_id', tenantId);
    qb = applyCommonFilters(qb, { estado, compania, ubicacion, search });
    qb = qb.order(order, { ascending: String(dir).toLowerCase() === 'asc' });

    if (String(all) === '1') {
      qb = qb.limit(50000);
    } else {
      const lim = Number(limit ?? 50);
      const off = Number(offset ?? 0);
      qb = qb.range(off, off + lim - 1);
    }

    const { data, error } = await qb;
    if (error) throw error;
    
    return res.json({ paquetes: data || [] });
  } catch (err) {
    console.error('[listarPaquetes Error]', err);
    return res.status(500).json({ error: 'Error al listar paquetes' });
  }
};

exports.contarPaquetes = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'No autorizado' });
    
    const { estado, compania, ubicacion, search } = req.query || {};

    if (isDirectPg()) {
      const { rows } = await query(
        'SELECT * FROM public.contar_kpis_paquetes($1, $2, $3, $4, $5)',
        [tenantId, estado || null, compania || null, ubicacion || null, search ? search.trim() : null]
      );
      const kpis = rows[0]?.contar_kpis_paquetes || rows[0] || { total: 0, entregados: 0, pendientes: 0 };
      return res.json(kpis);
    }

    const { data, error } = await supabase.rpc('contar_kpis_paquetes', {
      p_tenant_id: tenantId,
      p_estado: estado || null,
      p_compania: compania || null,
      p_ubicacion: ubicacion || null,
      p_search: search ? search.trim() : null
    });

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('[contarPaquetes Error]', err);
    return res.status(500).json({ error: 'Error al contar paquetes' });
  }
};

exports.crearPaquete = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'No autorizado' });

    const { nombre_cliente, empresa_transporte, ubicacion_id, ubicacion_label, balda_id, compartimento, telefono } = req.body || {};

    if (isDirectPg()) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const tRes = await client.query('SELECT * FROM public.tenants WHERE id = $1 FOR UPDATE LIMIT 1', [tenantId]);
        if (tRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Tenant no encontrado' });
        }
        const tenantData = tRes.rows[0];

        const subscription = await fetchSubscriptionForTenant(tenantId);
        const entitlements = computeEntitlements({ tenant: tenantData, subscription });

        if (!entitlements.canCreatePackage) {
          await client.query('ROLLBACK');
          return res.status(403).json({ ok: false, error: 'LIMIT_EXCEEDED', message: 'Límite de paquetes alcanzado.', entitlements });
        }

        if (!empresa_transporte) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Falta empresa_transporte' });
        }

        const empRes = await client.query(
          'SELECT id FROM public.empresas_transporte_tenant WHERE tenant_id = $1 AND nombre = $2 LIMIT 1',
          [tenantId, empresa_transporte]
        );
        const empresaId = empRes.rows[0]?.id;
        if (!empresaId) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Empresa no encontrada en la configuración del local.' });
        }

        let finalUbiId = ubicacion_id || balda_id || null;
        let finalUbiLabel = ubicacion_label || compartimento || null;

        if (finalUbiId) {
          const uCheck = await client.query('SELECT id, label FROM public.ubicaciones WHERE tenant_id = $1 AND id = $2 LIMIT 1', [tenantId, finalUbiId]);
          if (uCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Ubicación ajena al local.' });
          }
          if (!finalUbiLabel) finalUbiLabel = up(uCheck.rows[0].label);
        } else if (finalUbiLabel) {
          finalUbiLabel = up(finalUbiLabel);
          const uCheck = await client.query('SELECT id FROM public.ubicaciones WHERE tenant_id = $1 AND label = $2 LIMIT 1', [tenantId, finalUbiLabel]);
          if (uCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `No existe la ubicación ${finalUbiLabel}` });
          }
          finalUbiId = uCheck.rows[0].id;
        } else {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Ubicación no especificada.' });
        }

        const insRes = await client.query(`
          INSERT INTO public.packages (
            tenant_id, empresa_id, nombre_cliente, empresa_transporte,
            ubicacion_id, ubicacion_label, entregado, telefono, fecha_llegada, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, false, $7, NOW(), NOW(), NOW())
          RETURNING *
        `, [tenantId, empresaId, up(nombre_cliente), empresa_transporte, finalUbiId, finalUbiLabel, telefono ? String(telefono).trim() : null]);

        if (!entitlements.features.unlimitedPackages) {
          await client.query('UPDATE public.tenants SET trial_used = COALESCE(trial_used, 0) + 1 WHERE id = $1', [tenantId]);
        }

        await client.query('COMMIT');
        return res.json({ paquete: insRes.rows[0] });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const { data: tenantData, error: tErr } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
    if (tErr || !tenantData) return res.status(404).json({ error: 'Tenant no encontrado' });

    const subscription = await fetchSubscriptionForTenant(tenantId);
    const entitlements = computeEntitlements({ tenant: tenantData, subscription });

    if (!entitlements.canCreatePackage) {
      return res.status(403).json({ ok: false, error: 'LIMIT_EXCEEDED', message: 'Límite de paquetes alcanzado.', entitlements });
    }

    if (!empresa_transporte) return res.status(400).json({ error: 'Falta empresa_transporte' });
    
    const empresaId = await getEmpresaId(tenantId, empresa_transporte);
    if (!empresaId) return res.status(400).json({ error: 'Empresa no encontrada en la configuración del local.' });

    let finalUbiId = ubicacion_id || balda_id || null;
    let finalUbiLabel = ubicacion_label || compartimento || null;

    if (finalUbiId) {
      if (!(await ensureUbiBelongsToTenant(tenantId, finalUbiId))) return res.status(400).json({ error: 'Ubicación ajena al local.' });
    } else if (finalUbiLabel) {
      finalUbiLabel = up(finalUbiLabel);
      finalUbiId = await resolveUbiIdByLabel(tenantId, finalUbiLabel);
      if (!finalUbiId) return res.status(400).json({ error: `No existe la ubicación ${finalUbiLabel}` });
    } else {
      return res.status(400).json({ error: 'Ubicación no especificada.' });
    }

    if (!finalUbiLabel) {
      const { data: u } = await supabase.from('ubicaciones').select('label').eq('id', finalUbiId).maybeSingle();
      finalUbiLabel = up(u?.label || '');
    }

    const { data, error } = await supabase.from('packages').insert({
      tenant_id: tenantId, 
      empresa_id: empresaId, 
      nombre_cliente: up(nombre_cliente),
      empresa_transporte, 
      ubicacion_id: finalUbiId, 
      ubicacion_label: finalUbiLabel, 
      entregado: false,
      telefono: telefono ? String(telefono).trim() : null
    }).select().single();

    if (error) throw error;

    if (!entitlements.features.unlimitedPackages) {
      await supabase.from('tenants').update({ trial_used: (tenantData.trial_used || 0) + 1 }).eq('id', tenantId);
    }

    return res.json({ paquete: data });
  } catch (err) {
    console.error('[crearPaquete Error]', err);
    return res.status(500).json({ error: 'Error interno al crear paquete' });
  }
};

exports.entregarPaquete = async (req, res) => {
  try {
    const id = req.params.id;
    const tenantId = await resolveTenantId(req);
    if (!id || !tenantId) return res.status(400).json({ error: 'Faltan parámetros' });

    if (isDirectPg()) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const pkgRes = await client.query(
          'SELECT * FROM public.packages WHERE id = $1 AND tenant_id = $2 FOR UPDATE LIMIT 1',
          [id, tenantId]
        );
        if (pkgRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Paquete no encontrado' });
        }
        const pkg = pkgRes.rows[0];

        let ingreso = Number(pkg.ingreso_generado || 0);
        if (ingreso <= 0 && pkg.empresa_id) {
          const empRes = await client.query('SELECT ingreso_por_entrega FROM public.empresas_transporte_tenant WHERE id = $1 LIMIT 1', [pkg.empresa_id]);
          ingreso = Number(empRes.rows[0]?.ingreso_por_entrega || 0);
        }

        const updRes = await client.query(`
          UPDATE public.packages
          SET entregado = true, ingreso_generado = $1, fecha_entregado = NOW(), updated_at = NOW()
          WHERE id = $2 AND tenant_id = $3
          RETURNING *
        `, [ingreso, id, tenantId]);

        await client.query('COMMIT');
        return res.json({ ok: true, paquete: updRes.rows[0] });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const { data: pkg, error: e1 } = await supabase.from('packages').select('*').eq('id', id).eq('tenant_id', tenantId).maybeSingle();
    if (e1 || !pkg) return res.status(404).json({ error: 'Paquete no encontrado' });

    let ingreso = Number(pkg.ingreso_generado || 0);
    if (ingreso <= 0) ingreso = await getTarifaPorEmpresaId(pkg.empresa_id);

    const { data, error: e2 } = await supabase.from('packages').update({
      entregado: true, ingreso_generado: ingreso, fecha_entregado: new Date().toISOString()
    }).eq('id', id).select().single();

    if (e2) throw e2;
    return res.json({ ok: true, paquete: data });
  } catch (err) {
    console.error('[entregarPaquete Error]', err);
    return res.status(500).json({ error: 'Error al entregar paquete' });
  }
};

exports.editarPaquete = async (req, res) => {
  try {
    const id = req.params.id || req.body?.id;
    const tenantId = await resolveTenantId(req);
    if (!id || !tenantId) return res.status(400).json({ error: 'Faltan parámetros' });

    if (isDirectPg()) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const pkgRes = await client.query(
          'SELECT * FROM public.packages WHERE id = $1 AND tenant_id = $2 FOR UPDATE LIMIT 1',
          [id, tenantId]
        );
        if (pkgRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Paquete no encontrado' });
        }

        const currentPkg = pkgRes.rows[0];
        let nUbiId = req.body.ubicacion_id !== undefined ? req.body.ubicacion_id : currentPkg.ubicacion_id;
        let nUbiLabel = req.body.ubicacion_label !== undefined ? req.body.ubicacion_label : currentPkg.ubicacion_label;

        if (req.body.ubicacion_id) {
          const uCheck = await client.query('SELECT id, label FROM public.ubicaciones WHERE tenant_id = $1 AND id = $2 LIMIT 1', [tenantId, req.body.ubicacion_id]);
          if (uCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Ubicación inválida' });
          }
          nUbiId = uCheck.rows[0].id;
          if (req.body.ubicacion_label === undefined) nUbiLabel = uCheck.rows[0].label;
        } else if (req.body.ubicacion_label) {
          const cleanLabel = up(req.body.ubicacion_label);
          const uCheck = await client.query('SELECT id FROM public.ubicaciones WHERE tenant_id = $1 AND label = $2 LIMIT 1', [tenantId, cleanLabel]);
          if (uCheck.rows.length > 0) {
            nUbiId = uCheck.rows[0].id;
            nUbiLabel = cleanLabel;
          }
        }

        const nombre = req.body.nombre_cliente != null ? up(req.body.nombre_cliente) : currentPkg.nombre_cliente;
        const empresa = req.body.empresa_transporte != null ? req.body.empresa_transporte : currentPkg.empresa_transporte;
        const telefono = req.body.telefono !== undefined ? (req.body.telefono ? String(req.body.telefono).trim() : null) : currentPkg.telefono;
        const entregado = req.body.entregado !== undefined ? !!req.body.entregado : currentPkg.entregado;
        const fechaEntregado = req.body.fecha_entregado !== undefined ? req.body.fecha_entregado : currentPkg.fecha_entregado;

        const updRes = await client.query(`
          UPDATE public.packages
          SET nombre_cliente = $1, empresa_transporte = $2, telefono = $3,
              ubicacion_id = $4, ubicacion_label = $5, entregado = $6,
              fecha_entregado = $7, updated_at = NOW()
          WHERE id = $8 AND tenant_id = $9
          RETURNING *
        `, [nombre, empresa, telefono, nUbiId, nUbiLabel, entregado, fechaEntregado, id, tenantId]);

        await client.query('COMMIT');
        return res.json({ paquete: updRes.rows[0] });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const patch = {};
    if (req.body.nombre_cliente != null) patch.nombre_cliente = up(req.body.nombre_cliente);
    if (req.body.empresa_transporte != null) patch.empresa_transporte = req.body.empresa_transporte;
    if (req.body.telefono !== undefined) patch.telefono = req.body.telefono ? String(req.body.telefono).trim() : null;
    if (req.body.entregado !== undefined) patch.entregado = !!req.body.entregado;
    if (req.body.fecha_entregado !== undefined) patch.fecha_entregado = req.body.fecha_entregado;
    
    let nUbiId = req.body.ubicacion_id;
    let nUbiLabel = req.body.ubicacion_label;

    if (nUbiId) {
      if (!(await ensureUbiBelongsToTenant(tenantId, nUbiId))) return res.status(400).json({ error: 'Ubicación inválida' });
    } else if (nUbiLabel) {
      nUbiLabel = up(nUbiLabel);
      nUbiId = await resolveUbiIdByLabel(tenantId, nUbiLabel);
    }

    if (nUbiId) {
      patch.ubicacion_id = nUbiId;
      patch.ubicacion_label = nUbiLabel || null;
    }

    const { data, error } = await supabase.from('packages').update(patch).eq('id', id).eq('tenant_id', tenantId).select().single();
    if (error) throw error;
    return res.json({ paquete: data });
  } catch (err) {
    console.error('[editarPaquete Error]', err);
    return res.status(500).json({ error: 'Error al editar paquete' });
  }
};

exports.eliminarPaquete = async (req, res) => {
  try {
    const id = req.params.id;
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'No autorizado' });

    if (isDirectPg()) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const delRes = await client.query('DELETE FROM public.packages WHERE id = $1 AND tenant_id = $2 RETURNING id', [id, tenantId]);
        if (delRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'No encontrado' });
        }
        await client.query('COMMIT');
        return res.json({ ok: true });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const { data, error } = await supabase.from('packages').delete().eq('id', id).eq('tenant_id', tenantId).select('id').single();
    if (error || !data) return res.status(404).json({ error: 'No encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[eliminarPaquete Error]', err);
    return res.status(500).json({ error: 'Error al eliminar paquete' });
  }
};

exports.obtenerRecientes = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'No autorizado' });

    if (isDirectPg()) {
      const { rows } = await query(
        'SELECT * FROM public.packages WHERE tenant_id = $1 ORDER BY COALESCE(updated_at, fecha_llegada, NOW()) DESC LIMIT 6',
        [tenantId]
      );
      return res.json({ paquetes: rows });
    }

    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .limit(6);

    if (error) throw error;
    return res.json({ paquetes: data || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener paquetes recientes' });
  }
};

exports.obtenerOcupadas = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'No autorizado' });

    if (isDirectPg()) {
      const { rows } = await query(
        'SELECT ubicacion_label FROM public.packages WHERE tenant_id = $1 AND entregado = false AND ubicacion_label IS NOT NULL',
        [tenantId]
      );
      return res.json({ ocupadas: rows.map(p => p.ubicacion_label), data: rows });
    }

    const { data, error } = await supabase
      .from('packages')
      .select('ubicacion_label')
      .eq('tenant_id', tenantId)
      .eq('entregado', false)
      .not('ubicacion_label', 'is', null);

    if (error) throw error;
    return res.json({ ocupadas: (data || []).map(p => p.ubicacion_label), data: data || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener ubicaciones ocupadas' });
  }
};