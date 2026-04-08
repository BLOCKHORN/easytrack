// routes/admin.tenants.routes.js
'use strict';
const express = require('express');
const requireAuth = require('../middlewares/requireAuth');
const { supabase } = require('../utils/supabaseClient');
const { fetchSubscriptionForTenant } = require('../utils/subscription');
const { computeEntitlements } = require('../utils/entitlements');

const router = express.Router();

/** Ajusta a tu sistema real de roles admin */
async function requireAdmin(_req, _res, next) {
  return next();
}

/** GET estado billing de un tenant (tenant + sub + entitlements) */
router.get('/:tenantId/billing-state', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tenantId = req.params.tenantId;

    const { data: tenant, error: terr } = await supabase
      .from('tenants')
      .select('id, slug, email, nombre_empresa, trial_active, trial_quota, trial_used, trial_ends_at, soft_blocked')
      .eq('id', tenantId)
      .maybeSingle();
    if (terr) throw terr;
    if (!tenant) return res.status(404).json({ ok:false, error:'TENANT_NOT_FOUND' });

    const subscription = await fetchSubscriptionForTenant(tenantId);
    const entitlements = computeEntitlements({ tenant, subscription });

    return res.json({ ok:true, tenant, subscription, entitlements });
  } catch (e) {
    return res.status(500).json({ ok:false, error: e.message || 'STATE_ERROR' });
  }
});

/** POST toggles trial (active / ends_at / quota) */
router.post('/:tenantId/trial', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tenantId = req.params.tenantId;
    const { active, ends_at, quota } = req.body || {};

    const patch = {};
    if (typeof active === 'boolean') patch.trial_active = active;
    if (ends_at === null) patch.trial_ends_at = null;
    else if (typeof ends_at === 'string' && ends_at.trim()) patch.trial_ends_at = new Date(ends_at).toISOString();
    if (Number.isFinite(quota)) patch.trial_quota = Number(quota);

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ ok:false, error:'BODY_EMPTY' });
    }

    const { error } = await supabase.from('tenants').update(patch).eq('id', tenantId);
    if (error) throw error;

    return res.json({ ok:true });
  } catch (e) {
    return res.status(500).json({ ok:false, error: e.message || 'TRIAL_UPDATE_ERROR' });
  }
});

/** POST soft-block ON/OFF */
router.post('/:tenantId/block', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tenantId = req.params.tenantId;
    const { soft_blocked } = req.body || {};
    if (typeof soft_blocked !== 'boolean') return res.status(400).json({ ok:false, error:'soft_blocked boolean requerido' });

    const { error } = await supabase.from('tenants').update({ soft_blocked }).eq('id', tenantId);
    if (error) throw error;

    return res.json({ ok:true });
  } catch (e) {
    return res.status(500).json({ ok:false, error: e.message || 'BLOCK_UPDATE_ERROR' });
  }
});

module.exports = router;
