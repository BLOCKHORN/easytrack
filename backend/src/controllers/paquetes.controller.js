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

/** LEE carriles con esquema unificado. */
async function getLanes(tenantId) {
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

/** Crea/recupera “balda puente” para un carril (balda=1). */
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

/* ──────────────────────────────────────────────────────────────────── */
/* Handlers                                                            */
/* ──────────────────────────────────────────────────────────────────── */

/** ✅ Crear paquete con control de trial (trigger de BD aplica el límite 20) */
const crearPaquete = async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(403).json({ error: "Tenant no resuelto" });

    const { nombre_cliente, empresa_transporte, balda_id, lane_id, compartimento } = req.body || {};
    if (!nombre_cliente?.trim() || !empresa_transporte?.trim()) {
      return res.status(400).json({ error: "Faltan campos obligatorios." });
    }

    // empresa_id es NOT NULL → asegúrala
    const empresaId = await ensureEmpresaId(tenantId, empresa_transporte);
    if (!empresaId) return res.status(400).json({ error: "Empresa de transporte inválida." });

    // 1) Determinar balda_id sin heurísticas
    let finalBaldaId = null;

    if (Number.isFinite(Number(balda_id))) {
      // modo racks (balda concreta seleccionada en UI)
      const bid = Number(balda_id);
      const { data: b, error: e } = await supabase
        .from("baldas").select("id")
        .eq("id", bid).eq("id_negocio", tenantId).maybeSingle();
      if (e) return res.status(500).json({ error: e.message });
      if (!b) return res.status(400).json({ error: "Balda inválida para este negocio." });
      finalBaldaId = bid;
    } else if (Number.isFinite(Number(lane_id))) {
      // modo lanes (crea/usa balda puente del carril)
      const lid = Number(lane_id);
      // (opcional) valida que el carril exista
      const lanes = await getLanes(tenantId);
      if (!lanes.some(l => l.lane_id === lid)) {
        return res.status(400).json({ error: "Carril inválido para este negocio." });
      }
      const puente = await upsertBaldaPuente(tenantId, lid, compartimento);
      if (!puente) return res.status(500).json({ error: "No se pudo preparar la balda del carril." });
      finalBaldaId = puente.id;
    } else {
      // Nada de adivinar por “compartimento”
      return res.status(400).json({ error: "Debes indicar balda_id (racks) o lane_id (carril)." });
    }

    // 2) Insert (trigger de BD controla el límite del trial)
    const payload = {
      tenant_id: tenantId,
      empresa_id: empresaId,
      nombre_cliente: nombre_cliente.trim(),
      empresa_transporte: empresa_transporte.trim(),
      balda_id: finalBaldaId,
      ...(compartimento ? { compartimento: String(compartimento) } : {})
    };

    const { data: inserted, error: errorInsert } = await supabase
      .from("paquetes")
      .insert([payload])
      .select("id, nombre_cliente, fecha_llegada, fecha_entregado, entregado, empresa_transporte, balda_id, baldas (estante, balda, id)");

    if (errorInsert) {
      const msg = String(errorInsert?.message || '').toUpperCase();
      if (msg.includes('TRIAL_LIMIT_REACHED')) {
        return res.status(402).json({
          ok: false,
          error: 'TRIAL_LIMIT_REACHED',
          message: 'Has alcanzado el límite de 20 paquetes de la versión de prueba. Actualiza tu plan para seguir.'
        });
      }
      console.error("[crearPaquete] insert:", errorInsert);
      return res.status(500).json({ error: "Error al guardar el paquete." });
    }

    const p = inserted?.[0];
    if (!p) return res.status(500).json({ error: "No se pudo insertar el paquete." });

    /* 2.5) Incremento de trial (CAS) — SOLO si tu trigger NO incrementa ya trial_used
       - Lee trial_* del tenant.
       - Si sigue activo y queda cupo, intenta CAS: trial_used pasa de X a X+1.
       - Si alguien se te adelanta, el eq('trial_used', X) hará que este update no afecte filas (OK).
       - ⚠️ Si tu TRIGGER YA incrementa trial_used, borra este bloque para no duplicar. */
    try {
      const { data: t, error: tErr } = await supabase
        .from('tenants')
        .select('trial_active, trial_quota, trial_used')
        .eq('id', tenantId)
        .maybeSingle();

      if (!tErr && t?.trial_active) {
        const quota = Number(t.trial_quota ?? 0);
        const used  = Number(t.trial_used ?? 0);

        if (used < quota) {
          const { error: incErr } = await supabase
            .from('tenants')
            .update({ trial_used: used + 1 })
            .eq('id', tenantId)
            .eq('trial_active', true)
            .eq('trial_used', used)       // CAS: solo si nadie lo cambió entre lectura y escritura
            .lt('trial_used', quota);     // seguridad adicional
          if (incErr) {
            // No bloquear por contador — solo log si te interesa
            // console.warn('[crearPaquete] trial_used++ fallo CAS:', incErr);
          }
        }
      }
    } catch (incEx) {
      // No bloquear al usuario por el contador
      // console.warn('[crearPaquete] trial_used++ excepcion:', incEx);
    }

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
    const msg = String(error?.message || '').toUpperCase();
    if (msg.includes('TRIAL_LIMIT_REACHED')) {
      return res.status(402).json({
        ok: false,
        error: 'TRIAL_LIMIT_REACHED',
        message: 'Has alcanzado el límite de 20 paquetes de la versión de prueba. Actualiza tu plan para seguir.'
      });
    }
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
