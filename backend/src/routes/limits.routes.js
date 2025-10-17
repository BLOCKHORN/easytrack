// routes/limits.routes.js
'use strict';

const express = require('express');
const router = express.Router();
const requireAuth = require('../middlewares/requireAuth');

const { supabaseAdmin } = require('../utils/supabaseAdmin');
const {
  resolveTenantId,
  fetchSubscriptionForTenant,
  isSubscriptionActive,
} = require('../utils/subscription');

const { computeEntitlements } = require('../utils/entitlements');

router.get('/me', requireAuth, async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');

    // 👇 PRIMERO lo que ya resolvió el middleware
    let tenantId = req.tenant?.id || req.tenant_id || req.tenantId || null;

    // Si no lo tenemos, intenta helper genérico
    if (!tenantId) tenantId = await resolveTenantId(req);

    // Fallbacks (email owner / memberships)
    if (!tenantId) {
      const email = String(req.user?.email || '').toLowerCase().trim();
      if (email) {
        const { data: t } = await supabaseAdmin
          .from('tenants')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        tenantId = t?.id || tenantId;
      }
      if (!tenantId && req.user?.id) {
        const { data: mem } = await supabaseAdmin
          .from('memberships')
          .select('tenant_id')
          .eq('user_id', req.user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        tenantId = mem?.tenant_id || tenantId;
      }
    }

    if (!tenantId) {
      return res.status(404).json({ ok: false, error: 'TENANT_NOT_FOUND' });
    }

    const { data: tenant, error: tErr } = await supabaseAdmin
      .from('tenants')
      .select('id, slug, nombre_empresa, trial_active, trial_quota, trial_used, soft_blocked')
      .eq('id', tenantId)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!tenant) return res.status(404).json({ ok: false, error: 'TENANT_NOT_FOUND' });

    const sub = await fetchSubscriptionForTenant(tenant.id);
    const subState = isSubscriptionActive(sub);

    const quota = Number(tenant.trial_quota ?? 0);
    const used  = Number(tenant.trial_used ?? 0);
    const remaining = Math.max(0, quota - used);

    const entitlements = computeEntitlements({ tenant, subscription: sub });

    return res.json({
      ok: true,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        nombre_empresa: tenant.nombre_empresa,
      },
      limits: {
        trial_active: !!tenant.trial_active,
        trial_quota: quota,
        trial_used: used,
        remaining,
        soft_blocked: !!tenant.soft_blocked,
      },
      subscription: {
        active: subState.active,
        status: sub?.status || null,
        cancel_at_period_end: !!sub?.cancel_at_period_end,
        period_end: sub?.current_period_end || sub?.trial_ends_at || null,
      },
      entitlements,
    });
  } catch (e) {
    console.error('[limits/me] error', e);
    return res.status(500).json({ ok: false, error: e.message || 'LIMITS_ERROR' });
  }
});

module.exports = router;
