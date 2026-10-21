const { supabase } = require('../utils/supabaseClient');
const { computeEntitlements } = require('../utils/entitlements');
const { fetchSubscriptionForTenant } = require('../utils/subscription');
const { isDirectPg, query } = require('../utils/db');

async function resolveTenantId(req) {
  const direct = req.tenant_id || req.tenant?.id || req.tenantId;
  if (direct) return direct;
  const slug = req.params?.slug || req.params?.tenantSlug || null;
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

exports.obtenerResumenDashboard = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    if (isDirectPg()) {
      const { rows } = await query('SELECT * FROM public.obtener_resumen_dashboard($1)', [tenantId]);
      return res.json(rows[0]?.obtener_resumen_dashboard || rows[0] || {});
    }

    const { data, error } = await supabase.rpc('obtener_resumen_dashboard', {
      p_tenant_id: tenantId
    });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('[Dashboard] Error calculando resumen:', err);
    res.status(500).json({ error: 'Error calculando resumen dashboard' });
  }
};

exports.obtenerVolumenPaquetes = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const limiteDias = req.body?.rango === '30d' ? 30 : 7;
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - limiteDias);
    const limiteISO = fechaLimite.toISOString();

    let pkgs = [];
    if (isDirectPg()) {
      const { rows } = await query(`
        SELECT fecha_llegada, entregado, fecha_entregado
        FROM public.packages
        WHERE tenant_id = $1
          AND (fecha_llegada >= $2 OR fecha_entregado >= $2)
      `, [tenantId, limiteISO]);
      pkgs = rows;
    } else {
      const { data, error } = await supabase
        .from('packages')
        .select('fecha_llegada, entregado, fecha_entregado')
        .eq('tenant_id', tenantId)
        .or(`fecha_llegada.gte.${limiteISO},fecha_entregado.gte.${limiteISO}`);
      if (error) throw error;
      pkgs = data || [];
    }

    const diarioMap = {};
    for (const p of pkgs) {
      const kLle = p.fecha_llegada ? String(p.fecha_llegada).split('T')[0] : null;
      const kEnt = (p.entregado && p.fecha_entregado) ? String(p.fecha_entregado).split('T')[0] : null;

      if (kLle) {
        diarioMap[kLle] = diarioMap[kLle] || { fecha: kLle, recibidos: 0, entregados: 0 };
        diarioMap[kLle].recibidos++;
      }
      if (kEnt) {
        diarioMap[kEnt] = diarioMap[kEnt] || { fecha: kEnt, recibidos: 0, entregados: 0 };
        diarioMap[kEnt].entregados++;
      }
    }

    const out = [];
    const hoy = new Date();
    
    for (let i = limiteDias - 1; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(d.getDate() - i);
      const iso = d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
      out.push({
        fecha: iso,
        recibidos: diarioMap[iso]?.recibidos || 0,
        entregados: diarioMap[iso]?.entregados || 0
      });
    }

    res.json(out);
  } catch (err) {
    console.error('[Dashboard] Error calculando volumen:', err);
    res.status(500).json({ error: 'Error calculando volumen de paquetes' });
  }
};

exports.obtenerNegocio = async (req, res) => {
  const email = req.user?.email;
  if (!email) return res.status(401).json({ error: 'Usuario no resuelto' });
  const urlSlug = req.params?.slug || req.params?.tenantSlug || null;

  try {
    let tenant = null;

    if (isDirectPg()) {
      let sql = 'SELECT * FROM public.tenants WHERE ';
      let val = '';
      if (urlSlug) {
        sql += 'slug = $1 LIMIT 1';
        val = urlSlug;
      } else {
        sql += 'email ILIKE $1 LIMIT 1';
        val = email;
      }
      const { rows } = await query(sql, [val]);
      tenant = rows[0] || null;
    } else {
      let q = supabase.from('tenants').select('*');
      if (urlSlug) q = q.eq('slug', urlSlug);
      else q = q.ilike('email', email);
      const { data } = await q.maybeSingle();
      tenant = data;
    }

    if (!tenant) return res.status(404).json({ error: 'Negocio no encontrado' });

    const tenantId = tenant.id;

    let empresas = [];
    let ubicacionesActivas = 0;
    let subscription = null;

    if (isDirectPg()) {
      const [empRes, ubiRes, sub] = await Promise.all([
        query('SELECT * FROM public.empresas_transporte_tenant WHERE tenant_id = $1', [tenantId]),
        query('SELECT count(*)::int as cnt FROM public.ubicaciones WHERE tenant_id = $1 AND activo = true', [tenantId]),
        fetchSubscriptionForTenant(tenantId).catch(() => null)
      ]);
      empresas = empRes.rows || [];
      ubicacionesActivas = ubiRes.rows[0]?.cnt || 0;
      subscription = sub;
    } else {
      const [empresasRes, ubicacionesRes, sub] = await Promise.all([
        supabase.from('empresas_transporte_tenant').select('*').eq('tenant_id', tenantId),
        supabase.from('ubicaciones').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('activo', true),
        fetchSubscriptionForTenant(tenantId).catch(() => null)
      ]);
      empresas = empresasRes.data || [];
      ubicacionesActivas = ubicacionesRes.count || 0;
      subscription = sub;
    }

    const entitlements = computeEntitlements({ tenant, subscription });

    res.json({
      negocio: {
        nombre: tenant.nombre_empresa,
        slug: tenant.slug
      },
      entitlements, 
      empresas,
      ubicaciones_activas: ubicacionesActivas
    });
  } catch (err) {
    console.error("[Dashboard] Error obteniendo negocio:", err);
    res.status(500).json({ error: 'Error obteniendo negocio' });
  }
};