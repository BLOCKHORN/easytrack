'use strict';

const express = require('express');
const router = express.Router();
const requireAuth = require('../middlewares/requireAuth');
const { supabase } = require('../utils/supabaseClient');
const { computeEntitlements } = require('../utils/entitlements');

router.get('/me', requireAuth, async (req, res) => {
  try {
    const email = String(req.user?.email || '').toLowerCase().trim();
    if (!email) return res.status(401).json({ ok:false, error:'UNAUTHENTICATED' });

    const { data: tenant, error: tErr } = await supabase
      .from('tenants')
      .select('id, slug, nombre_empresa, trial_active, trial_quota, trial_used, soft_blocked')
      .eq('email', email)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!tenant) return res.status(404).json({ ok:false, error:'TENANT_NOT_FOUND' });

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status, current_period_end, trial_ends_at, cancel_at_period_end')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle();

    const quota = Number(tenant.trial_quota || 20);
    const used  = Number(tenant.trial_used || 0);
    const remaining = Math.max(0, quota - used);

    const entitlements = computeEntitlements({ tenant, subscription: sub });

    return res.json({
      ok: true,
      tenant: { id: tenant.id, slug: tenant.slug, nombre_empresa: tenant.nombre_empresa },
      limits: {
        trial_active: !!tenant.trial_active,
        trial_quota: quota,
        trial_used: used,
        remaining,
        soft_blocked: !!tenant.soft_blocked,
      },
      subscription: { status: sub?.status || 'inactive' },
      entitlements
    });
  } catch (e) {
    console.error('[limits/me] error:', e);
    return res.status(500).json({ ok:false, error: e.message || 'LIMITS_ERROR' });
  }
});

module.exports = router;
