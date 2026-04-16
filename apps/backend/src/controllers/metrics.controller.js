'use strict';

// Asegúrate de importar tu cliente admin correctamente
const { supabaseAdmin } = require('../utils/supabaseClient'); 

exports.getPublicMetrics = async (req, res) => {
  try {
    // Total de negocios
    const { count: tenantsCount } = await supabaseAdmin
      .from('tenants')
      .select('*', { count: 'exact', head: true });

    // Total de paquetes entregados (¡Corregido 'paquetes' por 'packages'!)
    const { count: deliveredCount } = await supabaseAdmin
      .from('packages')
      .select('*', { count: 'exact', head: true })
      .eq('entregado', true);

    return res.json({
      tenants_count: tenantsCount || 0,
      packages_delivered_total: deliveredCount || 0,
      uptime_rolling_pct: 99.9
    });
  } catch (error) {
    console.error('[Metrics] Error:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
};