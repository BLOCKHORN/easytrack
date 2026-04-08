'use strict';
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../utils/supabaseAdmin');
const TABLES = require('../config/admin.tables');
const { auditLog } = require('../utils/audit');

// Listado de tablas permitidas
router.get('/tables', (_req, res) => {
  res.json({ tables: Object.keys(TABLES) });
});

// Query genérica con scope por tenant y orden seguro
router.get('/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const cfg = TABLES[table];
    if (!cfg) return res.status(400).json({ error: 'TABLE_NOT_ALLOWED' });

    const {
      q = '',
      page = 1,
      pageSize = 20,
      orderBy,
      orderDir = 'desc',
      tenant_id = null
    } = req.query;

    const from = (Number(page) - 1) * Number(pageSize);
    const to = from + Number(pageSize) - 1;

    let qy = supabaseAdmin.from(table).select('*', { count: 'exact' });

    // Scope por tenant SOLO si la tabla lo soporta
    if (cfg.tenantScoped && tenant_id) {
      const tenantCol = cfg.tenantIdCol || 'tenant_id';
      qy = qy.eq(tenantCol, tenant_id);
    }

    // Búsqueda q sobre columnas declaradas
    if (q && Array.isArray(cfg.searchable) && cfg.searchable.length) {
      const like = `%${q}%`;
      const ors = cfg.searchable.map(c => `${c}.ilike.${like}`);
      qy = qy.or(ors.join(','));
    }

    // Orden seguro: usa orderBy si llega, si no defaultOrder, si no pk, si no 'id'
    const orderKey = orderBy || cfg.defaultOrder || cfg.pk || 'id';
    const ascending = String(orderDir).toLowerCase() === 'asc';
    qy = qy.order(orderKey, { ascending, nullsLast: true });

    // Paginación
    qy = qy.range(from, to);

    const { data, count, error } = await qy;
    if (error) {
      console.error('[admin.data.routes] Supabase error:', error);
      throw error;
    }

    res.json({ data, count, page: Number(page), pageSize: Number(pageSize) });
  } catch (e) {
    console.error('[GET /admin/data/:table] Unexpected:', e);
    res.status(500).json({ error: 'DATA_QUERY_FAILED' });
  }
});

// Obtener un registro
router.get('/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params;
    const cfg = TABLES[table];
    if (!cfg) return res.status(400).json({ error: 'TABLE_NOT_ALLOWED' });

    const { data, error } = await supabaseAdmin.from(table).select('*').eq(cfg.pk, id).maybeSingle();
    if (error) throw error;
    res.json({ row: data });
  } catch (e) { console.error(e); res.status(500).json({ error:'DATA_GET_FAILED' }); }
});

// Editar campos permitidos
router.patch('/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params;
    const cfg = TABLES[table];
    if (!cfg) return res.status(400).json({ error: 'TABLE_NOT_ALLOWED' });

    const payload = {};
    for (const k of (cfg.modifiable || [])) if (k in req.body) payload[k] = req.body[k];
    if (!Object.keys(payload).length) return res.status(400).json({ error: 'NO_ALLOWED_FIELDS' });

    const { data, error } = await supabaseAdmin.from(table).update(payload).eq(cfg.pk, id).select().maybeSingle();
    if (error) throw error;

    await auditLog({
      actor_user_id: req.superadmin.userId, actor_role: req.superadmin.role,
      tenant_id: data?.tenant_id ?? null, action: 'DATA_UPDATE',
      target_table: table, target_id: String(id), diff: payload, req
    });

    res.json({ ok: true, row: data });
  } catch (e) { console.error(e); res.status(500).json({ error:'DATA_PATCH_FAILED' }); }
});

module.exports = router;
