// backend/src/middlewares/requireAuth.js
'use strict';

const { supabase, supabaseAuth } = require('../utils/supabaseClient');

// Helper interno para adjuntar datos al request
const attach = (req, { user, tenant }) => {
  if (user) req.user = user;
  if (tenant) {
    req.tenant = tenant;
    req.tenantId = tenant.id; // Alias unificado
  }
};

// Resuelve el usuario desde el JWT
async function resolveUser(req) {
  if (process.env.AUTH_BYPASS === 'true') return { id: 'dev-bypass', email: 'dev@example.com' };
  
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return null;

  try {
    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data?.user) return null;
    return { id: data.user.id, email: String(data.user.email || '').trim().toLowerCase() };
  } catch { return null; }
}

// Resuelve el Tenant (negocio) por Slug o Email
async function resolveTenant(slug, email) {
  let query = supabase.from('tenants').select('id, slug, email, nombre_empresa');
  if (slug) query = query.eq('slug', slug);
  else if (email) query = query.ilike('email', email);
  else return null;

  const { data } = await query.maybeSingle();
  return data || null;
}

// 1. Middleware Estricto (Bloquea si no hay login)
async function strictUser(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (!user) return res.status(401).json({ error: 'Token inválido o no proporcionado.' });

    const slug = req.params?.tenantSlug || req.params?.slug;
    const tenant = await resolveTenant(slug, slug ? null : user.email); // Prioriza slug, sino usa email
    
    attach(req, { user, tenant });
    next();
  } catch (err) {
    res.status(500).json({ error: 'Error interno de autenticación.' });
  }
}

// 2. Middleware Opcional (Pasa aunque no haya login, útil para endpoints públicos mixtos)
async function optional(req, res, next) {
  try {
    const user = await resolveUser(req);
    const slug = req.params?.tenantSlug || req.params?.slug;
    const tenant = user || slug ? await resolveTenant(slug, user?.email) : null;
    
    attach(req, { user, tenant });
    next();
  } catch (err) { next(); }
}

// 3. Validador estricto de Slug (Asegura que el user tiene acceso a ese slug exacto)
function requireTenantSlug(paramName = 'tenantSlug') {
  return async (req, res, next) => {
    const slug = req.params?.[paramName];
    if (!slug) return res.status(400).json({ error: `Falta ${paramName} en la ruta.` });
    if (!req.tenant || req.tenant.slug !== slug) return res.status(403).json({ error: 'No tienes acceso a este negocio.' });
    next();
  };
}

const exported = Object.assign(strictUser, { optional, strictUser, requireTenantSlug });
module.exports = exported;
module.exports.requireAuth = exported;
module.exports.default = exported;