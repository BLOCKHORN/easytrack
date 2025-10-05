// backend/src/controllers/areaPersonal.controller.js
const { supabase } = require('../utils/supabaseClient');

/* ───────────────── helpers ───────────────── */
async function resolveTenantId(req) {
  // 1) directo (middleware)
  if (req.tenant_id) return req.tenant_id;
  if (req.tenant?.id) return req.tenant.id;

  // 2) por slug en ruta
  const slug = req.params?.tenantSlug || req.params?.slug || null;
  if (slug) {
    const { data, error } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    return data?.id || null;
  }
  return null;
}

const ymd = (d) => (d instanceof Date ? d : new Date(d))
  .toISOString().slice(0,10);

/* ==================== RESUMEN ==================== */
// KPIs generales (solo tabla NUEVA: packages)
async function obtenerResumenEconomico(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const { data, error } = await supabase
      .from('packages')
      .select('ingreso_generado, fecha_llegada, fecha_entregado, entregado, nombre_cliente, empresa_transporte')
      .eq('tenant_id', tenantId)
      .order('fecha_llegada', { ascending: true });

    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    const hoy = ymd(new Date());

    let totalIngresos = 0;
    let totalEntregas = rows.length;
    let ingresoHoy = 0;
    let recibidosHoy = 0;
    let entregadosHoy = 0;
    let almacenActual = 0;

    const empresaTopMap = {};
    const clienteTopMap = {};

    for (const p of rows) {
      const inc = Number(p.ingreso_generado) || 0;
      totalIngresos += inc;

      const fL = p.fecha_llegada ? ymd(p.fecha_llegada) : null;
      const fE = p.fecha_entregado ? ymd(p.fecha_entregado) : null;

      if (fL === hoy) recibidosHoy++;
      if (p.entregado) {
        if (fE === hoy) { entregadosHoy++; ingresoHoy += inc; }
      } else {
        almacenActual++;
      }

      const empresa = p.empresa_transporte || '—';
      const cliente = p.nombre_cliente || '—';
      empresaTopMap[empresa] = (empresaTopMap[empresa] || 0) + 1;
      clienteTopMap[cliente] = (clienteTopMap[cliente] || 0) + 1;
    }

    const empresa_top = Object.entries(empresaTopMap).sort((a,b)=>b[1]-a[1])[0]?.[0] || null;
    const cliente_top = Object.entries(clienteTopMap).sort((a,b)=>b[1]-a[1])[0]?.[0] || null;

    const primeraEntrega = totalEntregas ? rows[0]?.fecha_llegada : null;
    const ultimaEntrega = totalEntregas ? rows[rows.length - 1]?.fecha_llegada : null;

    res.json({
      resumen: {
        total_ingresos: totalIngresos,
        total_entregas: totalEntregas,
        primera_entrega: primeraEntrega,
        ultima_entrega: ultimaEntrega,
        empresa_top,
        cliente_top,
        ingresoHoy,
        recibidosHoy,
        entregadosHoy,
        almacenActual
      }
    });
  } catch (err) {
    console.error('❌ obtenerResumenEconomico:', err);
    res.status(500).json({ error: 'Error al obtener resumen económico' });
  }
}

/* ==================== MENSUAL (RPC opcional) ==================== */
async function obtenerIngresosMensuales(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    // Si tienes un RPC ya hecho, lo reutilizamos:
    try {
      const rpc = await supabase.rpc('ingresos_mensuales', { tenant_input: tenantId });
      if (rpc.error) throw rpc.error;
      return res.json({ mensual: rpc.data || [] });
    } catch {
      // Fallback en Node (packages)
      const { data: rows, error } = await supabase
        .from('packages')
        .select('fecha_llegada, ingreso_generado')
        .eq('tenant_id', tenantId);
      if (error) throw error;

      const map = new Map(); // "YYYY-MM" -> { mes, total_ingresos, total_entregas }
      for (const r of rows || []) {
        const d = new Date(r.fecha_llegada);
        if (isNaN(d)) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const cur = map.get(key) || { mes: key, total_ingresos: 0, total_entregas: 0 };
        cur.total_ingresos += Number(r.ingreso_generado) || 0;
        cur.total_entregas += 1;
        map.set(key, cur);
      }
      const data = Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes));
      res.json({ mensual: data });
    }
  } catch (err) {
    console.error('❌ obtenerIngresosMensuales:', err);
    res.status(500).json({ error: 'Error al obtener ingresos mensuales' });
  }
}

/* ==================== POR EMPRESA ==================== */
async function obtenerIngresosPorEmpresa(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const { data, error } = await supabase
      .from('packages')
      .select('empresa_transporte, ingreso_generado')
      .eq('tenant_id', tenantId);
    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    const agrupadoObj = rows.reduce((acc, p) => {
      const k = p.empresa_transporte || '—';
      if (!acc[k]) acc[k] = { empresa_transporte: k, total: 0, entregas: 0 };
      acc[k].total += Number(p.ingreso_generado) || 0;
      acc[k].entregas += 1;
      return acc;
    }, {});
    const agrupado = Object.values(agrupadoObj);
    res.json({ porEmpresa: agrupado });
  } catch (err) {
    console.error('❌ obtenerIngresosPorEmpresa:', err);
    res.status(500).json({ error: 'Error al obtener ingresos por empresa' });
  }
}

/* ==================== TOP CLIENTES ==================== */
async function obtenerTopClientes(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const { data, error } = await supabase
      .from('packages')
      .select('nombre_cliente, ingreso_generado')
      .eq('tenant_id', tenantId);
    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    const clientes = Object.values(
      rows.reduce((acc, p) => {
        const k = p.nombre_cliente || '—';
        if (!acc[k]) acc[k] = { nombre_cliente: k, total_entregas: 0, total_ingresos: 0 };
        acc[k].total_entregas += 1;
        acc[k].total_ingresos += Number(p.ingreso_generado) || 0;
        return acc;
      }, {})
    ).sort((a, b) => b.total_ingresos - a.total_ingresos);

    res.json({ topClientes: clientes.slice(0, 10) });
  } catch (err) {
    console.error('❌ obtenerTopClientes:', err);
    res.status(500).json({ error: 'Error al obtener top clientes' });
  }
}

/* ==================== DIARIO ==================== */
// Serie agregada por día (ingresos/entregas) usando fecha_llegada
async function obtenerDiario(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const { data, error } = await supabase
      .from('packages')
      .select('fecha_llegada, ingreso_generado')
      .eq('tenant_id', tenantId);
    if (error) throw error;

    const map = new Map(); // yyyy-mm-dd -> { fecha, ingresos, entregas }
    for (const r of data || []) {
      const d = new Date(r.fecha_llegada);
      if (isNaN(d)) continue;
      const key = ymd(d);
      const cur = map.get(key) || { fecha: key, ingresos: 0, entregas: 0 };
      cur.ingresos += Number(r.ingreso_generado) || 0;
      cur.entregas += 1;
      map.set(key, cur);
    }
    const diario = Array.from(map.values()).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    res.json({ diario });
  } catch (err) {
    console.error('❌ obtenerDiario:', err);
    res.status(500).json({ error: 'Error al obtener diario' });
  }
}

/* ==================== ÚLTIMAS ==================== */
async function obtenerUltimasEntregas(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const { data, error } = await supabase
      .from('packages')
      .select('nombre_cliente, fecha_llegada, empresa_transporte, ingreso_generado, ubicacion_label, entregado')
      .eq('tenant_id', tenantId)
      .order('fecha_llegada', { ascending: false })
      .limit(10);

    if (error) throw error;
    res.json({ ultimas: Array.isArray(data) ? data : [] });
  } catch (err) {
    console.error('❌ obtenerUltimasEntregas:', err);
    res.status(500).json({ error: 'Error al obtener últimas entregas' });
  }
}

module.exports = {
  obtenerResumenEconomico,
  obtenerIngresosMensuales,
  obtenerIngresosPorEmpresa,
  obtenerTopClientes,
  obtenerDiario,
  obtenerUltimasEntregas,
};
