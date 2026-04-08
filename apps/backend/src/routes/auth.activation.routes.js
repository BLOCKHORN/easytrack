'use strict';
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../utils/supabaseAdmin');

router.post('/auth/activate', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ ok: false, error: 'Token requerido' });

    const { data: tok } = await supabaseAdmin
      .from('demo_activation_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (!tok || tok.used_at) return res.status(400).json({ ok: false, error: 'Token inválido' });

    // Aquí simplemente marcamos el token como usado, el frontend hará el registro normal 
    // y el bootstrap heredará la configuración de la demo.
    await supabaseAdmin.from('demo_activation_tokens').update({ used_at: new Date().toISOString() }).eq('id', tok.id);

    return res.json({ ok: true, message: 'Token validado' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;