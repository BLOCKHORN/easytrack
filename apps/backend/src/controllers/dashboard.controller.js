const { supabase } = require('../utils/supabaseClient');
const { computeEntitlements } = require('../utils/entitlements');
const { fetchSubscriptionForTenant } = require('../utils/subscription');

async function resolveTenantId(req) {
  const direct = req.tenant_id || req.tenant?.id || req.tenantId;
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

    const { data, error } = await supabase.rpc('obtener_resumen_dashboard', {
      p_tenant_id: tenantId
    });

    if (error) throw error;

    res.json(data);
  } catch (err) {
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

    const { data: pkgs, error } = await supabase
      .from('packages')
      .select('fecha_llegada, entregado, fecha_entregado')
      .eq('tenant_id', tenantId)
      .or(`fecha_llegada.gte.${limiteISO},fecha_entregado.gte.${limiteISO}`);

    if (error) throw error;

    const diarioMap = {};
    for (const p of (pkgs || [])) {
      const kLle = p.fecha_llegada ? p.fecha_llegada.split('T')[0] : null;
      const kEnt = (p.entregado && p.fecha_entregado) ? p.fecha_entregado.split('T')[0] : null;

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
    res.status(500).json({ error: 'Error calculando volumen de paquetes' });
  }
};

exports.obtenerNegocio = async (req, res) => {
  const email = req.user?.email;
  if (!email) return res.status(401).json({ error: 'Usuario no resuelto' });
  const urlSlug = req.params?.slug || req.params?.tenantSlug || null;

  try {
    // 1. Seleccionamos * para traernos datos clave (plan_id, trial_used, etc.) necesarios para los entitlements
    let query = supabase.from('tenants').select('*');
    if (urlSlug) query = query.eq('slug', urlSlug);
    else query = query.ilike('email', email);

    const { data: tenant, error } = await query.maybeSingle();
    if (error || !tenant) return res.status(404).json({ error: 'Negocio no encontrado' });

    const tenantId = tenant.id;

    // 2. Traemos empresas, ubicaciones y la suscripción en paralelo para no penalizar tiempos
    const [empresasRes, ubicacionesRes, subscription] = await Promise.all([
      supabase.from('empresas_transporte_tenant').select('*').eq('tenant_id', tenantId),
      supabase.from('ubicaciones').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('activo', true),
      fetchSubscriptionForTenant(tenantId).catch(() => null)
    ]);

    // 3. Calculamos los permisos basándonos en el tenant y su suscripción
    const entitlements = computeEntitlements({ tenant, subscription });

    // 4. Agregamos los entitlements a la respuesta para que el Front-end aplique los bloqueos
    res.json({
      negocio: {
        nombre: tenant.nombre_empresa,
        slug: tenant.slug
      },
      entitlements, 
      empresas: empresasRes.data || [],
      ubicaciones_activas: ubicacionesRes.count || 0
    });
  } catch (err) {
    console.error("[Dashboard] Error obteniendo negocio:", err);
    res.status(500).json({ error: 'Error obteniendo negocio' });
  }
};