'use strict';

const { supabase } = require('../utils/supabaseClient');
const { v4: uuidv4 } = require('uuid');
const { uploadManyToBucket } = require('../utils/storageSupport');

const ok  = (res, extra = {}) => res.json({ ok: true,  ...extra });
const bad = (res, code, error, http = 400, extra = {}) =>
  res.status(http).json({ ok: false, code, error, ...extra });

function ctx(req) {
  return {
    user_id:    req.user?.id,
    tenant_id:  req.tenant?.id || req.tenant_id,
    user_email: req.user?.email || null,
    user_name:  req.user?.user_metadata?.full_name || req.user?.user_metadata?.name || null,
  };
}

async function isStaff(tenant_id, user_id) {
  if (!tenant_id || !user_id) return false;
  const { data, error } = await supabase
    .from('memberships')
    .select('role')
    .eq('tenant_id', tenant_id)
    .eq('user_id', user_id)
    .maybeSingle();
  if (error || !data) return false;
  return ['owner','admin','support'].includes(String(data.role || '').toLowerCase());
}

/* ========== Tickets (área cliente) ========== */
exports.listTickets = async (req, res) => {
  const { tenant_id, user_id } = ctx(req);
  if (!tenant_id || !user_id) return bad(res, 'NO_CONTEXT', 'Falta contexto de autenticación', 401);

  const page     = Math.max(1, parseInt(req.query.page || '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize || '10', 10)));
  const estado   = req.query.estado || null;
  const tipo     = req.query.tipo || null;
  const q        = req.query.q || null;

  let query = supabase
    .from('support_tickets')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenant_id)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (estado) query = query.eq('estado', estado);
  if (tipo)   query = query.eq('tipo', tipo);
  if (q)      query = query.or(`codigo.ilike.%${q}%,asunto.ilike.%${q}%,descripcion.ilike.%${q}%`);

  const staff = await isStaff(tenant_id, user_id);
  if (!staff) query = query.eq('created_by', user_id);

  const { data, error, count } = await query;
  if (error) return bad(res, 'LIST_TICKETS_FAIL', error.message, 400);
  return ok(res, { items: data, total: count ?? 0 });
};

exports.createTicket = async (req, res) => {
  const { tenant_id, user_id } = ctx(req);
  if (!tenant_id || !user_id) return bad(res, 'NO_CONTEXT', 'Falta contexto', 401);

  const { tipo, asunto, descripcion } = req.body || {};
  if (!tipo || (!descripcion && !asunto)) {
    return bad(res, 'MISSING_FIELDS', 'Tipo y descripción/asunto son obligatorios');
  }

  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      tenant_id,
      tipo,
      asunto: asunto || null,
      descripcion: descripcion || null,
      estado: 'pendiente',
      created_by: user_id,
    })
    .select()
    .single();

  if (error) return bad(res, 'CREATE_TICKET_FAIL', error.message, 400);
  return ok(res, data);
};

exports.getTicket = async (req, res) => {
  const { tenant_id, user_id } = ctx(req);
  if (!tenant_id || !user_id) return bad(res, 'NO_CONTEXT', 'Falta contexto', 401);

  const id = req.params.id;
  const { data: tk, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('tenant_id', tenant_id).eq('id', id)
    .single();
  if (error || !tk) return bad(res, 'NOT_FOUND', 'Ticket no encontrado', 404);

  const staff = await isStaff(tenant_id, user_id);
  if (!staff && tk.created_by !== user_id) return bad(res, 'FORBIDDEN', 'Sin acceso a este ticket', 403);

  return ok(res, tk);
};

exports.updateStatus = async (req, res) => {
  const { tenant_id, user_id } = ctx(req);
  if (!tenant_id || !user_id) return bad(res, 'NO_CONTEXT', 'Falta contexto', 401);

  const id = req.params.id;
  const { estado } = req.body || {};
  const allowed = ['pendiente','en_proceso','esperando_cliente','cerrado'];
  if (!allowed.includes(estado)) return bad(res, 'BAD_STATE', 'Estado no válido');

  const { data: tk, error: e1 } = await supabase
    .from('support_tickets')
    .select('id, created_by')
    .eq('tenant_id', tenant_id).eq('id', id).single();
  if (e1 || !tk) return bad(res, 'NOT_FOUND', 'Ticket no encontrado', 404);

  const staff = await isStaff(tenant_id, user_id);
  if (!staff && !(estado === 'cerrado' && tk.created_by === user_id)) {
    return bad(res, 'FORBIDDEN', 'No puedes cambiar el estado', 403);
  }

  const { data, error } = await supabase
    .from('support_tickets')
    .update({ estado, closed_at: estado === 'cerrado' ? new Date().toISOString() : null })
    .eq('tenant_id', tenant_id).eq('id', id)
    .select().single();

  if (error) return bad(res, 'UPDATE_STATUS_FAIL', error.message, 400);
  return ok(res, data);
};

/* ========== Mensajes ========== */
exports.listMessages = async (req, res) => {
  const { tenant_id, user_id } = ctx(req);
  if (!tenant_id || !user_id) return bad(res, 'NO_CONTEXT', 'Falta contexto', 401);

  const id = req.params.id;
  const { data: tk, error: e1 } = await supabase
    .from('support_tickets')
    .select('id, created_by')
    .eq('tenant_id', tenant_id).eq('id', id).single();
  if (e1 || !tk) return bad(res, 'NOT_FOUND', 'Ticket no encontrado', 404);

  const staff = await isStaff(tenant_id, user_id);
  if (!staff && tk.created_by !== user_id) return bad(res, 'FORBIDDEN', 'Sin acceso', 403);

  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('tenant_id', tenant_id)
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });

  if (error) return bad(res, 'LIST_MSG_FAIL', error.message, 400);
  return ok(res, { items: data });
};

exports.postMessage = async (req, res) => {
  const { tenant_id, user_id, user_name } = ctx(req);
  if (!tenant_id || !user_id) return bad(res, 'NO_CONTEXT', 'Falta contexto', 401);

  const id = req.params.id;
  const raw = req.body || {};

  const texto = String(
    raw.texto ?? raw.text ?? raw.body ?? raw.mensaje ?? raw.descripcion ?? ''
  ).trim();
  const adjuntos = Array.isArray(raw.adjuntos) ? raw.adjuntos
                  : Array.isArray(raw.files)   ? raw.files
                  : [];

  const { data: tk, error: e1 } = await supabase
    .from('support_tickets')
    .select('id, created_by, estado')
    .eq('tenant_id', tenant_id).eq('id', id).single();
  if (e1 || !tk) return bad(res, 'NOT_FOUND', 'Ticket no encontrado', 404);
  if (tk.estado === 'cerrado') return bad(res, 'CLOSED', 'El ticket está cerrado', 400);

  const staff = await isStaff(tenant_id, user_id);
  const xAs = String(req.headers['x-support-as'] || '').toLowerCase();
  const autor = (staff && xAs === 'staff') ? 'tecnico' : 'cliente';

  if (!staff && tk.created_by !== user_id) return bad(res, 'FORBIDDEN', 'Sin acceso', 403);
  if (!texto && adjuntos.length === 0)     return bad(res, 'EMPTY', 'Mensaje vacío');

  const { data, error } = await supabase
    .from('support_messages')
    .insert({
      id: uuidv4(),
      tenant_id,
      ticket_id: id,
      autor,
      autor_nombre: user_name,
      texto: texto || null,
      adjuntos,
      created_by: user_id,
    })
    .select()
    .single();
  if (error) return bad(res, 'POST_MSG_FAIL', error.message, 400);

  await supabase
    .from('support_tickets')
    .update({
      estado: autor === 'tecnico'
        ? (texto ? 'esperando_cliente' : 'en_proceso')
        : 'en_proceso',
      updated_at: new Date().toISOString()
    })
    .eq('tenant_id', tenant_id).eq('id', id);

  return ok(res, data);
};

/* ========== Valoración ========== */
exports.rateTicket = async (req, res) => {
  const { tenant_id, user_id } = ctx(req);
  if (!tenant_id || !user_id) return bad(res, 'NO_CONTEXT', 'Falta contexto', 401);

  const id = req.params.id;
  const { value, comentario } = req.body || {};
  const valor = parseInt(value, 10);
  if (!Number.isInteger(valor) || valor < 1 || valor > 5) return bad(res, 'BAD_RATING', 'Valoración 1..5');

  const { data: tk, error: e1 } = await supabase
    .from('support_tickets')
    .select('id, created_by, estado')
    .eq('tenant_id', tenant_id).eq('id', id).single();
  if (e1 || !tk) return bad(res, 'NOT_FOUND', 'Ticket no encontrado', 404);
  if (tk.created_by !== user_id) return bad(res, 'FORBIDDEN', 'Solo el autor puede valorar', 403);
  if (tk.estado !== 'cerrado') return bad(res, 'NOT_CLOSED', 'Solo se valora un ticket cerrado', 400);

  const { data, error } = await supabase
    .from('support_ratings')
    .upsert({ tenant_id, ticket_id: id, user_id, valor, comentario: comentario || null },
            { onConflict: 'tenant_id,ticket_id,user_id' })
    .select().single();
  if (error) return bad(res, 'RATE_FAIL', error.message, 400);

  return ok(res, data);
};

/* ========== Uploads ========== */
exports.uploadFiles = async (req, res) => {
  const { tenant_id, user_id } = ctx(req);
  if (!tenant_id || !user_id) return bad(res, 'NO_CONTEXT', 'Falta contexto', 401);

  const files = (req.files || []);
  try {
    const uploaded = await uploadManyToBucket({
      bucket: 'support-files',
      tenant_id,
      user_id,
      files
    });
    return ok(res, { files: uploaded });
  } catch (e) {
    return bad(res, 'UPLOAD_FAIL', e.message || 'Error subiendo adjuntos', 400);
  }
};

/* ==================== SUPERADMIN - GLOBAL ==================== */
function _qstr(req) {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || '20', 10)));
  const offset = (page - 1) * pageSize;
  const estado = (req.query.estado || '').trim();
  const tipo   = (req.query.tipo   || '').trim();
  const q      = (req.query.q      || '').trim();
  return { page, pageSize, offset, estado, tipo, q };
}

exports.adminListTickets = async (req, res) => {
  try {
    const { page, pageSize, offset, estado, tipo, q } = _qstr(req);

    let base = supabase
      .from('support_tickets')
      .select('id, codigo, tenant_id, asunto, tipo, estado, created_at, updated_at', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (estado) base = base.eq('estado', estado);
    if (tipo)   base = base.eq('tipo', tipo);
    if (q)      base = base.or(`codigo.ilike.%${q}%,asunto.ilike.%${q}%,descripcion.ilike.%${q}%`);

    const { data: rows, error: e1, count } = await base;
    if (e1) return bad(res, 'ADMIN_LIST_ERR', e1.message, 400);

    const tenantIds = Array.from(new Set((rows || []).map(r => r.tenant_id))).filter(Boolean);
    let tenantsById = {};
    if (tenantIds.length) {
      const { data: tenants, error: e2 } = await supabase
        .from('tenants')
        .select('id, slug, email, nombre_empresa')
        .in('id', tenantIds);
      if (e2) return bad(res, 'ADMIN_TENANTS_ERR', e2.message, 400);
      tenantsById = Object.fromEntries((tenants || []).map(t => [t.id, t]));
    }

    const items = (rows || []).map(t => ({
      ...t,
      tenant: tenantsById[t.tenant_id] || null,
    }));

    return ok(res, { items, total: count || 0, page, pageSize });
  } catch (e) {
    return bad(res, 'ADMIN_LIST_EXC', e.message || 'Excepción listando tickets', 500);
  }
};

exports.adminGetTicket = async (req, res) => {
  try {
    const id = req.params.id;

    const { data: t, error: e1 } = await supabase
      .from('support_tickets')
      .select('id, codigo, tenant_id, asunto, descripcion, tipo, estado, created_at, updated_at, closed_at, created_by')
      .eq('id', id)
      .maybeSingle();
    if (e1) return bad(res, 'ADMIN_GET_ERR', e1.message, 400);
    if (!t) return bad(res, 'NOT_FOUND', 'Ticket no encontrado', 404);

    const { data: ten, error: e2 } = await supabase
      .from('tenants')
      .select('id, slug, email, nombre_empresa')
      .eq('id', t.tenant_id)
      .maybeSingle();
    if (e2) return bad(res, 'ADMIN_GET_TENANT_ERR', e2.message, 400);

    return ok(res, { ...t, tenant: ten || null });
  } catch (e) {
    return bad(res, 'ADMIN_GET_EXC', e.message || 'Excepción obteniendo ticket', 500);
  }
};

exports.adminListMessages = async (req, res) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase
      .from('support_messages')
      .select('id, tenant_id, ticket_id, autor, autor_nombre, texto, adjuntos, created_at')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });
    if (error) return bad(res, 'ADMIN_MSG_LIST_ERR', error.message, 400);
    return ok(res, { items: data || [] });
  } catch (e) {
    return bad(res, 'ADMIN_MSG_LIST_EXC', e.message || 'Excepción listando mensajes', 500);
  }
};

exports.adminPostMessage = async (req, res) => {
  try {
    const id = req.params.id;
    const raw = req.body || {};
    const texto = String(
      raw.texto ?? raw.text ?? raw.body ?? raw.mensaje ?? ''
    ).trim();
    const adjuntos = Array.isArray(raw.adjuntos) ? raw.adjuntos
                    : Array.isArray(raw.files)   ? raw.files
                    : [];

    if (!texto && adjuntos.length === 0) return bad(res, 'EMPTY', 'Mensaje vacío', 400);

    const { data: tk, error: e1 } = await supabase
      .from('support_tickets')
      .select('id, tenant_id, estado')
      .eq('id', id)
      .maybeSingle();
    if (e1) return bad(res, 'ADMIN_MSG_TK_ERR', e1.message, 400);
    if (!tk) return bad(res, 'NOT_FOUND', 'Ticket no encontrado', 404);
    if (tk.estado === 'cerrado') return bad(res, 'CLOSED', 'El ticket está cerrado', 400);

    const autor_nombre =
      req.superadmin?.email ||
      req.user?.user_metadata?.full_name ||
      req.user?.email || 'Soporte';

    const insert = {
      id: uuidv4(),
      tenant_id: tk.tenant_id,
      ticket_id: id,
      autor: 'tecnico',
      autor_nombre,
      texto: texto || null,
      adjuntos,
      created_by: req.superadmin?.userId || null,
    };

    const { error: e2 } = await supabase.from('support_messages').insert(insert);
    if (e2) return bad(res, 'ADMIN_MSG_INS_ERR', e2.message, 400);

    await supabase
      .from('support_tickets')
      .update({
        estado: texto ? 'esperando_cliente' : 'en_proceso',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return ok(res, { id: insert.id });
  } catch (e) {
    return bad(res, 'ADMIN_MSG_EXC', e.message || 'Excepción enviando mensaje', 500);
  }
};

exports.adminUpdateStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const estado = String(req.body?.estado || '').trim();
    const allowed = ['pendiente', 'en_proceso', 'esperando_cliente', 'cerrado'];
    if (!allowed.includes(estado)) return bad(res, 'BAD_STATUS', 'Estado no válido', 400);

    const { error } = await supabase
      .from('support_tickets')
      .update({
        estado,
        closed_at: estado === 'cerrado' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) return bad(res, 'ADMIN_SET_STATUS_ERR', error.message, 400);

    return ok(res);
  } catch (e) {
    return bad(res, 'ADMIN_SET_STATUS_EXC', e.message || 'Excepción estado', 500);
  }
};

exports.adminAssignAgent = async (_req, res) => {
  return bad(res, 'NOT_IMPLEMENTED', 'Asignación no soportada en el esquema actual', 501);
};

/* ======= Extras: counters/bubble ======= */

/** GET /admin/support/latest-ts */
exports.adminSupportLatestTs = async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('support_messages')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    const latest = data && data.length ? data[0].created_at : null;
    return res.json({ latest_message_at: latest });
  } catch (err) {
    console.error('[adminSupportLatestTs] Error:', err?.message || err);
    return res.status(500).json({ error: 'internal-error' });
  }
};

/** GET /admin/support/counters
 * Params opcionales:
 *   - since: ISO o epoch ms. Si viene, devolvemos unread_since (mensajes cliente desde esa fecha).
 */
exports.adminSupportCounters = async (req, res) => {
  try {
    // ---- parse since
    let sinceISO = null;
    const sinceRaw = (req.query.since || '').trim();
    if (sinceRaw) {
      const n = Number(sinceRaw);
      const d = Number.isFinite(n) && n > 0 ? new Date(n) : new Date(sinceRaw);
      if (!isNaN(d.getTime())) sinceISO = d.toISOString();
    }

    // ---- unread_total (intenta con leido_admin, si no existe, fallback)
    let unread_total = 0;
    try {
      const { count, error } = await supabase
        .from('support_messages')
        .select('id', { count: 'exact', head: true })
        .neq('autor', 'tecnico')
        .or('leido_admin.is.null,leido_admin.eq.false');
      if (error) throw error;
      unread_total = count || 0;
    } catch (e) {
      // Fallback cuando no existe leido_admin u otro error
      const { count, error } = await supabase
        .from('support_messages')
        .select('id', { count: 'exact', head: true })
        .neq('autor', 'tecnico');
      if (error) throw error;
      unread_total = count || 0;
    }

    // ---- latest_message_at
    let latest_message_at = null;
    {
      const { data: lastRow, error } = await supabase
        .from('support_messages')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      latest_message_at = lastRow?.created_at ?? null;
    }

    // ---- unread_since (si pasaron since)
    let unread_since = null;
    if (sinceISO) {
      try {
        // intenta con leido_admin + filtro de fecha
        const { count, error } = await supabase
          .from('support_messages')
          .select('id', { count: 'exact', head: true })
          .neq('autor', 'tecnico')
          .gt('created_at', sinceISO)
          .or('leido_admin.is.null,leido_admin.eq.false');
        if (error) throw error;
        unread_since = count || 0;
      } catch (_e) {
        // fallback sin leido_admin
        const { count, error } = await supabase
          .from('support_messages')
          .select('id', { count: 'exact', head: true })
          .neq('autor', 'tecnico')
          .gt('created_at', sinceISO);
        if (error) throw error;
        unread_since = count || 0;
      }
    }

    return res.json({ unread_total, latest_message_at, unread_since });
  } catch (err) {
    console.error('[adminSupportCounters] Error fatal:', err?.message || err);
    return res.status(500).json({ error: 'internal-error' });
  }
};
