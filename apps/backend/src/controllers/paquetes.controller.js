'use strict';

const supa = require('../utils/supabaseClient');
const supabase = supa.supabase || supa.default || supa;
const { computeEntitlements } = require('../utils/entitlements');
const { fetchSubscriptionForTenant } = require('../utils/subscription');

const up = (s = '') => String(s || '').trim().toUpperCase();

async function resolveTenantId(req) {
  if (req.query?.tenantId) return String(req.query.tenantId);
  if (req.query?.tenant_id) return String(req.query.tenant_id);
  if (req.tenant?.id) return String(req.tenant.id);
  if (req.tenantId) return String(req.tenantId);

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;
    const userId = data.user.id;
    const { data: map } = await supabase.from('memberships').select('tenant_id').eq('user_id', userId).limit(1);
    return map && map[0]?.tenant_id ? String(map[0].tenant_id) : null;
  } catch {
    return null;
  }
}

async function getEmpresaId(tenantId, nombre) {
  const { data, error } = await supabase.from('empresas_transporte_tenant').select('id').eq('tenant_id', tenantId).eq('nombre', nombre).maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

async function getTarifaPorEmpresaId(empresaId) {
  if (!empresaId) return 0;
  const { data, error } = await supabase.from('empresas_transporte_tenant').select('ingreso_por_entrega').eq('id', empresaId).maybeSingle();
  if (error) throw error;
  return Number(data?.ingreso_por_entrega || 0);
}

async function resolveUbiIdByLabel(tenantId, label) {
  const lbl = up(label);
  const { data, error } = await supabase.from('ubicaciones').select('id').eq('tenant_id', tenantId).eq('label', lbl).maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

async function ensureUbiBelongsToTenant(tenantId, ubiId) {
  const { data, error } = await supabase.from('ubicaciones').select('id').eq('tenant_id', tenantId).eq('id', ubiId).maybeSingle();
  if (error) throw error;
  return !!data?.id;
}

function applyCommonFilters(qb, { estado, compania, ubicacion, search }) {
  if (estado === 'pendiente') qb = qb.eq('entregado', false);
  else if (estado === 'entregado') qb = qb.eq('entregado', true);
  
  if (compania && compania !== 'todos') qb = qb.eq('empresa_transporte', compania);
  if (ubicacion && ubicacion !== 'todas') qb = qb.eq('ubicacion_label', up(ubicacion));
  
  if (search && search.trim()) {
    const s = search.trim();
    qb = qb.or(`nombre_cliente.ilike.%${s}%,empresa_transporte.ilike.%${s}%,telefono.ilike.%${s}%`);
  }
  
  return qb;
}

async function listarPaquetes(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.json({ paquetes: [] });
    
    const { limit, offset, all, estado, compania, ubicacion, search, order = 'fecha_llegada', dir = 'desc' } = req.query || {};
    const filters = { estado, compania, ubicacion, search };
    const cols = `id, tenant_id, nombre_cliente, empresa_transporte, empresa_id, fecha_llegada, entregado, fecha_entregado, ingreso_generado, ubicacion_id, ubicacion_label, telefono`;
    
    let qb = supabase.from('packages').select(cols).eq('tenant_id', tenantId);
    qb = applyCommonFilters(qb, filters);
    qb = qb.order(order, { ascending: String(dir).toLowerCase() === 'asc' });

    if (String(all) === '1') {
      qb = qb.limit(50000);
    } else {
      const lim = Number(limit ?? 50);
      const off = Number(offset ?? 0);
      qb = qb.range(off, off + lim - 1);
    }

    const { data, error } = await qb;
    if (error) throw error;
    
    return res.json({ paquetes: data || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Error al listar paquetes' });
  }
}

async function contarPaquetes(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.json({ total: 0, entregados: 0, pendientes: 0 });
    
    const { estado, compania, ubicacion, search } = req.query || {};
    
    const { data, error } = await supabase.rpc('contar_kpis_paquetes', {
      p_tenant_id: tenantId,
      p_estado: estado || null,
      p_compania: compania || null,
      p_ubicacion: ubicacion || null,
      p_search: search ? search.trim() : null
    });

    if (error) throw error;

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Error al contar paquetes' });
  }
}

async function crearPaquete(req, res) {
  try {
    const { tenant_id, nombre_cliente, empresa_transporte, ubicacion_id, ubicacion_label, balda_id, compartimento, telefono } = req.body || {};
    const tenantId = tenant_id || (await resolveTenantId(req));
    if (!tenantId) return res.status(400).json({ error: 'Falta tenant_id' });

    const { data: tenantData, error: tErr } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
    if (tErr || !tenantData) return res.status(404).json({ error: 'Tenant no encontrado' });

    const subscription = await fetchSubscriptionForTenant(tenantId);
    const entitlements = computeEntitlements({ tenant: tenantData, subscription });

    if (!entitlements.canCreatePackage) {
      return res.status(403).json({ ok: false, error: 'LIMIT_EXCEEDED', message: 'Límite de paquetes alcanzado para tu plan.', entitlements });
    }

    if (!empresa_transporte) return res.status(400).json({ error: 'Falta empresa_transporte' });
    const empresaId = await getEmpresaId(tenantId, empresa_transporte);
    if (!empresaId) return res.status(400).json({ error: 'Empresa no encontrada para este local.' });

    let finalUbiId = ubicacion_id || balda_id || null;
    let finalUbiLabel = ubicacion_label || compartimento || null;

    if (finalUbiId) {
      const ok = await ensureUbiBelongsToTenant(tenantId, finalUbiId);
      if (!ok) return res.status(400).json({ error: 'La ubicación no pertenece a este local.' });
    }
    if (finalUbiLabel) {
      finalUbiLabel = up(finalUbiLabel);
      if (!finalUbiId) {
        finalUbiId = await resolveUbiIdByLabel(tenantId, finalUbiLabel);
        if (!finalUbiId) return res.status(400).json({ error: `No existe la ubicación ${finalUbiLabel}` });
      }
    }
    if (!finalUbiId) return res.status(400).json({ error: 'Ubicación no especificada.' });

    if (!finalUbiLabel) {
      const { data: u } = await supabase.from('ubicaciones').select('label').eq('id', finalUbiId).maybeSingle();
      finalUbiLabel = up(u?.label || '');
    }

    const payloadDB = {
      tenant_id: tenantId, 
      empresa_id: empresaId, 
      nombre_cliente: up(nombre_cliente),
      empresa_transporte, 
      ubicacion_id: finalUbiId, 
      ubicacion_label: finalUbiLabel, 
      entregado: false,
      telefono: telefono ? String(telefono).trim() : null
    };

    const { data, error } = await supabase.from('packages').insert(payloadDB).select().single();

    if (error) return res.status(500).json({ error: error.message });

    if (!entitlements.features.unlimitedPackages) {
      await supabase.from('tenants').update({ trial_used: (tenantData.trial_used || 0) + 1 }).eq('id', tenantId);
    }

    return res.json({ paquete: data });
  } catch (err) {
    return res.status(500).json({ error: 'Error al crear paquete' });
  }
}

async function entregarPaquete(req, res) {
  try {
    const id = req.params.id;
    const tenantId = await resolveTenantId(req);
    if (!id || !tenantId) return res.status(400).json({ error: 'Faltan parámetros' });
    const { data: pkg, error: e1 } = await supabase.from('packages').select('*').eq('id', id).eq('tenant_id', tenantId).maybeSingle();
    if (e1 || !pkg) return res.status(404).json({ error: 'Paquete no encontrado' });
    let ingreso = Number(pkg.ingreso_generado || 0);
    if (ingreso <= 0) ingreso = await getTarifaPorEmpresaId(pkg.empresa_id);
    const { data, error: e2 } = await supabase.from('packages').update({
      entregado: true, ingreso_generado: ingreso, fecha_entregado: new Date().toISOString()
    }).eq('id', id).select().single();
    if (e2) return res.status(500).json({ error: e2.message });
    return res.json({ paquete: data });
  } catch (err) {
    return res.status(500).json({ error: 'Error al entregar paquete' });
  }
}

async function editarPaquete(req, res) {
  try {
    const id = req.params.id || req.body?.id;
    const tenantId = await resolveTenantId(req);
    if (!id || !tenantId) return res.status(400).json({ error: 'Faltan parámetros' });
    const patch = {};
    if (req.body.nombre_cliente != null) patch.nombre_cliente = up(req.body.nombre_cliente);
    if (req.body.empresa_transporte != null) patch.empresa_transporte = req.body.empresa_transporte;
    if (req.body.telefono !== undefined) patch.telefono = req.body.telefono ? String(req.body.telefono).trim() : null;
    
    let nUbiId = req.body.ubicacion_id;
    let nUbiLabel = req.body.ubicacion_label;
    if (nUbiId) {
      const ok = await ensureUbiBelongsToTenant(tenantId, nUbiId);
      if (!ok) return res.status(400).json({ error: 'Ubicación inválida' });
    }
    if (nUbiLabel) {
      nUbiLabel = up(nUbiLabel);
      if (!nUbiId) nUbiId = await resolveUbiIdByLabel(tenantId, nUbiLabel);
    }
    if (nUbiId) {
      patch.ubicacion_id = nUbiId;
      patch.ubicacion_label = nUbiLabel || null;
    }
    const { data, error } = await supabase.from('packages').update(patch).eq('id', id).eq('tenant_id', tenantId).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ paquete: data });
  } catch (err) {
    return res.status(500).json({ error: 'Error al editar paquete' });
  }
}

async function eliminarPaquete(req, res) {
  try {
    const id = req.params.id;
    const tenantId = await resolveTenantId(req);
    const { data, error } = await supabase.from('packages').delete().eq('id', id).eq('tenant_id', tenantId).select('id').single();
    if (error || !data) return res.status(404).json({ error: 'No encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error al eliminar paquete' });
  }
}

module.exports = { listarPaquetes, contarPaquetes, crearPaquete, entregarPaquete, editarPaquete, eliminarPaquete };