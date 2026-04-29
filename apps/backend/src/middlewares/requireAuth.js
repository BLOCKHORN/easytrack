'use strict';

const { supabase, supabaseAuth } = require('../utils/supabaseClient');

const attach = (req, { user, tenant }) => {
  if (user) req.user = user;
  if (tenant) {
    req.tenant = tenant;
    req.tenantId = tenant.id;
  }
};

async function resolveUser(req) {
  if (process.env.AUTH_BYPASS === 'true' && process.env.NODE_ENV !== 'production') {
    return { id: 'dev-bypass', email: 'dev@example.com' };
  }
  
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return null;

  try {
    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data?.user) return null;
    return { id: data.user.id, email: String(data.user.email || '').trim().toLowerCase() };
  } catch { return null; }
}

async function resolveTenantForUser(userId, slug, email) {
  if (!userId) return null;

  let query = supabase
    .from('memberships')
    .select(`
      tenant_id,
      tenants!inner (id, slug, email, nombre_empresa)
    `)
    .eq('user_id', userId);

  if (slug) {
    query = query.eq('tenants.slug', slug);
  } else if (email) {
    query = query.ilike('tenants.email', email);
  }

  const { data } = await query.limit(1).maybeSingle();
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
    if (!user) return res.status(401).json({ error: 'Token inválido o no proporcionado.' });

    const slug = req.params?.tenantSlug || req.params?.slug;
    const tenant = await resolveTenantForUser(user.id, slug, user.email);
    
    if (!tenant) return res.status(403).json({ error: 'Acceso denegado a este negocio.' });

    attach(req, { user, tenant });
    next();
  } catch (err) {
    res.status(500).json({ error: 'Error interno de autenticación.' });
  }
}

async function tokenOnly(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (!user) return res.status(401).json({ error: 'Token inválido o no proporcionado.' });
    
    attach(req, { user });
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