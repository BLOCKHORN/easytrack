'use strict';
const jwt = require('jsonwebtoken');
const { supabaseAdmin, supabaseAuth } = require('../utils/supabaseAdmin');

/**
 * Middleware de autorización para el panel:
 * - Acepta Authorization: Bearer <jwt>
 * - Verifica el JWT de Supabase con HS256 si tienes SUPABASE_JWT_SECRET,
 *   o hace fallback a supabaseAuth.auth.getUser(token) si no está disponible.
 * - Busca al usuario en la tabla staff_users (user_id, role, is_active, allowed_ips).
 * - Valida IPs permitidas si están definidas.
 * - Exige un rol mínimo (support < admin < superadmin).
 *
 * Uso:
 *   router.use(requireSuperadmin()); // por defecto exige 'support'
 *   router.use(requireSuperadmin({ minRole: 'admin' }));
 */

const ROLE_ORDER = { support: 1, admin: 2, superadmin: 3 };
const DEFAULT_MIN_ROLE = 'support';

function parseForwardedIp(req) {
  // admite IPv6 con "::ffff:" y XFF con múltiples IPs
  const raw =
    (req.headers['x-forwarded-for'] || '')
      .split(',')[0].trim() ||
    (req.socket?.remoteAddress || '').trim();

  // normaliza "::ffff:1.2.3.4" -> "1.2.3.4"
  const m = raw.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/);
  return m ? m[1] : raw;
}

async function verifySupabaseToken(token, secret) {
  // Devuelve { userId, email } o lanza
  if (secret) {
    // Ruta preferida: verificar HS256 localmente
    const decoded = jwt.verify(token, secret); // lanza si inválido
    return {
      userId: decoded?.sub || null,
      email: decoded?.email || null,
    };
  }

  // Fallback: pedir a Supabase que resuelva el token
  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data?.user) {
    const err = new Error(error?.message || 'Invalid or expired token');
    err.code = 'INVALID_TOKEN';
    throw err;
  }
  return { userId: data.user.id, email: data.user.email || null };
}

function requireSuperadmin(opts = {}) {
  const minRole = (opts.minRole || DEFAULT_MIN_ROLE).toLowerCase();

  return async function (req, res, next) {
    try {
      const auth = req.headers.authorization || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
      if (!token) {
        return res.status(401).json({ ok: false, code: 'NO_TOKEN', error: 'Missing bearer token' });
      }

      const secret = process.env.SUPABASE_JWT_SECRET || null;

      let userId = null;
      let email  = null;

      try {
        const v = await verifySupabaseToken(token, secret);
        userId = v.userId;
        email  = v.email;
      } catch (err) {
        const code = err.code === 'INVALID_TOKEN' ? 401 : 401;
        return res.status(code).json({
          ok: false,
          code: err.code || 'INVALID_TOKEN',
          error: err.message || 'Invalid or expired token',
        });
      }

      if (!userId) {
        return res.status(401).json({ ok: false, code: 'INVALID_SUB', error: 'JWT does not contain sub' });
      }

      // ---- staff_users lookup
      const { data: staff, error } = await supabaseAdmin
        .from('staff_users')
        .select('user_id, role, is_active, allowed_ips')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('[requireSuperadmin] staff_users lookup error:', error);
        return res.status(500).json({ ok: false, code: 'STAFF_LOOKUP_ERROR', error: error.message });
      }

      if (!staff) {
        return res.status(403).json({ ok: false, code: 'NOT_STAFF', error: 'User is not staff' });
      }
      if (!staff.is_active) {
        return res.status(403).json({ ok: false, code: 'STAFF_INACTIVE', error: 'Staff member is inactive' });
      }

      // ---- IP allowlist (si hay)
      const allowedIps = Array.isArray(staff.allowed_ips) ? staff.allowed_ips : null;
      if (allowedIps && allowedIps.length) {
        const ip = parseForwardedIp(req);
        if (!allowedIps.includes(ip)) {
          return res.status(403).json({ ok: false, code: 'IP_NOT_ALLOWED', error: 'IP not allowed', details: { ip } });
        }
      }

      // ---- Rol mínimo
      const role = String(staff.role || '').toLowerCase();
      const have = ROLE_ORDER[role] || 0;
      const need = ROLE_ORDER[minRole] || ROLE_ORDER[DEFAULT_MIN_ROLE];

      if (have < need) {
        return res.status(403).json({
          ok: false,
          code: 'ROLE_NOT_ALLOWED',
          error: `Required min role ${minRole}, got ${role || 'none'}`,
          details: { minRole, role }
        });
      }

      // Attach info útil
      req.superadmin = { userId, role, email };

      return next();
    } catch (e) {
      console.error('[requireSuperadmin] Unexpected:', e);
      return res.status(500).json({ ok: false, code: 'AUTH_MIDDLEWARE_ERROR', error: e.message || 'SERVER_ERROR' });
    }
  };
}

module.exports = requireSuperadmin;
