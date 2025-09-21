'use strict';
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

/* ===== Middlewares propios ===== */
const requireAuth = require('./middlewares/requireAuth');
const subscriptionFirewall = require('./middlewares/subscriptionFirewall');

/* ===== Rutas ===== */
const paquetesRoutes = require('./routes/paquetes.routes');
const estantesRoutes = require('./routes/estantes.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const areaPersonalRoutes = require('./routes/areaPersonal.routes');
const imagenesRoutes = require('./routes/imagenes.routes');
const authRoutes = require('./routes/auth.routes');
const verificarUsuarioRoutes = require('./routes/verificar.usuario');
const tenantsRoutes = require('./routes/tenants.routes');
const metricsRouter = require('./routes/metrics.routes');

const billingRoutes = require('./routes/billing.routes');
const { stripeWebhook } = require('./routes/stripe.webhook');

const adminRoutes = require('./routes/admin.routes');

/* ============== CORS ROBUSTO ============== */
const envOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const defaultsDev = [
  process.env.FRONTEND_URL,
  process.env.APP_BASE_URL,
  'http://localhost:5173','http://127.0.0.1:5173',
  'http://localhost:5174','http://127.0.0.1:5174',
  'http://localhost:4173','http://127.0.0.1:4173',
  'http://localhost:4174','http://127.0.0.1:4174',
].filter(Boolean);

const ALLOWED_ORIGINS = Array.from(new Set([
  ...envOrigins,
  ...(process.env.NODE_ENV === 'production' ? [] : defaultsDev),
]));

function originChecker(origin, cb) {
  if (!origin) return cb(null, true);
  if (ALLOWED_ORIGINS.includes('*')) return cb(null, true);
  try {
    const u = new URL(origin);
    const host = u.hostname;
    const ok =
      ALLOWED_ORIGINS.includes(origin) ||
      host === 'localhost' || host === '127.0.0.1' ||
      host.endsWith('.devtunnels.ms') ||
      host.endsWith('.vercel.app') ||
      host.endsWith('.onrender.com');
    return cb(null, ok);
  } catch {}
  return cb(new Error('Not allowed by CORS'));
}

const corsOptions = {
  origin: originChecker,
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Stripe-Signature'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

/* ============== Healthchecks ============== */
app.get('/health', (_, res) => res.json({ ok: true }));
app.get('/.well-known/health', (_, res) => res.json({ ok: true }));

/* =========================================================
   STRIPE WEBHOOK (RAW) — SIEMPRE antes de express.json()
   ========================================================= */
const rawJson = express.raw({ type: 'application/json' });
app.post('/billing/stripe/webhook', rawJson, stripeWebhook);
app.post('/webhooks/stripe', rawJson, stripeWebhook);

/* ============== Parsers JSON normales ============== */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/* ============== Rutas públicas (sin firewall) ============== */
app.use('/api/auth', authRoutes);
app.use('/api/verificar-usuario', verificarUsuarioRoutes);
app.use('/api/metrics', metricsRouter);

/* ============== Admin (Superadmin) ============== */
app.use('/admin', adminRoutes);

/* =========================================================
   Billing (Stripe) — accesible sin firewall
   ========================================================= */
app.use('/billing', billingRoutes);
app.use('/api/billing', billingRoutes);

/* =========================================================
   Helpers de montaje
   ========================================================= */
function gate(path, router) {
  app.use(path, requireAuth, subscriptionFirewall(), router);
}
function authOnly(path, router) {
  app.use(path, requireAuth, router);
}

/* ============== Rutas protegidas (solo login) ============== */
authOnly('/api/dashboard', dashboardRoutes);
authOnly('/api/imagenes', imagenesRoutes);
authOnly('/api/estantes', estantesRoutes);

authOnly('/:tenantSlug/api/dashboard', dashboardRoutes);
authOnly('/:tenantSlug/api/imagenes', imagenesRoutes);
authOnly('/:tenantSlug/api/estantes', estantesRoutes);

/* ============== Rutas protegidas (login + firewall) ============== */
gate('/api/tenants', tenantsRoutes);
gate('/api/paquetes', paquetesRoutes);
gate('/api/area-personal', areaPersonalRoutes);

gate('/:tenantSlug/api/paquetes', paquetesRoutes);
gate('/:tenantSlug/api/area-personal', areaPersonalRoutes);

/* ============== 404 ============== */
app.use((req, res) => {
  if (req.path === '/favicon.ico') return res.status(204).end();
  return res.status(404).json({ ok: false, error: 'Not found' });
});

/* ============== Error handler ============== */
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({ ok: false, error: err.message || 'Internal error' });
});

/* ============== Arranque ============== */
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY',
    'SUPABASE_JWT_SECRET',
    'APP_BASE_URL',
    'FRONTEND_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) console.warn('⚠️ Faltan variables .env:', missing.join(', '));

  console.log(`🚀 API EasyTrack escuchando en http://localhost:${PORT}`);
  if (ALLOWED_ORIGINS.length) console.log('CORS ORIGINS:', ALLOWED_ORIGINS.join(', '));
});

module.exports = app;
