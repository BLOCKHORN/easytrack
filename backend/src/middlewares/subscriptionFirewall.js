// backend/src/middlewares/subscriptionFirewall.js
'use strict';

const rawRequireAuth       = require('./requireAuth');                 // tu middleware de auth
const makeRequireActive    = require('./requireActiveSubscription');   // factory → devuelve middleware

// Prefijos totalmente públicos (no auth, no sub-check)
const PUBLIC_PREFIXES = [
  '/health',
  '/.well-known/health',
  '/webhooks',       // p.ej. /webhooks/stripe
  '/billing',        // ojo: los handlers de billing pueden validar por su cuenta
  '/api/billing',
  '/api/auth',
  '/api/metrics',
  '/admin',          // /admin ya protege con requireSuperadmin internamente
];

// Endpoints “solo auth” (saltan el check de suscripción)
const AUTH_ONLY_EXACT = new Set([
  '/api/tenants/me', // ← necesitamos req.user para saber el tenant, pero NO bloquear por suscripción
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
