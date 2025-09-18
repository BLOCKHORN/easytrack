// backend/src/controllers/areaPersonalSnapshots.controller.js
const { supabase } = require('../utils/supabaseClient');

function ymd(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

// GET /snapshots?from=YYYY-MM-DD&to=YYYY-MM-DD
async function getSnapshots(req, res) {
  try {
    const tenantId = req.tenant_id || req.tenant?.id || req.params?.tenantSlug || null;
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

    if (error && error.code === '42P01') {
      // tabla no existe aún → respuesta vacía
      return res.json({ snapshots: [] });
    }
    if (error) throw error;

    res.json({ snapshots: Array.isArray(data) ? data : [] });
  } catch (err) {
    console.error('❌ getSnapshots:', err);
    res.status(200).json({ snapshots: [] });
  }
}

// POST /snapshots  → guarda un corte con métricas actuales
async function createSnapshot(req, res) {
  try {
    const tenantId = req.tenant_id || req.tenant?.id || req.params?.tenantSlug || null;
    const userId = req.user?.id || null;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Tenant/usuario no resuelto' });

    // leemos todos los paquetes del tenant
    const { data: rows, error } = await supabase
      .from('paquetes')
      .select('fecha_llegada, ingreso_generado, empresa_transporte')
      .eq('tenant_id', tenantId);

    if (error) throw error;

    const total_ingresos = rows.reduce((a, p) => a + (Number(p.ingreso_generado) || 0), 0);
    const total_entregas = rows.length;

    // últimos 30 días
    const end = new Date(); end.setHours(23,59,59,999);
    const start = new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate() - 29);

    const last30 = rows.filter(r => {
      const d = new Date(r.fecha_llegada);
      return !isNaN(d) && d >= start && d <= end;
    });
    const ingresos_30d  = last30.reduce((a,p)=>a+(Number(p.ingreso_generado)||0),0);
    const entregas_30d  = last30.length;
    const ticket_medio  = total_entregas ? total_ingresos / total_entregas : 0;

    // empresa top + share
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

    if (insErr && insErr.code === '42P01') {
      // si no hay tabla, devolvemos el payload como si fuese "guardado"
      return res.json({ snapshot: payload, created: false });
    }
    if (insErr) throw insErr;

    res.json({ snapshot: ins || payload, created: true });
  } catch (err) {
    console.error('❌ createSnapshot:', err);
    res.status(500).json({ error: 'No se pudo crear el snapshot' });
  }
}

module.exports = { getSnapshots, createSnapshot };
