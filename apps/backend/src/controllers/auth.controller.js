'use strict';

const { z } = require('zod');
const { supabaseAuth, supabase } = require('../utils/supabaseClient');
const { slugifyBase, uniqueSlug } = require('../utils/slug');

const APP_BASE = (process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nombre_empresa: z.string().min(2),
  full_name: z.string().min(2),
  plan_inicial: z.string().optional()
});

async function register(req, res) {
  try {
    const val = registerSchema.parse(req.body);
    const { data, error } = await supabaseAuth.auth.signUp({
      email: val.email,
      password: val.password,
      options: {
        data: { full_name: val.full_name, nombre_empresa: val.nombre_empresa, plan_inicial: 'free' },
        emailRedirectTo: `${APP_BASE}/auth/email-confirmado`
      }
    });
    if (error) return res.status(400).json({ ok: false, error: error.message });
    return res.json({ ok: true, user: data.user, session: data.session });
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'Datos de registro inválidos' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
  return res.json({ ok: true, session: data.session });
}

async function bootstrap(req, res) {
  try {
    const userId = req.user.id;
    const metadata = req.user.user_metadata || {};

    const { data: existing } = await supabase.from('memberships').select('tenant_id').eq('user_id', userId).maybeSingle();
    if (existing) {
      const { data: t } = await supabase.from('tenants').select('*').eq('id', existing.tenant_id).single();
      return res.json({ ok: true, tenant: t, status: 'existing' });
    }

    const rawSlug = slugifyBase(metadata.nombre_empresa || 'Mi Local');
    const slug = await uniqueSlug(rawSlug);
    
    const { data: tenant, error: tErr } = await supabase
      .from('tenants')
      .insert([{
        nombre_empresa: metadata.nombre_empresa || 'Mi Local',
        slug,
        email: req.user.email,
        plan_id: 'free',
        trial_quota: 250,
        trial_used: 0,
        is_ai_active: false,
        ai_trial_used: false,
        ai_trial_ends_at: null,
        goal_annual_eur: 5000,  
        currency: 'EUR'
      }])
      .select()
      .single();

    if (tErr) throw tErr;

    await supabase.from('memberships').insert([{ tenant_id: tenant.id, user_id: userId, role: 'owner' }]);
    
    return res.json({ ok: true, tenant, status: 'created' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Error de infraestructura' });
  }
}

module.exports = { register, login, bootstrap };