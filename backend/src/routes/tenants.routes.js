'use strict';
const express = require('express');
const router = express.Router({ mergeParams: true });

const requireAuth = require('../middlewares/requireAuth');
const { supabaseAdmin } = require('../utils/supabaseAdmin');
const { fetchSubscriptionForTenant } = require('../utils/subscription');

// Si tienes controlador para actualizar
let actualizarTenantMe = null;
try {
  ({ actualizarTenantMe } = require('../controllers/tenants.controller'));
} catch { /* opcional */ }

/**
 * GET /api/tenants/me
 * - Solo auth (NO chequeo de suscripción)
 * - Acepta ?slug= para escoger tenant explícito si el email administra varios
 * - Devuelve { tenant, subscription }
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const slugQ = req.query?.slug || null;

    // 1) Si un middleware previo ya resolvió req.tenant, úsalo
    if (req.tenant?.id) {
      const { id, slug, nombre_empresa, email } = req.tenant;
      const subscription = await fetchSubscriptionForTenant(id);
      return res.json({ ok: true, tenant: { id, slug, nombre_empresa, email }, subscription });
    }

    // 2) Si viene slug explícito, priorízalo
    if (slugQ) {
      const { data: t, error } = await supabaseAdmin
        .from('tenants')
        .select('id, slug, nombre_empresa, email')
        .eq('slug', slugQ)
        .maybeSingle();
      if (error)  return res.status(500).json({ ok: false, error: 'TENANT_LOOKUP_FAILED' });
      if (!t)     return res.status(404).json({ ok: false, error: 'TENANT_NOT_FOUND' });
      const subscription = await fetchSubscriptionForTenant(t.id);
      return res.json({ ok: true, tenant: t, subscription });
    }

    // 3) Por email del usuario autenticado (elige el más reciente)
    const email = String(req.user?.email || '').toLowerCase().trim();
    if (!email) return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED' });

    const { data: t, error } = await supabaseAdmin
      .from('tenants')
      .select('id, slug, nombre_empresa, email, updated_at')
      .ilike('email', email)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return res.status(500).json({ ok: false, error: 'TENANT_LOOKUP_FAILED' });
    if (!t)    return res.status(404).json({ ok: false, error: 'TENANT_NOT_FOUND' });

    const subscription = await fetchSubscriptionForTenant(t.id);
    return res.json({ ok: true, tenant: t, subscription });
  } catch (err) {
    console.error('[tenants/me] Error inesperado:', err);
    return res.status(500).json({ ok: false, error: 'TENANT_ME_FAILED' });
  }
});

/**
 * POST /api/tenants/me — actualizar nombre del negocio
 */
router.post('/me', requireAuth, async (req, res, next) => {
  if (typeof actualizarTenantMe === 'function') return actualizarTenantMe(req, res, next);
  return res.status(501).json({ ok: false, error: 'Actualizar tenant no implementado' });
});

module.exports = router;
