'use strict';

const { supabaseAdmin } = require('../utils/supabaseClient');
const { isDirectPg, query } = require('../utils/db');
const { computeEntitlements } = require('../utils/entitlements');
const { fetchSubscriptionForTenant } = require('../utils/subscription');
const { slugifyBase, uniqueSlug } = require('../utils/slug');

const TENANT_FIELDS = 'id, slug, nombre_empresa, email, trial_quota, trial_used, soft_blocked, plan_id, requested_plan, is_ai_active, ai_trial_ends_at, ai_trial_used, fecha_creacion';

async function ensureTenantByEmail(email) {
  const em = String(email || '').toLowerCase().trim();
  if (!em) return null;

  const { data: exist } = await supabaseAdmin
    .from('tenants')
    .select(TENANT_FIELDS)
    .ilike('email', em)
    .order('fecha_creacion', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (exist) return exist;

  const base = slugifyBase(em.split('@')[0]);
  const slug = await uniqueSlug(supabaseAdmin, base);

  const { data, error } = await supabaseAdmin
    .from('tenants')
    .insert([{ email: em, nombre_empresa: base, slug, plan_id: 'free' }])
    .select(TENANT_FIELDS)
    .single();

  if (error) {
    const { data: again } = await supabaseAdmin
      .from('tenants')
      .select(TENANT_FIELDS)
      .ilike('email', em)
      .maybeSingle();
    return again || null;
  }
  return data;
}

async function resolveTenantId(req) {
  const direct = req.tenant?.id || req.tenant_id || req.tenantId;
  if (direct) return direct;
  const email = String(req.user?.email || '').toLowerCase().trim();
  if (!email) return null;
  if (isDirectPg()) {
    const { rows } = await query('SELECT id FROM public.tenants WHERE lower(email) = lower($1) ORDER BY fecha_creacion DESC LIMIT 1', [email]);
    return rows[0]?.id || null;
  }
  const { data, error } = await supabaseAdmin.from('tenants').select('id').ilike('email', email).maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

exports.obtenerTenantMe = async (req, res) => {
  try {
    const slugQ = req.query?.slug || null;
    const email = String(req.user?.email || '').toLowerCase().trim();
    if (!email && !req.user?.id) {
      return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED' });
    }

    if (isDirectPg()) {
      let t = null;
      if (req.tenant?.id) {
        const { rows } = await query(`SELECT ${TENANT_FIELDS} FROM public.tenants WHERE id = $1 LIMIT 1`, [req.tenant.id]);
        t = rows[0] || null;
      }
      if (!t && slugQ) {
        const { rows } = await query(`SELECT ${TENANT_FIELDS} FROM public.tenants WHERE slug = $1 LIMIT 1`, [slugQ]);
        t = rows[0] || null;
      }
      if (!t && req.user?.id) {
        const { rows } = await query(`
          SELECT t.id, t.slug, t.nombre_empresa, t.email, t.trial_quota, t.trial_used, t.soft_blocked, t.plan_id, t.requested_plan, t.is_ai_active, t.ai_trial_ends_at, t.ai_trial_used, t.fecha_creacion
          FROM public.memberships m
          JOIN public.tenants t ON t.id = m.tenant_id
          WHERE m.user_id = $1
          LIMIT 1
        `, [req.user.id]);
        t = rows[0] || null;
      }
      if (!t && email) {
        const { rows } = await query(`SELECT ${TENANT_FIELDS} FROM public.tenants WHERE lower(email) = lower($1) ORDER BY fecha_creacion DESC LIMIT 1`, [email]);
        t = rows[0] || null;
      }
      if (t) {
        const subscription = await fetchSubscriptionForTenant(t.id);
        const entitlements = computeEntitlements({ tenant: t, subscription });
        return res.json({ ok: true, tenant: t, subscription, entitlements });
      }
    }

    if (req.tenant?.id) {
      const { data: t, error: terr } = await supabaseAdmin
        .from('tenants')
        .select(TENANT_FIELDS)
        .eq('id', req.tenant.id)
        .maybeSingle();
      if (terr) return res.status(500).json({ ok: false, error: 'TENANT_LOOKUP_FAILED' });
      if (!t) return res.status(404).json({ ok: false, error: 'TENANT_NOT_FOUND' });

      const subscription = await fetchSubscriptionForTenant(t.id);
      const entitlements = computeEntitlements({ tenant: t, subscription });
      return res.json({ ok: true, tenant: t, subscription, entitlements });
    }

    if (!email) {
      return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED' });
    }

    if (slugQ) {
      const { data: t, error } = await supabaseAdmin
        .from('tenants')
        .select(TENANT_FIELDS)
        .eq('slug', slugQ)
        .maybeSingle();
      if (error) return res.status(500).json({ ok: false, error: 'TENANT_LOOKUP_FAILED' });
      const tenant = t || await ensureTenantByEmail(email);
      if (!tenant) return res.status(500).json({ ok: false, error: 'TENANT_PROVISION_FAILED' });
      const subscription = await fetchSubscriptionForTenant(tenant.id);
      const entitlements = computeEntitlements({ tenant, subscription });
      return res.json({ ok: true, tenant, subscription, entitlements });
    }

    const tenant = await ensureTenantByEmail(email);
    if (!tenant) {
      return res.status(500).json({ ok: false, error: 'TENANT_PROVISION_FAILED' });
    }

    const subscription = await fetchSubscriptionForTenant(tenant.id);
    const entitlements = computeEntitlements({ tenant, subscription });
    return res.json({ ok: true, tenant, subscription, entitlements });
  } catch (err) {
    console.error('Error en obtenerTenantMe:', err);
    return res.status(500).json({ ok: false, error: 'TENANT_ME_FAILED' });
  }
};

exports.actualizarTenantMe = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ ok: false, error: 'Tenant no resuelto' });
    const nombre = String(req.body?.nombre_empresa || '').trim();
    if (!nombre) return res.status(400).json({ ok: false, error: 'Nombre vacío' });

    if (isDirectPg()) {
      const { rows } = await query('UPDATE public.tenants SET nombre_empresa = $1 WHERE id = $2 RETURNING id, slug, nombre_empresa, email', [nombre, tenantId]);
      return res.json({ ok: true, tenant: rows[0] });
    }

    const { data, error } = await supabaseAdmin.from('tenants').update({ nombre_empresa: nombre }).eq('id', tenantId).select('id, slug, nombre_empresa, email').maybeSingle();
    if (error) throw error;
    return res.json({ ok: true, tenant: data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'No se pudo actualizar el tenant' });
  }
};

exports.activarPruebaIA = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ ok: false, error: 'Tenant no resuelto' });
    
    if (isDirectPg()) {
      const { rows } = await query('SELECT ai_trial_used, plan_id FROM public.tenants WHERE id = $1 LIMIT 1', [tenantId]);
      const t = rows[0];
      if (!t) return res.status(404).json({ ok: false, error: 'Tenant no encontrado' });
      if (t.plan_id !== 'plus') return res.status(400).json({ ok: false, error: 'Solo el plan Plus tiene acceso a esta prueba.' });
      if (t.ai_trial_used) return res.status(400).json({ ok: false, error: 'TRIAL_ALREADY_USED' });
      
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + 7);
      
      const upd = await query(`
        UPDATE public.tenants 
        SET ai_trial_used = true, ai_trial_ends_at = $1, is_ai_active = true 
        WHERE id = $2 
        RETURNING ai_trial_ends_at
      `, [endsAt.toISOString(), tenantId]);
      return res.json({ ok: true, ai_trial_ends_at: upd.rows[0]?.ai_trial_ends_at });
    }

    const { data: t, error: tErr } = await supabaseAdmin.from('tenants').select('ai_trial_used, plan_id').eq('id', tenantId).single();
    if (tErr || !t) return res.status(404).json({ ok: false, error: 'Tenant no encontrado' });
    if (t.plan_id !== 'plus') return res.status(400).json({ ok: false, error: 'Solo el plan Plus tiene acceso a esta prueba.' });
    if (t.ai_trial_used) return res.status(400).json({ ok: false, error: 'TRIAL_ALREADY_USED' });
    
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + 7);
    
    const { data, error } = await supabaseAdmin.from('tenants').update({ 
      ai_trial_used: true, 
      ai_trial_ends_at: endsAt.toISOString(),
      is_ai_active: true
    }).eq('id', tenantId).select('ai_trial_ends_at').single();
    
    if (error) throw error;
    return res.json({ ok: true, ai_trial_ends_at: data.ai_trial_ends_at });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'No se pudo activar la prueba de IA' });
  }
};

exports.generarMagicLinkIncognito = async (req, res) => {
  try {
    const adminId = req.user.id;

    const { data: isAdmin } = await supabaseAdmin
      .from('superadmins')
      .select('user_id')
      .eq('user_id', adminId)
      .single();

    if (!isAdmin) return res.status(403).json({ ok: false, error: 'No autorizado' });

    const emailObjetivo = req.body.email;
    if (!emailObjetivo) return res.status(400).json({ ok: false, error: 'Email requerido' });

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: emailObjetivo
    });

    if (error) throw error;

    return res.json({ ok: true, link: data.properties.action_link });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Error al generar el enlace de acceso' });
  }
};