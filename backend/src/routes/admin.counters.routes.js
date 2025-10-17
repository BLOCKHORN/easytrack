'use strict';

const express = require('express');
const router = express.Router();

const requireSuperadmin = require('../middlewares/requireSuperadmin');

// Intenta cargar desde utils/supabaseClient y/o utils/supabaseAdmin
let db = null, supabaseAdmin = null;
try {
  const c = require('../utils/supabaseClient');
  db = c.supabase || null;
  supabaseAdmin = c.supabaseAdmin || null;
} catch (_) {}
try {
  if (!supabaseAdmin) {
    const a = require('../utils/supabaseAdmin');
    supabaseAdmin = a.supabaseAdmin || supabaseAdmin;
  }
} catch (_) {}

/** Middleware de auth (support/admin/superadmin) */
router.use(requireSuperadmin());

/**
 * Conteo robusto (v2):
 * - Siempre empezamos con select('id', { count:'exact', head:true })
 * - Luego aplicamos filtros (eq/is/lo que toque) SOBRE ese builder.
 * - Si falla algo, devolvemos 0 y logeamos el label.
 */
async function safeCountV2(label, client, filterFn) {
  try {
    if (!client || typeof client.from !== 'function') {
      console.error(`[admin.counters] ${label}: no supabase client`);
      return 0;
    }
    let qb = client
      .from('demo_requests')
      .select('id', { count: 'exact', head: true }); // <- aquí se crea el FilterBuilder

    if (typeof filterFn === 'function') {
      qb = filterFn(qb) || qb; // el filterFn debe devolver el qb encadenado
    }

    const { count, error } = await qb;
    if (error) throw error;
    return count || 0;
  } catch (e) {
    console.error(`[admin.counters] ${label} failed:`, e?.message || e);
    return 0;
  }
}

/** Ping de diagnóstico */
router.get('/demo-requests/counters/ping', (_req, res) => {
  return res.status(200).json({ ok: true, pong: true });
});

/** CONTADORES — SIEMPRE 200 */
router.get('/demo-requests/counters', async (_req, res) => {
  try {
    // Preferimos supabaseAdmin (sin RLS). Si no, usa db (podría requerir policies).
    const client = (typeof supabaseAdmin?.from === 'function')
      ? supabaseAdmin
      : (typeof db?.from === 'function' ? db : null);

    if (!client) {
      console.error('[admin.counters] No supabase client available');
      return res.status(200).json({
        ok: false, total: 0, pending: 0, pending_unseen: 0, accepted: 0, declined: 0
      });
    }

    const [total, pending, pending_unseen, accepted, declined] = await Promise.all([
      // total sin filtros
      safeCountV2('total', client),

      // pendientes
      safeCountV2('pending', client, (qb) => qb.eq('status', 'pending')),

      // pendientes no vistos
      safeCountV2('pending_unseen', client, (qb) =>
        qb.eq('status', 'pending').is('reviewed_at', null)
      ),

      // aceptados
      safeCountV2('accepted', client, (qb) => qb.eq('status', 'accepted')),

      // rechazados
      safeCountV2('declined', client, (qb) => qb.eq('status', 'declined')),
    ]);

    return res.status(200).json({
      ok: true, total, pending, pending_unseen, accepted, declined
    });
  } catch (e) {
    console.error('[admin.counters] unexpected:', e);
    return res.status(200).json({
      ok: false, total: 0, pending: 0, pending_unseen: 0, accepted: 0, declined: 0
    });
  }
});

module.exports = router;
