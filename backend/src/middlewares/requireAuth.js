// middlewares/requireAuth.js
'use strict';

const { supabase, supabaseAuth } = require('../utils/supabaseClient');

function getBearer(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

async function resolveUserFromToken(token) {
  if (!token) return null;
  try {
    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data?.user) return null;
    const email = String(data.user.email || '').trim().toLowerCase();
    return { id: data.user.id, email };
  } catch {
    return null;
  }
}

async function findTenantByEmail(email) {
  if (!email) return null;
  const { data } = await supabase
    .from('tenants')
    .select('id, slug, email, nombre_empresa')
    .ilike('email', email)
    .maybeSingle();
  return data || null;
}

async function findTenantBySlug(slug) {
  if (!slug) return null;
  const { data } = await supabase
    .from('tenants')
    .select('id, slug, email, nombre_empresa')
    .eq('slug', slug)
    .maybeSingle();
  return data || null;
}

// 🔧 Añadimos alias tenantId además de tenant_id
function attach(req, { user = null, tenant = null } = {}) {
  if (user) req.user = user;
  if (tenant) {
    req.tenant = tenant;
    req.tenant_id = tenant.id;
    req.tenantId = tenant.id;          // <—— alias para compatibilidad con rutas antiguas
  }
}

function readSlugParam(req) {
  return req.params?.tenantSlug || req.params?.slug || null;
}

async function optional(req, _res, next) {
  try {
    if (process.env.AUTH_BYPASS === 'true') {
      attach(req, { user: { id: 'dev-bypass', email: 'dev@example.com' } });
      return next();
    }
    const token = getBearer(req);
    const user  = await resolveUserFromToken(token);
    const slug  = readSlugParam(req);

    let tenant = null;
    if (slug) tenant = await findTenantBySlug(slug);
    if (!tenant && user?.email) tenant = await findTenantByEmail(user.email);

    attach(req, { user, tenant });
    next();
  } catch (err) {
    console.warn('[requireAuth.optional] Warning:', err?.message || err);
    next();
  }
}

async function strictUser(req, res, next) {
  try {
    if (process.env.AUTH_BYPASS === 'true') {
      attach(req, { user: { id: 'dev-bypass', email: 'dev@example.com' } });
      const slug = readSlugParam(req);
      let tenant = null;
      if (slug) tenant = await findTenantBySlug(slug);
      if (!tenant) tenant = await findTenantByEmail('dev@example.com');
      attach(req, { tenant });
      return next();
    }

    const token = getBearer(req);
    if (!token) return res.status(401).json({ error: 'Token no proporcionado.' });

    const user = await resolveUserFromToken(token);
    if (!user?.email) return res.status(401).json({ error: 'Token inválido o expirado.' });

    attach(req, { user });

    try {
      const slug = readSlugParam(req);
      let tenant = null;
      if (slug) tenant = await findTenantBySlug(slug);
      if (!tenant) tenant = await findTenantByEmail(user.email);
      attach(req, { tenant });
    } catch {}

    next();
  } catch (err) {
    console.error('[requireAuth.strictUser] Error:', err);
    res.status(500).json({ error: 'Error interno de autenticación.' });
  }
}

function strictTenantBySlug(paramName = 'tenantSlug') {
  return (req, res, next) => {
    strictUser(req, res, async () => {
      try {
        const slug = req.params?.[paramName];
        if (!slug) return res.status(400).json({ error: `Falta ${paramName} en la ruta.` });

        if (!req.tenant || req.tenant.slug !== slug) {
          const tenant = await findTenantBySlug(slug);
          if (!tenant) return res.status(403).json({ error: 'Negocio inexistente.' });
          attach(req, { tenant });
        }
        next();
      } catch (err) {
        console.error('[requireAuth.strictTenantBySlug] Error:', err);
        res.status(500).json({ error: 'Error al buscar tenant.' });
      }
    });
  };
}

async function strictTenantByEmail(req, res, next) {
  strictUser(req, res, async () => {
    try {
      if (!req.tenant) {
        const tenant = await findTenantByEmail(req.user.email);
        if (!tenant) return res.status(403).json({ error: 'No se encontró negocio asociado a tu usuario.' });
        attach(req, { tenant });
      }
      next();
    } catch (err) {
      console.error('[requireAuth.strictTenantByEmail] Error:', err);
      res.status(500).json({ error: 'Error al buscar tenant asociado.' });
    }
  });
}

function attachTenantFromSlug(paramName = 'tenantSlug') {
  return async (req, _res, next) => {
    try {
      const slug = req.params?.[paramName];
      if (!slug) return next();
      if (!req.tenant) {
        const tenant = await findTenantBySlug(slug);
        if (tenant) attach(req, { tenant });
      }
      next();
    } catch (err) {
      console.warn('[requireAuth.attachTenantFromSlug] Warning:', err?.message || err);
      next();
    }
  };
}

function requireTenantSlug(paramName = 'tenantSlug') {
  return async (req, res, next) => {
    try {
      const slug = req.params?.[paramName];
      if (!slug) return res.status(400).json({ error: `Falta ${paramName} en la ruta.` });

      if (!req.tenant) {
        const tenant = await findTenantBySlug(slug);
        if (tenant) attach(req, { tenant });
      }
      if (!req.tenant) return res.status(403).json({ error: 'Tenant no resuelto' });
      if (req.tenant.slug !== slug) return res.status(403).json({ error: 'No tienes acceso a este negocio.' });

      next();
    } catch (err) {
      console.error('[requireAuth.requireTenantSlug] Error:', err);
      res.status(500).json({ error: 'Error al verificar slug.' });
    }
  };
}

const exported = Object.assign(
  function requireAuthMiddleware(req, res, next) { return strictUser(req, res, next); },
  { optional, strictUser, strictTenantByEmail, strictTenantBySlug, attachTenantFromSlug, requireTenantSlug }
);

module.exports = exported;
module.exports.requireAuth = exported;
module.exports.default = exported;
