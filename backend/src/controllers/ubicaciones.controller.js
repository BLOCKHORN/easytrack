// CommonJS (robusto para distintas formas de export del cliente supabase)
const supa = require('../utils/supabaseClient');
const supabase = supa.supabase || supa.default || supa;

const DEFAULT_META = { cols: 5, order: 'horizontal' };

/* ----------------------- helpers ----------------------- */
const up = (s = '') => String(s || '').trim().toUpperCase();
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

/**
 * Resuelve tenant_id:
 * 1) req.query.tenant_id
 * 2) Authorization: Bearer <jwt> → supabase.auth.getUser(token) → (opcional) RPC/tabla
 * Si no se puede, devuelve null (el caller devolverá 200 con valores por defecto).
 */
async function resolveTenantId(req) {
  if (req.query && req.query.tenant_id) return String(req.query.tenant_id);

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;

    const userId = data.user.id;

    // RPC opcional
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('resolve_tenant_from_user', { p_user_id: userId });
      if (!rpcErr && rpcData) return String(rpcData);
    } catch (_) {}

    // Tabla puente opcional
    try {
      const { data: map } = await supabase
        .from('memberships') // o 'tenants_users' si ese es tu nombre
        .select('tenant_id')
        .eq('user_id', userId)
        .limit(1);
      if (map && map[0]?.tenant_id) return String(map[0].tenant_id);
    } catch (_) {}

    // Owner opcional
    try {
      const { data: owned } = await supabase
        .from('tenants')
        .select('id')
        .eq('accepted_by', userId) // o 'owner_id' si tu esquema lo usa
        .limit(1);
      if (owned && owned[0]?.id) return String(owned[0].id);
    } catch (_) {}

    return null;
  } catch {
    return null;
  }
}

/* ----------------------- GET /api/ubicaciones ----------------------- */
async function listUbicaciones(req, res) {
  const tenantId = await resolveTenantId(req);

  // Sin tenant → devolvemos vacío y meta por defecto (nunca 4xx)
  if (!tenantId) {
    return res.status(200).json({ ubicaciones: [], meta: DEFAULT_META });
  }

  try {
    // 1) Meta (OJO: la columna es 'orden' en tu esquema)
    let meta = DEFAULT_META;
    try {
      const { data: metaRow } = await supabase
        .from('ubicaciones_meta')
        .select('cols, orden')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (metaRow) {
        meta = {
          cols: num(metaRow.cols, 5),
          order: metaRow.orden === 'vertical' ? 'vertical' : 'horizontal',
        };
      }
    } catch (_) {}

    // 2) Ubicaciones nuevas (tabla 'ubicaciones')
    let ubicaciones = [];
    try {
      const { data: uRows } = await supabase
        .from('ubicaciones')
        .select('id, label, orden, activo')
        .eq('tenant_id', tenantId)
        .order('orden', { ascending: true });

      if (uRows?.length) {
        ubicaciones = uRows.map(r => ({
          id: r.id,
          label: up(r.label),
          orden: num(r.orden, 0),
          activo: r.activo ?? true,
        }));
      }
    } catch (_) {}

    // 3) Fallback legacy: derivar desde 'baldas' si no hay filas en 'ubicaciones'
    if (!ubicaciones.length) {
      try {
        const { data: bRows } = await supabase
          .from('baldas')
          .select('id, codigo, estante, balda')
          .eq('id_negocio', tenantId)
          .order('estante', { ascending: true })
          .order('balda', { ascending: true });

        if (bRows?.length) {
          ubicaciones = bRows.map((b, i) => ({
            id: b.id,
            label: up(b.codigo || `B${i + 1}`),
            orden: i,
            activo: true,
          }));
        }
      } catch (_) {}
    }

    return res.json({ ubicaciones, meta });
  } catch (e) {
    console.error('[ubicaciones.list] error', e);
    // Nunca reventar al cliente
    return res.status(200).json({ ubicaciones: [], meta: DEFAULT_META });
  }
}

/* ----------------------- POST /api/ubicaciones ----------------------- */
/**
 * Guarda meta (cols, order) + ubicaciones (label/orden/activo).
 * Además sincroniza la tabla legacy 'baldas' para que B6, B7… existan,
 * evitando así el 400 "No existe la ubicación B6" al crear paquetes.
 */
async function upsertUbicaciones(req, res) {
  const explicitTenant = req.body?.tenant_id;
  const resolvedTenant = await resolveTenantId(req);
  const tenantId = explicitTenant || resolvedTenant || null;

  // Sin tenant → confirmamos ok pero no hacemos nada
  if (!tenantId) return res.status(200).json({ ok: true });

  const metaIn = req.body?.meta || {};
  const rowsIn = Array.isArray(req.body?.ubicaciones) ? req.body.ubicaciones : [];

  try {
    // 1) Guardar meta (en tu schema el campo se llama 'orden')
    try {
      const mCols = num(metaIn.cols, 5);
      const mOrder = (metaIn.order === 'vertical' ? 'vertical' : 'horizontal');

      await supabase
        .from('ubicaciones_meta')
        .upsert(
          { tenant_id: tenantId, cols: mCols, orden: mOrder },
          { onConflict: 'tenant_id' }
        );
    } catch (e) {
      console.warn('[ubicaciones.upsert] meta warn:', e?.message);
    }

    // 2) Normalizar filas
    const nowRows = rowsIn.map((u, i) => {
      const label = up(u?.label || u?.codigo || `B${i + 1}`);
      const orden = Number.isFinite(Number(u?.orden)) ? Number(u.orden) : i;
      return {
        tenant_id: tenantId,
        label,
        orden,
        activo: typeof u?.activo === 'boolean' ? u.activo : true,
      };
    });

    // 3) Upsert a 'ubicaciones' SIN índices únicos (update-or-insert por (tenant_id, label))
    //    a) intentamos UPDATE por (tenant_id, label)
    //    b) si no afectó filas, hacemos INSERT
    try {
      for (const r of nowRows) {
        const { data: updated, error: upErr } = await supabase
          .from('ubicaciones')
          .update({ orden: r.orden, activo: r.activo, label: r.label })
          .eq('tenant_id', tenantId)
          .eq('label', r.label)
          .select('id');

        if (upErr) throw upErr;

        if (!updated || updated.length === 0) {
          const { error: insErr } = await supabase
            .from('ubicaciones')
            .insert({ tenant_id: tenantId, label: r.label, orden: r.orden, activo: r.activo });
          if (insErr) throw insErr;
        }
      }
    } catch (e) {
      console.warn('[ubicaciones.upsert] ubicaciones warn:', e?.message);
    }

    // 4) Sincronizar 'baldas' (garantiza que existan B1..Bn)
    //    - Leemos existentes por tenant
    //    - Insertamos los que no existan
    //    - Actualizamos estante/balda/codigo para los que existan
    try {
      const { data: existing } = await supabase
        .from('baldas')
        .select('id, codigo')
        .eq('id_negocio', tenantId);

      const byCode = new Map((existing || []).map(r => [up(r.codigo), r.id]));

      const inserts = [];
      const updates = [];

      for (const r of nowRows) {
        const codigo = r.label;           // espejo 1:1 con label (B1, B2, …)
        const baldaIdx = r.orden + 1;     // balda = orden + 1 (estante fijo = 1)

        if (byCode.has(codigo)) {
          // preparar update por id
          updates.push({
            id: byCode.get(codigo),
            id_negocio: tenantId,
            estante: 1,
            balda: baldaIdx,
            codigo,
            disponible: true,
          });
        } else {
          inserts.push({
            id_negocio: tenantId,
            estante: 1,
            balda: baldaIdx,
            codigo,
            disponible: true,
          });
        }
      }

      if (inserts.length) {
        const { error: insB } = await supabase.from('baldas').insert(inserts);
        if (insB) throw insB;
      }
      if (updates.length) {
        // Supabase no soporta bulk-update por body, hacemos 1 a 1
        for (const u of updates) {
          const { error: upB } = await supabase
            .from('baldas')
            .update({
              estante: u.estante,
              balda: u.balda,
              codigo: u.codigo,
              disponible: u.disponible,
            })
            .eq('id', u.id)
            .eq('id_negocio', tenantId);
          if (upB) throw upB;
        }
      }
    } catch (e) {
      console.warn('[ubicaciones.upsert] baldas sync warn:', e?.message);
      // aunque falle la sync de baldas, no reventamos: el front sigue funcionando
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error('[ubicaciones.upsert] error', e);
    // No mandamos 500 para no ensuciar la consola del cliente; devolvemos ok=false
    return res.status(200).json({ ok: false });
  }
}

/* ----------------------- PATCH /api/ubicaciones/meta ----------------------- */
async function patchMeta(req, res) {
  const explicitTenant = req.body?.tenant_id;
  const resolvedTenant = await resolveTenantId(req);
  const tenantId = explicitTenant || resolvedTenant || null;

  if (!tenantId) return res.status(200).json({ ok: true });

  const metaIn = req.body?.meta || {};
  try {
    const mCols = num(metaIn.cols, 5);
    const mOrder = (metaIn.order === 'vertical' ? 'vertical' : 'horizontal');

    await supabase
      .from('ubicaciones_meta')
      .upsert(
        { tenant_id: tenantId, cols: mCols, orden: mOrder },
        { onConflict: 'tenant_id' }
      );

    return res.json({ ok: true });
  } catch (e) {
    console.error('[ubicaciones.patchMeta] error', e);
    return res.status(200).json({ ok: false });
  }
}

module.exports = {
  listUbicaciones,
  upsertUbicaciones,
  patchMeta,
};
