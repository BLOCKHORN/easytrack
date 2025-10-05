// backend/controllers/dashboard.controller.js
const { supabase } = require('../utils/supabaseClient');

/* ─────────────────────────────────────────────────────────────
 * Helpers reutilizables
 * ───────────────────────────────────────────────────────────── */
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
function calcularHoraPico(rows, entregadoEsperado, campoFecha) {
  const horasPorDia = {};
  rows.forEach((p) => {
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

async function resolveTenantId(req) {
  // Prioridad: req.tenant_id / req.tenant.id -> slug en ruta -> 403
  const direct = req.tenant_id || req.tenant?.id;
  if (direct) return direct;

  const slug = req.params?.slug || req.params?.tenantSlug || null;
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

/* ─────────────────────────────────────────────────────────────
 * GET /api/dashboard/resumen
 *  👉 KPIs basados en la tabla NUEVA: public.packages
 * ───────────────────────────────────────────────────────────── */
exports.obtenerResumenDashboard = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const hoyISO = new Date().toISOString().split('T')[0];

    const { data: rows, error } = await supabase
      .from('packages')
      .select('fecha_llegada, fecha_entregado, ingreso_generado, entregado, ubicacion_id')
      .eq('tenant_id', tenantId);

    if (error) throw error;

    let ingresoHoy = 0, ingresoTotal = 0, recibidosHoy = 0, entregadosHoy = 0, almacenActual = 0;
    const ingresosPorDia = {}, recibidosPorDia = {}, entregadosPorDia = {};
    const ocupacionUbicacion = {};

    rows.forEach((p) => {
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
        if (p.ubicacion_id) {
          ocupacionUbicacion[p.ubicacion_id] = (ocupacionUbicacion[p.ubicacion_id] || 0) + 1;
        }
      }
    });

    const excluirFecha = '2025-06-07';
    const recordRecibidos = maxConExclusion(recibidosPorDia, excluirFecha);
    const recordEntregados = maxConExclusion(entregadosPorDia, excluirFecha);
    const recordIngreso = maxConExclusion(ingresosPorDia, excluirFecha);

    const historialFechas = new Set([...Object.keys(recibidosPorDia), ...Object.keys(entregadosPorDia)]);
    const historial = [...historialFechas].map((fecha) => ({
      fecha,
      recibidos: recibidosPorDia[fecha] || 0,
      entregados: entregadosPorDia[fecha] || 0,
    }));

    const mediaDiaria = promedio(historial.map((h) => h.recibidos));
    const mediaEntregados = promedio(historial.map((h) => h.entregados));

    const estantesLlenos = Object.values(ocupacionUbicacion).filter((v) => v >= 12).length;

    const horaPico = calcularHoraPico(rows, true, 'fecha_entregado');
    const horaPicoRecibido = calcularHoraPico(rows, false, 'fecha_llegada');

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

/* ─────────────────────────────────────────────────────────────
 * POST /api/dashboard/volumen-paquetes
 *  ✅ Re-implementado: agrega directamente desde public.packages
 *  Formato de salida: [{ periodo, recibidos, entregados }]
 *    - anual:   periodo = "Ene".."Dic"
 *    - mensual: periodo = "1".."31"
 *    - semanal: periodo = "Lun".."Dom" (semana de la 'fecha' dada, empezando lunes)
 *    - diaria:  periodo = "0".."23" (horas del día de 'fecha')
 *    - historial: periodo = "YYYY-MM-DD" (últimos 30 días hasta 'fecha')
 * ───────────────────────────────────────────────────────────── */
exports.obtenerVolumenPaquetes = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const vista = String(req.body?.tipo_vista || 'anual').toLowerCase();
    const fechaStr = String(req.body?.fecha || new Date().toISOString().split('T')[0]);
    const fechaBase = new Date(fechaStr);
    if (isNaN(fechaBase)) return res.status(400).json({ error: 'Fecha inválida' });

    const mesesCorto = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    const diasCorto  = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

    // Traemos SOLO columnas necesarias
    const { data: rows, error } = await supabase
      .from('packages')
      .select('id, fecha_llegada, fecha_entregado, entregado')
      .eq('tenant_id', tenantId);
    if (error) throw error;

    // Utils de rangos
    const y = fechaBase.getFullYear();
    const m = fechaBase.getMonth(); // 0..11
    const d = fechaBase.getDate();

    const startOfDay = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0);
    const endOfDay   = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + 1, 0, 0, 0, 0);

    const startOfWeekMon = (dt) => {
      const day = dt.getDay(); // 0=Dom,1=Lun..6=Sab
      const diff = (day === 0 ? -6 : 1 - day); // mover a lunes
      const s = new Date(dt); s.setDate(dt.getDate() + diff);
      s.setHours(0,0,0,0);
      return s;
    };
    const addDays = (dt, n) => { const x = new Date(dt); x.setDate(x.getDate() + n); return x; };

    const inRange = (iso, a, b) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      return t >= a.getTime() && t < b.getTime();
    };

    let out = [];

    if (vista === 'anual') {
      // 12 meses del año de 'fecha'
      const base = Array.from({ length: 12 }, (_, i) => ({
        periodo: mesesCorto[i], recibidos: 0, entregados: 0
      }));
      rows.forEach(r => {
        if (r.fecha_llegada) {
          const dt = new Date(r.fecha_llegada);
          if (dt.getFullYear() === y) base[dt.getMonth()].recibidos++;
        }
        if (r.entregado && r.fecha_entregado) {
          const dt = new Date(r.fecha_entregado);
          if (dt.getFullYear() === y) base[dt.getMonth()].entregados++;
        }
      });
      out = base;
    }
    else if (vista === 'mensual') {
      // Días del mes de 'fecha'
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const base = Array.from({ length: daysInMonth }, (_, i) => ({
        periodo: String(i + 1), recibidos: 0, entregados: 0
      }));
      rows.forEach(r => {
        if (r.fecha_llegada) {
          const dt = new Date(r.fecha_llegada);
          if (dt.getFullYear() === y && dt.getMonth() === m) base[dt.getDate() - 1].recibidos++;
        }
        if (r.entregado && r.fecha_entregado) {
          const dt = new Date(r.fecha_entregado);
          if (dt.getFullYear() === y && dt.getMonth() === m) base[dt.getDate() - 1].entregados++;
        }
      });
      out = base;
    }
    else if (vista === 'semanal') {
      // Lunes..Domingo de la semana de 'fecha'
      const start = startOfWeekMon(fechaBase);
      const end = addDays(start, 7);
      const base = Array.from({ length: 7 }, (_, i) => ({
        periodo: diasCorto[i], recibidos: 0, entregados: 0
      }));
      rows.forEach(r => {
        if (r.fecha_llegada) {
          const dt = new Date(r.fecha_llegada);
          if (inRange(r.fecha_llegada, start, end)) {
            // map day -> 0..6 (Lun..Dom)
            const idx = (dt.getDay() === 0 ? 6 : dt.getDay() - 1);
            base[idx].recibidos++;
          }
        }
        if (r.entregado && r.fecha_entregado) {
          const dt = new Date(r.fecha_entregado);
          if (inRange(r.fecha_entregado, start, end)) {
            const idx = (dt.getDay() === 0 ? 6 : dt.getDay() - 1);
            base[idx].entregados++;
          }
        }
      });
      out = base;
    }
    else if (vista === 'diaria') {
      // 24 horas del día de 'fecha'
      const dayStart = startOfDay(fechaBase);
      const dayEnd   = endOfDay(fechaBase);
      const base = Array.from({ length: 24 }, (_, i) => ({
        periodo: String(i), recibidos: 0, entregados: 0
      }));
      rows.forEach(r => {
        if (r.fecha_llegada && inRange(r.fecha_llegada, dayStart, dayEnd)) {
          const h = new Date(r.fecha_llegada).getHours();
          base[h].recibidos++;
        }
        if (r.entregado && r.fecha_entregado && inRange(r.fecha_entregado, dayStart, dayEnd)) {
          const h = new Date(r.fecha_entregado).getHours();
          base[h].entregados++;
        }
      });
      out = base;
    }
    else if (vista === 'historial') {
      // Últimos 30 días hasta 'fecha' (incluida)
      const end = endOfDay(fechaBase);
      const start = addDays(end, -30);
      const days = [];
      for (let cur = new Date(start); cur < end; cur = addDays(cur, 1)) {
        const yyyy = cur.getFullYear();
        const mm = String(cur.getMonth() + 1).padStart(2, '0');
        const dd = String(cur.getDate()).padStart(2, '0');
        days.push({ iso: `${yyyy}-${mm}-${dd}`, start: startOfDay(cur), end: endOfDay(cur) });
      }
      const base = days.map(d => ({ periodo: d.iso, recibidos: 0, entregados: 0 }));
      rows.forEach(r => {
        if (r.fecha_llegada) {
          const dt = new Date(r.fecha_llegada);
          const iso = dt.toISOString().split('T')[0];
          const idx = base.findIndex(x => x.periodo === iso);
          if (idx !== -1) base[idx].recibidos++;
        }
        if (r.entregado && r.fecha_entregado) {
          const dt = new Date(r.fecha_entregado);
          const iso = dt.toISOString().split('T')[0];
          const idx = base.findIndex(x => x.periodo === iso);
          if (idx !== -1) base[idx].entregados++;
        }
      });
      out = base;
    }
    else {
      return res.status(400).json({ error: 'tipo_vista inválido' });
    }

    return res.json(out);
  } catch (err) {
    console.error('❌ [dashboard] volumen_paquetes:', err);
    res.status(500).json({ error: 'Error al obtener volumen de paquetes' });
  }
};

/* ─────────────────────────────────────────────────────────────
 * GET /api/dashboard/negocio
 *  👉 Devuelve tenant + estructura_almacen='ubicaciones' si hay ubicaciones activas
 * ───────────────────────────────────────────────────────────── */
exports.obtenerNegocio = async (req, res) => {
  const email = req.user?.email;
  if (!email) return res.status(401).json({ error: 'Usuario no resuelto' });

  const urlSlug = req.params?.slug || req.params?.tenantSlug || null;

  try {
    let query = supabase
      .from('tenants')
      .select('id, slug, nombre_empresa, imagen_fondo');

    if (urlSlug) {
      query = query.eq('slug', urlSlug);
    } else {
      query = query.ilike('email', email);
    }

    const { data: tenant, error } = await query.maybeSingle();
    if (error) throw error;
    if (!tenant) return res.status(404).json({ error: 'Negocio no encontrado' });

    const tenantId = tenant.id;

    const { data: empresas, error: empErr } = await supabase
      .from('empresas_transporte_tenant')
      .select('*')
      .eq('tenant_id', tenantId);
    if (empErr) throw empErr;

    const { count: ubicacionesActivas, error: ubiErr } = await supabase
      .from('ubicaciones')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('activo', true);
    if (ubiErr) throw ubiErr;

    res.json({
      ...tenant,
      empresas_transporte: empresas || [],
      baldas_total: 0,
      estructura_almacen: (ubicacionesActivas || 0) > 0 ? 'ubicaciones' : null,
      ubicaciones_activas: ubicacionesActivas || 0,
    });
  } catch (e) {
    console.error('❌ [dashboard] obtenerNegocio:', e);
    res.status(500).json({ error: 'Error al obtener el negocio' });
  }
};
