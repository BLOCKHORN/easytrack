// backend/src/controllers/areaPersonal.controller.js
const { supabase } = require('../utils/supabaseClient');

/* ───────────────── helpers ───────────────── */
async function resolveTenantId(req) {
  if (req.tenant_id) return req.tenant_id;
  if (req.tenant?.id) return req.tenant.id;

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

// Formateo LOCAL (sin UTC)
const ymd = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

/* ==================== RESUMEN ==================== */
// Ingresos y entregas SOLO por paquetes entregados (cobrados).
// Contadores "hoy": recibidosHoy por fecha_llegada; entregados/ingresoHoy por fecha_entregado (con fallback).
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
    let totalEntregas = 0;
    let ingresoHoy = 0;
    let recibidosHoy = 0;
    let entregadosHoy = 0;
    let almacenActual = 0;

    const empresaTopMap = {};
    const clienteTopMap = {};

    for (const p of rows) {
      const inc = Number(p.ingreso_generado) || 0;

      const fL = p.fecha_llegada ? ymd(p.fecha_llegada) : null;
      // Fallback: si está entregado pero falta fecha_entregado, usamos llegada
      const entregaDate =
        p.entregado && (p.fecha_entregado || p.fecha_llegada)
          ? new Date(p.fecha_entregado || p.fecha_llegada)
          : null;
      const fE = entregaDate ? ymd(entregaDate) : null;

      if (fL === hoy) recibidosHoy++;

      if (p.entregado) {
        totalIngresos += inc;
        totalEntregas += 1;
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

    // Rango cronológico informativo por llegada
    const primeraEntrega = rows.length ? rows[0]?.fecha_llegada : null;
    const ultimaEntrega  = rows.length ? rows[rows.length - 1]?.fecha_llegada : null;

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
// Agrega por mes natural de ENTREGA. Si falta fecha_entregado pero está entregado, usa fecha_llegada.
async function obtenerIngresosMensuales(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    try {
      const rpc = await supabase.rpc('ingresos_mensuales', { tenant_input: tenantId });
      if (rpc.error) throw rpc.error;
      return res.json({ mensual: rpc.data || [] });
    } catch {
      const { data: rows, error } = await supabase
        .from('packages')
        .select('fecha_entregado, fecha_llegada, entregado, ingreso_generado')
        .eq('tenant_id', tenantId);
      if (error) throw error;

      const map = new Map();
      for (const r of rows || []) {
        if (!r.entregado) continue;
        const dateSrc = r.fecha_entregado || r.fecha_llegada; // fallback
        const d = dateSrc ? new Date(dateSrc) : null;
        if (!d || isNaN(d)) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const cur = map.get(key) || { mes: key, total_ingresos: 0, total_entregas: 0 };
        cur.total_ingresos += Number(r.ingreso_generado) || 0;
        cur.total_entregas += 1;
        map.set(key, cur);
      }
      res.json({ mensual: Array.from(map.values()).sort((a,b)=>a.mes.localeCompare(b.mes)) });
    }
  } catch (err) {
    console.error('❌ obtenerIngresosMensuales:', err);
    res.status(500).json({ error: 'Error al obtener ingresos mensuales' });
  }
}

/* ==================== POR EMPRESA ==================== */
// Solo ingresos/entregas de paquetes entregados (cobrados)
async function obtenerIngresosPorEmpresa(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const { data, error } = await supabase
      .from('packages')
      .select('empresa_transporte, ingreso_generado, entregado')
      .eq('tenant_id', tenantId);
    if (error) throw error;

    const agrupadoObj = {};
    for (const p of data || []) {
      const k = p.empresa_transporte || '—';
      if (!agrupadoObj[k]) agrupadoObj[k] = { empresa_transporte: k, total: 0, entregas: 0 };
      if (p.entregado) {
        agrupadoObj[k].total += Number(p.ingreso_generado) || 0;
        agrupadoObj[k].entregas += 1;
      }
    }
    res.json({ porEmpresa: Object.values(agrupadoObj) });
  } catch (err) {
    console.error('❌ obtenerIngresosPorEmpresa:', err);
    res.status(500).json({ error: 'Error al obtener ingresos por empresa' });
  }
}

/* ==================== TOP CLIENTES ==================== */
// Solo entregados
async function obtenerTopClientes(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const { data, error } = await supabase
      .from('packages')
      .select('nombre_cliente, ingreso_generado, entregado')
      .eq('tenant_id', tenantId);
    if (error) throw error;

    const clientes = {};
    for (const p of data || []) {
      if (!p.entregado) continue;
      const k = p.nombre_cliente || '—';
      if (!clientes[k]) clientes[k] = { nombre_cliente: k, total_entregas: 0, total_ingresos: 0 };
      clientes[k].total_entregas++;
      clientes[k].total_ingresos += Number(p.ingreso_generado) || 0;
    }

    res.json({ topClientes: Object.values(clientes).sort((a,b)=>b.total_ingresos - a.total_ingresos).slice(0,10) });
  } catch (err) {
    console.error('❌ obtenerTopClientes:', err);
    res.status(500).json({ error: 'Error al obtener top clientes' });
  }
}

/* ==================== DIARIO ==================== */
// Agrega por día de ENTREGA (fallback a llegada si falta fecha_entregado).
async function obtenerDiario(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const { data, error } = await supabase
      .from('packages')
      .select('fecha_entregado, fecha_llegada, entregado, ingreso_generado')
      .eq('tenant_id', tenantId);
    if (error) throw error;

    const map = new Map();
    for (const r of data || []) {
      if (!r.entregado) continue;
      const dateSrc = r.fecha_entregado || r.fecha_llegada; // fallback
      const d = dateSrc ? new Date(dateSrc) : null;
      if (!d || isNaN(d)) continue;
      const key = ymd(d);
      const cur = map.get(key) || { fecha: key, ingresos: 0, entregas: 0 };
      cur.ingresos += Number(r.ingreso_generado) || 0;
      cur.entregas++;
      map.set(key, cur);
    }
    res.json({ diario: Array.from(map.values()).sort((a,b)=>new Date(a.fecha)-new Date(b.fecha)) });
  } catch (err) {
    console.error('❌ obtenerDiario:', err);
    res.status(500).json({ error: 'Error al obtener diario' });
  }
}

/* ==================== ÚLTIMAS ==================== */
// Mostrar últimas entregas (si falta fecha_entregado, ordenamos por llegada como secundario)
async function obtenerUltimasEntregas(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    let q = supabase
      .from('packages')
      .select('nombre_cliente, fecha_llegada, empresa_transporte, ingreso_generado, ubicacion_label, entregado, fecha_entregado')
      .eq('tenant_id', tenantId);

    // Orden principal por fecha_entregado desc, secundario por fecha_llegada desc
    q = q.order('fecha_entregado', { ascending: false }).order('fecha_llegada', { ascending: false }).limit(10);

    const { data, error } = await q;
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
