// src/controllers/paquetes.controller.js  (CommonJS, SOLO packages + ubicaciones)
const supa = require('../utils/supabaseClient');
const supabase = supa.supabase || supa.default || supa;

const up = (s = '') => String(s || '').trim().toUpperCase();

/* ---------- helpers ---------- */

// tenant por query o a partir del JWT (si lo necesitas)
async function resolveTenantId(req) {
  if (req.query?.tenantId) return String(req.query.tenantId);
  if (req.query?.tenant_id) return String(req.query.tenant_id);

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;

    const userId = data.user.id;

    // memberships
    try {
      const { data: map } = await supabase
        .from('memberships')
        .select('tenant_id')
        .eq('user_id', userId)
        .limit(1);
      if (map && map[0]?.tenant_id) return String(map[0].tenant_id);
    } catch (_) {}

    // fallback
    return null;
  } catch {
    return null;
  }
}

async function getEmpresaId(tenantId, nombre) {
  const { data, error } = await supabase
    .from('empresas_transporte_tenant')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('nombre', nombre)
    .maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

async function resolveUbiIdByLabel(tenantId, label) {
  const lbl = up(label);
  const { data, error } = await supabase
    .from('ubicaciones')
    .select('id,label')
    .eq('tenant_id', tenantId)
    .eq('label', lbl)
    .maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

async function ensureUbiBelongsToTenant(tenantId, ubiId) {
  const { data, error } = await supabase
    .from('ubicaciones')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('id', ubiId)
    .maybeSingle();
  if (error) throw error;
  return !!data?.id;
}

/* ========== Listar (packages) ========== */
async function listarPaquetes(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.json({ paquetes: [] });

    const { data, error } = await supabase
      .from('packages')
      .select(`
        id, tenant_id, nombre_cliente, empresa_transporte, empresa_id,
        fecha_llegada, entregado, fecha_entregado, ingreso_generado,
        ubicacion_id, ubicacion_label
      `)
      .eq('tenant_id', tenantId)
      .order('fecha_llegada', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ paquetes: data || [] });
  } catch (err) {
    console.error('[packages.listar] err:', err);
    return res.status(500).json({ error: 'Error al listar paquetes' });
  }
}

/* ========== Crear (packages) ========== */
async function crearPaquete(req, res) {
  try {
    const {
      tenant_id,
      nombre_cliente,
      empresa_transporte,
      ubicacion_id,
      ubicacion_label,   // "B6", "B25", ...
      // compat vieja: por si el front aun manda estos
      balda_id,
      compartimento
    } = req.body || {};

    const tenantId = tenant_id || (await resolveTenantId(req));
    if (!tenantId) return res.status(400).json({ error: 'Falta tenant_id' });
    if (!empresa_transporte) return res.status(400).json({ error: 'Falta empresa_transporte' });

    const empresaId = await getEmpresaId(tenantId, empresa_transporte);
    if (!empresaId) return res.status(400).json({ error: 'Empresa de transporte no encontrada para este tenant.' });

    // normalizamos inputs nuevos y legacy
    let finalUbiId = null;
    let finalUbiLabel = null;

    if (ubicacion_id) {
      const ok = await ensureUbiBelongsToTenant(tenantId, ubicacion_id);
      if (!ok) return res.status(400).json({ error: 'ubicacion_id no pertenece a este tenant' });
      finalUbiId = ubicacion_id;
    }
    if (ubicacion_label) {
      finalUbiLabel = up(ubicacion_label);
      if (!finalUbiId) {
        const id = await resolveUbiIdByLabel(tenantId, finalUbiLabel);
        if (!id) return res.status(400).json({ error: `No existe la ubicación ${finalUbiLabel}` });
        finalUbiId = id;
      }
    }

    // compat (viejito)
    if (!finalUbiId && (balda_id != null || compartimento)) {
      const lbl = compartimento ? up(compartimento) : null;
      if (balda_id != null) {
        const ok = await ensureUbiBelongsToTenant(tenantId, balda_id);
        if (!ok) return res.status(400).json({ error: 'ubicacion_id (balda_id) no pertenece a este tenant' });
        finalUbiId = balda_id;
      } else if (lbl) {
        const id = await resolveUbiIdByLabel(tenantId, lbl);
        if (!id) return res.status(400).json({ error: `No existe la ubicación ${lbl}` });
        finalUbiId = id;
        finalUbiLabel = lbl;
      }
    }

    if (!finalUbiId) return res.status(400).json({ error: 'Falta ubicacion_id o ubicacion_label.' });

    // si no vino el label, lo rellenamos desde tabla (trigger también lo hace)
    if (!finalUbiLabel) {
      const { data: u } = await supabase
        .from('ubicaciones')
        .select('label')
        .eq('id', finalUbiId)
        .eq('tenant_id', tenantId)
        .maybeSingle();
      finalUbiLabel = up(u?.label || '');
    }

    const insertRow = {
      tenant_id: tenantId,
      empresa_id: empresaId,
      nombre_cliente: up(nombre_cliente || ''),
      empresa_transporte,
      ubicacion_id: finalUbiId,
      ubicacion_label: finalUbiLabel || null,
      entregado: false,
    };

    const { data, error } = await supabase
      .from('packages')
      .insert(insertRow)
      .select(`
        id, tenant_id, nombre_cliente, empresa_transporte, empresa_id,
        fecha_llegada, entregado, fecha_entregado, ingreso_generado,
        ubicacion_id, ubicacion_label
      `)
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ paquete: data });
  } catch (err) {
    console.error('[packages.crear] err:', err);
    return res.status(500).json({ error: 'Error al crear paquete' });
  }
}

/* ========== Entregar ========== */
async function entregarPaquete(req, res) {
  try {
    const id = req.params.id;
    const tenantId = await resolveTenantId(req);
    if (!id) return res.status(400).json({ error: 'Falta id' });
    if (!tenantId) return res.status(400).json({ error: 'Falta tenantId' });

    const { data, error } = await supabase
      .from('packages')
      .update({ entregado: true, fecha_entregado: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id,entregado,fecha_entregado')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'No encontrado para este tenant' });

    return res.json({ paquete: data });
  } catch (err) {
    console.error('[packages.entregar] err:', err);
    return res.status(500).json({ error: 'Error al entregar paquete' });
  }
}

/* ========== Editar (mover de ubicación, etc.) ========== */
async function editarPaquete(req, res) {
  try {
    const id = req.params.id || req.body?.id;
    const tenantId = await resolveTenantId(req);
    if (!id) return res.status(400).json({ error: 'Falta id' });
    if (!tenantId) return res.status(400).json({ error: 'Falta tenantId' });

    const patch = {};
    if (req.body?.nombre_cliente != null) patch.nombre_cliente = up(req.body.nombre_cliente);
    if (req.body?.empresa_transporte != null) patch.empresa_transporte = req.body.empresa_transporte;

    // mover de ubicación
    let nextUbiId = null;
    let nextUbiLabel = null;

    if (req.body?.ubicacion_id != null) {
      const ok = await ensureUbiBelongsToTenant(tenantId, req.body.ubicacion_id);
      if (!ok) return res.status(400).json({ error: 'ubicacion_id no pertenece a este tenant' });
      nextUbiId = req.body.ubicacion_id;
    }
    if (req.body?.ubicacion_label) {
      nextUbiLabel = up(req.body.ubicacion_label);
      if (!nextUbiId) {
        const id2 = await resolveUbiIdByLabel(tenantId, nextUbiLabel);
        if (!id2) return res.status(400).json({ error: `No existe la ubicación ${nextUbiLabel}` });
        nextUbiId = id2;
      }
    }

    if (nextUbiId) {
      patch.ubicacion_id = nextUbiId;
      patch.ubicacion_label = nextUbiLabel || null;
    }

    const { data, error } = await supabase
      .from('packages')
      .update(patch)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(`
        id, tenant_id, nombre_cliente, empresa_transporte, empresa_id,
        fecha_llegada, entregado, fecha_entregado, ingreso_generado,
        ubicacion_id, ubicacion_label
      `)
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'No encontrado para este tenant' });

    return res.json({ paquete: data });
  } catch (err) {
    console.error('[packages.editar] err:', err);
    return res.status(500).json({ error: 'Error al editar paquete' });
  }
}

/* ========== Eliminar ========== */
async function eliminarPaquete(req, res) {
  try {
    const id = req.params.id;
    const tenantId = await resolveTenantId(req);
    if (!id) return res.status(400).json({ error: 'Falta id' });
    if (!tenantId) return res.status(400).json({ error: 'Falta tenantId' });

    const { data, error } = await supabase
      .from('packages')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'No encontrado para este tenant' });

    return res.json({ ok: true });
  } catch (err) {
    console.error('[packages.eliminar] err:', err);
    return res.status(500).json({ error: 'Error al eliminar paquete' });
  }
}

module.exports = {
  listarPaquetes,
  crearPaquete,
  entregarPaquete,
  editarPaquete,
  eliminarPaquete,
};
