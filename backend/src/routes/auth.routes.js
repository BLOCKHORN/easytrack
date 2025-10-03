'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const router = express.Router();

// Clientes: supabaseAuth = anon, supabase = service-role
const { supabaseAuth, supabase } = require('../utils/supabaseClient');
const requireAuth = require('../middlewares/requireAuth');
const { slugifyBase, uniqueSlug } = require('../helpers/slug');

/* ---------- Config de URLs ---------- */
const APP_BASE = (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
  .replace(/\/$/, '');
const EMAIL_CONFIRM_URL = `${APP_BASE}/auth/email-confirmado`;
const RECOVERY_URL      = `${APP_BASE}/crear-password`;

// Muestra action links de debug si lo activas (NO en prod)
const EXPOSE_DEBUG_LINKS = String(process.env.EXPOSE_DEBUG_LINKS || '').toLowerCase() === 'true';

// ⚠️ Nuevo: desactiva el reset “automático” al registrarse con cuenta ya existente
const ALLOW_REGISTER_RESET_FALLBACK =
  String(process.env.ALLOW_REGISTER_RESET_FALLBACK || '').toLowerCase() === 'true';

/* ---------- Rate limit ---------- */
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
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

const emailSchema = z.object({ email: z.string().email('Email inválido') });

/* ---------- Helpers ---------- */
const toEmail = (v) => String(v || '').trim().toLowerCase();

async function getUserByEmail(email) {
  try {
    const { data, error } = await supabase.auth.admin.getUserByEmail(email);
    if (error) return null;
    return data?.user || null;
  } catch { return null; }
}

async function generateLink(kind, email) {
  try {
    const { data, error } = await supabase.auth.admin.generateLink({
      type: kind, // 'signup' | 'recovery'
      email,
      options: {
        redirectTo: kind === 'recovery' ? RECOVERY_URL : EMAIL_CONFIRM_URL
      }
    });
    if (error) return null;
    return data?.properties?.action_link || null;
  } catch { return null; }
}

/* =========================================================
   🔐 Login (email/contraseña)
   ========================================================= */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const parsed = credsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, code: 'VALIDATION_ERROR', error: parsed.error.issues[0].message });
    }
    const email = toEmail(parsed.data.email);
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
   📝 Registro ROBUSTO
   - NO mandamos reset automático salvo que lo actives con env.
   ========================================================= */
router.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, code: 'VALIDATION_ERROR', error: parsed.error.issues[0].message });
    }
    const { email: rawEmail, password, nombre_empresa, marketingOptIn } = parsed.data;
    const email = toEmail(rawEmail);

    // 1) Alta normal
    const { data, error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: EMAIL_CONFIRM_URL,
        data: { nombre_empresa, marketingOptIn: !!marketingOptIn }
      }
    });

    if (!error) {
      const out = {
        ok: true,
        kind: 'signup_sent',
        message: 'Registro correcto. Revisa tu correo para confirmar la cuenta.'
      };
      if (EXPOSE_DEBUG_LINKS) out.debug_link = await generateLink('signup', email);
      return res.status(200).json(out);
    }

    // 2) Ya existía → reenvío si NO está confirmada; si está confirmada NO disparamos reset por defecto
    const msg = String(error.message || '').toLowerCase();
    if (msg.includes('already registered')) {
      const existing = await getUserByEmail(email);

      if (existing && !existing.email_confirmed_at) {
        await supabaseAuth.auth.resend({
          type: 'signup',
          email,
          options: { emailRedirectTo: EMAIL_CONFIRM_URL }
        });
        const out = {
          ok: true,
          kind: 'resend_signup',
          message: 'Tu cuenta ya existía pero no estaba confirmada. Te reenviamos el correo.'
        };
        if (EXPOSE_DEBUG_LINKS) out.debug_link = await generateLink('signup', email);
        return res.status(200).json(out);
      }

      // Cuenta confirmada: NO enviar reset salvo flag
      if (ALLOW_REGISTER_RESET_FALLBACK) {
        console.info('[auth/register] sending password recovery to', email);
        await supabaseAuth.auth.resetPasswordForEmail(email, { redirectTo: RECOVERY_URL });
        const out = {
          ok: true,
          kind: 'reset_sent',
          message: 'Tu cuenta ya existía y estaba confirmada. Te enviamos un correo para restablecer la contraseña.'
        };
        if (EXPOSE_DEBUG_LINKS) out.debug_link = await generateLink('recovery', email);
        return res.status(200).json(out);
      }

      // Sin reset: devolvemos mensaje claro
      return res.status(200).json({
        ok: true,
        kind: 'account_exists',
        message: 'Esta cuenta ya existe y está activa. Usa “He olvidado mi contraseña” si la necesitas.'
      });
    }

    return res.status(400).json({ ok: false, code: 'REGISTER_ERROR', error: error.message });
  } catch (e) {
    console.error('[register] Unexpected:', e);
    return res.status(500).json({ ok: false, code: 'SERVER_ERROR', error: 'Error interno.' });
  }
});

/* =========================================================
   🔁 Reenviar correo (confirmación / recuperación)
   ========================================================= */
router.post('/resend', async (req, res) => {
  try {
    const email = toEmail(req.body?.email);
    const type  = String(req.body?.type || 'signup');
    const eok = emailSchema.safeParse({ email });
    if (!eok.success) return res.status(400).json({ ok:false, code:'VALIDATION_ERROR', error:'Email inválido.' });
    if (!['signup', 'recovery'].includes(type)) {
      return res.status(400).json({ ok:false, code:'TYPE_INVALID', error:'Tipo inválido.' });
    }

    if (type === 'signup') {
      const { error } = await supabaseAuth.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: EMAIL_CONFIRM_URL }
      });
      if (error) throw error;
      const out = { ok:true, kind:'resend_signup' };
      if (EXPOSE_DEBUG_LINKS) out.debug_link = await generateLink('signup', email);
      return res.json(out);
    } else {
      const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, { redirectTo: RECOVERY_URL });
      if (error) throw error;
      const out = { ok:true, kind:'reset_sent' };
      if (EXPOSE_DEBUG_LINKS) out.debug_link = await generateLink('recovery', email);
      return res.json(out);
    }
  } catch (e) {
    console.error('[POST /api/auth/resend] error', e);
    return res.status(500).json({ ok:false, error:'RESEND_ERROR' });
  }
});

/* =========================================================
   🔑 Login con Google
   ========================================================= */
router.get('/login-google', (_req, res) => {
  const redirectUrl =
    `${process.env.SUPABASE_URL}/auth/v1/authorize` +
    `?provider=google` +
    `&redirect_to=${encodeURIComponent(EMAIL_CONFIRM_URL)}`;
  res.redirect(redirectUrl);
});

/* =========================================================
   🧩 Bootstrap post-confirmación
   ========================================================= */
router.post('/bootstrap', requireAuth, async (req, res) => {
  try {
    const user = req.user || {};
    const userId = user.id;
    const email = toEmail(user.email);
    if (!userId || !email) return res.status(401).json({ ok:false, error:'UNAUTHENTICATED' });

    const { data: existing, error: exErr } = await supabase
      .from('tenants')
      .select('id, slug, email, nombre_empresa, trial_active, trial_quota, trial_used, soft_blocked')
      .eq('email', email)
      .maybeSingle();
    if (exErr) throw exErr;

    let tenant = existing;

    if (!tenant) {
      const hinted =
        (user.user_metadata && (user.user_metadata.nombre_empresa || user.user_metadata.company)) ||
        String(req.body?.nombre_empresa || '').trim() ||
        email.split('@')[0];

      const base = slugifyBase(hinted);
      const slug = await uniqueSlug(supabase, base);

      const insert = {
        email,
        nombre_empresa: hinted || base,
        slug,
        trial_active: true,
        trial_quota: Number(process.env.TRIAL_QUOTA_DEFAULT || process.env.TRIAL_QUOTA || 1000000),
        trial_used: 0,
        soft_blocked: false,
      };

      const { data: created, error: cErr } = await supabase
        .from('tenants')
        .insert([insert])
        .select('id, slug, email, nombre_empresa, trial_active, trial_quota, trial_used, soft_blocked')
        .single();
      if (cErr) throw cErr;
      tenant = created;
    } else {
      tenant.trial_quota  = Number(tenant.trial_quota ?? process.env.TRIAL_QUOTA ?? 20);
      tenant.trial_used   = Number(tenant.trial_used  ?? 0);
      tenant.trial_active = tenant.trial_active ?? true;
      tenant.soft_blocked = !!tenant.soft_blocked;
    }

    await supabase
      .from('memberships')
      .upsert([{ tenant_id: tenant.id, user_id: userId, role: 'owner' }], { onConflict: 'tenant_id,user_id' });

    return res.json({
      ok: true,
      tenant: { id: tenant.id, slug: tenant.slug, nombre_empresa: tenant.nombre_empresa },
      trial: {
        active: !!tenant.trial_active,
        used: Number(tenant.trial_used || 0),
        quota: Number(tenant.trial_quota || 20),
        remaining: Math.max(0, Number(tenant.trial_quota || 20) - Number(tenant.trial_used || 0)),
        soft_blocked: !!tenant.soft_blocked
      }
    });
  } catch (e) {
    console.error('[auth/bootstrap] error:', e);
    return res.status(500).json({ ok:false, error: e.message || 'BOOTSTRAP_ERROR' });
  }
});
// ➕ NUEVO: POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const email = toEmail(req.body?.email);
    const eok = emailSchema.safeParse({ email });
    if (!eok.success) return res.status(400).json({ ok:false, error:'Email inválido.' });

    const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, { redirectTo: RECOVERY_URL });
    if (error) return res.status(400).json({ ok:false, error: error.message });

    return res.json({ ok:true, message:'Hemos enviado un enlace para restablecer tu contraseña.' });
  } catch (e) {
    console.error('[forgot-password] error', e);
    return res.status(500).json({ ok:false, error:'FORGOT_PWD_ERROR' });
  }
});

module.exports = router;
