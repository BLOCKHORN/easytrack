const { supabase } = require('../utils/supabaseClient');
const { isDirectPg, query } = require('../utils/db');

async function resolveTenantId(req) {
  if (req.tenant_id) return req.tenant_id;
  if (req.tenant?.id) return req.tenant.id;
  const slug = req.params?.tenantSlug || req.params?.slug || null;
  if (slug) {
    if (isDirectPg()) {
      const { rows } = await query('SELECT id FROM public.tenants WHERE slug = $1 LIMIT 1', [slug]);
      return rows[0]?.id || null;
    }
    const { data } = await supabase.from('tenants').select('id').eq('slug', slug).maybeSingle();
    return data?.id || null;
  }
  return null;
}

// ==========================================
// 1. CONFIGURACIÓN (SETTINGS) -> Lee/Escribe de 'tenants'
// ==========================================

async function getFinanceSettings(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    if (isDirectPg()) {
      const { rows } = await query('SELECT goal_annual_eur, currency FROM public.tenants WHERE id = $1 LIMIT 1', [tenantId]);
      return res.json({
        settings: {
          goal_annual_eur: Number(rows[0]?.goal_annual_eur || 0),
          currency: rows[0]?.currency || 'EUR',
        }
      });
    }

    const { data, error } = await supabase
      .from('tenants')
      .select('goal_annual_eur, currency')
      .eq('id', tenantId)
      .maybeSingle();

    if (error) throw error;

    res.json({
      settings: {
        goal_annual_eur: Number(data?.goal_annual_eur || 0),
        currency: data?.currency || 'EUR',
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al leer settings' });
  }
}

async function updateFinanceSettings(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const { goal_annual_eur, currency } = req.body || {};
    const updates = {};

    if (goal_annual_eur !== undefined) {
      const v = Number(goal_annual_eur);
      if (!Number.isFinite(v) || v < 0) return res.status(400).json({ error: 'goal_annual_eur inválido' });
      updates.goal_annual_eur = v;
    }
    if (currency !== undefined) {
      const cur = String(currency || '').trim().toUpperCase() || 'EUR';
      if (cur.length > 8) return res.status(400).json({ error: 'currency inválida' });
      updates.currency = cur;
    }

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Sin cambios' });

    if (isDirectPg()) {
      const fields = [];
      const vals = [];
      let idx = 1;
      if (updates.goal_annual_eur !== undefined) {
        fields.push(`goal_annual_eur = $${idx++}`);
        vals.push(updates.goal_annual_eur);
      }
      if (updates.currency !== undefined) {
        fields.push(`currency = $${idx++}`);
        vals.push(updates.currency);
      }
      vals.push(tenantId);
      const { rows } = await query(`UPDATE public.tenants SET ${fields.join(', ')} WHERE id = $${idx} RETURNING goal_annual_eur, currency`, vals);
      return res.json({
        settings: {
          goal_annual_eur: Number(rows[0]?.goal_annual_eur || 0),
          currency: rows[0]?.currency || 'EUR',
        }
      });
    }

    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', tenantId)
      .select('goal_annual_eur, currency')
      .maybeSingle();

    if (error) throw error;

    res.json({
      settings: {
        goal_annual_eur: Number(data?.goal_annual_eur || 0),
        currency: data?.currency || 'EUR',
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar settings' });
  }
}

// ==========================================
// 2. ESTADÍSTICAS Y MÉTRICAS (RPC)
// ==========================================

async function fetchStats(tenantId) {
  if (isDirectPg()) {
    const { rows } = await query('SELECT * FROM public.get_area_personal_stats($1)', [tenantId]);
    return rows[0]?.get_area_personal_stats || rows[0] || {};
  }
  const { data, error } = await supabase.rpc('get_area_personal_stats', { p_tenant_id: tenantId });
  if (error) throw error;
  return data;
}

async function obtenerResumenEconomico(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const data = await fetchStats(tenantId);
    if (data?.resumen) {
      data.resumen.empresa_top = data.porEmpresa?.[0]?.empresa_transporte || null;
      data.resumen.cliente_top = data.topClientes?.[0]?.nombre_cliente || null;
    }

    res.json({ resumen: data?.resumen || {} });
  } catch (err) {
    console.error('[AreaPersonal] Error:', err);
    res.status(500).json({ error: 'Error al obtener resumen económico' });
  }
}

async function obtenerIngresosMensuales(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    const data = await fetchStats(tenantId);
    res.json({ mensual: data?.mensual || [] });
  } catch(e) { res.json({ mensual: [] }); }
}

async function obtenerIngresosPorEmpresa(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    const data = await fetchStats(tenantId);
    res.json({ porEmpresa: data?.porEmpresa || [] });
  } catch(e) { res.json({ porEmpresa: [] }); }
}

async function obtenerTopClientes(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    const data = await fetchStats(tenantId);
    res.json({ topClientes: data?.topClientes || [] });
  } catch(e) { res.json({ topClientes: [] }); }
}

async function obtenerDiario(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    const data = await fetchStats(tenantId);
    res.json({ diario: data?.diario || [] });
  } catch(e) { res.json({ diario: [] }); }
}

async function obtenerUltimasEntregas(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.json({ ultimas: [] });

    if (isDirectPg()) {
      const { rows } = await query(
        `SELECT nombre_cliente, fecha_llegada, empresa_transporte, ingreso_generado, ubicacion_label, entregado, fecha_entregado
         FROM public.packages
         WHERE tenant_id = $1 AND entregado = true
         ORDER BY fecha_entregado DESC
         LIMIT 10`,
        [tenantId]
      );
      return res.json({ ultimas: rows || [] });
    }

    const { data } = await supabase.from('packages')
      .select('nombre_cliente, fecha_llegada, empresa_transporte, ingreso_generado, ubicacion_label, entregado, fecha_entregado')
      .eq('tenant_id', tenantId).eq('entregado', true)
      .order('fecha_entregado', { ascending: false }).limit(10);
    res.json({ ultimas: data || [] });
  } catch (e) { res.json({ ultimas: [] }); }
}

// ==========================================
// 3. SNAPSHOTS DE FINANZAS
// ==========================================

async function getSnapshots(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    if (isDirectPg()) {
      let sql = 'SELECT id, taken_at, total_ingresos, total_entregas, ingresos_30d, entregas_30d, ticket_medio, empresa_top, empresa_top_share FROM public.area_personal_snapshots WHERE tenant_id = $1';
      const params = [tenantId];
      let pIdx = 2;
      const { from, to } = req.query || {};
      if (from) { sql += ` AND taken_at >= $${pIdx++}`; params.push(from); }
      if (to) { sql += ` AND taken_at <= $${pIdx++}`; params.push(`${to} 23:59:59`); }
      sql += ' ORDER BY taken_at ASC';
      try {
        const { rows } = await query(sql, params);
        return res.json({ snapshots: rows || [] });
      } catch (e) {
        return res.json({ snapshots: [] });
      }
    }

    let q = supabase
      .from('area_personal_snapshots')
      .select('id,taken_at,total_ingresos,total_entregas,ingresos_30d,entregas_30d,ticket_medio,empresa_top,empresa_top_share')
      .eq('tenant_id', tenantId)
      .order('taken_at', { ascending: true });

    const { from, to } = req.query || {};
    if (from) q = q.gte('taken_at', from);
    if (to)   q = q.lte('taken_at', `${to} 23:59:59`);

    const { data, error } = await q;

    if (error && error.code === '42P01') return res.json({ snapshots: [] });
    if (error) throw error;

    res.json({ snapshots: Array.isArray(data) ? data : [] });
  } catch (err) {
    res.status(200).json({ snapshots: [] });
  }
}

async function createSnapshot(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    const userId = req.user?.id || null;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Tenant/usuario no resuelto' });

    let rows = [];
    if (isDirectPg()) {
      const { rows: pRows } = await query(
        'SELECT fecha_llegada, ingreso_generado, empresa_transporte, entregado, fecha_entregado FROM public.packages WHERE tenant_id = $1',
        [tenantId]
      );
      rows = pRows || [];
    } else {
      const { data, error } = await supabase
        .from('packages')
        .select('fecha_llegada, ingreso_generado, empresa_transporte, entregado, fecha_entregado')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      rows = data || [];
    }

    const total_ingresos = rows.reduce((a, p) => a + (Number(p.ingreso_generado) || 0), 0);
    const total_entregas = rows.length;

    const end = new Date(); end.setHours(23,59,59,999);
    const start = new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate() - 29);

    const last30 = rows.filter(r => {
      const d = new Date(r.fecha_llegada);
      return !isNaN(d) && d >= start && d <= end;
    });
    
    const ingresos_30d  = last30.reduce((a,p)=>a+(Number(p.ingreso_generado)||0),0);
    const entregas_30d  = last30.length;
    const ticket_medio  = total_entregas ? total_ingresos / total_entregas : 0;

    const map = last30.reduce((acc, p) => {
      const k = p.empresa_transporte || '—';
      acc[k] = (acc[k] || 0) + (Number(p.ingreso_generado) || 0);
      return acc;
    }, {});
    const ordered = Object.entries(map).sort((a,b)=>b[1]-a[1]);
    const empresa_top = ordered[0]?.[0] || null;
    const topVal = ordered[0]?.[1] || 0;
    const empresa_top_share = ingresos_30d ? topVal / ingresos_30d : null;

    const payload = {
      tenant_id: tenantId,
      user_id: userId,
      taken_at: new Date().toISOString(),
      total_ingresos,
      total_entregas,
      ingresos_30d,
      entregas_30d,
      ticket_medio,
      empresa_top,
      empresa_top_share,
    };

    if (isDirectPg()) {
      try {
        const { rows: ins } = await query(
          `INSERT INTO public.area_personal_snapshots (tenant_id, user_id, taken_at, total_ingresos, total_entregas, ingresos_30d, entregas_30d, ticket_medio, empresa_top, empresa_top_share)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [tenantId, userId, payload.taken_at, total_ingresos, total_entregas, ingresos_30d, entregas_30d, ticket_medio, empresa_top, empresa_top_share]
        );
        return res.json({ snapshot: ins[0] || payload, created: true });
      } catch (insErr) {
        if (insErr.code === '42P01') return res.json({ snapshot: payload, created: false });
        throw insErr;
      }
    }

    const { data: ins, error: insErr } = await supabase
      .from('area_personal_snapshots')
      .insert(payload)
      .select()
      .maybeSingle();

    if (insErr && insErr.code === '42P01') return res.json({ snapshot: payload, created: false });
    if (insErr) throw insErr;

    res.json({ snapshot: ins || payload, created: true });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo crear el snapshot' });
  }
}

module.exports = { 
  getFinanceSettings, 
  updateFinanceSettings,
  obtenerResumenEconomico, 
  obtenerIngresosMensuales, 
  obtenerIngresosPorEmpresa, 
  obtenerTopClientes, 
  obtenerDiario, 
  obtenerUltimasEntregas,
  getSnapshots,
  createSnapshot
};