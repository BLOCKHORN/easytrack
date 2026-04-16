const { supabase } = require('../utils/supabaseClient');

async function resolveTenantId(req) {
  if (req.tenant_id) return req.tenant_id;
  if (req.tenant?.id) return req.tenant.id;
  const slug = req.params?.tenantSlug || req.params?.slug || null;
  if (slug) {
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

async function obtenerResumenEconomico(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const { data, error } = await supabase.rpc('get_area_personal_stats', { p_tenant_id: tenantId });
    if (error) throw error;

    data.resumen.empresa_top = data.porEmpresa?.[0]?.empresa_transporte || null;
    data.resumen.cliente_top = data.topClientes?.[0]?.nombre_cliente || null;

    res.json({ resumen: data.resumen });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener resumen económico' });
  }
}

async function obtenerIngresosMensuales(req, res) {
  const tenantId = await resolveTenantId(req);
  const { data } = await supabase.rpc('get_area_personal_stats', { p_tenant_id: tenantId });
  res.json({ mensual: data?.mensual || [] });
}

async function obtenerIngresosPorEmpresa(req, res) {
  const tenantId = await resolveTenantId(req);
  const { data } = await supabase.rpc('get_area_personal_stats', { p_tenant_id: tenantId });
  res.json({ porEmpresa: data?.porEmpresa || [] });
}

async function obtenerTopClientes(req, res) {
  const tenantId = await resolveTenantId(req);
  const { data } = await supabase.rpc('get_area_personal_stats', { p_tenant_id: tenantId });
  res.json({ topClientes: data?.topClientes || [] });
}

async function obtenerDiario(req, res) {
  const tenantId = await resolveTenantId(req);
  const { data } = await supabase.rpc('get_area_personal_stats', { p_tenant_id: tenantId });
  res.json({ diario: data?.diario || [] });
}

async function obtenerUltimasEntregas(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
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

    const { data: rows, error } = await supabase
      .from('packages')
      .select('fecha_llegada, ingreso_generado, empresa_transporte, entregado, fecha_entregado')
      .eq('tenant_id', tenantId);

    if (error) throw error;

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