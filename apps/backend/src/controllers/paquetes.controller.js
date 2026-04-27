'use strict';

const { supabase } = require('../utils/supabaseClient');
const { computeEntitlements } = require('../utils/entitlements');
const { fetchSubscriptionForTenant } = require('../utils/subscription');

const up = (s = '') => String(s || '').trim().toUpperCase();

async function resolveTenantId(req) {
  if (req.tenant?.id) return String(req.tenant.id);
  if (req.tenantId) return String(req.tenantId);
  return null;
}

async function getEmpresaId(tenantId, nombre) {
  const { data } = await supabase.from('empresas_transporte_tenant').select('id').eq('tenant_id', tenantId).eq('nombre', nombre).maybeSingle();
  return data?.id || null;
}

async function getTarifaPorEmpresaId(empresaId) {
  if (!empresaId) return 0;
  const { data } = await supabase.from('empresas_transporte_tenant').select('ingreso_por_entrega').eq('id', empresaId).maybeSingle();
  return Number(data?.ingreso_por_entrega || 0);
}

async function resolveUbiIdByLabel(tenantId, label) {
  const { data } = await supabase.from('ubicaciones').select('id').eq('tenant_id', tenantId).eq('label', up(label)).maybeSingle();
  return data?.id || null;
}

async function ensureUbiBelongsToTenant(tenantId, ubiId) {
  const { data } = await supabase.from('ubicaciones').select('id').eq('tenant_id', tenantId).eq('id', ubiId).maybeSingle();
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

exports.listarPaquetes = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'No autorizado' });
    
    const { limit, offset, all, estado, compania, ubicacion, search, order = 'fecha_llegada', dir = 'desc' } = req.query || {};
    const cols = `id, tenant_id, nombre_cliente, empresa_transporte, empresa_id, fecha_llegada, entregado, fecha_entregado, ingreso_generado, ubicacion_id, ubicacion_label, telefono`;
    
    let qb = supabase.from('packages').select(cols).eq('tenant_id', tenantId);
    qb = applyCommonFilters(qb, { estado, compania, ubicacion, search });
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
};

exports.contarPaquetes = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'No autorizado' });
    
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
};

exports.crearPaquete = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'No autorizado' });

    const { nombre_cliente, empresa_transporte, ubicacion_id, ubicacion_label, balda_id, compartimento, telefono } = req.body || {};

    const { data: tenantData, error: tErr } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
    if (tErr || !tenantData) return res.status(404).json({ error: 'Tenant no encontrado' });

    const subscription = await fetchSubscriptionForTenant(tenantId);
    const entitlements = computeEntitlements({ tenant: tenantData, subscription });

    if (!entitlements.canCreatePackage) {
      return res.status(403).json({ ok: false, error: 'LIMIT_EXCEEDED', message: 'Límite de paquetes alcanzado.', entitlements });
    }

    if (!empresa_transporte) return res.status(400).json({ error: 'Falta empresa_transporte' });
    
    const empresaId = await getEmpresaId(tenantId, empresa_transporte);
    if (!empresaId) return res.status(400).json({ error: 'Empresa no encontrada en la configuración del local.' });

    let finalUbiId = ubicacion_id || balda_id || null;
    let finalUbiLabel = ubicacion_label || compartimento || null;

    if (finalUbiId) {
      if (!(await ensureUbiBelongsToTenant(tenantId, finalUbiId))) return res.status(400).json({ error: 'Ubicación ajena al local.' });
    } else if (finalUbiLabel) {
      finalUbiLabel = up(finalUbiLabel);
      finalUbiId = await resolveUbiIdByLabel(tenantId, finalUbiLabel);
      if (!finalUbiId) return res.status(400).json({ error: `No existe la ubicación ${finalUbiLabel}` });
    } else {
      return res.status(400).json({ error: 'Ubicación no especificada.' });
    }

    if (!finalUbiLabel) {
      const { data: u } = await supabase.from('ubicaciones').select('label').eq('id', finalUbiId).maybeSingle();
      finalUbiLabel = up(u?.label || '');
    }

    const { data, error } = await supabase.from('packages').insert({
      tenant_id: tenantId, 
      empresa_id: empresaId, 
      nombre_cliente: up(nombre_cliente),
      empresa_transporte, 
      ubicacion_id: finalUbiId, 
      ubicacion_label: finalUbiLabel, 
      entregado: false,
      telefono: telefono ? String(telefono).trim() : null
    }).select().single();

    if (error) throw error;

    if (!entitlements.features.unlimitedPackages) {
      await supabase.from('tenants').update({ trial_used: (tenantData.trial_used || 0) + 1 }).eq('id', tenantId);
    }

    return res.json({ paquete: data });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno al crear paquete' });
  }
};

exports.entregarPaquete = async (req, res) => {
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

    if (e2) throw e2;
    return res.json({ paquete: data });
  } catch (err) {
    return res.status(500).json({ error: 'Error al entregar paquete' });
  }
};

exports.editarPaquete = async (req, res) => {
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
      if (!(await ensureUbiBelongsToTenant(tenantId, nUbiId))) return res.status(400).json({ error: 'Ubicación inválida' });
    } else if (nUbiLabel) {
      nUbiLabel = up(nUbiLabel);
      nUbiId = await resolveUbiIdByLabel(tenantId, nUbiLabel);
    }

    if (nUbiId) {
      patch.ubicacion_id = nUbiId;
      patch.ubicacion_label = nUbiLabel || null;
    }

    const { data, error } = await supabase.from('packages').update(patch).eq('id', id).eq('tenant_id', tenantId).select().single();
    if (error) throw error;
    return res.json({ paquete: data });
  } catch (err) {
    return res.status(500).json({ error: 'Error al editar paquete' });
  }
};

exports.eliminarPaquete = async (req, res) => {
  try {
    const id = req.params.id;
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'No autorizado' });

    const { data, error } = await supabase.from('packages').delete().eq('id', id).eq('tenant_id', tenantId).select('id').single();
    
    if (error || !data) return res.status(404).json({ error: 'No encontrado' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error al eliminar paquete' });
  }
};