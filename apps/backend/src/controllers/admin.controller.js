const { supabaseAdmin } = require('../utils/supabaseClient');

const checkAdmin = async (userId) => {
  const { data } = await supabaseAdmin
    .from('superadmins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
};

exports.getDashboardData = async (req, res) => {
  try {
    if (!(await checkAdmin(req.user.id))) return res.status(403).json({ ok: false, error: 'Acceso denegado.' });

    const { timeRange = 'all' } = req.query;

    // Añadimos una cuarta consulta concurrente directa a la tabla tenants
    const [tenantsRes, globalStatsRes, reviewsRes, stripeIdsRes] = await Promise.all([
      supabaseAdmin.rpc('admin_get_all_tenants'),
      supabaseAdmin.rpc('admin_get_global_carrier_stats', { p_time_range: timeRange }),
      supabaseAdmin.from('reviews').select('id, rating, comentario, status, created_at, tenants(nombre_empresa)').order('created_at', { ascending: false }),
      supabaseAdmin.from('tenants').select('id, stripe_customer_id')
    ]);

    if (tenantsRes.error) throw tenantsRes.error;
    if (globalStatsRes.error) throw globalStatsRes.error;
    if (reviewsRes.error) throw reviewsRes.error;
    if (stripeIdsRes.error) throw stripeIdsRes.error;

    // Creamos un mapa rápido de IDs para no saturar con bucles anidados
    const stripeMap = stripeIdsRes.data.reduce((acc, curr) => {
      acc[curr.id] = curr.stripe_customer_id;
      return acc;
    }, {});

    // Inyectamos el stripe_customer_id a los datos que nos devuelve tu RPC
    const tenantsWithStripe = (tenantsRes.data || []).map(t => ({
      ...t,
      stripe_customer_id: stripeMap[t.id] || null
    }));

    return res.json({ 
      ok: true, 
      tenants: tenantsWithStripe,
      globalStats: globalStatsRes.data || [],
      reviews: reviewsRes.data || []
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Error extrayendo datos globales' });
  }
};

exports.getTenantStats = async (req, res) => {
  try {
    if (!(await checkAdmin(req.user.id))) return res.status(403).json({ ok: false, error: 'Acceso denegado.' });
    
    const { tenantId } = req.params;
    const { timeRange = 'all' } = req.query;

    const { data, error } = await supabaseAdmin.rpc('admin_get_tenant_stats', {
      p_tenant_id: tenantId,
      p_time_range: timeRange
    });

    if (error) throw error;
    return res.json({ ok: true, stats: data || [] });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Error extrayendo stats del tenant' });
  }
};

exports.updateReviewStatus = async (req, res) => {
  try {
    if (!(await checkAdmin(req.user.id))) return res.status(403).json({ ok: false, error: 'Acceso denegado.' });
    
    const { id } = req.params;
    const { status } = req.body;

    const { error } = await supabaseAdmin.from('reviews').update({ status }).eq('id', id);
    if (error) throw error;

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Error actualizando reseña' });
  }
};

exports.updateTenantLimits = async (req, res) => {
  try {
    if (!(await checkAdmin(req.user.id))) return res.status(403).json({ ok: false, error: 'Acceso denegado.' });
    
    const { id } = req.params;
    const { trial_quota, is_ai_active } = req.body;

    const { error } = await supabaseAdmin.from('tenants').update({ trial_quota, is_ai_active }).eq('id', id);
    if (error) throw error;

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Error actualizando límites' });
  }
};