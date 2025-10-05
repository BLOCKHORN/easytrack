// backend/src/controllers/areaPersonalSettings.controller.js
const { supabase } = require('../utils/supabaseClient');

async function resolveTenantId(req) {
  if (req.tenant_id) return req.tenant_id;
  if (req.tenant?.id) return req.tenant.id;
  const slug = req.params?.tenantSlug || req.params?.slug || null;
  if (slug) {
    const { data, error } = await supabase.from('tenants').select('id').eq('slug', slug).maybeSingle();
    if (error) throw error;
    return data?.id || null;
  }
  return null;
}

/**
 * GET /settings
 * Devuelve { settings: { goal_annual_eur, currency } }
 */
async function getFinanceSettings(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const { data, error } = await supabase
      .from('area_personal_settings')
      .select('goal_annual_eur, currency')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      console.error('❌ [GET /settings] Supabase error:', { code: error.code, details: error.details, message: error.message });
      throw error;
    }

    const settings = {
      goal_annual_eur: Number(data?.goal_annual_eur || 0),
      currency: data?.currency || 'EUR',
    };
    return res.json({ settings });
  } catch (err) {
    console.error('❌ [GET /settings] Error:', err?.message || err);
    return res.status(500).json({ error: 'Error al leer settings' });
  }
}

/**
 * PATCH /settings  { goal_annual_eur?: number, currency?: string }
 * Devuelve { settings: {...} } con lo guardado
 */
async function updateFinanceSettings(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const { goal_annual_eur, currency } = req.body || {};
    const updates = {};

    if (goal_annual_eur !== undefined) {
      const v = Number(goal_annual_eur);
      if (!Number.isFinite(v) || v < 0) {
        return res.status(400).json({ error: 'goal_annual_eur inválido' });
      }
      updates.goal_annual_eur = v;
    }
    if (currency !== undefined) {
      const cur = String(currency || '').trim().toUpperCase() || 'EUR';
      if (cur.length > 8) {
        return res.status(400).json({ error: 'currency inválida' });
      }
      updates.currency = cur;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Sin cambios' });
    }

    const { data, error } = await supabase
      .from('area_personal_settings')
      .upsert(
        { tenant_id: tenantId, ...updates, updated_at: new Date().toISOString() },
        { onConflict: 'tenant_id' }
      )
      .select('goal_annual_eur, currency')
      .maybeSingle();

    if (error) {
      console.error('❌ [PATCH /settings] Supabase error:', { code: error.code, details: error.details, message: error.message });
      throw error;
    }

    return res.json({
      settings: {
        goal_annual_eur: Number(data?.goal_annual_eur || 0),
        currency: data?.currency || 'EUR',
      },
    });
  } catch (err) {
    console.error('❌ [PATCH /settings] Error:', err?.message || err);
    return res.status(500).json({ error: 'Error al actualizar settings' });
  }
}

module.exports = {
  getFinanceSettings,
  updateFinanceSettings,
};
