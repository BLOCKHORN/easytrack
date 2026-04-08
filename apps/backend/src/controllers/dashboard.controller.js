const { supabase } = require('../utils/supabaseClient');

function promedio(arr) { return arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0; }

async function resolveTenantId(req) {
  const direct = req.tenant_id || req.tenant?.id;
  if (direct) return direct;
  const slug = req.params?.slug || req.params?.tenantSlug || null;
  if (slug) {
    const { data } = await supabase.from('tenants').select('id').eq('slug', slug).maybeSingle();
    return data?.id || null;
  }
  return null;
}

exports.obtenerResumenDashboard = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    // Llamamos al Cerebro 2
    const { data, error } = await supabase.rpc('get_dashboard_daily_stats', { p_tenant_id: tenantId });
    if (error) throw error;

    const { diario, resumen } = data;
    
    // Localizamos "Hoy" asegurando zona horaria española
    const hoyISO = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
    const diaHoy = diario.find(d => d.fecha === hoyISO) || { recibidos: 0, entregados: 0, ingresos: 0 };
    
    const ingresoTotal = diario.reduce((a, b) => a + Number(b.ingresos), 0);
    
    // Historial limpio para records (excluyendo tu dia de testeo)
    const historicoLimpio = diario.filter(d => d.fecha !== '2025-06-07');
    const recordRecibidos = Math.max(0, ...historicoLimpio.map(d => d.recibidos));
    const recordEntregados = Math.max(0, ...historicoLimpio.map(d => d.entregados));
    const recordIngreso = Math.max(0, ...historicoLimpio.map(d => d.ingresos));

    const mediaDiaria = promedio(diario.map(d => d.recibidos));
    const mediaEntregados = promedio(diario.map(d => d.entregados));

    res.json({
      recibidosHoy: diaHoy.recibidos,
      entregadosHoy: diaHoy.entregados,
      ingresoHoy: diaHoy.ingresos,
      ingresoTotal,
      almacenActual: resumen.almacenActual,
      horaPico: resumen.horaPicoEntregas != null ? `${resumen.horaPicoEntregas}:00` : '–',
      horaPicoRecibido: resumen.horaPicoRecibidos != null ? `${resumen.horaPicoRecibidos}:00` : '–',
      estantesLlenos: resumen.estantesLlenos,
      mediaDiaria,
      mediaEntregados,
      recordRecibidos,
      recordEntregados,
      recordIngreso,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
};

exports.obtenerVolumenPaquetes = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const vista = String(req.body?.tipo_vista || 'anual').toLowerCase();
    const fechaStr = String(req.body?.fecha || new Date().toISOString().split('T')[0]);
    const fechaBase = new Date(fechaStr);

    const mesesCorto = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    const diasCorto  = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

    // Si es diaria, hacemos fetch solo de ese dia (Rápido y permite agrupar por horas)
    if (vista === 'diaria') {
        const dStart = new Date(fechaBase.setHours(0,0,0,0)).toISOString();
        const dEnd = new Date(fechaBase.setHours(23,59,59,999)).toISOString();
        
        const { data: rows } = await supabase.from('packages')
            .select('fecha_llegada, fecha_entregado, entregado')
            .eq('tenant_id', tenantId)
            .or(`fecha_llegada.gte.${dStart},fecha_entregado.gte.${dStart}`);
            
        const base = Array.from({ length: 24 }, (_, i) => ({ periodo: String(i), recibidos: 0, entregados: 0 }));
        rows.forEach(r => {
            if (r.fecha_llegada && r.fecha_llegada >= dStart && r.fecha_llegada <= dEnd) base[new Date(r.fecha_llegada).getHours()].recibidos++;
            if (r.entregado && r.fecha_entregado && r.fecha_entregado >= dStart && r.fecha_entregado <= dEnd) base[new Date(r.fecha_entregado).getHours()].entregados++;
        });
        return res.json(base);
    }

    // Para el resto (anual, mensual, historial, semanal), usamos el RPC diario ultra eficiente
    const { data } = await supabase.rpc('get_dashboard_daily_stats', { p_tenant_id: tenantId });
    const diario = data.diario || [];

    const y = fechaBase.getFullYear();
    const m = fechaBase.getMonth();
    
    let out = [];
    
    if (vista === 'anual') {
        out = Array.from({ length: 12 }, (_, i) => ({ periodo: mesesCorto[i], recibidos: 0, entregados: 0 }));
        diario.filter(d => d.fecha.startsWith(String(y))).forEach(d => {
            const mesIdx = parseInt(d.fecha.split('-')[1]) - 1;
            out[mesIdx].recibidos += d.recibidos;
            out[mesIdx].entregados += d.entregados;
        });
    } else if (vista === 'mensual') {
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        out = Array.from({ length: daysInMonth }, (_, i) => ({ periodo: String(i + 1), recibidos: 0, entregados: 0 }));
        const prefijo = `${y}-${String(m + 1).padStart(2, '0')}`;
        diario.filter(d => d.fecha.startsWith(prefijo)).forEach(d => {
            const diaIdx = parseInt(d.fecha.split('-')[2]) - 1;
            out[diaIdx].recibidos += d.recibidos;
            out[diaIdx].entregados += d.entregados;
        });
    } else if (vista === 'historial') {
        const end = new Date(fechaBase.setHours(23,59,59,999));
        const start = new Date(end); start.setDate(start.getDate() - 30);
        
        out = Array.from({ length: 30 }, (_, i) => {
            const cur = new Date(start); cur.setDate(cur.getDate() + i + 1);
            const iso = cur.toLocaleDateString('sv-SE');
            return { periodo: iso, recibidos: 0, entregados: 0 };
        });
        
        diario.forEach(d => {
            const idx = out.findIndex(x => x.periodo === d.fecha);
            if (idx !== -1) { out[idx].recibidos += d.recibidos; out[idx].entregados += d.entregados; }
        });
    } else if (vista === 'semanal') {
        const start = new Date(fechaBase); start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); start.setHours(0,0,0,0);
        const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23,59,59,999);
        
        out = Array.from({ length: 7 }, (_, i) => ({ periodo: diasCorto[i], recibidos: 0, entregados: 0, _date: new Date(start.getTime() + i * 86400000).toLocaleDateString('sv-SE') }));
        
        diario.forEach(d => {
            const idx = out.findIndex(x => x._date === d.fecha);
            if (idx !== -1) { out[idx].recibidos += d.recibidos; out[idx].entregados += d.entregados; }
        });
    }

    res.json(out);
  } catch (err) {
    res.status(500).json({ error: 'Error volumen' });
  }
};

exports.obtenerNegocio = async (req, res) => {
  const email = req.user?.email;
  if (!email) return res.status(401).json({ error: 'Usuario no resuelto' });
  const urlSlug = req.params?.slug || req.params?.tenantSlug || null;

  try {
    let query = supabase.from('tenants').select('id, slug, nombre_empresa, imagen_fondo');
    if (urlSlug) query = query.eq('slug', urlSlug);
    else query = query.ilike('email', email);

    const { data: tenant, error } = await query.maybeSingle();
    if (error || !tenant) return res.status(404).json({ error: 'Negocio no encontrado' });

    const tenantId = tenant.id;
    const { data: empresas } = await supabase.from('empresas_transporte_tenant').select('*').eq('tenant_id', tenantId);
    const { count: ubicacionesActivas } = await supabase.from('ubicaciones').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('activo', true);

    res.json({
      ...tenant,
      empresas_transporte: empresas || [],
      baldas_total: 0,
      estructura_almacen: (ubicacionesActivas || 0) > 0 ? 'ubicaciones' : null,
      ubicaciones_activas: ubicacionesActivas || 0,
    });
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener el negocio' });
  }
};