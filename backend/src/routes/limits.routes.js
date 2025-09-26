// src/routes/limits.routes.js
'use strict';

const express = require('express');
const router = express.Router();
const requireAuth = require('../middlewares/requireAuth');

const { supabaseAdmin } = require('../utils/supabaseAdmin');
const {
  resolveTenantId,
  fetchSubscriptionForTenant, // lee desde v_current_subscription con service role
  isSubscriptionActive,       // calcula active usando coalesce(period_end, trial_ends_at)
} = require('../utils/subscription');

const { computeEntitlements } = require('../utils/entitlements');

router.get('/me', requireAuth, async (req, res) => {
  try {
    // Fuerza respuesta JSON (evita HTML en caso de 401/402)
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');

    // 1) Resolver tenant id de forma robusta (slug/header/email/memberships)
    let tenantId = req.tenantId || null;
    if (!tenantId) tenantId = await resolveTenantId(req);

    if (!tenantId) {
      // fallback por email (owner) o memberships por user_id
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

    // 2) Cargar tenant (service role, sin RLS)
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from('tenants')
      .select('id, slug, nombre_empresa, trial_active, trial_quota, trial_used, soft_blocked')
      .eq('id', tenantId)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!tenant) return res.status(404).json({ ok: false, error: 'TENANT_NOT_FOUND' });

    // 3) Cargar suscripción vigente (vista v_current_subscription)
    const sub = await fetchSubscriptionForTenant(tenant.id);
    const subState = isSubscriptionActive(sub);

    // 4) Límite de prueba
    const quota = Number(tenant.trial_quota ?? 0);
    const used  = Number(tenant.trial_used ?? 0);
    const remaining = Math.max(0, quota - used);

    // 5) Entitlements coherentes con UI
    const entitlements = computeEntitlements({ tenant, subscription: sub });

    // 6) Respuesta para TrialBanner.jsx
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
        active: subState.active,                                      // 👈 clave para ocultar banner
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
