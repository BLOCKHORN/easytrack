'use strict';

const { supabaseAdmin } = require('../utils/supabaseClient');
const { resolveTenantId, fetchSubscriptionForTenant } = require('../utils/subscription');
const { computeEntitlements } = require('../utils/entitlements');
const { isDirectPg, query } = require('../utils/db');

exports.getLimitsMe = async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');

    let tenantId = req.tenant?.id || req.tenant_id || req.tenantId || null;

    if (!tenantId) tenantId = await resolveTenantId(req);

    if (!tenantId) {
      const email = String(req.user?.email || '').toLowerCase().trim();
      if (email) {
        if (isDirectPg()) {
          const { rows: tRows } = await query('SELECT id FROM public.tenants WHERE email ILIKE $1 LIMIT 1', [email]);
          tenantId = tRows[0]?.id || tenantId;
        } else {
          const { data: t } = await supabaseAdmin.from('tenants').select('id').eq('email', email).maybeSingle();
          tenantId = t?.id || tenantId;
        }
      }
      if (!tenantId && req.user?.id) {
        if (isDirectPg()) {
          const { rows: memRows } = await query('SELECT tenant_id FROM public.memberships WHERE user_id = $1 LIMIT 1', [req.user.id]);
          tenantId = memRows[0]?.tenant_id || tenantId;
        } else {
          const { data: mem } = await supabaseAdmin.from('memberships').select('tenant_id').eq('user_id', req.user.id).limit(1).maybeSingle();
          tenantId = mem?.tenant_id || tenantId;
        }
      }
    }

    if (!tenantId) return res.status(404).json({ ok: false, error: 'TENANT_NOT_FOUND' });

    let tenant = null;
    if (isDirectPg()) {
      const { rows: tRows } = await query(
        'SELECT id, slug, nombre_empresa, trial_quota, trial_used, soft_blocked, plan_id, requested_plan, is_ai_active, ai_trial_ends_at, ai_trial_used, fecha_creacion FROM public.tenants WHERE id = $1 LIMIT 1',
        [tenantId]
      );
      tenant = tRows[0] || null;
    } else {
      const { data: t, error: tErr } = await supabaseAdmin
        .from('tenants')
        .select('id, slug, nombre_empresa, trial_quota, trial_used, soft_blocked, plan_id, requested_plan, is_ai_active, ai_trial_ends_at, ai_trial_used, fecha_creacion')
        .eq('id', tenantId)
        .maybeSingle();
      if (tErr) throw tErr;
      tenant = t;
    }

    if (!tenant) return res.status(404).json({ ok: false, error: 'TENANT_NOT_FOUND' });

    const sub = await fetchSubscriptionForTenant(tenant.id);
    const entitlements = computeEntitlements({ tenant, subscription: sub });

    return res.json({
      ok: true,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        nombre_empresa: tenant.nombre_empresa,
        plan_id: tenant.plan_id,
        is_ai_active: tenant.is_ai_active
      },
      limits: {
        trial_quota: entitlements.trial.quota,
        trial_used: entitlements.trial.used,
        remaining: entitlements.trial.remaining,
        soft_blocked: entitlements.soft_blocked,
      },
      subscription: {
        active: entitlements.subscriptionActive,
        status: sub?.status || null,
        cancel_at_period_end: !!sub?.cancel_at_period_end,
        period_end: sub?.current_period_end || null,
      },
      entitlements,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message || 'LIMITS_ERROR' });
  }
};