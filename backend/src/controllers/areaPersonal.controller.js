// backend/src/controllers/areaPersonal.controller.js
const { supabase } = require('../utils/supabaseClient');

/* ==================== RESUMEN ==================== */
async function obtenerResumenEconomico(req, res) {
  try {
    const tenantId = req.tenant_id || req.tenant?.id || req.params?.tenantSlug || null;
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const { data, error } = await supabase
      .from('paquetes')
      .select('ingreso_generado, fecha_llegada, nombre_cliente, empresa_transporte')
      .eq('tenant_id', tenantId)
      .order('fecha_llegada', { ascending: true });

    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];

    const totalIngresos = rows.reduce((acc, p) => acc + (Number(p.ingreso_generado) || 0), 0);
    const totalEntregas = rows.length;
    const primeraEntrega = totalEntregas ? rows[0].fecha_llegada : null;
    const ultimaEntrega = totalEntregas ? rows[totalEntregas - 1].fecha_llegada : null;

    const empresaTopMap = rows.reduce((acc, p) => {
      const k = p.empresa_transporte || '—';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    const empresa_top = Object.entries(empresaTopMap).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const clienteTopMap = rows.reduce((acc, p) => {
      const k = p.nombre_cliente || '—';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    const cliente_top = Object.entries(clienteTopMap).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    res.json({
      resumen: {
        total_ingresos: totalIngresos,
        total_entregas: totalEntregas,
        primera_entrega: primeraEntrega,
        ultima_entrega: ultimaEntrega,
        empresa_top,
        cliente_top
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
    const tenantId = req.tenant_id || req.tenant?.id || req.params?.tenantSlug || null;
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    let data = null;
    try {
      const rpc = await supabase.rpc('ingresos_mensuales', { tenant_input: tenantId });
      if (rpc.error) throw rpc.error;
      data = rpc.data || [];
    } catch {
      // Fallback si no existe el RPC: agregamos en Node
      const { data: rows, error } = await supabase
        .from('paquetes')
        .select('fecha_llegada, ingreso_generado, tenant_id')
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
      data = Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes));
    }

    res.json({ mensual: data });
  } catch (err) {
    console.error('❌ obtenerIngresosMensuales:', err);
    res.status(500).json({ error: 'Error al obtener ingresos mensuales' });
  }
}

/* ==================== POR EMPRESA ==================== */
async function obtenerIngresosPorEmpresa(req, res) {
  try {
    const tenantId = req.tenant_id || req.tenant?.id || req.params?.tenantSlug || null;
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const { data, error } = await supabase
      .from('paquetes')
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
    const tenantId = req.tenant_id || req.tenant?.id || req.params?.tenantSlug || null;
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const { data, error } = await supabase
      .from('paquetes')
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

/* ==================== DIARIO (últimos N días agregados) ==================== */
async function obtenerDiario(req, res) {
  try {
    const tenantId = req.tenant_id || req.tenant?.id || req.params?.tenantSlug || null;
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const { data, error } = await supabase
      .from('paquetes')
      .select('fecha_llegada, ingreso_generado')
      .eq('tenant_id', tenantId);

    if (error) throw error;

    const map = new Map(); // yyyy-mm-dd -> { fecha, ingresos, entregas }
    for (const r of data || []) {
      const d = new Date(r.fecha_llegada);
      if (isNaN(d)) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

/* ==================== ÚLTIMAS ENTREGAS ==================== */
async function obtenerUltimasEntregas(req, res) {
  try {
    const tenantId = req.tenant_id || req.tenant?.id || req.params?.tenantSlug || null;
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const { data, error } = await supabase
      .from('paquetes')
      .select('nombre_cliente, fecha_llegada, empresa_transporte, ingreso_generado')
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
