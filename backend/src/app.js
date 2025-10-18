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

/* ===== Rutas existentes ===== */
const paquetesRoutes = require('./routes/paquetes.routes');
const ubicacionesRoutes = require('./routes/ubicaciones.routes');
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
const limitsRoutes = require('./routes/limits.routes');
const adminRoutes = require('./routes/admin.routes');
const adminCountersRoutes = require('./routes/admin.counters.routes');
const adminSupportRoutes = require('./routes/admin.support.routes');
const importRoutes = require('./routes/import.routes');

/* ===== NUEVAS rutas DEMO/Activación ===== */
const demoRequestsPublic = require('./routes/public.demo.requests.routes');
const adminDemoRequests  = require('./routes/admin.demo.requests.routes');
const activationRoutes   = require('./routes/auth.activation.routes');
const geoRoutes          = require('./routes/geo.routes');

/* ===== NUEVA ruta SOPORTE ===== */
const supportRoutes      = require('./routes/support.routes');
const ticketsRoutes      = require('./routes/tickets.routes');

/* ============== CORS ROBUSTO ============== */
const envOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '')
  .split(',').map(s => s.trim()).filter(Boolean);

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
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/.well-known/health', (_req, res) => res.json({ ok: true }));

/* =========================================================
   STRIPE WEBHOOK (RAW) — SIEMPRE antes de express.json()
   ========================================================= */
const rawJson = express.raw({ type: 'application/json' });
app.post('/billing/stripe/webhook', rawJson, stripeWebhook);
app.post('/webhooks/stripe',      rawJson, stripeWebhook);

/* ============== Parsers JSON normales ============== */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/* ============== Rutas públicas (sin firewall) ============== */
app.use('/api/auth',              authRoutes);
app.use('/api/verificar-usuario', verificarUsuarioRoutes);
app.use('/api/metrics',           metricsRouter);
app.use('/api',                   demoRequestsPublic);  // POST /api/demo/requests
app.use('/api',                   activationRoutes);    // POST /api/auth/activate

/* ============== Admin (Superadmin) ============== */
app.use('/admin', adminRoutes);
app.use('/admin', adminCountersRoutes);
app.use('/admin', adminDemoRequests);
app.use('/api/geo', geoRoutes);
app.use('/admin', adminSupportRoutes);
/* =========================================================
   Billing (Stripe) — accesible sin firewall
   ========================================================= */
app.use('/billing',     billingRoutes);
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
authOnly('/api/dashboard',  dashboardRoutes);
authOnly('/api/imagenes',   imagenesRoutes);
authOnly('/api/estantes',   estantesRoutes);
authOnly('/:tenantSlug/api/dashboard',  dashboardRoutes);
authOnly('/:tenantSlug/api/imagenes',   imagenesRoutes);
authOnly('/:tenantSlug/api/estantes',   estantesRoutes);

/* =========================================================
   Trial-friendly: SIN subscriptionFirewall
   ========================================================= */
authOnly('/api/paquetes', paquetesRoutes);
app.use('/api/ubicaciones', ubicacionesRoutes);
authOnly('/api/area-personal', areaPersonalRoutes);
authOnly('/:tenantSlug/api/paquetes', paquetesRoutes);
authOnly('/:tenantSlug/api/area-personal', areaPersonalRoutes);
authOnly('/api/import', importRoutes);
authOnly('/:tenantSlug/api/import', importRoutes);

/* =========================================================
   Limits — solo login (sin subscriptionFirewall)  ✅
   ========================================================= */
authOnly('/api/limits', limitsRoutes);
authOnly('/:tenantSlug/api/limits', limitsRoutes);

/* =========================================================
   Tenants: protegido con firewall
   ========================================================= */
gate('/api/tenants', tenantsRoutes);

/* =========================================================
   Soporte (tickets) — solo login
   ========================================================= */
authOnly('/api/support', supportRoutes);
authOnly('/:tenantSlug/api/support', supportRoutes);
app.use('/api/tickets', ticketsRoutes);

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
});

module.exports = app;
