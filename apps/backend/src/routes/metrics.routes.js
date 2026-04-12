'use strict';

const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../utils/supabaseClient');

router.get('/public', async (req, res) => {
  try {
    // Total de negocios
    const { count: tenantsCount } = await supabaseAdmin
      .from('tenants')
      .select('*', { count: 'exact', head: true });

    // Total de paquetes entregados
    const { count: deliveredCount } = await supabaseAdmin
      .from('paquetes')
      .select('*', { count: 'exact', head: true })
      .eq('entregado', true);

    res.json({
      tenants_count: tenantsCount || 0,
      packages_delivered_total: deliveredCount || 0,
      uptime_rolling_pct: 99.9
    });
  } catch (error) {
    console.error('[Metrics] Error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;