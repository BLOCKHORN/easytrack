'use strict';
const express = require('express');
const router = express.Router({ mergeParams: true });

const requireAuth = require('../middlewares/requireAuth');
const { supabase } = require('../utils/supabaseClient');
const { computeEntitlements } = require('../utils/entitlements');

let supabaseAdmin;
try {
  ({ supabaseAdmin } = require('../utils/supabaseAdmin'));
} catch {
  try {
    ({ supabaseAdmin } = require('../utils/supabaseClient'));
  } catch {
    supabaseAdmin = supabase;
  }
}
const dbAdmin = supabaseAdmin || supabase;

const { fetchSubscriptionForTenant } = require('../utils/subscription');
const { slugifyBase, uniqueSlug } = require('../helpers/slug');

let actualizarTenantMe = null;
try {
  ({ actualizarTenantMe } = require('../controllers/tenants.controller'));
} catch {}

const TENANT_FIELDS = 'id, slug, nombre_empresa, email, trial_quota, trial_used, soft_blocked, plan_id, requested_plan, is_ai_active, ai_trial_ends_at, ai_trial_used';

async function ensureTenantByEmail(email) {
  const em = String(email || '').toLowerCase().trim();
  if (!em) return null;

  const { data: exist } = await dbAdmin
    .from('tenants')
    .select(`${TENANT_FIELDS}, updated_at`)
    .ilike('email', em)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (exist) return exist;

  const base = slugifyBase(em.split('@')[0]);
  const slug = await uniqueSlug(dbAdmin, base);

  const { data, error } = await dbAdmin
    .from('tenants')
    .insert([{ email: em, nombre_empresa: base, slug, plan_id: 'free' }])
    .select(TENANT_FIELDS)
    .single();

  if (error) {
    const { data: again } = await dbAdmin
      .from('tenants')
      .select(TENANT_FIELDS)
      .ilike('email', em)
      .maybeSingle();
    return again || null;
  }
  return data;
}

router.get('/me', requireAuth, async (req, res) => {
  try {
    const slugQ = req.query?.slug || null;

    if (req.tenant?.id) {
      const { data: t, error: terr } = await dbAdmin
        .from('tenants')
        .select(TENANT_FIELDS)
        .eq('id', req.tenant.id)
        .maybeSingle();
      if (terr) return res.status(500).json({ ok:false, error:'TENANT_LOOKUP_FAILED' });
      if (!t)  return res.status(404).json({ ok:false, error:'TENANT_NOT_FOUND' });

      const subscription = await fetchSubscriptionForTenant(t.id);
      const entitlements = computeEntitlements({ tenant: t, subscription });
      return res.json({ ok: true, tenant: t, subscription, entitlements });
    }

    const email = String(req.user?.email || '').toLowerCase().trim();
    if (!email) return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED' });

    if (slugQ) {
      const { data: t, error } = await dbAdmin
        .from('tenants')
        .select(TENANT_FIELDS)
        .eq('slug', slugQ)
        .maybeSingle();
      if (error)  return res.status(500).json({ ok: false, error: 'TENANT_LOOKUP_FAILED' });
      const tenant = t || await ensureTenantByEmail(email);
      if (!tenant) return res.status(500).json({ ok: false, error: 'TENANT_PROVISION_FAILED' });
      const subscription = await fetchSubscriptionForTenant(tenant.id);
      const entitlements = computeEntitlements({ tenant, subscription });
      return res.json({ ok: true, tenant, subscription, entitlements });
    }

    const tenant = await ensureTenantByEmail(email);
    if (!tenant) return res.status(500).json({ ok: false, error: 'TENANT_PROVISION_FAILED' });

    const subscription = await fetchSubscriptionForTenant(tenant.id);
    const entitlements = computeEntitlements({ tenant, subscription });
    return res.json({ ok: true, tenant, subscription, entitlements });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'TENANT_ME_FAILED' });
  }
});

router.post('/me', requireAuth, async (req, res, next) => {
  if (typeof actualizarTenantMe === 'function') return actualizarTenantMe(req, res, next);
  return res.status(501).json({ ok: false, error: 'Actualizar tenant no implementado' });
});

module.exports = router;