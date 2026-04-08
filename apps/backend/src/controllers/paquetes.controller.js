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

// NUEVO: obtener tarifa para empresa_id (para rellenar ingreso_generado en la entrega)
async function getTarifaPorEmpresaId(empresaId) {
  if (!empresaId) return 0;
  const { data, error } = await supabase
    .from('empresas_transporte_tenant')
    .select('ingreso_por_entrega')
    .eq('id', empresaId)
    .maybeSingle();
  if (error) throw error;
  return Number(data?.ingreso_por_entrega || 0);
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

/* ---------- filtros compartidos (lista y count) ---------- */
function applyCommonFilters(qb, { estado, compania, ubicacion, search }) {
  if (estado === 'pendiente') qb = qb.eq('entregado', false);
  else if (estado === 'entregado') qb = qb.eq('entregado', true);

  if (compania && compania !== 'todos') qb = qb.eq('empresa_transporte', compania);
  if (ubicacion && ubicacion !== 'todas') qb = qb.eq('ubicacion_label', up(ubicacion));

  if (search && search.trim()) {
    // búsqueda simple por nombre_cliente
    qb = qb.ilike('nombre_cliente', `%${search.trim()}%`);
  }
  return qb;
}

/* ---------- fetch ALL con paginado interno (lotes de 1000) ---------- */
async function fetchAllPackagesBatched(tenantId, filters, selectCols, orderBy = { col: 'fecha_llegada', asc: false }, HARD_MAX = 50000) {
  const PAGE = 1000;
  let from = 0;
  let all = [];

  while (true) {
    let qb = supabase
      .from('packages')
      .select(selectCols)
      .eq('tenant_id', tenantId);

    qb = applyCommonFilters(qb, filters);
    qb = qb.order(orderBy.col, { ascending: !!orderBy.asc }).range(from, from + PAGE - 1);

    const { data, error } = await qb;
    if (error) throw error;

    const batch = data || [];
    all = all.concat(batch);
    if (batch.length < PAGE) break;
    from += PAGE;

    if (all.length >= HARD_MAX) break; // airbag por si acaso
  }

  return all;
}

/* ========== Listar (packages) ========== */
async function listarPaquetes(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.json({ paquetes: [] });

    // query params
    const {
      limit,
      offset,
      all,            // all=1 para traer todo
      estado,         // 'pendiente' | 'entregado' | 'todos'
      compania,       // nombre exacto o 'todos'
      ubicacion,      // label o 'todas'
      search,         // texto libre
      order = 'fecha_llegada',
      dir = 'desc',
    } = req.query || {};

    const filters = { estado, compania, ubicacion, search };

    // 🔴 SOLO columnas que EXISTEN en 'packages'
    const cols = `
      id, tenant_id, nombre_cliente, empresa_transporte, empresa_id,
      fecha_llegada, entregado, fecha_entregado, ingreso_generado,
      ubicacion_id, ubicacion_label
    `;

    if (String(all) === '1') {
      // Trae TODO por lotes de 1000 desde backend
      const paquetes = await fetchAllPackagesBatched(
        tenantId,
        filters,
        cols,
        { col: order || 'fecha_llegada', asc: String(dir).toLowerCase() === 'asc' }
      );
      return res.json({ paquetes });
    }

    // Paginado normal (recomendado para tabla)
    let qb = supabase
      .from('packages')
      .select(cols)
      .eq('tenant_id', tenantId);

    qb = applyCommonFilters(qb, filters);

    const asc = String(dir).toLowerCase() === 'asc';
    qb = qb.order(order || 'fecha_llegada', { ascending: asc });

    const lim = Number(limit ?? 50);
    const off = Number(offset ?? 0);

    // IMPORTANTÍSIMO: usar range para no caer en el cap de 1000
    qb = qb.range(off, off + lim - 1);

    const { data, error } = await qb;
    if (error) return res.status(500).json({ error: error.message });

    return res.json({ paquetes: data || [] });
  } catch (err) {
    console.error('[packages.listar] err:', err);
    return res.status(500).json({ error: 'Error al listar paquetes' });
  }
}

/* ========== Contar (exacto, para KPI) ========== */
async function contarPaquetes(req, res) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.json({ total: 0, entregados: 0, pendientes: 0 });

    const { estado, compania, ubicacion, search } = req.query || {};
    const filters = { estado: undefined, compania, ubicacion, search }; // estado no aplica en total

    // base builder
    const base = () => {
      let qb = supabase
        .from('packages')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);
      qb = applyCommonFilters(qb, filters);
      return qb;
    };

    const { count: total, error: e0 } = await base();
    if (e0) return res.status(500).json({ error: e0.message });

    const { count: entregados, error: e1 } = await base().eq('entregado', true);
    if (e1) return res.status(500).json({ error: e1.message });

    const { count: pendientes, error: e2 } = await base().eq('entregado', false);
    if (e2) return res.status(500).json({ error: e2.message });

    return res.json({
      total: total ?? 0,
      entregados: entregados ?? 0,
      pendientes: pendientes ?? 0,
    });
  } catch (err) {
    console.error('[packages.contar] err:', err);
    return res.status(500).json({ error: 'Error al contar paquetes' });
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
      ubicacion_label,
      // compat vieja:
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

    // Traemos el paquete para conocer empresa_id e ingreso actual
    const { data: pkg, error: e1 } = await supabase
      .from('packages')
      .select('id, empresa_id, ingreso_generado, entregado, fecha_entregado')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (e1) return res.status(500).json({ error: e1.message });
    if (!pkg) return res.status(404).json({ error: 'No encontrado para este tenant' });

    // Si el ingreso está vacío/0, lo calculamos con la tarifa de la empresa
    let ingreso = Number(pkg.ingreso_generado || 0);
    if (!ingreso || ingreso <= 0) {
      const tarifa = await getTarifaPorEmpresaId(pkg.empresa_id);
      ingreso = Number(tarifa || 0);
    }

    const patch = {
      entregado: true,
      ingreso_generado: ingreso,
      fecha_entregado: pkg.fecha_entregado ? pkg.fecha_entregado : new Date().toISOString(),
    };

    const { data, error: e2 } = await supabase
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

    if (e2) return res.status(500).json({ error: e2.message });
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
  contarPaquetes, // NUEVO
  crearPaquete,
  entregarPaquete,
  editarPaquete,
  eliminarPaquete,
};
