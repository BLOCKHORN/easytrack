'use strict';
const express = require('express');
const router = express.Router();

const requireSuperadmin = require('../middlewares/requireSuperadmin');
const { supabaseAdmin } = require('../utils/supabaseAdmin');
const { auditLog } = require('../utils/audit');

/**
 * Todo lo que cuelga de /admin requiere rol superadmin.
 * (El middleware valida el JWT de Supabase con SUPABASE_JWT_SECRET
 *  y revisa la tabla public.staff_users).
 */
router.use(requireSuperadmin());

/* =========================================================
   Utilidades / diagnóstico
   ========================================================= */
router.get('/whoami', async (req, res) => {
  // útil para probar el acceso desde el panel
  res.json({ ok: true, user_id: req.superadmin.userId, role: req.superadmin.role });
});

/* =========================================================
   Tenants
   ========================================================= */

/**
 * GET /admin/tenants
 *   ?q=texto&page=1&pageSize=20
 */
// LISTA DE TENANTS
router.get('/tenants', async (req, res) => {
  const DEBUG = process.env.DEBUG_ADMIN === '1';
  try {
    const { q = '', page = 1, pageSize = 20 } = req.query;
    const from = (Number(page) - 1) * Number(pageSize);
    const to = from + Number(pageSize) - 1;

    // En tu esquema: tenants(id, email, nombre_empresa, rol, fecha_creacion, imagen_fondo, slug, stripe_customer_id)
    let qy = supabaseAdmin
      .from('tenants')
      .select('*', { count: 'exact' })
      .order('fecha_creacion', { ascending: false })   // <- CORRECTO para tu tabla
      .range(from, to);

    if (q) {
      const like = `%${q}%`;
      // SOLO columnas que existen en tu tabla:
      qy = qy.or(
        [
          'nombre_empresa.ilike.' + like,
          'slug.ilike.'           + like,
          'email.ilike.'          + like,
          'stripe_customer_id.ilike.' + like
        ].join(',')
      );
    }

    const { data, count, error } = await qy;
    if (error) throw error;
    res.json({ data, count, page: Number(page), pageSize: Number(pageSize) });
  } catch (e) {
    console.error('TENANTS_LIST_FAILED:', e);
    // En local puedes exponer detalle para depurar
    const payload = { error: 'TENANTS_LIST_FAILED' };
    if (process.env.DEBUG_ADMIN === '1') payload.detail = e.message || String(e);
    res.status(500).json(payload);
  }
});


/**
 * GET /admin/tenants/:id
 *   Devuelve tenant + su suscripción actual (si existe)
 */
router.get('/tenants/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const [t, s] = await Promise.all([
      supabaseAdmin.from('tenants').select('*').eq('id', id).maybeSingle(),
      supabaseAdmin.from('subscriptions').select('*').eq('tenant_id', id).maybeSingle(),
    ]);
    if (t.error) throw t.error;
    if (s.error) throw s.error;
    res.json({ tenant: t.data, subscription: s.data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'TENANT_DETAIL_FAILED' });
  }
});

/**
 * POST /admin/tenants/:id/subscription/extend
 * body: { days: number }
 */
router.post('/tenants/:id/subscription/extend', async (req, res) => {
  try {
    const tenant_id = req.params.id;
    const { days = 30 } = req.body;

    const { data: sub, error: e1 } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', tenant_id)
      .maybeSingle();
    if (e1) throw e1;

    const newEnd = sub?.current_period_end ? new Date(sub.current_period_end) : new Date();
    newEnd.setDate(newEnd.getDate() + Number(days));

    const { data, error: e2 } = await supabaseAdmin
      .from('subscriptions')
      .update({ current_period_end: newEnd.toISOString() })
      .eq('tenant_id', tenant_id)
      .select()
      .maybeSingle();
    if (e2) throw e2;

    await auditLog({
      actor_user_id: req.superadmin.userId,
      actor_role: req.superadmin.role,
      tenant_id,
      action: 'SUBSCRIPTION_EXTEND',
      target_table: 'subscriptions',
      target_id: data?.id ?? null,
      diff: { days },
      req,
    });

    res.json({ ok: true, subscription: data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SUBSCRIPTION_EXTEND_FAILED' });
  }
});

/**
 * POST /admin/tenants/:id/subscription/set-plan
 * body: { plan: string, status?: 'active'|'past_due'|'canceled' }
 */
router.post('/tenants/:id/subscription/set-plan', async (req, res) => {
  try {
    const tenant_id = req.params.id;
    const { plan, status } = req.body;

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update({ plan, status })
      .eq('tenant_id', tenant_id)
      .select()
      .maybeSingle();
    if (error) throw error;

    await auditLog({
      actor_user_id: req.superadmin.userId,
      actor_role: req.superadmin.role,
      tenant_id,
      action: 'SUBSCRIPTION_SET_PLAN',
      target_table: 'subscriptions',
      target_id: data?.id ?? null,
      diff: { plan, status },
      req,
    });

    res.json({ ok: true, subscription: data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SUBSCRIPTION_SET_PLAN_FAILED' });
  }
});

/* =========================================================
   Impersonación (operator_sessions)
   ========================================================= */

/**
 * POST /admin/assume-tenant
 * body: { tenant_id: uuid, reason?: string, minutes?: number }
 */
router.post('/assume-tenant', async (req, res) => {
  try {
    const { tenant_id, reason = null, minutes = 60 } = req.body;
    const expires = new Date(Date.now() + minutes * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('operator_sessions')
      .insert([{ actor_user_id: req.superadmin.userId, tenant_id, reason, expires_at: expires }])
      .select()
      .maybeSingle();
    if (error) throw error;

    await auditLog({
      actor_user_id: req.superadmin.userId,
      actor_role: req.superadmin.role,
      tenant_id,
      action: 'ASSUME_TENANT',
      target_table: 'operator_sessions',
      target_id: data?.id ?? null,
      diff: { minutes },
      req,
    });

    res.json({ ok: true, session: data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'ASSUME_TENANT_FAILED' });
  }
});

/**
 * POST /admin/end-assume
 * body: { session_id: number }
 */
router.post('/end-assume', async (req, res) => {
  try {
    const { session_id } = req.body;

    const { data, error } = await supabaseAdmin
      .from('operator_sessions')
      .update({ active: false })
      .eq('id', session_id)
      .eq('actor_user_id', req.superadmin.userId)
      .select()
      .maybeSingle();
    if (error) throw error;

    await auditLog({
      actor_user_id: req.superadmin.userId,
      actor_role: req.superadmin.role,
      tenant_id: data?.tenant_id ?? null,
      action: 'END_ASSUME_TENANT',
      target_table: 'operator_sessions',
      target_id: session_id,
      req,
    });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'END_ASSUME_FAILED' });
  }
});
// CANCELAR SUSCRIPCIÓN (al final de periodo o inmediata)
router.post('/tenants/:id/subscription/cancel', async (req, res) => {
  try {
    const tenant_id = req.params.id;
    const { at_period_end = true } = req.body || {};

    // Buscar suscripción actual del tenant
    const { data: sub, error: e1 } = await supabaseAdmin
      .from('subscriptions').select('*').eq('tenant_id', tenant_id).maybeSingle();
    if (e1) throw e1;
    if (!sub) return res.status(404).json({ error: 'SUBSCRIPTION_NOT_FOUND' });

    const patch = { cancel_at_period_end: !!at_period_end };
    if (!at_period_end) {
      // Cancelación inmediata
      patch.status = 'canceled';
      patch.current_period_end = new Date().toISOString();
    }

    const { data, error: e2 } = await supabaseAdmin
      .from('subscriptions')
      .update(patch)
      .eq('tenant_id', tenant_id)
      .select().maybeSingle();
    if (e2) throw e2;

    await auditLog({
      actor_user_id: req.superadmin.userId,
      actor_role: req.superadmin.role,
      tenant_id,
      action: 'SUBSCRIPTION_CANCEL',
      target_table: 'subscriptions',
      target_id: data?.id ?? null,
      diff: { at_period_end },
      req
    });

    res.json({ ok: true, subscription: data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SUBSCRIPTION_CANCEL_FAILED' });
  }
});

// REANUDAR (quitar cancel_at_period_end y marcar activa)
router.post('/tenants/:id/subscription/resume', async (req, res) => {
  try {
    const tenant_id = req.params.id;

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update({ cancel_at_period_end: false, status: 'active' })
      .eq('tenant_id', tenant_id)
      .select().maybeSingle();
    if (error) throw error;

    await auditLog({
      actor_user_id: req.superadmin.userId,
      actor_role: req.superadmin.role,
      tenant_id,
      action: 'SUBSCRIPTION_RESUME',
      target_table: 'subscriptions',
      target_id: data?.id ?? null,
      req
    });

    res.json({ ok: true, subscription: data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SUBSCRIPTION_RESUME_FAILED' });
  }
});

// EDITAR FECHAS MANUALMENTE
router.post('/tenants/:id/subscription/set-dates', async (req, res) => {
  try {
    const tenant_id = req.params.id;
    let { current_period_start, current_period_end, trial_ends_at } = req.body || {};

    // helper para parsear ISO/fecha
    const toISO = v => {
      if (!v) return undefined;
      const d = new Date(v);
      if (isNaN(d.getTime())) throw new Error('INVALID_DATE_' + v);
      return d.toISOString();
    };

    const patch = {};
    if (current_period_start != null) patch.current_period_start = toISO(current_period_start);
    if (current_period_end   != null) patch.current_period_end   = toISO(current_period_end);
    if (trial_ends_at        != null) patch.trial_ends_at        = toISO(trial_ends_at);

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update(patch)
      .eq('tenant_id', tenant_id)
      .select().maybeSingle();
    if (error) throw error;

    await auditLog({
      actor_user_id: req.superadmin.userId,
      actor_role: req.superadmin.role,
      tenant_id,
      action: 'SUBSCRIPTION_SET_DATES',
      target_table: 'subscriptions',
      target_id: data?.id ?? null,
      diff: patch,
      req
    });

    res.json({ ok: true, subscription: data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SUBSCRIPTION_SET_DATES_FAILED' });
  }
});

/* =========================================================
   Subrutas del panel (explorador de datos, auditoría, usuarios)
   ========================================================= */

// Todas heredan requireSuperadmin() porque se montan después del router.use de arriba
router.use('/data', require('./admin.data.routes'));   // GET /admin/data/tables, /admin/data/:table, PATCH /admin/data/:table/:id
router.use('/audit', require('./admin.audit.routes')); // GET /admin/audit
router.use('/auth', require('./admin.auth.routes'));   // GET /admin/auth/users, POST /admin/auth/users/send-reset, ...

module.exports = router;
