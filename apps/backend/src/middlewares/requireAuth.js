'use strict';

const { supabase, supabaseAuth } = require('../utils/supabaseClient');
const { isDirectPg, query } = require('../utils/db');

const attach = (req, { user, tenant }) => {
  if (user) req.user = user;
  if (tenant) {
    req.tenant = tenant;
    req.tenantId = tenant.id;
  }
};

const { verifyToken } = require('../utils/token');

function verifySupabaseTokenLocally(token) {
  const payload = verifyToken(token);
  if (!payload || !payload.sub) return null;
  return {
    id: payload.sub,
    email: String(payload.email || '').trim().toLowerCase(),
    user_metadata: payload.user_metadata || {}
  };
}

async function resolveUser(req) {
  if (process.env.AUTH_BYPASS === 'true' && process.env.NODE_ENV !== 'production') {
    return { id: 'dev-bypass', email: 'dev@example.com' };
  }
  
  const token = req.cookies?.et_access_token || 
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  // 1. Verificación instantánea criptográfica local (0ms, nativo HMAC-SHA256)
  const localUser = verifySupabaseTokenLocally(token);
  if (localUser) return localUser;

  // 2. Fallback supabaseAuth si aún hubiese tokens legados
  try {
    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (!error && data?.user) {
      return { 
        id: data.user.id, 
        email: String(data.user.email || '').trim().toLowerCase(),
        user_metadata: data.user.user_metadata || {}
      };
    }
  } catch {}

  return null;
}

async function resolveTenantForUser(userId, slug, email) {
  if (!userId) return null;

  if (isDirectPg()) {
    try {
      let sql = `
        SELECT t.id, t.slug, t.email, t.nombre_empresa
        FROM public.memberships m
        JOIN public.tenants t ON t.id = m.tenant_id
        WHERE m.user_id = $1
      `;
      const params = [userId];
      if (slug) {
        sql += ' AND t.slug = $2';
        params.push(slug);
      } else if (email) {
        sql += ' AND lower(t.email) = lower($2)';
        params.push(email);
      }
      sql += ' LIMIT 1';
      const { rows } = await query(sql, params);
      if (rows[0]) return rows[0];

      if (email) {
        let orphanSql = 'SELECT id, slug, email, nombre_empresa FROM public.tenants WHERE lower(email) = lower($1)';
        const orphanParams = [email];
        if (slug) {
          orphanSql += ' AND slug = $2';
          orphanParams.push(slug);
        }
        orphanSql += ' LIMIT 1';
        const orphanRes = await query(orphanSql, orphanParams);
        if (orphanRes.rows[0]) {
          const orphan = orphanRes.rows[0];
          await query(
            'INSERT INTO public.memberships (user_id, tenant_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [userId, orphan.id, 'owner']
          );
          return orphan;
        }
      }
      return null;
    } catch (e) {
      console.error('[requireAuth DirectPg error]', e);
    }
  }

  let queryBuilder = supabase
    .from('memberships')
    .select(`
      tenant_id,
      tenants!inner (id, slug, email, nombre_empresa)
    `)
    .eq('user_id', userId);

  if (slug) {
    queryBuilder = queryBuilder.eq('tenants.slug', slug);
  } else if (email) {
    queryBuilder = queryBuilder.ilike('tenants.email', email);
  }

  const { data } = await queryBuilder.limit(1).maybeSingle();
  if (data?.tenants) return data.tenants;

  if (email) {
    let orphanQuery = supabase.from('tenants').select('id, slug, email, nombre_empresa').ilike('email', email);
    if (slug) orphanQuery = orphanQuery.eq('slug', slug);
    
    const { data: orphan } = await orphanQuery.limit(1).maybeSingle();
    
    if (orphan) {
      await supabase.from('memberships').insert([{ user_id: userId, tenant_id: orphan.id, role: 'owner' }]);
      return orphan;
    }
  }

  return null;
}

async function strictUser(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      console.log('Auth Fallida: No hay usuario o token inválido');
      return res.status(401).json({ error: 'Token inválido o no proporcionado.' });
    }

    const slug = req.params?.tenantSlug || req.params?.slug;
    const tenant = await resolveTenantForUser(user.id, slug, user.email);
    
    if (!tenant) {
      console.log('Auth Fallida: Usuario', user.email, 'no tiene acceso al negocio', slug);
      return res.status(403).json({ error: 'Acceso denegado a este negocio.' });
    }

    attach(req, { user, tenant });
    next();
  } catch (err) {
    console.error('Error en strictUser:', err);
    res.status(500).json({ error: 'Error interno de autenticación.' });
  }
}

async function tokenOnly(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (!user) return res.status(401).json({ error: 'Token inválido o no proporcionado.' });
    
    const slug = req.params?.tenantSlug || req.params?.slug;
    const tenant = await resolveTenantForUser(user.id, slug, user.email);
    attach(req, { user, tenant });
    next();
  } catch (err) {
    res.status(500).json({ error: 'Error interno de autenticación.' });
  }
}

async function optional(req, res, next) {
  try {
    const user = await resolveUser(req);
    const slug = req.params?.tenantSlug || req.params?.slug;
    const tenant = user ? await resolveTenantForUser(user.id, slug, user.email) : null;
    
    attach(req, { user, tenant });
    next();
  } catch (err) { next(); }
}

function requireTenantSlug(paramName = 'tenantSlug') {
  return async (req, res, next) => {
    const slug = req.params?.[paramName];
    if (!slug) return res.status(400).json({ error: `Falta ${paramName} en la ruta.` });
    if (!req.tenant || req.tenant.slug !== slug) return res.status(403).json({ error: 'No tienes acceso a este negocio.' });
    next();
  };
}

const exported = Object.assign(strictUser, { optional, strictUser, requireTenantSlug, tokenOnly });
module.exports = exported;
module.exports.requireAuth = exported;
module.exports.default = exported;