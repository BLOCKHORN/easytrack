// backend/src/routes/auth.routes.js
'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const router = express.Router();
const { supabaseAuth } = require('../utils/supabaseClient');

/* ---------- Config de URLs (prod/dev) ---------- */
const APP_BASE = (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
  .replace(/\/$/, '');
const EMAIL_CONFIRM_URL = `${APP_BASE}/email-confirmado`;

/* ---------- Rate limit para frenar fuerza bruta ---------- */
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 20,                  // 20 intentos/10min por IP
  message: { ok: false, code: 'TOO_MANY_REQUESTS', error: 'Demasiados intentos. Prueba en unos minutos.' }
});

/* ---------- Validaciones ---------- */
const credsSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres')
});

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  nombre_empresa: z.string().min(2, 'Indica el nombre de tu empresa'),
  termsAccepted: z.boolean().refine(v => v === true, 'Debes aceptar los términos'),
  marketingOptIn: z.boolean().optional()
});

/* =========================================================
   🔐 Login tradicional (email/contraseña)
   ========================================================= */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const parsed = credsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, code: 'VALIDATION_ERROR', error: parsed.error.issues[0].message });
    }

    const email = String(parsed.data.email).toLowerCase().trim();
    const password = parsed.data.password;

    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });

    if (error) {
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('email not confirmed')) {
        return res.status(401).json({ ok: false, code: 'EMAIL_NOT_CONFIRMED', error: 'Tu email no está confirmado.' });
      }
      if (msg.includes('invalid login credentials')) {
        return res.status(401).json({ ok: false, code: 'BAD_CREDENTIALS', error: 'Credenciales incorrectas.' });
      }
      return res.status(401).json({ ok: false, code: 'AUTH_ERROR', error: 'No se pudo iniciar sesión.' });
    }

    return res.status(200).json({ ok: true, session: data.session, user: data.user });
  } catch (e) {
    console.error('[login] Unexpected:', e);
    return res.status(500).json({ ok: false, code: 'SERVER_ERROR', error: 'Error interno.' });
  }
});

/* =========================================================
   📝 Registro (con nombre_empresa y términos)
   ========================================================= */
router.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, code: 'VALIDATION_ERROR', error: parsed.error.issues[0].message });
    }

    const { email: rawEmail, password, nombre_empresa, marketingOptIn } = parsed.data;
    const email = String(rawEmail).toLowerCase().trim();

    const { data, error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: EMAIL_CONFIRM_URL,
        data: { nombre_empresa, marketingOptIn: !!marketingOptIn }
      }
    });

    if (error) {
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('user already registered')) {
        return res.status(200).json({
          ok: true,
          message: 'Ya hay una cuenta con ese email. Si no confirmaste, reenvía el correo.'
        });
      }
      return res.status(400).json({ ok: false, code: 'REGISTER_ERROR', error: error.message });
    }

    return res.status(200).json({
      ok: true,
      message: 'Registro correcto. Revisa tu correo para confirmar la cuenta.'
    });
  } catch (e) {
    console.error('[register] Unexpected:', e);
    return res.status(500).json({ ok: false, code: 'SERVER_ERROR', error: 'Error interno.' });
  }
});

/* =========================================================
   🔁 Reenviar email de confirmación
   ========================================================= */
router.post('/resend-confirmation', async (req, res) => {
  try {
    const emailSchema = z.object({ email: z.string().email() });
    const parsed = emailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, code: 'VALIDATION_ERROR', error: 'Email inválido.' });
    }

    const email = String(parsed.data.email).toLowerCase().trim();

    const { error } = await supabaseAuth.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: EMAIL_CONFIRM_URL }
    });

    if (error) {
      return res.status(400).json({ ok: false, code: 'RESEND_ERROR', error: 'No se pudo reenviar el correo.' });
    }
    return res.json({ ok: true, message: 'Te hemos reenviado el correo de confirmación.' });
  } catch (e) {
    console.error('[resend-confirmation] Unexpected:', e);
    return res.status(500).json({ ok: false, code: 'SERVER_ERROR', error: 'Error interno.' });
  }
});

/* =========================================================
   🔑 Login con Google (redirección)
   ========================================================= */
router.get('/login-google', (req, res) => {
  const redirectUrl =
    `${process.env.SUPABASE_URL}/auth/v1/authorize` +
    `?provider=google` +
    `&redirect_to=${encodeURIComponent(EMAIL_CONFIRM_URL)}`;
  res.redirect(redirectUrl);
});

module.exports = router;
