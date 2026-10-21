'use strict';

const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { supabaseAuth, supabase } = require('../utils/supabaseClient');
const { isDirectPg, query } = require('../utils/db');
const { signAccessToken, signRefreshToken, signToken, verifyToken } = require('../utils/token');
const { slugifyBase, uniqueSlug } = require('../utils/slug');

const APP_BASE = (process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');

function setAuthCookies(res, user, tenant) {
  const payload = {
    sub: user.id,
    email: user.email,
    user_metadata: user.raw_user_meta_data || user.user_metadata || {},
    tenant_id: tenant?.id || null,
    tenant_slug: tenant?.slug || null
  };

  const accessToken = signAccessToken(payload, 24 * 3600); // 24 horas (estabilidad en puestos de tienda)
  const refreshToken = signRefreshToken({ sub: user.id, email: user.email }, 30 * 24 * 3600); // 30 days

  // Configuración de cookie segura
  const cookieOptions = {
    httpOnly: true,
    secure: true, // Forzado en HTTPS (Cloudflare / reverse proxy)
    sameSite: 'lax',
    path: '/'
  };

  res.cookie('et_access_token', accessToken, {
    ...cookieOptions,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  });

  res.cookie('et_refresh_token', refreshToken, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 días
  });

  return { accessToken, refreshToken };
}

function clearAuthCookies(res) {
  const clearOptions = { path: '/', httpOnly: true, secure: true, sameSite: 'lax' };
  res.clearCookie('et_access_token', clearOptions);
  res.clearCookie('et_refresh_token', clearOptions);
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nombre_empresa: z.string().min(2),
  full_name: z.string().min(2),
  plan_inicial: z.string().optional(),
  referral_slug: z.string().optional()
});

async function register(req, res) {
  try {
    const val = registerSchema.parse(req.body);

    if (isDirectPg()) {
      // 1. Registro nativo en PostgreSQL
      const existing = await query('SELECT id FROM auth.users WHERE lower(email) = lower($1) LIMIT 1', [val.email]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ ok: false, error: 'El email ya está registrado' });
      }

      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(val.password, salt);
      const rawSlug = slugifyBase(val.nombre_empresa || 'Mi Local');
      const slug = await uniqueSlug(rawSlug);

      const userRes = await query(`
        INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
        VALUES ($1, $2, NOW(), $3, NOW(), NOW())
        RETURNING id, email, raw_user_meta_data as user_metadata
      `, [val.email, hash, JSON.stringify({ full_name: val.full_name, nombre_empresa: val.nombre_empresa })]);

      const user = userRes.rows[0];

      // Crear tenant
      const tenantRes = await query(`
        INSERT INTO public.tenants (nombre_empresa, slug, email, plan_id, trial_quota, trial_used, is_ai_active, currency, goal_annual_eur)
        VALUES ($1, $2, $3, 'free', 250, 0, false, 'EUR', 5000)
        RETURNING *
      `, [val.nombre_empresa, slug, val.email]);

      const tenant = tenantRes.rows[0];

      // Crear membership
      await query(`
        INSERT INTO public.memberships (user_id, tenant_id, role)
        VALUES ($1, $2, 'owner')
      `, [user.id, tenant.id]);

      const { accessToken, refreshToken } = setAuthCookies(res, user, tenant);
      return res.json({ 
        ok: true, 
        user, 
        token: accessToken, 
        session: { access_token: accessToken, refresh_token: refreshToken, expires_in: 900 },
        tenant 
      });
    }

    // 2. Fallback Supabase
    const { data, error } = await supabaseAuth.auth.signUp({
      email: val.email,
      password: val.password,
      options: {
        data: { full_name: val.full_name, nombre_empresa: val.nombre_empresa, plan_inicial: 'free', referred_by: val.referral_slug },
        emailRedirectTo: `${APP_BASE}/auth/email-confirmado`
      }
    });
    if (error) return res.status(400).json({ ok: false, error: error.message });
    return res.json({ ok: true, user: data.user, session: data.session });
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message || 'Datos de registro inválidos' });
  }
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Email y contraseña requeridos' });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  // 1. Intento de autenticación nativa vía PostgreSQL directo (bcrypt)
  if (isDirectPg()) {
    try {
      const { rows } = await query(
        'SELECT id, email, encrypted_password, raw_user_meta_data FROM auth.users WHERE lower(email) = $1 LIMIT 1',
        [cleanEmail]
      );

      if (rows.length === 0) {
        return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
      }

      const user = rows[0];
      const encPass = user.encrypted_password;
      if (!encPass || typeof encPass !== 'string' || encPass.trim() === '') {
        return res.status(400).json({
          ok: false,
          error: 'Esta cuenta fue creada mediante Google OAuth o no tiene contraseña asignada. Inicia sesión con el botón de Google o pulsa "Crear / Recuperar contraseña".'
        });
      }

      const match = bcrypt.compareSync(String(password), encPass);
      if (!match) {
        return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
      }

      // Resolver tenant del usuario
      const mRes = await query(`
        SELECT t.id, t.slug, t.nombre_empresa, t.email
        FROM public.memberships m
        JOIN public.tenants t ON t.id = m.tenant_id
        WHERE m.user_id = $1
        LIMIT 1
      `, [user.id]);

      const tenant = mRes.rows[0] || null;
      const userMeta = user.raw_user_meta_data || {};

      const { accessToken, refreshToken } = setAuthCookies(res, user, tenant);

      return res.json({
        ok: true,
        token: accessToken,
        session: { access_token: accessToken, refresh_token: refreshToken, expires_in: 86400 },
        user: { id: user.id, email: user.email, user_metadata: userMeta },
        tenant
      });
    } catch (err) {
      console.error('[Auth Native Error]', err);
      return res.status(500).json({ ok: false, error: 'Error interno en autenticación' });
    }
  }

  // 2. Fallback de transición: Supabase Auth (con timeout estricto de 3s para evitar bloqueos)
  try {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Auth service timeout')), 3000));
    const loginPromise = supabaseAuth.auth.signInWithPassword({ email: cleanEmail, password: String(password) });
    const { data, error } = await Promise.race([loginPromise, timeoutPromise]);
    if (error) return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });

    const session = data.session;
    return res.json({
      ok: true,
      token: session?.access_token,
      session,
      user: data.user
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Fallo de conexión con servicio de autenticación' });
  }
}

async function refresh(req, res) {
  const refreshToken = req.cookies?.et_refresh_token || req.body?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ ok: false, error: 'Refresh token no proporcionado' });
  }

  const payload = verifyToken(refreshToken);
  if (!payload || !payload.sub) {
    clearAuthCookies(res);
    return res.status(401).json({ ok: false, error: 'Sesión expirada o token inválido' });
  }

  try {
    let user = null;
    let tenant = null;

    if (isDirectPg()) {
      const { rows } = await query('SELECT id, email, raw_user_meta_data FROM auth.users WHERE id = $1 LIMIT 1', [payload.sub]);
      if (rows.length === 0) {
        clearAuthCookies(res);
        return res.status(401).json({ ok: false, error: 'Usuario inexistente' });
      }
      user = rows[0];

      const mRes = await query(`
        SELECT t.id, t.slug, t.nombre_empresa, t.email
        FROM public.memberships m
        JOIN public.tenants t ON t.id = m.tenant_id
        WHERE m.user_id = $1 LIMIT 1
      `, [user.id]);
      tenant = mRes.rows[0] || null;
    } else {
      user = { id: payload.sub, email: payload.email, user_metadata: payload.user_metadata || {} };
    }

    const { accessToken, refreshToken: newRefreshToken } = setAuthCookies(res, user, tenant);

    return res.json({
      ok: true,
      token: accessToken,
      session: { access_token: accessToken, refresh_token: newRefreshToken, expires_in: 900 },
      user: { id: user.id, email: user.email, user_metadata: user.raw_user_meta_data || user.user_metadata || {} },
      tenant
    });
  } catch (err) {
    console.error('[Refresh error]', err);
    return res.status(500).json({ ok: false, error: 'Error al refrescar la sesión' });
  }
}

async function logout(req, res) {
  clearAuthCookies(res);
  return res.json({ ok: true, message: 'Sesión finalizada con éxito' });
}

async function updatePassword(req, res) {
  try {
    const { password } = req.body || {};
    if (!password || password.length < 8) {
      return res.status(400).json({ ok: false, error: 'La contraseña debe tener al menos 8 caracteres' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ ok: false, error: 'No autorizado' });

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    if (isDirectPg()) {
      await query('UPDATE auth.users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2', [hash, userId]);
      return res.json({ ok: true, message: 'Contraseña actualizada' });
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Error al actualizar contraseña' });
  }
}

async function me(req, res) {
  if (!req.user) {
    return res.status(401).json({ ok: false, error: 'No autenticado' });
  }

  let tenant = req.tenant || null;
  if (!tenant && req.user.id && isDirectPg()) {
    try {
      const { rows } = await query(`
        SELECT t.id, t.slug, t.nombre_empresa, t.email
        FROM public.memberships m
        JOIN public.tenants t ON t.id = m.tenant_id
        WHERE m.user_id = $1
        LIMIT 1
      `, [req.user.id]);
      if (rows[0]) tenant = rows[0];
    } catch {}
  }

  return res.json({
    ok: true,
    user: req.user,
    tenant
  });
}

async function bootstrap(req, res) {
  try {
    const userId = req.user.id;
    const metadata = req.user.user_metadata || {};

    const { data: existing } = await supabase.from('memberships').select('tenant_id').eq('user_id', userId).maybeSingle();
    if (existing) {
      const { data: t } = await supabase.from('tenants').select('*').eq('id', existing.tenant_id).single();
      return res.json({ ok: true, tenant: t, status: 'existing' });
    }

    const rawSlug = slugifyBase(metadata.nombre_empresa || 'Mi Local');
    const slug = await uniqueSlug(rawSlug);
    
    const { data: tenant, error: tErr } = await supabase
      .from('tenants')
      .insert([{
        nombre_empresa: metadata.nombre_empresa || 'Mi Local',
        slug,
        email: req.user.email,
        plan_id: 'free',
        trial_quota: 250,
        trial_used: 0,
        is_ai_active: false,
        ai_trial_used: false,
        ai_trial_ends_at: null,
        goal_annual_eur: 5000,  
        currency: 'EUR'
      }])
      .select()
      .single();

    if (tErr) throw tErr;

    await supabase.from('memberships').insert([{ tenant_id: tenant.id, user_id: userId, role: 'owner' }]);
    
    const referralSlug = req.body.referral_slug || metadata.referred_by || null;
    if (referralSlug) {
      const { data: referrer } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', referralSlug)
        .maybeSingle();

      if (referrer && referrer.id !== tenant.id) {
        await supabase.from('tenant_referrals').insert([{
          referrer_tenant_id: referrer.id,
          referred_tenant_id: tenant.id
        }]);
      }
    }
    
    return res.json({ ok: true, tenant, status: 'created' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Error de infraestructura' });
  }
}

async function googleLogin(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ ok: false, error: 'GOOGLE_CLIENT_ID no configurado en el servidor' });
  }

  let host = req.headers['x-forwarded-host'] || req.headers.host || 'easytrack.pro';
  if (host === 'www.easytrack.pro') host = 'easytrack.pro';
  if (host === 'www.easytrack.es') host = 'easytrack.es';
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const proto = host.includes('localhost') || host.includes('127.0.0.1') ? protocol : 'https';
  const redirectUri = `${proto}://${host}/api/auth/google/callback`;

  const nextParam = req.query.next || '/dashboard';
  const state = Buffer.from(JSON.stringify({ next: nextParam })).toString('base64url');

  const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleUrl.searchParams.set('client_id', clientId.trim());
  googleUrl.searchParams.set('redirect_uri', redirectUri);
  googleUrl.searchParams.set('response_type', 'code');
  googleUrl.searchParams.set('scope', 'openid email profile');
  googleUrl.searchParams.set('access_type', 'offline');
  googleUrl.searchParams.set('prompt', 'select_account');
  googleUrl.searchParams.set('state', state);

  return res.redirect(googleUrl.toString());
}

async function googleCallback(req, res) {
  try {
    const { code, error, state } = req.query;
    let nextUrl = '/dashboard';
    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
        if (decoded.next) nextUrl = decoded.next;
      } catch {}
    }

    if (error || !code) {
      return res.redirect(`/login?error=${encodeURIComponent(error || 'Acceso cancelado por el usuario')}`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    let host = req.headers['x-forwarded-host'] || req.headers.host || 'easytrack.pro';
    if (host === 'www.easytrack.pro') host = 'easytrack.pro';
    if (host === 'www.easytrack.es') host = 'easytrack.es';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const proto = host.includes('localhost') || host.includes('127.0.0.1') ? protocol : 'https';
    const redirectUri = `${proto}://${host}/api/auth/google/callback`;

    // 1. Intercambiar código por tokens con Google
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error('[Google OAuth Token Error]', tokenData);
      return res.redirect(`/login?error=${encodeURIComponent('No se pudo verificar la cuenta con Google')}`);
    }

    // 2. Obtener datos del perfil de Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const googleUser = await userRes.json();

    if (!googleUser?.email) {
      return res.redirect(`/login?error=${encodeURIComponent('Google no proporcionó una dirección de email válida')}`);
    }

    const email = String(googleUser.email).trim().toLowerCase();
    const fullName = googleUser.name || email.split('@')[0];
    const avatarUrl = googleUser.picture || null;

    let user = null;
    let tenant = null;

    if (isDirectPg()) {
      // 1. Buscar o crear usuario en auth.users
      const { rows: existingUsers } = await query(
        'SELECT id, email, raw_user_meta_data FROM auth.users WHERE lower(email) = $1 LIMIT 1',
        [email]
      );

      if (existingUsers.length > 0) {
        user = existingUsers[0];
        const currentMeta = user.raw_user_meta_data || {};
        if (avatarUrl && !currentMeta.avatar_url) {
          const updatedMeta = { ...currentMeta, avatar_url: avatarUrl, full_name: currentMeta.full_name || fullName };
          await query('UPDATE auth.users SET raw_user_meta_data = $1, updated_at = NOW() WHERE id = $2', [JSON.stringify(updatedMeta), user.id]);
          user.raw_user_meta_data = updatedMeta;
        }
      } else {
        const userMeta = { full_name: fullName, avatar_url: avatarUrl, name: fullName };
        const { rows: newUsers } = await query(`
          INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
          VALUES (gen_random_uuid(), $1, NOW(), $2, NOW(), NOW())
          RETURNING id, email, raw_user_meta_data
        `, [email, JSON.stringify(userMeta)]);
        user = newUsers[0];
      }

      // 2. Buscar membresía y tenant asociado
      const { rows: memberships } = await query(`
        SELECT t.id, t.slug, t.nombre_empresa, t.email
        FROM public.memberships m
        JOIN public.tenants t ON t.id = m.tenant_id
        WHERE m.user_id = $1
        LIMIT 1
      `, [user.id]);

      if (memberships.length > 0) {
        tenant = memberships[0];
      } else {
        // ¿Existe un tenant con el mismo email?
        const { rows: existingTenants } = await query(
          'SELECT id, slug, nombre_empresa, email FROM public.tenants WHERE lower(email) = $1 ORDER BY fecha_creacion DESC LIMIT 1',
          [email]
        );

        if (existingTenants.length > 0) {
          tenant = existingTenants[0];
          await query(
            'INSERT INTO public.memberships (user_id, tenant_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [user.id, tenant.id, 'owner']
          );
        } else {
          // Crear nuevo tenant para el usuario
          const baseSlug = slugifyBase(fullName || email.split('@')[0]);
          let candidateSlug = baseSlug;
          let counter = 0;
          while (true) {
            const { rows: slugCheck } = await query('SELECT id FROM public.tenants WHERE slug = $1 LIMIT 1', [candidateSlug]);
            if (slugCheck.length === 0) break;
            counter += 1;
            candidateSlug = (baseSlug + '-' + counter).slice(0, 60);
          }

          const { rows: newTenants } = await query(`
            INSERT INTO public.tenants (nombre_empresa, slug, email, plan_id, trial_quota, trial_used, is_ai_active, currency, goal_annual_eur)
            VALUES ($1, $2, $3, 'free', 250, 0, false, 'EUR', 5000)
            RETURNING id, slug, nombre_empresa, email
          `, [fullName, candidateSlug, email]);
          tenant = newTenants[0];
          await query(
            'INSERT INTO public.memberships (user_id, tenant_id, role) VALUES ($1, $2, $3)',
            [user.id, tenant.id, 'owner']
          );
        }
      }

      const { accessToken } = setAuthCookies(res, user, tenant);

      const destSlug = tenant?.slug;
      const targetNext = destSlug ? `/${destSlug}/dashboard` : nextUrl;
      return res.redirect(`/auth/callback?next=${encodeURIComponent(targetNext)}`);
    }

    return res.redirect(`/login?error=${encodeURIComponent('Base de datos no disponible')}`);
  } catch (err) {
    console.error('[Google Callback Exception]', err);
    return res.redirect(`/login?error=${encodeURIComponent('Error interno al iniciar sesión con Google')}`);
  }
}

module.exports = { register, login, refresh, logout, me, bootstrap, googleLogin, googleCallback, updatePassword };