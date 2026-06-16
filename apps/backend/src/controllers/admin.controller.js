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
    // Versión Restaurada: Usando la función maestra admin_get_all_tenants
    const [tenantsRes, globalStatsRes, reviewsRes, stripeIdsRes] = await Promise.all([
      supabaseAdmin.rpc('admin_get_all_tenants'),
      supabaseAdmin.rpc('admin_get_global_carrier_stats', { p_time_range: timeRange }),
      supabaseAdmin.from('reviews').select('id, rating, comentario, status, created_at, tenants(nombre_empresa)').order('created_at', { ascending: false }),
      supabaseAdmin.from('tenants').select('id, stripe_customer_id')
    ]);

    if (tenantsRes.error) {
      console.error('[Admin] Tenants RPC error:', tenantsRes.error);
      return res.status(500).json({ ok: false, error: `Error DB Tenants: ${tenantsRes.error.message}` });
    }
    if (globalStatsRes.error) {
      console.error('[Admin] RPC globalStats error:', globalStatsRes.error);
      return res.status(500).json({ ok: false, error: `Error DB Stats: ${globalStatsRes.error.message}` });
    }

    const stripeMap = (stripeIdsRes.data || []).reduce((acc, curr) => {
      acc[curr.id] = curr.stripe_customer_id;
      return acc;
    }, {});

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
    console.error('[Admin] getDashboardData crash:', error);
    return res.status(500).json({ ok: false, error: 'Error fatal extrayendo datos' });
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
