// backend/src/routes/metrics.routes.js
const express = require('express')
const router = express.Router()
const { supabase } = require('../utils/supabaseClient')

const CACHE_MS = 60 * 1000
let cache = { ts: 0, payload: null }

// Helper de conteo que nunca rompe
const countSafe = async (qb, label) => {
  try {
    const { count, error } = await qb
    if (error) throw error
    return count ?? 0
  } catch (e) {
    console.error(`[metrics] fallo contando "${label}":`, e.message)
    return 0
  }
}

router.get('/public', async (_req, res) => {
  try {
    if (cache.payload && Date.now() - cache.ts < CACHE_MS) {
      return res.json(cache.payload)
    }

    const today = new Date(); today.setHours(0,0,0,0)
    const last30 = new Date(); last30.setDate(last30.getDate() - 30); last30.setHours(0,0,0,0)

    const tenants_count = await countSafe(
      supabase.from('tenants').select('id', { count: 'exact', head: true }),
      'tenants'
    )

    const packages_total = await countSafe(
      supabase.from('paquetes').select('id', { count: 'exact', head: true }),
      'paquetes total'
    )

    const packages_delivered_total = await countSafe(
      supabase.from('paquetes').select('id', { count: 'exact', head: true }).eq('entregado', true),
      'paquetes entregados'
    )

    const packages_last_30d = await countSafe(
      supabase
        .from('paquetes')
        .select('id', { count: 'exact', head: true })
        .eq('entregado', true)
        .gte('fecha_entregado', last30.toISOString()),
      'paquetes últimos 30 días'
    )

    const packages_today = await countSafe(
      supabase
        .from('paquetes')
        .select('id', { count: 'exact', head: true })
        .eq('entregado', true)
        .gte('fecha_entregado', today.toISOString()),
      'paquetes hoy'
    )

    // RPC de ingresos (si no existe, no rompemos)
    let revenue_total = 0
    try {
      const { data, error } = await supabase.rpc('total_ingresos_paquetes')
      if (error) throw error
      revenue_total = Number(data || 0)
    } catch {
      console.warn('[metrics] RPC total_ingresos_paquetes no disponible (ok, seguimos con 0)')
    }

    const payload = {
      ok: true,
      tenants_count,
      packages_total,
      packages_delivered_total,
      packages_pending: Math.max(packages_total - packages_delivered_total, 0),
      packages_last_30d,
      packages_today,
      revenue_total
    }

    cache = { ts: Date.now(), payload }
    return res.json(payload)
  } catch (e) {
    console.error('[metrics.public] error inesperado:', e)
    // Nunca devolvemos 500 para no romper la landing
    return res.status(200).json({
      ok: false,
      tenants_count: 0,
      packages_total: 0,
      packages_delivered_total: 0,
      packages_pending: 0,
      packages_last_30d: 0,
      packages_today: 0,
      revenue_total: 0,
      warn: 'METRICS_FAILED'
    })
  }
})

// Compatibilidad
router.get('/tenants/count', async (_req, res) => {
  const { count, error } = await supabase.from('tenants').select('id', { count: 'exact', head: true })
  if (error) return res.status(500).json({ ok: false, error: error.message })
  res.json({ ok: true, count: count ?? 0 })
})

module.exports = router
