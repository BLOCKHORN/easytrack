'use strict';
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { supabaseAdmin } = require('../utils/supabaseAdmin');
const { decrypt } = require('../utils/crypto');

router.post('/auth/activate', async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ ok: false, error: 'MISSING_TOKEN' });

    const { data: tok, error: err1 } = await supabaseAdmin
      .from('demo_activation_tokens')
      .select('id, request_id, used_at, expires_at')
      .eq('token', token)
      .maybeSingle();
    if (err1) return res.status(400).json({ ok: false, error: err1.message });
    if (!tok) return res.status(404).json({ ok: false, error: 'TOKEN_NOT_FOUND' });
    if (tok.used_at) return res.status(400).json({ ok: false, error: 'TOKEN_USED' });
    if (tok.expires_at && new Date(tok.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ ok: false, error: 'TOKEN_EXPIRED' });
    }

    const { data: reqData, error: err2 } = await supabaseAdmin
      .from('demo_requests')
      .select('*')
      .eq('id', tok.request_id)
      .maybeSingle();
    if (err2) return res.status(400).json({ ok: false, error: err2.message });
    if (!reqData) return res.status(404).json({ ok: false, error: 'REQUEST_NOT_FOUND' });

    // Crear usuario (si no existe)
    let userId = null;
    const plaintext = reqData.password_cipher ? decrypt(reqData.password_cipher) : crypto.randomBytes(12).toString('base64url');

    const { data: created, error: errCU } = await supabaseAdmin.auth.admin.createUser({
      email: reqData.email,
      password: plaintext,
      email_confirm: true,
    });

    if (errCU && !String(errCU.message || '').toLowerCase().includes('already registered')) {
      return res.status(400).json({ ok: false, error: 'CREATE_USER_FAILED: ' + errCU.message });
    }
    userId = created?.user?.id || null;

    // Crear tenant
    let tenant;
    const tenantPayload = {
      email: reqData.email,
      nombre_empresa: reqData.company_name || null,
      billing_name: reqData.company_name || reqData.full_name || null,
      billing_country: reqData.country_code || 'ES',
      billing_state: reqData.province || null,
      billing_city: reqData.city || null,
      billing_zip: reqData.postal_code || null,
      billing_address1: reqData.address || null,
      tax_id: reqData.cif || null,
      billing_email: reqData.email,
      is_business: true,
    };

    const ins = await supabaseAdmin.from('tenants').insert(tenantPayload).select().single();
    if (ins.error) {
      // si ya existe por email, lo reutilizamos
      const sel = await supabaseAdmin.from('tenants').select('*').eq('email', reqData.email).maybeSingle();
      if (sel.error || !sel.data) return res.status(400).json({ ok: false, error: ins.error.message });
      tenant = sel.data;
    } else {
      tenant = ins.data;
    }

    // membership (si tenemos userId)
    if (userId) {
      await supabaseAdmin.from('memberships').upsert(
        { user_id: userId, tenant_id: tenant.id, role: 'owner' },
        { onConflict: 'user_id,tenant_id' }
      );
    }

    // marcar token y request
    await supabaseAdmin.from('demo_activation_tokens').update({ used_at: new Date().toISOString() }).eq('id', tok.id);
    await supabaseAdmin.from('demo_requests').update({ status: 'activated', activated_at: new Date().toISOString() }).eq('id', reqData.id);

    res.json({ ok: true, tenant_id: tenant.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
});

module.exports = router;
