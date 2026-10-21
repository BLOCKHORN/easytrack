'use strict';

const { query } = require('../utils/db');

async function getPublicReviews(req, res) {
  try {
    const { rows } = await query(`
      SELECT r.id, r.rating, r.comentario, r.created_at, json_build_object('nombre_empresa', t.nombre_empresa) as tenants
      FROM public.reviews r
      JOIN public.tenants t ON t.id = r.tenant_id
      WHERE r.status = 'approved'
      ORDER BY r.created_at DESC
      LIMIT 10
    `);
    return res.json({ ok: true, reviews: rows });
  } catch (err) {
    console.error('[Reviews getPublic Error]', err);
    return res.status(500).json({ ok: false, error: 'Error al consultar reseñas' });
  }
}

async function getEligibility(req, res) {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'Tenant no especificado' });
    }

    const { rows: existing } = await query('SELECT id FROM public.reviews WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    if (existing.length > 0) {
      return res.json({ ok: true, eligible: false, reason: 'already_reviewed' });
    }

    const { rows: pkgs } = await query(
      'SELECT count(*)::int as count FROM public.packages WHERE tenant_id = $1 AND entregado = true',
      [tenantId]
    );

    const count = pkgs[0]?.count || 0;
    return res.json({
      ok: true,
      eligible: count >= 250,
      count
    });
  } catch (err) {
    console.error('[Reviews getEligibility Error]', err);
    return res.status(500).json({ ok: false, error: 'Error al verificar elegibilidad' });
  }
}

async function submitReview(req, res) {
  try {
    const tenantId = req.tenant?.id || req.body.tenantId;
    const { rating, comentario } = req.body;

    if (!tenantId || !rating || !comentario) {
      return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });
    }

    const ratingNum = Math.min(5, Math.max(1, parseInt(rating, 10)));
    const cleanComment = String(comentario).trim();

    const { rows } = await query(`
      INSERT INTO public.reviews (tenant_id, rating, comentario, status, created_at)
      VALUES ($1, $2, $3, 'pending', NOW())
      ON CONFLICT (tenant_id)
      DO UPDATE SET rating = EXCLUDED.rating, comentario = EXCLUDED.comentario, status = 'pending'
      RETURNING *
    `, [tenantId, ratingNum, cleanComment]);

    return res.json({ ok: true, review: rows[0] });
  } catch (err) {
    console.error('[Reviews submit Error]', err);
    return res.status(500).json({ ok: false, error: 'Error al guardar reseña' });
  }
}

module.exports = {
  getPublicReviews,
  getEligibility,
  submitReview
};
