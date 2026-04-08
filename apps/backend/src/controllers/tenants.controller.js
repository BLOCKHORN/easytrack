// backend/src/controllers/tenants.controller.js
const { supabase } = require('../utils/supabaseClient');

async function resolveTenantId(req) {
  const direct = req.tenant?.id || req.tenant_id;
  if (direct) return direct;

  const email = String(req.user?.email || '').toLowerCase().trim();
  if (!email) return null;

  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .ilike('email', email)
    .maybeSingle();

  if (error) throw error;
  return data?.id || null;
}

/** POST /api/tenants/me -> actualizar nombre del negocio del tenant actual */
exports.actualizarTenantMe = async (req, res) => {
  try {
    const tenantId = (req.tenant && req.tenant.id) || await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ ok: false, error: 'Tenant no resuelto' });

    const nombre = String(req.body?.nombre_empresa || '').trim();
    if (!nombre) return res.status(400).json({ ok: false, error: 'Nombre vacío' });

    const { data, error } = await supabase
      .from('tenants')
      .update({ nombre_empresa: nombre })
      .eq('id', tenantId)
      .select('id, slug, nombre_empresa, email')
      .maybeSingle();

    if (error) throw error;
    return res.json({ ok: true, tenant: data });
  } catch (e) {
    console.error('[tenants.me/POST] error:', e);
    return res.status(500).json({ ok: false, error: 'No se pudo actualizar el tenant' });
  }
};
