'use strict';

const rawRequireAuth       = require('./requireAuth');               // tu middleware de auth
const makeRequireActive    = require('./requireActiveSubscription'); // factory → devuelve middleware

// Permite BYPASS temporal para no bloquear mientras depuras
const BYPASS = process.env.SUBSCRIPTION_FIREWALL_BYPASS === '1';

/* =========================================================
   Reglas
   - PUBLIC: pasan sin login ni sub-check.
   - AUTH_ONLY_EXACT: obligan login pero no chequean sub.
   - AUTH_ONLY_PREFIXES: cualquier ruta que empiece por estos prefijos (normalizados) pide login pero no sub.
   Nota: normalizamos '/:slug/api/...'(multi-tenant) a '/api/...'
   ========================================================= */
const PUBLIC_PREFIXES = [
  '/health',
  '/.well-known/health',
  '/webhooks',
  '/billing',
  '/api/billing',
  '/api/auth',
  '/api/metrics',
  '/admin',
];

// Endpoints exactos “solo auth”
const AUTH_ONLY_EXACT = new Set([
  '/api/tenants/me', // necesitamos req.user/tenant pero NO bloquear por suscripción aquí
]);

// Prefijos “solo auth” (tanto con como sin slug)
const AUTH_ONLY_PREFIXES = [
  '/api/dashboard',
  '/api/imagenes',
  '/api/limits',     // ✅ necesario para que el gate consulte límites/entitlements sin bloquear
];

// Detección de API de la app: /api/* ó /:slug/api/*
const APP_API_REGEX = /^\/(?:[^/]+\/)?api\/?/;

function pickAuthMiddleware(mod) {
  if (typeof mod === 'function') return mod;                   // export directo
  if (mod && typeof mod.requireAuth === 'function') return mod.requireAuth;
  if (mod && typeof mod.default === 'function') return mod.default;
  throw new Error('[subscriptionFirewall] requireAuth no es un middleware Express');
}

function normalizeAppPath(path) {
  // Convierte '/:tenantSlug/api/...' -> '/api/...'
  // Si ya empieza por '/api/', lo deja igual.
  if (!path) return '/';
  const m = path.match(/^\/([^/]+)(\/api\/.*)$/);
  if (m && !path.startsWith('/api/')) return m[2];
  return path;
}

function startsWithAny(path, prefixes) {
  return prefixes.some(p => path.startsWith(p));
}

function isPublicPrefix(path) {
  return startsWithAny(path, PUBLIC_PREFIXES);
}

module.exports = function subscriptionFirewall() {
  const requireAuth = pickAuthMiddleware(rawRequireAuth);
  const requireActiveSubscription = makeRequireActive();

  return (req, res, next) => {
    const rawPath = req.path;
    const isAppApi = APP_API_REGEX.test(rawPath);
    if (!isAppApi) return next();

    const path = normalizeAppPath(rawPath);

    if (isPublicPrefix(path)) return next();

    if (BYPASS) {
      res.setHeader('X-SubFirewall', 'bypass');
      return requireAuth(req, res, next);
    }

    if (AUTH_ONLY_EXACT.has(path)) {
      res.setHeader('X-SubFirewall', 'auth-only-exact');
      return requireAuth(req, res, next);
    }

    if (startsWithAny(path, AUTH_ONLY_PREFIXES)) {
      res.setHeader('X-SubFirewall', 'auth-only-prefix');
      return requireAuth(req, res, next);
    }

    return requireAuth(req, res, (err) => {
      if (err) return next(err);
      // El header 'active-required' también lo pone el middleware interno
      return requireActiveSubscription(req, res, next);
    });
  };
};
