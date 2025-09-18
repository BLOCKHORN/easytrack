// backend/controllers/dashboard.controller.js
const { supabase } = require('../utils/supabaseClient');

/**
 * GET /api/dashboard/resumen
 * KPIs del dashboard: recibidos/entregados por día, ingresos, etc.
 */
exports.obtenerResumenDashboard = async (req, res) => {
  const tenantId = req.tenant_id || req.tenant?.id;
  if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

  const hoyISO = new Date().toISOString().split('T')[0];

  try {
    const { data: paquetes, error } = await supabase
      .from('paquetes')
      .select('fecha_llegada, fecha_entregado, ingreso_generado, entregado, balda_id')
      .eq('tenant_id', tenantId);

    if (error) throw error;

    let ingresoHoy = 0, ingresoTotal = 0, recibidosHoy = 0, entregadosHoy = 0, almacenActual = 0;
    const ingresosPorDia = {}, recibidosPorDia = {}, entregadosPorDia = {}, baldas = {};

    paquetes.forEach((p) => {
      const fechaLlegada = p.fecha_llegada ? p.fecha_llegada.split('T')[0] : null;
      const fechaEntrega = p.fecha_entregado ? p.fecha_entregado.split('T')[0] : null;

      if (fechaLlegada) {
        recibidosPorDia[fechaLlegada] = (recibidosPorDia[fechaLlegada] || 0) + 1;
        if (fechaLlegada === hoyISO) recibidosHoy++;
      }

      if (p.entregado && fechaEntrega) {
        const ingreso = Number(p.ingreso_generado || 0);
        entregadosPorDia[fechaEntrega] = (entregadosPorDia[fechaEntrega] || 0) + 1;
        ingresosPorDia[fechaEntrega] = (ingresosPorDia[fechaEntrega] || 0) + ingreso;

        ingresoTotal += ingreso;
        if (fechaEntrega === hoyISO) {
          entregadosHoy++;
          ingresoHoy += ingreso;
        }
      }

      if (!p.entregado) {
        almacenActual++;
        if (p.balda_id) baldas[p.balda_id] = (baldas[p.balda_id] || 0) + 1;
      }
    });

    const excluirFecha = '2025-06-07';
    const recordRecibidos = maxConExclusion(recibidosPorDia, excluirFecha);
    const recordEntregados = maxConExclusion(entregadosPorDia, excluirFecha);
    const recordIngreso = maxConExclusion(ingresosPorDia, excluirFecha);

    const historialFechas = new Set([
      ...Object.keys(recibidosPorDia),
      ...Object.keys(entregadosPorDia),
    ]);
    const historial = [...historialFechas].map((fecha) => ({
      fecha,
      recibidos: recibidosPorDia[fecha] || 0,
      entregados: entregadosPorDia[fecha] || 0,
    }));

    const mediaDiaria = promedio(historial.map((h) => h.recibidos));
    const mediaEntregados = promedio(historial.map((h) => h.entregados));

    const estantesLlenos = Object.values(baldas).filter((v) => v >= 12).length;
    const horaPico = calcularHoraPico(paquetes, true, 'fecha_entregado');
    const horaPicoRecibido = calcularHoraPico(paquetes, false, 'fecha_llegada');

    res.json({
      recibidosHoy,
      entregadosHoy,
      ingresoHoy,
      ingresoTotal,
      almacenActual,
      horaPico,
      horaPicoRecibido,
      estantesLlenos,
      mediaDiaria,
      mediaEntregados,
      recordRecibidos,
      recordEntregados,
      recordIngreso,
    });
  } catch (err) {
    console.error('❌ [dashboard] Error resumen:', err);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
};

function maxConExclusion(obj, excluirFecha) {
  return Math.max(
    ...Object.entries(obj)
      .filter(([fecha]) => fecha !== excluirFecha)
      .map(([, valor]) => valor),
    0
  );
}
function promedio(arr) {
  return arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
}
function calcularHoraPico(paquetes, entregadoEsperado, campoFecha) {
  const horasPorDia = {};
  paquetes.forEach((p) => {
    if (p.entregado === entregadoEsperado && p[campoFecha]) {
      const fecha = p[campoFecha].split('T')[0];
      const hora = new Date(p[campoFecha]).getHours();
      if (!horasPorDia[fecha]) horasPorDia[fecha] = {};
      horasPorDia[fecha][hora] = (horasPorDia[fecha][hora] || 0) + 1;
    }
  });
  const picos = Object.values(horasPorDia).map((horas) =>
    parseInt(Object.entries(horas).sort((a, b) => b[1] - a[1])[0][0])
  );
  return picos.length > 0
    ? `${Math.round(picos.reduce((a, b) => a + b, 0) / picos.length)}:00`
    : '–';
}

/**
 * POST /api/dashboard/volumen-paquetes
 * RPC: volumen_paquetes(tenant_input uuid, tipo_vista text, fecha_input date?)
 */
exports.obtenerVolumenPaquetes = async (req, res) => {
  const tenantId = req.tenant_id || req.tenant?.id;
  if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

  const { tipo_vista, fecha } = req.body;
  try {
    const { data, error } = await supabase.rpc('volumen_paquetes', {
      tenant_input: tenantId,
      tipo_vista,
      fecha_input: fecha || null,
    });
    if (error) {
      console.error('🔴 Supabase RPC error:', error);
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error('❌ [dashboard] volumen_paquetes:', err);
    res.status(500).json({ error: 'Error al obtener volumen de paquetes' });
  }
};

/**
 * GET /api/dashboard/negocio
 * ➜ Devuelve datos del negocio (sin columnas/baldas_por_columna) +
 *    empresas_transporte asociadas y un indicador `baldas_total`
 *    para permitir al front avisar si falta configurar estantes.
 */
exports.obtenerNegocio = async (req, res) => {
  const email = req.user?.email;
  if (!email) return res.status(401).json({ error: 'Usuario no resuelto' });

  const urlSlug = req.params?.tenantSlug || null;

  try {
    let query = supabase
      .from('tenants')
      .select('id, slug, nombre_empresa, imagen_fondo')
      .ilike('email', email);

    if (urlSlug) query = query.eq('slug', urlSlug);

    const { data: tenant, error } = await query.maybeSingle();
    if (error) throw error;
    if (!tenant) return res.status(404).json({ error: 'Negocio no encontrado' });

    const tenantId = tenant.id;

    // Empresas de transporte del tenant
    const { data: empresas, error: empErr } = await supabase
      .from('empresas_transporte_tenant')
      .select('*')
      .eq('tenant_id', tenantId);

    if (empErr) throw empErr;

    // Conteo de baldas del tenant
    const { count: baldasCount, error: baldasErr } = await supabase
      .from('baldas')
      .select('id', { count: 'exact', head: true })
      .eq('id_negocio', tenantId);

    if (baldasErr) throw baldasErr;

    res.json({
      ...tenant,
      empresas_transporte: empresas || [],
      baldas_total: baldasCount ?? 0, // 👈 útil para el front
    });
  } catch (e) {
    console.error('❌ [dashboard] obtenerNegocio:', e);
    res.status(500).json({ error: 'Error al obtener el negocio' });
  }
};
