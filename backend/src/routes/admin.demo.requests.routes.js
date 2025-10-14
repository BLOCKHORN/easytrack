'use strict';

const express = require('express');
const router = express.Router();
const requireSuperadmin = require('../middlewares/requireSuperadmin');
const { supabase: db, supabaseAdmin, supabaseAuth } = require('../utils/supabaseClient');

router.use(requireSuperadmin());

// ---------- Helpers ----------
const APP_BASE = (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const bad = (res, code, error, http = 400, extra = {}) => res.status(http).json({ ok:false, code, error, ...extra });
const ok  = (res, extra = {}) => res.json({ ok:true, ...extra });

function normalizeBase(b) {
  try {
    if (!b) return APP_BASE;
    const u = new URL(b);
    return `${u.protocol}//${u.host}${u.pathname}`.replace(/\/$/, '');
  } catch {
    return APP_BASE;
  }
}
function pickBase(req) {
  const fromBody  = req.body?.redirectTo;
  const fromQuery = req.query?.redirectTo;
  return normalizeBase(fromBody || fromQuery || APP_BASE);
}

async function getUserByEmail(email) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserByEmail(email);
    if (error) return null;
    return data?.user || null;
  } catch {
    return null;
  }
}

function has(method) {
  try { return !!method; } catch { return false; }
}

async function setNeedsPasswordTrue(userId, metadata = {}) {
  try {
    if (!userId) return;
    const meta = { ...metadata, needs_password: true };
    await supabaseAdmin.auth.admin.updateUserById(userId, { user_metadata: meta });
  } catch { /* noop */ }
}

// ========== LISTADO ==========
router.get('/demo-requests', async (req, res) => {
  try {
    const { q = '', status = '', page = 1, pageSize = 20 } = req.query;
    const from = (Number(page) - 1) * Number(pageSize);
    const to   = from + Number(pageSize) - 1;

    let query = db.from('demo_requests')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending:false })
      .range(from, to);

    if (status) query = query.eq('status', status);
    if (q) query = query.or(`email.ilike.%${q}%,company_name.ilike.%${q}%,city.ilike.%${q}%`);

    const { data, error, count } = await query;
    if (error) return bad(res, 'DB_ERROR', error.message);
    return ok(res, { data, count });
  } catch (e) {
    console.error('[GET /admin/demo-requests] Unexpected:', e);
    return bad(res, 'SERVER_ERROR', e.message || 'SERVER_ERROR', 500);
  }
});

// ========== DETALLE ==========
router.get('/demo-requests/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { data, error } = await db.from('demo_requests').select('*').eq('id', id).maybeSingle();
    if (error) return bad(res, 'DB_ERROR', error.message);
    if (!data) return bad(res, 'NOT_FOUND', 'NOT_FOUND', 404);
    return ok(res, { request: data });
  } catch (e) {
    console.error('[GET /admin/demo-requests/:id] Unexpected:', e);
    return bad(res, 'SERVER_ERROR', e.message || 'SERVER_ERROR', 500);
  }
});

// ========== ACEPTAR ==========
router.post('/demo-requests/:id/accept', async (req, res) => {
  const BASE = pickBase(req);
  const CREATE_PWD_URL = `${BASE}/crear-password`;
  try {
    const id = req.params.id;

    const { data: dr, error: e1 } = await db.from('demo_requests').select('*').eq('id', id).maybeSingle();
    if (e1) return bad(res, 'DB_ERROR', e1.message);
    if (!dr) return bad(res, 'NOT_FOUND', 'NOT_FOUND', 404);

    const email = String(dr.email || '').trim().toLowerCase();
    if (!email) return bad(res, 'INVALID', 'Email vacío en la solicitud.');
    const full_name = dr.full_name || dr.name || null;

    let user = await getUserByEmail(email);
    let action_link = null;
    let method = null;

    // Preferencia 1: inviteUserByEmail (envía email automáticamente)
    if (!user) {
      if (has(supabaseAdmin?.auth?.admin?.inviteUserByEmail)) {
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo: CREATE_PWD_URL,
        });
        if (error) return bad(res, 'INVITE_ERROR', error.message, 400, { base_used: BASE });
        user = data?.user || null;
        method = 'invite';
        await setNeedsPasswordTrue(user?.id, full_name ? { full_name } : {});
      } else {
        // Fallback: crear usuario + reenviar signup
        const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: false,
          user_metadata: { needs_password: true, ...(full_name ? { full_name } : {}) }
        });
        if (cErr) return bad(res, 'CREATE_USER_ERROR', cErr.message, 400, { base_used: BASE });
        user = created?.user || created || null;

        const { error: rErr } = await supabaseAuth.auth.resend({
          type: 'signup',
          email,
          options: { emailRedirectTo: CREATE_PWD_URL },
        });
        if (rErr) return bad(res, 'RESEND_SIGNUP_ERROR', rErr.message, 400, { base_used: BASE });
        method = 'resend_signup_created';
      }
    } else if (!user.email_confirmed_at) {
      // Usuario existe pero no confirmado → reenvío signup a /crear-password
      const { error } = await supabaseAuth.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: CREATE_PWD_URL },
      });
      if (error) return bad(res, 'RESEND_SIGNUP_ERROR', error.message, 400, { base_used: BASE });
      method = 'resend_signup';
      await setNeedsPasswordTrue(user.id, full_name ? { full_name } : {});
    } else {
      // Usuario confirmado → generar enlace de recovery a /crear-password
      if (!has(supabaseAdmin?.auth?.admin?.generateLink)) {
        return bad(res, 'ADMIN_SDK_TOO_OLD', 'Tu SDK no soporta admin.generateLink()', 500);
      }
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: CREATE_PWD_URL },
      });
      if (error) return bad(res, 'RECOVERY_LINK_ERROR', error.message, 400, { base_used: BASE });
      action_link = data?.properties?.action_link || null;
      method = 'recovery';
      await setNeedsPasswordTrue(user.id, full_name ? { full_name } : {});
    }

    const { error: e2 } = await db
      .from('demo_requests')
      .update({
        status: 'accepted',
        reviewed_at: new Date().toISOString(),
        supabase_user_id: user?.id || null,
      })
      .eq('id', id);
    if (e2) return bad(res, 'DB_ERROR', e2.message);

    return ok(res, { id, method, action_link, redirect_hint: CREATE_PWD_URL, base_used: BASE });
  } catch (e) {
    console.error('[POST /admin/demo-requests/:id/accept] Unexpected:', e);
    return bad(res, 'SERVER_ERROR', e.message || 'SERVER_ERROR', 500);
  }
});

// ========== REENVIAR ==========
router.post('/demo-requests/:id/resend', async (req, res) => {
  const BASE = pickBase(req);
  const CREATE_PWD_URL = `${BASE}/crear-password`;
  try {
    const id = req.params.id;

    const { data: dr, error: e1 } = await db.from('demo_requests').select('*').eq('id', id).maybeSingle();
    if (e1) return bad(res, 'DB_ERROR', e1.message);
    if (!dr) return bad(res, 'NOT_FOUND', 'NOT_FOUND', 404);

    const email = String(dr.email || '').trim().toLowerCase();
    const full_name = dr.full_name || dr.name || null;
    const user = await getUserByEmail(email);

    if (!user || !user.email_confirmed_at) {
      const { error } = await supabaseAuth.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: CREATE_PWD_URL },
      });
      if (error) return bad(res, 'RESEND_SIGNUP_ERROR', error.message, 400, { base_used: BASE });
      if (user?.id) await setNeedsPasswordTrue(user.id, full_name ? { full_name } : {});
      return ok(res, { method: 'resend_signup', base_used: BASE });
    } else {
      if (!has(supabaseAdmin?.auth?.admin?.generateLink)) {
        return bad(res, 'ADMIN_SDK_TOO_OLD', 'Tu SDK no soporta admin.generateLink()', 500);
      }
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: CREATE_PWD_URL },
      });
      if (error) return bad(res, 'RECOVERY_LINK_ERROR', error.message, 400, { base_used: BASE });
      await setNeedsPasswordTrue(user.id, full_name ? { full_name } : {});
      return ok(res, { method:'recovery', action_link: data?.properties?.action_link || null, base_used: BASE });
    }
  } catch (e) {
    console.error('[POST /admin/demo-requests/:id/resend] Unexpected:', e);
    return bad(res, 'SERVER_ERROR', e.message || 'SERVER_ERROR', 500);
  }
});

// ========== COPIAR ENLACE ==========
router.get('/demo-requests/:id/activation-link', async (req, res) => {
  const BASE = pickBase(req);
  const CREATE_PWD_URL = `${BASE}/crear-password`;
  try {
    const id = req.params.id;

    const { data: dr, error: e1 } = await db.from('demo_requests').select('*').eq('id', id).maybeSingle();
    if (e1) return bad(res, 'DB_ERROR', e1.message);
    if (!dr) return bad(res, 'NOT_FOUND', 'NOT_FOUND', 404);

    const email = String(dr.email || '').trim().toLowerCase();
    const full_name = dr.full_name || dr.name || null;
    let user = await getUserByEmail(email);

    if (!has(supabaseAdmin?.auth?.admin?.generateLink)) {
      return bad(res, 'ADMIN_SDK_TOO_OLD', 'Tu SDK no soporta admin.generateLink()', 500);
    }

    if (!user) {
      // Creamos usuario para poder generar un enlace válido
      const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: { needs_password: true, ...(full_name ? { full_name } : {}) }
      });
      if (cErr) return bad(res, 'CREATE_USER_ERROR', cErr.message, 400, { base_used: BASE });
      user = created?.user || created || null;
    }

    if (!user?.email_confirmed_at) {
      // Preferimos 'invite' si el SDK lo soporta
      try {
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
          type: 'invite',
          email,
          options: { redirectTo: CREATE_PWD_URL },
        });
        if (error) throw error;
        await setNeedsPasswordTrue(user.id, full_name ? { full_name } : {});
        return ok(res, { method:'invite', action_link: data?.properties?.action_link || null, base_used: BASE });
      } catch (e) {
        // Fallback: recovery (sirve para poner contraseña)
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: { redirectTo: CREATE_PWD_URL },
        });
        if (error) return bad(res, 'RECOVERY_LINK_ERROR', error.message, 400, { base_used: BASE });
        await setNeedsPasswordTrue(user.id, full_name ? { full_name } : {});
        return ok(res, { method:'recovery', action_link: data?.properties?.action_link || null, base_used: BASE });
      }
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: CREATE_PWD_URL },
      });
      if (error) return bad(res, 'RECOVERY_LINK_ERROR', error.message, 400, { base_used: BASE });
      await setNeedsPasswordTrue(user.id, full_name ? { full_name } : {});
      return ok(res, { method:'recovery', action_link: data?.properties?.action_link || null, base_used: BASE });
    }
  } catch (e) {
    console.error('[GET /admin/demo-requests/:id/activation-link] Unexpected:', e);
    return bad(res, 'SERVER_ERROR', e.message || 'SERVER_ERROR', 500);
  }
});

// ========== DECLINAR ==========
router.post('/demo-requests/:id/decline', async (req, res) => {
  try {
    const id = req.params.id;
    const { reason = '', purge = false } = req.body || {};
    if (purge) {
      const { error } = await db.from('demo_requests').delete().eq('id', id);
      if (error) return bad(res, 'DB_ERROR', error.message);
      return ok(res, { deleted: true });
    } else {
      const { data, error } = await db
        .from('demo_requests')
        .update({
          status: 'declined',
          review_notes: reason || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) return bad(res, 'DB_ERROR', error.message);
      return ok(res, { request: data });
    }
  } catch (e) {
    console.error('[POST /admin/demo-requests/:id/decline] Unexpected:', e);
    return bad(res, 'SERVER_ERROR', e.message || 'SERVER_ERROR', 500);
  }
});

// ========== ELIMINAR (hard delete) ==========
router.delete('/demo-requests/:id', async (req, res) => {
  try {
    const id = req.params.id;

    // Si hay FKs que impidan borrar, configura ON DELETE CASCADE en la DB
    // o cambia a soft-delete (deleted_at). Aquí hacemos hard delete directo.
    const { error } = await db
      .from('demo_requests')
      .delete()
      .eq('id', id);

    if (error) return bad(res, 'DB_ERROR', error.message);
    return ok(res, { deleted: true });
  } catch (e) {
    console.error('[DELETE /admin/demo-requests/:id] Unexpected:', e);
    return bad(res, 'SERVER_ERROR', e.message || 'SERVER_ERROR', 500);
  }
});

// ========== CONTADORES ==========
// Devuelve: total, pending, pending_unseen, accepted, declined
router.get('/demo-requests/counters', async (_req, res) => {
  try {
    const countExact = async (fn) => {
      const { count, error } = await fn.select('id', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    };

    const total = await countExact(db.from('demo_requests'));
    const pending = await countExact(db.from('demo_requests').eq('status', 'pending'));
    const pending_unseen = await countExact(
      db.from('demo_requests').eq('status', 'pending').is('reviewed_at', null)
    );
    const accepted = await countExact(db.from('demo_requests').eq('status', 'accepted'));
    const declined = await countExact(db.from('demo_requests').eq('status', 'declined'));

    return ok(res, { total, pending, pending_unseen, accepted, declined });
  } catch (e) {
    console.error('[GET /admin/demo-requests/counters] Unexpected:', e);
    return bad(res, 'SERVER_ERROR', e.message || 'SERVER_ERROR', 500);
  }
});


module.exports = router;
