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

// Un solo endpoint para succionar TODO en una sola petición a Supabase (0.01 segundos)
async function obtenerResumenEconomico(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    // Llamamos al cerebro RPC de Postgres
    const { data, error } = await supabase.rpc('get_area_personal_stats', { p_tenant_id: tenantId });
    if (error) throw error;

    // Asignamos los líderes (Postgres no lo extraía como campo suelto)
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

module.exports = { obtenerResumenEconomico, obtenerIngresosMensuales, obtenerIngresosPorEmpresa, obtenerTopClientes, obtenerDiario, obtenerUltimasEntregas };