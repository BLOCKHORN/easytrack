'use strict';

const rawRequireAuth       = require('./requireAuth');
const makeRequireActive    = require('./requireActiveSubscription');

const BYPASS = process.env.SUBSCRIPTION_FIREWALL_BYPASS === '1';

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

const AUTH_ONLY_EXACT = new Set([
  '/api/tenants/me',
]);

// ⬇️ añadimos '/api/tenants' completo para lecturas de estado
const AUTH_ONLY_PREFIXES = [
  '/api/dashboard',
  '/api/imagenes',
  '/api/limits',
  '/api/tenants',   // <— NUEVO
  '/api/config',
];

const APP_API_REGEX = /^\/(?:[^/]+\/)?api\/?/;

function pickAuthMiddleware(mod) {
  if (typeof mod === 'function') return mod;
  if (mod && typeof mod.requireAuth === 'function') return mod.requireAuth;
  if (mod && typeof mod.default === 'function') return mod.default;
  throw new Error('[subscriptionFirewall] requireAuth no es un middleware Express');
}

function normalizeAppPath(path) {
  if (!path) return '/';
  const m = path.match(/^\/([^/]+)(\/api\/.*)$/);
  if (m && !path.startsWith('/api/')) return m[2];
  return path;
}
const startsWithAny = (p, arr) => arr.some(x => p.startsWith(x));
const isPublicPrefix = (p) => startsWithAny(p, PUBLIC_PREFIXES);

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
      return requireActiveSubscription(req, res, next);
    });
  };
};
