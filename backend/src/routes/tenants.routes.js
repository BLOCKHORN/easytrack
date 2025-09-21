'use strict';
const express = require('express');
const router = express.Router({ mergeParams: true });

const requireAuth = require('../middlewares/requireAuth');
const { supabase } = require('../utils/supabaseClient'); // RW normal

// Intentamos usar el admin “de /admin”; si no existe, caemos al admin del cliente común
let supabaseAdmin;
try {
  ({ supabaseAdmin } = require('../utils/supabaseAdmin')); // tu /admin
} catch {
  try {
    ({ supabaseAdmin } = require('../utils/supabaseClient')); // fallback
  } catch {
    supabaseAdmin = supabase; // último fallback (funciona si no tienes RLS estricta)
  }
}

const dbAdmin = supabaseAdmin || supabase; // usa admin cuando esté disponible
const { fetchSubscriptionForTenant } = require('../utils/subscription');
const { slugifyBase, uniqueSlug } = require('../helpers/slug');

// opcional: actualizar nombre
let actualizarTenantMe = null;
try {
  ({ actualizarTenantMe } = require('../controllers/tenants.controller'));
} catch { /* opcional */ }

/** Crea/asegura tenant por email (idempotente) */
async function ensureTenantByEmail(email) {
  const em = String(email || '').toLowerCase().trim();
  if (!em) return null;

  // lee con admin para evitar RLS
  const { data: exist } = await dbAdmin
    .from('tenants')
    .select('id, slug, nombre_empresa, email, updated_at')
    .ilike('email', em)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (exist) return exist;

  const base = slugifyBase(em.split('@')[0]);
  const slug = await uniqueSlug(dbAdmin, base);

  const { data, error } = await dbAdmin
    .from('tenants')
    .insert([{ email: em, nombre_empresa: base, slug }])
    .select('id, slug, nombre_empresa, email')
    .single();

  if (error) {
    // carrera: si falló el insert porque otro lo creó, re-lee
    const { data: again } = await dbAdmin
      .from('tenants')
      .select('id, slug, nombre_empresa, email')
      .ilike('email', em)
      .maybeSingle();
    return again || null;
  }
  return data;
}

/**
 * GET /api/tenants/me
 * - Requiere auth (NO bloquea por suscripción)
 * - Si no existe tenant, lo crea (auto-provisión)
 * - Acepta ?slug= para elegir explícito si el email gestiona varios
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const slugQ = req.query?.slug || null;

    // 1) si middleware ya resolvió tenant, úsalo
    if (req.tenant?.id) {
      const t = req.tenant;
      const subscription = await fetchSubscriptionForTenant(t.id);
      return res.json({ ok: true, tenant: { id: t.id, slug: t.slug, nombre_empresa: t.nombre_empresa, email: t.email }, subscription });
    }

    const email = String(req.user?.email || '').toLowerCase().trim();
    if (!email) return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED' });

    // 2) si viene ?slug, priorízalo; si no existe, cae a ensureTenantByEmail(email)
    if (slugQ) {
      const { data: t, error } = await dbAdmin
        .from('tenants')
        .select('id, slug, nombre_empresa, email')
        .eq('slug', slugQ)
        .maybeSingle();
      if (error)  return res.status(500).json({ ok: false, error: 'TENANT_LOOKUP_FAILED' });
      const tenant = t || await ensureTenantByEmail(email);
      if (!tenant) return res.status(500).json({ ok: false, error: 'TENANT_PROVISION_FAILED' });
      const subscription = await fetchSubscriptionForTenant(tenant.id);
      return res.json({ ok: true, tenant, subscription });
    }

    // 3) por email (o créalo si no existe)
    const tenant = await ensureTenantByEmail(email);
    if (!tenant) return res.status(500).json({ ok: false, error: 'TENANT_PROVISION_FAILED' });

    const subscription = await fetchSubscriptionForTenant(tenant.id);
    return res.json({ ok: true, tenant, subscription });
  } catch (err) {
    console.error('[tenants/me] Error inesperado:', err);
    return res.status(500).json({ ok: false, error: 'TENANT_ME_FAILED' });
  }
});

/** POST /api/tenants/me — actualizar nombre del negocio (si lo usas) */
router.post('/me', requireAuth, async (req, res, next) => {
  if (typeof actualizarTenantMe === 'function') return actualizarTenantMe(req, res, next);
  return res.status(501).json({ ok: false, error: 'Actualizar tenant no implementado' });
});

module.exports = router;
