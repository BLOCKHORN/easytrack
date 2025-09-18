'use strict';
const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../utils/supabaseAdmin');

module.exports = function requireSuperadmin() {
  return async function (req, res, next) {
    try {
      const auth = req.headers.authorization || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
      if (!token) return res.status(401).json({ error: 'NO_TOKEN' });

      // Verificamos la firma del JWT de Supabase
      const secret = process.env.SUPABASE_JWT_SECRET;
      if (!secret) return res.status(500).json({ error: 'MISSING_JWT_SECRET' });

      let decoded;
      try {
        decoded = jwt.verify(token, secret); // HS256 por defecto (Supabase)
      } catch (err) {
        console.warn('JWT verify failed:', err.message);
        return res.status(401).json({ error: 'INVALID_TOKEN' });
      }

      const userId = decoded?.sub;
      if (!userId) return res.status(401).json({ error: 'INVALID_SUB' });

      // Comprobamos staff_users
      const { data: staff, error } = await supabaseAdmin
        .from('staff_users')
        .select('user_id, role, is_active, allowed_ips')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('staff_users lookup error:', error);
        return res.status(500).json({ error: 'STAFF_LOOKUP_ERROR' });
      }

      if (!staff)       return res.status(403).json({ error: 'NOT_STAFF' });
      if (!staff.is_active) return res.status(403).json({ error: 'STAFF_INACTIVE' });

      // IPs permitidas (si hay lista, se aplica; si es null/[], se permite)
      const ips = Array.isArray(staff.allowed_ips) ? staff.allowed_ips : null;
      if (ips && ips.length) {
        const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
          .split(',')[0].trim();
        if (!ips.includes(ip)) return res.status(403).json({ error: 'IP_NOT_ALLOWED' });
      }

      // Roles válidos para admin panel
      if (!['support', 'admin', 'superadmin'].includes(staff.role)) {
        return res.status(403).json({ error: 'ROLE_NOT_ALLOWED' });
      }

      req.superadmin = { userId, role: staff.role };
      return next();
    } catch (e) {
      console.error('requireSuperadmin error:', e);
      return res.status(500).json({ error: 'AUTH_MIDDLEWARE_ERROR' });
    }
  };
};
