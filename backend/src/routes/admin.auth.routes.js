'use strict';
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../utils/supabaseAdmin');
const { auditLog } = require('../utils/audit');

router.get('/users', async (req, res) => {
  try {
    const { q='' } = req.query;
    // listUsers es paginado; para demo cogemos primeras 100
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (error) throw error;

    const items = (data?.users || []).filter(u =>
      !q ? true : (u.email?.toLowerCase().includes(q.toLowerCase()))
    ).map(u => ({ id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at }));
    res.json({ users: items });
  } catch (e) { console.error(e); res.status(500).json({ error:'AUTH_USERS_FAILED' }); }
});

router.post('/users/send-reset', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error:'EMAIL_REQUIRED' });
    const redirectTo = process.env.FRONTEND_URL || 'http://localhost:5173';
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery', email, options: { redirectTo }
    });
    if (error) throw error;

    await auditLog({
      actor_user_id: req.superadmin.userId, actor_role: req.superadmin.role,
      tenant_id: null, action:'AUTH_SEND_RESET', target_table:'auth.users', target_id: email, diff:null, req
    });

    // Devolvemos el link directo para usarlo manualmente si hace falta
    res.json({ ok:true, link: data?.properties?.action_link || null });
  } catch (e) { console.error(e); res.status(500).json({ error:'AUTH_SEND_RESET_FAILED' }); }
});

router.post('/users/impersonate-link', async (req, res) => {
  try {
    const { email, tenant_id=null, reason='Soporte', minutes=30 } = req.body;
    if (!email) return res.status(400).json({ error:'EMAIL_REQUIRED' });

    const redirectTo = process.env.FRONTEND_URL || 'http://localhost:5173';
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type:'magiclink', email, options:{ redirectTo }
    });
    if (error) throw error;

    // opcional: guardamos una operator_session
    const expires = new Date(Date.now() + minutes*60*1000).toISOString();
    await supabaseAdmin.from('operator_sessions').insert([{
      actor_user_id: req.superadmin.userId, tenant_id, reason, expires_at: expires
    }]);

    await auditLog({
      actor_user_id: req.superadmin.userId, actor_role: req.superadmin.role,
      tenant_id, action:'AUTH_IMPERSONATE_LINK', target_table:'auth.users', target_id: email, diff:{ minutes }, req
    });

    res.json({ ok:true, link: data?.properties?.action_link || null });
  } catch (e) { console.error(e); res.status(500).json({ error:'AUTH_IMPERSONATE_FAILED' }); }
});

module.exports = router;
