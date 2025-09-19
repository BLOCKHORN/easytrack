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
  'http://localhost:5173', 'http://127.0.0.1:5173',
  'http://localhost:5174', 'http://127.0.0.1:5174',
  'http://localhost:4173', 'http://127.0.0.1:4173',
  'http://localhost:4174', 'http://127.0.0.1:4174',
  'https://8r7cj2hr-5173.uks1.devtunnels.ms',
].filter(Boolean);

const ALLOWED_ORIGINS = Array.from(new Set([
  ...envOrigins,
  ...(process.env.NODE_ENV === 'production' ? [] : defaultsDev),
]));

function originChecker(origin, cb) {
  if (!origin) return cb(null, true);          // curl/cron/healthchecks
  if (ALLOWED_ORIGINS.includes('*')) return cb(null, true);

  try {
    const u = new URL(origin);
    const host = u.hostname;
    const ok =
      ALLOWED_ORIGINS.includes(origin) ||
      host === 'localhost' || host === '127.0.0.1' ||
      host.endsWith('.devtunnels.ms') ||
      host.endsWith('.vercel.app');            // previews/prod en Vercel
    if (ok) return cb(null, true);
  } catch { /* noop */ }

  return cb(new Error('Not allowed by CORS'));
}

const corsOptions = {
  origin: originChecker,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Stripe-Signature'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

/* ============== Healthchecks ============== */
app.get('/health', (_, res) => res.json({ ok: true }));
app.get('/.well-known/health', (_, res) => res.json({ ok: true }));

/* =========================================================
   STRIPE WEBHOOK (RAW) — antes de express.json()
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
   Billing (Stripe) — SIEMPRE accesible (antes del firewall)
   ========================================================= */
app.use('/billing', billingRoutes);
app.use('/api/billing', billingRoutes);

/* =========================================================
   Helper para montar rutas protegidas:
   requireAuth  → subscriptionFirewall → router
   ========================================================= */
function gate(path, router) {
  app.use(path, requireAuth, subscriptionFirewall(), router);
}

/* ============== Rutas protegidas (legacy sin slug) ============== */
gate('/api/tenants', tenantsRoutes);
gate('/api/paquetes', paquetesRoutes);
gate('/api/estantes', estantesRoutes);
gate('/api/dashboard', dashboardRoutes);
gate('/api/area-personal', areaPersonalRoutes);
gate('/api/imagenes', imagenesRoutes);

/* ============== Rutas protegidas multi-tenant (con slug) ============== */
gate('/:tenantSlug/api/paquetes', paquetesRoutes);
gate('/:tenantSlug/api/estantes', estantesRoutes);
gate('/:tenantSlug/api/dashboard', dashboardRoutes);
gate('/:tenantSlug/api/area-personal', areaPersonalRoutes);
gate('/:tenantSlug/api/imagenes', imagenesRoutes);

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
