// backend/src/middlewares/subscriptionFirewall.js
'use strict';

const rawRequireAuth       = require('./requireAuth');               // tu middleware de auth
const makeRequireActive    = require('./requireActiveSubscription'); // factory → devuelve middleware

// Permite BYPASS temporal (prod o staging) para no bloquear mientras depuras
const BYPASS = process.env.SUBSCRIPTION_FIREWALL_BYPASS === '1';

// Prefijos totalmente públicos (no auth, no sub-check)
const PUBLIC_PREFIXES = [
  '/health',
  '/.well-known/health',
  '/webhooks',      // p.ej. /webhooks/stripe
  '/billing',       // los handlers de billing validan por su cuenta (y /portal ya trae requireAuth)
  '/api/billing',
  '/api/auth',
  '/api/metrics',
  '/admin',         // /admin protege internamente
];

// Endpoints “solo auth” (saltan el check de suscripción)
const AUTH_ONLY_EXACT = new Set([
  '/api/tenants/me', // necesitamos req.user/tenant pero NO bloquear por suscripción aquí
]);

// Coincide con /api/* y /:slug/api/*
const APP_API_REGEX = /^\/(?:[^/]+\/)?api\/?/;

function pickAuthMiddleware(mod) {
  if (typeof mod === 'function') return mod;                   // export directo
  if (mod && typeof mod.requireAuth === 'function') return mod.requireAuth;
  if (mod && typeof mod.default === 'function') return mod.default;
  throw new Error('[subscriptionFirewall] requireAuth no es un middleware Express');
}

function isPublicPrefix(path) {
  return PUBLIC_PREFIXES.some(p => path.startsWith(p));
}

module.exports = function subscriptionFirewall() {
  const requireAuth = pickAuthMiddleware(rawRequireAuth);
  const requireActiveSubscription = makeRequireActive();

  return (req, res, next) => {
    const path = req.path;

    // No es API de la app → continuar
    if (!APP_API_REGEX.test(path)) return next();

    // Endpoints totalmente públicos
    if (isPublicPrefix(path)) return next();

    // BYPASS para debug/control
    if (BYPASS) {
      res.setHeader('X-SubFirewall', 'bypass');
      return requireAuth(req, res, next); // al menos exige login
    }

    // Endpoints que requieren login pero NO chequeo de suscripción
    if (AUTH_ONLY_EXACT.has(path)) {
      return requireAuth(req, res, next);
    }

    // Resto de la app cliente: auth + suscripción activa
    return requireAuth(req, res, (err) => {
      if (err) return next(err);
      return requireActiveSubscription(req, res, next);
    });
  };
};
