import { useEffect, useMemo, useRef, useState } from 'react'
import { FaBuilding, FaBoxOpen, FaShieldAlt } from 'react-icons/fa'
import './Trustbar.scss'

/** 1234→"1,2k", 128300→"128k", 2_400_000→"2,4M" */
function formatCompact(n) {
  if (typeof n !== 'number' || !isFinite(n) || n < 0) return null
  if (n < 1000) return new Intl.NumberFormat('es-ES').format(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0)}k`.replace('.0', '')
  return `${(n / 1_000_000).toFixed(n % 1_000_000 >= 100_000 ? 1 : 0)}M`.replace('.0', '')
}

/** “hace 1 min / hace 2 h / justo ahora” */
function timeAgo(ts) {
  if (!ts) return null
  const diff = Date.now() - ts
  const mins = Math.max(0, Math.floor(diff / 60000))
  if (mins < 1) return 'justo ahora'
  if (mins < 60) return `hace ${mins === 1 ? '1 min' : `${mins} min`}`
  const hrs = Math.floor(mins / 60)
  return `hace ${hrs === 1 ? '1 h' : `${hrs} h`}`
}

/**
 * Trustbar
 * props opcionales:
 *  - businessesCount: nº de negocios (prioridad sobre API)
 *  - uptime: string o number (ej: "99,9%" o 99.9)
 */
export default function Trustbar({ businessesCount, uptime }) {
  const API_BASE = useMemo(() => {
    const env = import.meta.env?.VITE_API_URL
    return (env && env.replace(/\/$/, '')) || 'http://localhost:3001'
  }, [])

  const [metrics, setMetrics] = useState(null) // { tenants_count, packages_total, packages_delivered_total, uptime_rolling_pct }
  const [stamp, setStamp] = useState(null)     // ts última actualización
  const [loading, setLoading] = useState(true)
  const mounted = useRef(true)
  const CACHE_KEY = 'et_metrics_public_v1'

  useEffect(() => {
    mounted.current = true

    const getCached = () => {
      try {
        const raw = localStorage.getItem(CACHE_KEY)
        if (!raw) return null
        const { ts, payload } = JSON.parse(raw)
        if (ts && Date.now() - ts < 5 * 60 * 1000) return { ts, payload }
      } catch {}
      return null
    }
    const saveCache = (payload) => {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), payload })) } catch {}
    }

    // 1) si hay prop válida, úsala ya para no parpadear
    let base = {}
    if (typeof businessesCount === 'number' && businessesCount > 0) {
      base.tenants_count = businessesCount
    }

    // 2) si hay caché fresco, úsalo como snapshot inicial
    const cached = getCached()
    if (cached?.payload) {
      base = { ...cached.payload, ...base }
      setMetrics(base)
      setStamp(cached.ts)
      setLoading(false)
    } else if (Object.keys(base).length) {
      setMetrics(base)
      setStamp(Date.now())
      setLoading(false)
    }

    // 3) intenta refrescar siempre (no bloqueante)
    const ac = new AbortController()
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/metrics/public`, { signal: ac.signal })
        if (!res.ok) throw new Error('Bad status')
        const data = await res.json()
        // normaliza campos esperados
        const normalized = {
          tenants_count: Number(data.tenants_count) || base.tenants_count,
          packages_total: Number(data.packages_total) || undefined,
          packages_delivered_total: Number(data.packages_delivered_total) || undefined,
          uptime_rolling_pct: typeof data.uptime_rolling_pct === 'number'
            ? data.uptime_rolling_pct
            : (typeof data.uptime === 'number' ? data.uptime : undefined),
        }
        saveCache(normalized)
        if (!mounted.current) return
        setMetrics(prev => ({ ...(prev || {}), ...normalized }))
        setStamp(Date.now())
        setLoading(false)
      } catch {
        if (!mounted.current) return
        // si no había nada, seguimos mostrando skeleton o snapshot
        setLoading(false)
      }
    })()

    return () => { mounted.current = false; ac.abort() }
  }, [API_BASE, businessesCount])

  // ------- Derivados seguros (sin “genéricos”) -------
  const tenants = (typeof businessesCount === 'number' && businessesCount > 0)
    ? businessesCount
    : (typeof metrics?.tenants_count === 'number' && metrics.tenants_count > 0 ? metrics.tenants_count : null)

  const pkgs = (() => {
    if (typeof metrics?.packages_delivered_total === 'number' && metrics.packages_delivered_total > 0)
      return metrics.packages_delivered_total
    if (typeof metrics?.packages_total === 'number' && metrics.packages_total > 0)
      return metrics.packages_total
    return null
  })()

  const uptimeValue = (() => {
    if (typeof uptime === 'string') return uptime
    if (typeof uptime === 'number') return `${uptime.toFixed(1).replace('.', ',')}%`
    if (typeof metrics?.uptime_rolling_pct === 'number')
      return `${metrics.uptime_rolling_pct.toFixed(1).replace('.', ',')}%`
    return '99,9%' // valor por defecto de marketing si no hay dato
  })()

  const tenantsFmt = tenants != null ? formatCompact(tenants) : null
  const pkgsFmt = pkgs != null ? formatCompact(pkgs) : null
  const updatedAgo = timeAgo(stamp)

  return (
    <section className="et-trustbar" aria-label="Confían en EasyTrack">
      <div className={`et-trustbar__stats ${loading ? 'is-loading' : ''}`}>
        {/* Negocios activos */}
        <div className="tb-stat" role="status" aria-live="polite">
          <span className="tb-icon" aria-hidden="true"><FaBuilding /></span>
          <div className="tb-body">
            <strong className="tb-num">
              {loading && tenantsFmt == null ? <span className="skel skel--num" /> : (tenantsFmt ?? '—')}
            </strong>
            <span className="tb-label">negocios activos</span>
          </div>
        </div>

        {/* Paquetes gestionados */}
        <div className="tb-stat">
          <span className="tb-icon" aria-hidden="true"><FaBoxOpen /></span>
          <div className="tb-body">
            <strong className="tb-num">
              {loading && pkgsFmt == null ? <span className="skel skel--num" /> : (pkgsFmt ?? '—')}
            </strong>
            <span className="tb-label">paquetes gestionados*</span>
          </div>
        </div>

        {/* Uptime */}
        <div className="tb-stat">
          <span className="tb-icon" aria-hidden="true"><FaShieldAlt /></span>
          <div className="tb-body">
            <strong className="tb-num">{uptimeValue}</strong>
            <span className="tb-label">disponibilidad</span>
          </div>
        </div>
      </div>

      <div className="et-trustbar__foot">
        {updatedAgo && (tenantsFmt || pkgsFmt) && (
          <span className="tb-updated" title="Refrescado automáticamente">{updatedAgo}</span>
        )}
      </div>
    </section>
  )
}
