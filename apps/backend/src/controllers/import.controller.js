// src/controllers/import.controller.js
'use strict';

const { supabase } = require('../utils/supabaseClient');

/* ========= Helpers de parsing ========= */

const KNOWN_CARRIERS = {
  gls: ['gls', 'general logistics'],
  seur: ['seur'],
  correos: ['correos', 'correos express', 'correos-expres', 'correos_express'],
  amazon: ['amzl', 'amazon', 'amazon logistics', 'amazon-logistics', 'amazon_logistics'],
  dhl: ['dhl'],
  mrw: ['mrw'],
};

function normalizeCarrier(str = '') {
  const s = String(str).trim().toLowerCase();
  if (!s) return '';
  for (const [key, variants] of Object.entries(KNOWN_CARRIERS)) {
    if (variants.some(v => s.includes(v))) return key;
  }
  return s; // si no coincide, devolvemos lo que venga (libre)
}

function smartSplit(line = '') {
  // soporta: "pepito - gls - b2", "pepito;gls;b2", "pepito, gls, b2", "pepito|gls|b2", "pepito\tgls\tb2"
  const sep = line.includes('\t') ? '\t' : /;|\||,| - | -|- /.test(line) ? /;|\||,| - | -|- / : /-/;
  return String(line).split(sep).map(s => s.trim()).filter(Boolean);
}

function parseLine(line = '') {
  // Heurística mínima: [nombre, empresa, ubicacion]
  const parts = smartSplit(line);
  let nombre = parts[0] || '';
  let empresa = parts[1] || '';
  let ubicacion = parts[2] || '';

  // Si detectamos algo tipo B2 / A1 como segundo, y el tercero parece empresa, invertimos
  const looksLikeUbic = v => /^[A-Z]?\d+$/i.test(String(v || '').trim());
  if (!ubicacion && looksLikeUbic(empresa) && parts[2]) {
    ubicacion = empresa;
    empresa = parts[2];
  }

  empresa = normalizeCarrier(empresa);
  const confidence =
    (nombre ? 0.45 : 0) +
    (empresa ? 0.35 : 0) +
    (ubicacion ? 0.20 : 0);

  return {
    raw_text: line,
    detected_nombre: nombre || null,
    detected_empresa: empresa || null,
    detected_ubicacion: ubicacion || null,
    confidence: Math.min(1, confidence),
  };
}

function parsePayload(payload = '') {
  // recibe: blob de texto multi-línea (pegado o leido de archivo)
  const lines = String(payload || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  return lines.map(parseLine);
}

/* ========= Endpoints ========= */

/**
 * POST /api/import/preview
 * body: { tenantId, content, source? }   // content = texto pegado o leído de CSV/TXT
 * Devuelve rows con {idTemp, ...parsed}
 */
async function preview(req, res) {
  try {
    const { tenantId, content, source = 'txt' } = req.body || {};
    if (!tenantId || !content) return res.status(400).json({ ok: false, error: 'tenantId y content son obligatorios.' });

    const rows = parsePayload(content).map((r, idx) => ({
      idTemp: `tmp_${idx}_${Math.random().toString(36).slice(2,8)}`,
      source,
      ...r
    }));

    return res.json({ ok: true, rows, count: rows.length });
  } catch (err) {
    console.error('[import.preview] Error:', err);
    return res.status(500).json({ ok: false, error: 'Error en preview.' });
  }
}

/**
 * POST /api/import/commit
 * body: { tenantId, rows: [{raw_text, detected_nombre, detected_empresa, detected_ubicacion, confidence}], autoConfirmIfGte? }
 * Inserta en import_buffer y crea packages para filas válidas.
 */
async function commit(req, res) {
  try {
    const { tenantId, rows = [], autoConfirmIfGte = 0.9 } = req.body || {};
    if (!tenantId || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ ok: false, error: 'tenantId y rows son obligatorios.' });
    }

    // 1) upsert en staging
    const stageRows = rows.map(r => ({
      tenant_id: tenantId,
      source: r.source || 'txt',
      raw_text: r.raw_text || null,
      detected_nombre: r.detected_nombre || null,
      detected_empresa: r.detected_empresa || null,
      detected_ubicacion: r.detected_ubicacion || null,
      confidence: Number.isFinite(r.confidence) ? r.confidence : 0,
      status: (r.confidence >= autoConfirmIfGte) ? 'confirmado' : 'pendiente'
    }));

    const { data: staged, error: stageErr } = await supabase
      .from('import_buffer')
      .insert(stageRows)
      .select('*');

    if (stageErr) {
      console.error('[import.commit] stageErr:', stageErr);
      return res.status(500).json({ ok: false, error: 'No se pudo insertar en staging.' });
    }

    // 2) Resolver ubicaciones y empresas para los "confirmados" (o todos si quieres fuerza)
    const confirmables = (staged || []).filter(r => r.status === 'confirmado');

    if (confirmables.length === 0) {
      return res.json({ ok: true, staged: staged.length, created: 0, pending: staged.length });
    }

    // 2.1 cache de ubicaciones por label
    const { data: ubicList, error: ubiErr } = await supabase
      .from('ubicaciones')
      .select('id,label')
      .eq('tenant_id', tenantId)
      .eq('activo', true);

    if (ubiErr) {
      console.error('[import.commit] ubiErr:', ubiErr);
      return res.status(500).json({ ok: false, error: 'Error al cargar ubicaciones.' });
    }
    const ubiByLabel = new Map((ubicList || []).map(u => [String(u.label || '').toUpperCase(), u.id]));

    // 2.2 cache de empresas del tenant por nombre normalizado
    const { data: empList, error: empErr } = await supabase
      .from('empresas_transporte_tenant')
      .select('id,nombre,activo')
      .eq('tenant_id', tenantId);

    if (empErr) {
      console.error('[import.commit] empErr:', empErr);
      return res.status(500).json({ ok: false, error: 'Error al cargar empresas de transporte.' });
    }
    const empByName = new Map((empList || []).map(e => [String(e.nombre || '').toLowerCase(), e]));

    // 3) construir inserts para packages
    const toInsert = [];
    for (const r of confirmables) {
      const nombre = (r.detected_nombre || '').trim();
      const empresaTxt = (r.detected_empresa || '').trim().toLowerCase();
      const ubiLabel = String(r.detected_ubicacion || '').trim().toUpperCase();

      if (!nombre || !ubiLabel) continue;
      const ubicacion_id = ubiByLabel.get(ubiLabel);
      if (!ubicacion_id) continue;

      let empresa_id = null;
      let empresa_transporte = null;
      if (empresaTxt) {
        if (empByName.has(empresaTxt)) {
          const emp = empByName.get(empresaTxt);
          empresa_id = emp?.id || null;
          empresa_transporte = emp?.nombre || empresaTxt;
        } else {
          // Si no existe, la creamos *activa* con ingreso 0
          const { data: newEmp, error: newEmpErr } = await supabase
            .from('empresas_transporte_tenant')
            .insert({ tenant_id: tenantId, nombre: empresaTxt, ingreso_por_entrega: 0, activo: true })
            .select('id,nombre')
            .maybeSingle();
          if (!newEmpErr && newEmp) {
            empresa_id = newEmp.id;
            empresa_transporte = newEmp.nombre;
            empByName.set(empresaTxt, newEmp);
          } else {
            empresa_transporte = empresaTxt; // fallback sin id
          }
        }
      }

      toInsert.push({
        tenant_id: tenantId,
        nombre_cliente: nombre,
        empresa_transporte: empresa_transporte,
        empresa_id: empresa_id,
        ubicacion_id,
        ubicacion_label: ubiLabel,
        entregado: false,
        ingreso_generado: 0
      });
    }

    let created = 0;
    if (toInsert.length) {
      const { data: createdRows, error: insErr } = await supabase
        .from('packages')
        .insert(toInsert)
        .select('id');

      if (insErr) {
        console.error('[import.commit] insErr:', insErr);
        return res.status(500).json({ ok: false, error: 'Error al crear paquetes.' });
      }
      created = (createdRows || []).length;
    }

    return res.json({
      ok: true,
      staged: staged.length,
      created,
      pending: staged.length - confirmables.length,
    });

  } catch (err) {
    console.error('[import.commit] Error:', err);
    return res.status(500).json({ ok: false, error: 'Error en commit.' });
  }
}

/**
 * GET /api/import/staging?status=pendiente
 */
async function listStaging(req, res) {
  try {
    const tenantId = req.tenantId || req.tenant_id || req.tenant?.id;
    if (!tenantId) return res.status(400).json({ ok: false, error: 'Tenant no resuelto.' });

    const status = String(req.query.status || 'pendiente');
    const { data, error } = await supabase
      .from('import_buffer')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.json({ ok: true, rows: data || [] });
  } catch (err) {
    console.error('[import.listStaging] Error:', err);
    return res.status(500).json({ ok: false, error: 'Error listando staging.' });
  }
}

/**
 * POST /api/import/bulk-confirm
 * body: { ids: [...] }  // marca en staging como confirmado y crea packages
 */
async function bulkConfirm(req, res) {
  try {
    const tenantId = req.tenantId || req.tenant_id || req.tenant?.id;
    const { ids = [] } = req.body || {};
    if (!tenantId || !ids.length) {
      return res.status(400).json({ ok: false, error: 'tenant y ids son obligatorios.' });
    }

    // 1) marcar confirmados
    const { data: staged, error: updErr } = await supabase
      .from('import_buffer')
      .update({ status: 'confirmado' })
      .in('id', ids)
      .select('*');

    if (updErr) return res.status(500).json({ ok: false, error: updErr.message });

    // 2) reusar lógica del commit (pero con confirmados)
    req.body = { tenantId, rows: staged.map(s => ({
      source: s.source,
      raw_text: s.raw_text,
      detected_nombre: s.detected_nombre,
      detected_empresa: s.detected_empresa,
      detected_ubicacion: s.detected_ubicacion,
      confidence: s.confidence
    })) , autoConfirmIfGte: 0 }; // autoConfirm 0 para reinsertar confirmados

    return commit(req, res);
  } catch (err) {
    console.error('[import.bulkConfirm] Error:', err);
    return res.status(500).json({ ok: false, error: 'Error en bulkConfirm.' });
  }
}

module.exports = { preview, commit, listStaging, bulkConfirm };
