'use strict';
const { supabase } = require("../utils/supabaseClient");

/* ---------- Utils ---------- */
function canonCodigo(s) {
  return String(s ?? "")
    .trim()
    .replace(/^CARRIL\s+/i, "")
    .replace(/^ESTANTE\s+/i, "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .toUpperCase();
}
function alphaToNum(str) {
  const s = String(str || "").toUpperCase();
  if (!/^[A-Z]+$/.test(s)) return NaN;
  let n = 0;
  for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}
function parseCodigoGenerico(raw) {
  const code = canonCodigo(raw);
  if (/^\d+$/.test(code)) return { estante: parseInt(code, 10), balda: 1 };
  if (/^[A-Z]+$/.test(code)) return { estante: alphaToNum(code), balda: 1 };
  let m = code.match(/^([A-Z]+)(\d+)$/);
  if (m) return { estante: alphaToNum(m[1]), balda: parseInt(m[2], 10) };
  m = String(raw).trim().match(/^(\d+)\s*-\s*(\d+)$/);
  if (m) return { estante: parseInt(m[1], 10), balda: parseInt(m[2], 10) };
  return null;
}
function normHex(s = "") {
  const x = String(s).trim().replace(/^#/, "").toUpperCase();
  return /^[0-9A-F]{6}$/.test(x) ? x : null;
}
function afterKeyword(raw = "", keyword = /^(CARRIL|ESTANTE)\s+/i) {
  return String(raw).replace(keyword, "").trim();
}
const normName = (x = "") =>
  String(x).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

async function resolveTenantId(req) {
  const direct = req.tenant_id || req.tenant?.id;
  if (direct) return direct;
  const email = String(req.user?.email || "").toLowerCase().trim();
  if (!email) return null;
  const { data, error } = await supabase
    .from("tenants").select("id").ilike("email", email).maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

/* Asegura que exista la empresa y devuelve su UUID (NOT NULL en paquetes) */
async function ensureEmpresaId(tenantId, nombre) {
  const limpio = (nombre || '').trim();
  if (!limpio) return null;

  const { data, error } = await supabase
    .from('empresas_transporte_tenant')
    .upsert([{ tenant_id: tenantId, nombre: limpio }], { onConflict: 'tenant_id,nombre' })
    .select('id')
    .maybeSingle();

  if (error) { console.warn('[ensureEmpresaId] error:', error); return null; }
  return data?.id || null;
}

async function getLayoutMeta(tenantId) {
  const { data } = await supabase
    .from("layouts_meta").select("mode, rows, cols")
    .eq("org_id", tenantId).maybeSingle();
  return { mode: data?.mode || null, rows: data?.rows || 0, cols: data?.cols || 0 };
}

/** LEE carriles con esquema unificado. Soporta:
 *  - tabla `lanes` (lane_id, name, color, row/col opcional)
 *  - tabla `carriles` (id, codigo, color, fila/columna opcional)
 */
async function getLanes(tenantId) {
  // lanes (preferente)
  try {
    const { data, error } = await supabase
      .from("lanes")
      .select("lane_id, id, name, color")
      .eq("tenant_id", tenantId)
      .order("lane_id", { ascending: true })
      .order("id", { ascending: true });
    if (!error && Array.isArray(data) && data.length) {
      return data.map(l => ({
        lane_id: Number(l.lane_id ?? l.id),
        name: (l.name || String(l.lane_id ?? l.id)).trim(),
        colorHex: normHex(l.color || "")
      }));
    }
  } catch {/* ignore */}
  // carriles (fallback)
  try {
    const { data } = await supabase
      .from("carriles")
      .select("id, codigo, color")
      .eq("tenant_id", tenantId)
      .order("id", { ascending: true });
    return (data || []).map(r => ({
      lane_id: Number(r.id),
      name: (r.codigo || String(r.id)).trim(),
      colorHex: normHex(r.color || "")
    }));
  } catch {
    return [];
  }
}

/**
 * Busca o crea una balda “puente” para un carril (balda=1).
 */
async function upsertBaldaPuente(tenantId, laneId, codigoMostrado) {
  const { data: found, error: fErr } = await supabase
    .from("baldas")
    .select("id, estante, balda, codigo")
    .eq("id_negocio", tenantId)
    .eq("estante", laneId)
    .eq("balda", 1)
    .maybeSingle();
  if (fErr) console.warn("[upsertBaldaPuente] fetch error:", fErr);
  if (found?.id) return found;

  const codigo = String(codigoMostrado || laneId);
  const { data: ins, error: iErr } = await supabase
    .from("baldas")
    .upsert([{
      id_negocio: tenantId, estante: laneId, balda: 1, codigo
    }], { onConflict: "id_negocio,estante,balda" })
    .select("id, estante, balda, codigo")
    .maybeSingle();

  if (iErr) { console.error("[upsertBaldaPuente] insert error:", iErr); return null; }
  return ins || null;
}

/**
 * Devuelve {id,estante,balda,codigo} de public.baldas para (tenantId, compartimento).
 * Si no existe:
 *  - en carriles: resuelve por número, letras, color o nombre; crea balda puente (balda=1).
 *  - en estantes: intenta racks_shelves (org_id/idx) y luego patrón (A1, 2-3…).
 */
async function ensureBaldaForCompartimento(tenantId, compartimento, opts = {}) {
  const raw = String(compartimento || "").trim();
  const needle = canonCodigo(raw);

  const laneFromBody = Number(opts?.lane_id ?? NaN);
  if (Number.isFinite(laneFromBody)) {
    const ok = await upsertBaldaPuente(tenantId, laneFromBody, raw);
    if (ok) return ok;
  }

  // 1) ya existe en baldas por código
  {
    const { data: list, error } = await supabase
      .from("baldas").select("id, estante, balda, codigo")
      .eq("id_negocio", tenantId);
    if (error) console.warn("[ensureBalda] baldas list error:", error);
    if (Array.isArray(list)) {
      const found = list.find((b) => canonCodigo(b.codigo) === needle);
      if (found) return found;
    }
  }

  // modo
  const meta = await getLayoutMeta(tenantId);

  /* Carriles (por defecto si no es 'racks') */
  if (meta.mode !== "racks") {
    const token = afterKeyword(raw, /^CARRIL\s+/i);
    const tokenCanon = canonCodigo(token);

    if (/^\d+$/.test(tokenCanon)) {
      const laneId = parseInt(tokenCanon, 10);
      const lanes = await getLanes(tenantId);
      if (!lanes.some(l => l.lane_id === laneId)) return null;
      return await upsertBaldaPuente(tenantId, laneId, token || String(laneId));
    }

    if (/^[A-Z]+$/.test(tokenCanon)) {
      const laneId = alphaToNum(tokenCanon);
      const lanes = await getLanes(tenantId);
      if (!lanes.some(l => l.lane_id === laneId)) return null;
      return await upsertBaldaPuente(tenantId, laneId, token);
    }

    const hexDirect = normHex(token) || (token.match(/#?[0-9a-fA-F]{6}/)?.[0] && normHex(token.match(/#?[0-9a-fA-F]{6}/)[0]));
    if (hexDirect) {
      const lanes = await getLanes(tenantId);
      const hit = lanes.find(l => l.colorHex === hexDirect);
      if (!hit) return null;
      return await upsertBaldaPuente(tenantId, hit.lane_id, hit.name || String(hit.lane_id));
    }

    if (token) {
      const lanes = await getLanes(tenantId);
      const up = normName(token);
      const hit = lanes.find(l => normName(l.name || "") === up);
      if (hit) {
        return await upsertBaldaPuente(tenantId, hit.lane_id, hit.name || String(hit.lane_id));
      }
    }

    const parsed = parseCodigoGenerico(token);
    if (parsed && Number.isFinite(parsed.estante)) {
      const lanes = await getLanes(tenantId);
      if (!lanes.some(l => l.lane_id === parsed.estante)) return null;
      return await upsertBaldaPuente(tenantId, parsed.estante, token);
    }
    return null;
  }

  /* Estantes (racks_shelves con org_id, idx) */
  try {
    // Carga shelves
    const { data: shelves, error: eS } = await supabase
      .from("racks_shelves")
      .select("rack_id, idx, name")
      .eq("org_id", tenantId);
    if (eS) console.warn("[ensureBalda] shelves error:", eS);

    if (Array.isArray(shelves) && shelves.length) {
      // Carga nombres de racks
      const rackIds = [...new Set(shelves.map(s => s.rack_id))];
      let rackName = {};
      if (rackIds.length) {
        const { data: racks, error: eR } = await supabase
          .from("racks")
          .select("rack_id, name")
          .eq("org_id", tenantId)
          .in("rack_id", rackIds);
        if (!eR && Array.isArray(racks)) {
          racks.forEach(r => { rackName[r.rack_id] = r.name || String(r.rack_id); });
        }
      }

      for (const s of shelves) {
        const rname = rackName[s.rack_id] || String(s.rack_id);
        const idx = Number(s.idx);
        const codeA = s.name ?? `${rname}${idx}`;
        const codeB = s.name ?? `${s.rack_id}-${idx}`;
        if (canonCodigo(codeA) === needle || canonCodigo(codeB) === needle) {
          await supabase.from("baldas").upsert([{
            id_negocio: tenantId, estante: s.rack_id, balda: idx, codigo: s.name ?? codeA
          }], { onConflict: "id_negocio,estante,balda" });
          const { data: row } = await supabase
            .from("baldas").select("id, estante, balda, codigo")
            .eq("id_negocio", tenantId).eq("estante", s.rack_id).eq("balda", idx).maybeSingle();
          if (row) return row;
        }
      }
    }
  } catch (e) {
    console.warn("[ensureBalda] racks block skipped:", e?.message || e);
  }

  // Fallback por patrón (A1, 2-3…)
  const parsed = parseCodigoGenerico(raw);
  if (parsed && Number.isFinite(parsed.estante) && Number.isFinite(parsed.balda)) {
    await supabase.from("baldas").upsert([{
      id_negocio: tenantId,
      estante: parsed.estante,
      balda: parsed.balda,
      codigo: raw
    }], { onConflict: "id_negocio,estante,balda" });
    const { data: row } = await supabase
      .from("baldas").select("id, estante, balda, codigo")
      .eq("id_negocio", tenantId).eq("estante", parsed.estante).eq("balda", parsed.balda).maybeSingle();
    if (row) return row;
  }

  return null;
}

/* ---------- Handlers ---------- */
const crearPaquete = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: "Tenant no resuelto" });

    const { nombre_cliente, empresa_transporte, compartimento, lane_id } = req.body || {};
    if (!nombre_cliente?.trim() || !empresa_transporte?.trim() || !compartimento?.trim()) {
      return res.status(400).json({ error: "Faltan campos obligatorios." });
    }

    const balda = await ensureBaldaForCompartimento(tenantId, compartimento, { lane_id });
    if (!balda) return res.status(404).json({ error: "No se pudo localizar el carril/balda para ese compartimento." });

    // empresa_id es NOT NULL en tu esquema → asegúrala
    const empresaId = await ensureEmpresaId(tenantId, empresa_transporte);
    if (!empresaId) return res.status(400).json({ error: "Empresa de transporte inválida." });

    const payload = {
      nombre_cliente: nombre_cliente.trim(),
      empresa_transporte: empresa_transporte.trim(),
      balda_id: balda.id,
      tenant_id: tenantId,
      empresa_id: empresaId,
    };

    const { data: inserted, error: errorInsert } = await supabase
      .from("paquetes")
      .insert([payload])
      .select("id, nombre_cliente, fecha_llegada, fecha_entregado, entregado, empresa_transporte, balda_id, baldas (estante, balda, id)");

    if (errorInsert) {
      console.error("[crearPaquete] insert:", errorInsert);
      return res.status(500).json({ error: "Error al guardar el paquete." });
    }

    const p = inserted?.[0];
    if (!p) return res.status(500).json({ error: "No se pudo insertar el paquete." });

    return res.status(200).json({
      paquete: {
        ...p,
        compania: p.empresa_transporte,
        estante: p.baldas?.estante,
        balda: p.baldas?.balda,
        balda_id: p.baldas?.id || p.balda_id,
      },
    });
  } catch (error) {
    console.error("[crearPaquete] inesperado:", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};

const listarPaquetes = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: "Tenant no resuelto" });

    const { data, error } = await supabase
      .from("paquetes")
      .select("id, nombre_cliente, fecha_llegada, fecha_entregado, entregado, empresa_transporte, balda_id, baldas (estante, balda, id)")
      .eq("tenant_id", tenantId)
      .order("fecha_llegada", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const formateados = (data || []).map((p) => ({
      ...p,
      compania: p.empresa_transporte,
      estante: p.baldas?.estante,
      balda: p.baldas?.balda,
      balda_id: p.baldas?.id || p.balda_id,
    }));

    res.json(formateados);
  } catch (err) {
    console.error("[listarPaquetes] Error:", err);
    res.status(500).json({ error: "Error al listar paquetes" });
  }
};

const eliminarPaquete = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: "Tenant no resuelto" });

    const { id } = req.params;
    const { error } = await supabase
      .from("paquetes").delete()
      .eq("id", id).eq("tenant_id", tenantId);

    if (error) return res.status(500).json({ error: error.message });
    res.sendStatus(204);
  } catch (err) {
    console.error("[eliminarPaquete] Error:", err);
    res.status(500).json({ error: "Error al eliminar paquete" });
  }
};

const entregarPaquete = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: "Tenant no resuelto" });

    const { id } = req.params;
    const { data, error } = await supabase
      .from("paquetes")
      .update({ entregado: true, fecha_entregado: new Date().toISOString() })
      .eq("id", id).eq("tenant_id", tenantId).eq("entregado", false)
      .select("id").maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Paquete no encontrado o ya entregado" });
    res.sendStatus(200);
  } catch (err) {
    console.error("[entregarPaquete] Error:", err);
    res.status(500).json({ error: "Error al marcar entrega" });
  }
};

const editarPaquete = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: "Tenant no resuelto" });

    const { id } = req.params;
    const { nombre_cliente, empresa_transporte, balda_id } = req.body;

    if (balda_id) {
      const { data: b, error: e } = await supabase
        .from("baldas").select("id")
        .eq("id", balda_id).eq("id_negocio", tenantId).maybeSingle();
      if (e) return res.status(500).json({ error: e.message });
      if (!b) return res.status(400).json({ error: "Balda inválida para este negocio." });
    }

    const upd = {};
    if (typeof nombre_cliente === "string") upd.nombre_cliente = nombre_cliente.trim();
    if (typeof empresa_transporte === "string") {
      upd.empresa_transporte = empresa_transporte.trim();
      const empresaId = await ensureEmpresaId(tenantId, empresa_transporte);
      if (!empresaId) return res.status(400).json({ error: "Empresa de transporte inválida." });
      upd.empresa_id = empresaId;
    }
    if (balda_id) upd.balda_id = balda_id;

    const { error } = await supabase
      .from("paquetes").update(upd)
      .eq("id", id).eq("tenant_id", tenantId);

    if (error) return res.status(500).json({ error: error.message });

    const { data: actualizado, error: fetchError } = await supabase
      .from("paquetes")
      .select("id, nombre_cliente, fecha_llegada, fecha_entregado, entregado, empresa_transporte, balda_id, baldas (estante, balda, id)")
      .eq("id", id).eq("tenant_id", tenantId).maybeSingle();

    if (fetchError) return res.status(500).json({ error: fetchError.message });
    if (!actualizado) return res.status(404).json({ error: "Paquete no encontrado" });

    const paquete = {
      ...actualizado,
      compania: actualizado.empresa_transporte,
      estante: actualizado.baldas?.estante,
      balda: actualizado.baldas?.balda,
      balda_id: actualizado.baldas?.id || actualizado.balda_id,
    };

    res.json(paquete);
  } catch (err) {
    console.error("[editarPaquete] Error:", err);
    res.status(500).json({ error: "Error al editar paquete" });
  }
};

module.exports = { crearPaquete, listarPaquetes, eliminarPaquete, entregarPaquete, editarPaquete };
