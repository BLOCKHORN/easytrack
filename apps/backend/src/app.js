'use strict';
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const requireAuth = require('./middlewares/requireAuth');
const subscriptionFirewall = require('./middlewares/subscriptionFirewall');

const paquetesRoutes = require('./routes/paquetes.routes');
const ubicacionesRoutes = require('./routes/ubicaciones.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const areaPersonalRoutes = require('./routes/areaPersonal.routes');
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

const activationRoutes = require('./routes/auth.activation.routes');
const geoRoutes = require('./routes/geo.routes');

const supportRoutes = require('./routes/support.routes');
const ticketsRoutes = require('./routes/tickets.routes');

const adminBillingRoutes = require('./routes/admin.billing.routes');
const adminTenantsRoutes = require('./routes/admin.tenants.routes');

const iaRoutes = require('./routes/ia.routes');

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

app.get('/health', (req, res) => res.status(200).send('OK'));
app.head('/health', (req, res) => res.status(200).end());
app.get('/.well-known/health', (req, res) => res.status(200).send('OK'));
app.head('/.well-known/health', (req, res) => res.status(200).end());

const rawJson = express.raw({ type: 'application/json' });
app.post('/billing/stripe/webhook', rawJson, stripeWebhook);
app.post('/webhooks/stripe', rawJson, stripeWebhook);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/verificar-usuario', verificarUsuarioRoutes);
app.use('/api/metrics', metricsRouter);
app.use('/api', activationRoutes);

app.use('/admin', adminRoutes);
app.use('/admin', adminCountersRoutes);
app.use('/api/geo', geoRoutes);
app.use('/admin', adminSupportRoutes);

app.use('/billing', billingRoutes);
app.use('/api/billing', billingRoutes);

app.use('/admin', adminBillingRoutes);
app.use('/admin/tenants', adminTenantsRoutes);

function gate(path, router) {
  app.use(path, requireAuth, subscriptionFirewall(), router);
}
function authOnly(path, router) {
  app.use(path, requireAuth, router);
}

authOnly('/api/dashboard', dashboardRoutes);
authOnly('/:tenantSlug/api/dashboard', dashboardRoutes);

authOnly('/api/paquetes', paquetesRoutes);
authOnly('/:tenantSlug/api/paquetes', paquetesRoutes);

authOnly('/api/area-personal', areaPersonalRoutes);
authOnly('/:tenantSlug/api/area-personal', areaPersonalRoutes);

authOnly('/api/import', importRoutes);
authOnly('/:tenantSlug/api/import', importRoutes);

authOnly('/api/limits', limitsRoutes);
authOnly('/:tenantSlug/api/limits', limitsRoutes);

authOnly('/api/support', supportRoutes);
authOnly('/:tenantSlug/api/support', supportRoutes);
app.use('/api/tickets', ticketsRoutes);

authOnly('/api/ubicaciones', ubicacionesRoutes);
authOnly('/:tenantSlug/api/ubicaciones', ubicacionesRoutes);

authOnly('/api/estantes', ubicacionesRoutes);
authOnly('/:tenantSlug/api/estantes', ubicacionesRoutes);

authOnly('/api/ia', iaRoutes);
authOnly('/:tenantSlug/api/ia', iaRoutes);

gate('/api/tenants', tenantsRoutes);

app.use((req, res) => {
  if (req.path === '/favicon.ico') return res.status(204).end();
  return res.status(404).json({ ok: false, error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ ok: false, error: err.message || 'Internal error' });
});

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
  if (missing.length) console.warn('Missing env vars:', missing.join(', '));
});

module.exports = app;