'use strict';
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const Stripe = require('stripe');
const { supabase } = require('./utils/supabaseClient');
const { processCommissionsAutomated } = require('./controllers/partners.controller');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' }) : null;

const requireAuth = require('./middlewares/requireAuth');
const subscriptionFirewall = require('./middlewares/subscriptionFirewall');

const webhooksRoutes = require('./routes/webhooks.routes');
const paquetesRoutes = require('./routes/paquetes.routes');
const ubicacionesRoutes = require('./routes/ubicaciones.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const areaPersonalRoutes = require('./routes/areaPersonal.routes');
const authRoutes = require('./routes/auth.routes');
const tenantsRoutes = require('./routes/tenants.routes');
const partnersRoutes = require('./routes/partners.routes');
const billingRoutes = require('./routes/billing.routes');
const limitsRoutes = require('./routes/limits.routes');
const importRoutes = require('./routes/import.routes');
const metricsRouter = require('./routes/metrics.routes');
const iaRoutes = require('./routes/ia.routes');
const radarRoutes = require('./routes/radar.routes');

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
  return cb(new Error('CORS_NOT_ALLOWED'));
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

app.use('/webhooks', webhooksRoutes);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/api/metrics', metricsRouter); 
app.use('/api/auth', authRoutes);
app.use('/api/billing', billingRoutes);
app.use('/billing', billingRoutes);

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

authOnly('/api/ubicaciones', ubicacionesRoutes);
authOnly('/:tenantSlug/api/ubicaciones', ubicacionesRoutes);

authOnly('/api/ia', iaRoutes);
authOnly('/:tenantSlug/api/ia', iaRoutes);

authOnly('/api/admin/radar', radarRoutes);

app.use('/api/partners', requireAuth.tokenOnly, partnersRoutes);

app.use('/api/tenants', subscriptionFirewall(), tenantsRoutes);

app.use((req, res) => {
  if (req.path === '/favicon.ico') return res.status(204).end();
  return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
});

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ ok: false, error: err.message || 'INTERNAL_ERROR' });
});

// CRONS
cron.schedule('0 3 * * *', async () => {
  try {
    await processCommissionsAutomated();
  } catch (error) {}
});

cron.schedule('0 4 * * *', async () => {
  if (!stripe) return;
  try {
    const { data: pending } = await supabase
      .from('pending_referral_credits')
      .select('*, tenant_referrals(referrer_tenant_id)')
      .eq('processed', false)
      .lte('release_at', new Date().toISOString());

    for (const item of (pending || [])) {
      const referrerId = item.tenant_referrals?.referrer_tenant_id;
      if (!referrerId) continue;
      
      const { data: referrer } = await supabase.from('tenants').select('stripe_customer_id').eq('id', referrerId).maybeSingle();
      
      if (referrer?.stripe_customer_id) {
        await stripe.customers.createBalanceTransaction(referrer.stripe_customer_id, {
          amount: -item.amount_cents,
          currency: 'eur',
          description: `Crédito por referido activo (Ref: ${item.id})`
        });
        await supabase.from('pending_referral_credits').update({ processed: true }).eq('id', item.id);
      }
    }
  } catch (error) { 
    console.error('Error procesando referidos:', error); 
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY',
    'SUPABASE_JWT_SECRET',
    'FRONTEND_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) console.warn('Faltan variables de entorno:', missing.join(', '));
  else console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});

module.exports = app;