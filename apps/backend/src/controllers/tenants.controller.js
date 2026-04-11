const { supabase } = require('../utils/supabaseClient');

async function resolveTenantId(req) {
  const direct = req.tenant?.id || req.tenant_id || req.tenantId;
  if (direct) return direct;
  const email = String(req.user?.email || '').toLowerCase().trim();
  if (!email) return null;
  const { data, error } = await supabase.from('tenants').select('id').ilike('email', email).maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

exports.actualizarTenantMe = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ ok: false, error: 'Tenant no resuelto' });
    const nombre = String(req.body?.nombre_empresa || '').trim();
    if (!nombre) return res.status(400).json({ ok: false, error: 'Nombre vacío' });
    const { data, error } = await supabase.from('tenants').update({ nombre_empresa: nombre }).eq('id', tenantId).select('id, slug, nombre_empresa, email').maybeSingle();
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
    
    const { data: t, error: tErr } = await supabase.from('tenants').select('ai_trial_used, plan_id').eq('id', tenantId).single();
    if (tErr || !t) return res.status(404).json({ ok: false, error: 'Tenant no encontrado' });
    if (t.plan_id !== 'plus') return res.status(400).json({ ok: false, error: 'Solo el plan Plus tiene acceso a esta prueba.' });
    if (t.ai_trial_used) return res.status(400).json({ ok: false, error: 'TRIAL_ALREADY_USED' });
    
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + 7);
    
    const { data, error } = await supabase.from('tenants').update({ 
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