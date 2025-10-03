// frontend/src/pages/landing/LandingPage.jsx
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './LandingBase.scss'

// Secciones
import Hero from './Hero'
import Benefits from './Benefits'
import HowItWorks from './HowItWorks'
// import Pricing from './Pricing'   // 🔒 Oculto temporalmente
import Testimonials from './Testimonials'
import WhatsAppFab from './WhatsAppFab'
import DemoModal from '../../components/DemoModal'
import useHashScroll from '../../hooks/useHashScroll'

export default function LandingPage() {
  // Scroll suave a secciones (#pricing, #features, etc.)
  useHashScroll(80) // offset ≈ altura navbar

  const navigate = useNavigate()
  const location = useLocation()

  // -------- Demo modal (compartido Hero/HIW) --------
  const [demoOpen, setDemoOpen] = useState(false)
  const openDemo = () => setDemoOpen(true)
  const closeDemo = () => {
    setDemoOpen(false)
    // limpia ?demo=1 si vino por fallback
    const params = new URLSearchParams(location.search)
    if (params.get('demo') === '1') {
      params.delete('demo')
      navigate({ search: params.toString() ? `?${params.toString()}` : '' }, { replace: true })
    }
  }

  // expone handler global + escucha evento
  useEffect(() => {
    window.__ET_OPEN_DEMO = openDemo
    const onEvt = () => openDemo()
    window.addEventListener('et:open-demo', onEvt)
    return () => window.removeEventListener('et:open-demo', onEvt)
  }, [])

  // abre si llega ?demo=1
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('demo') === '1') setDemoOpen(true)
  }, [location.search])

  // CTA a planes (tu App redirige /planes -> /precios)
  // const goPlans = () => navigate('/precios?cta=landing', { replace: false })

  // -------- Métricas Trustbar (tal cual tenías) --------
  const API_BASE = useMemo(() => {
    const env = import.meta.env?.VITE_API_URL
    return (env && env.replace(/\/$/, '')) || 'http://localhost:3001'
  }, [])

  const [businessesCount, setBusinessesCount] = useState(null)

  useEffect(() => {
    const METRICS_CACHE_KEY = 'ep_metrics_cache_v1'
    const controller = new AbortController()

    const getCached = () => {
      try {
        const raw = localStorage.getItem(METRICS_CACHE_KEY)
        if (!raw) return null
        const obj = JSON.parse(raw)
        if (obj?.ts && Date.now() - obj.ts < 5 * 60 * 1000) return obj.data || null
      } catch {}
      return null
    }
    const saveCache = (data) => {
      try { localStorage.setItem(METRICS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data })) } catch {}
    }

    const normalizeCount = (payload) => {
      const raw =
        typeof payload?.tenants_count === 'number'
          ? payload.tenants_count
          : typeof payload?.count === 'number'
          ? payload.count
          : null
      return typeof raw === 'number' && raw > 0 ? raw : null
    }

    const tryFetch = async (path) => {
      const res = await fetch(`${API_BASE}${path}`, { signal: controller.signal })
      if (!res.ok) throw new Error('bad status')
      return res.json()
    }

    const load = async () => {
      const cached = getCached()
      if (cached) {
        const n = normalizeCount(cached)
        if (n !== null) setBusinessesCount(n)
      }

      try {
        const data = await tryFetch('/api/metrics/public')
        saveCache(data)
        const n = normalizeCount(data)
        setBusinessesCount(n)
        return
      } catch {}

      try {
        const data = await tryFetch('/api/metrics/tenants/count')
        saveCache(data)
        const n = normalizeCount(data)
        setBusinessesCount(n)
        return
      } catch {
        const last = getCached()
        const n = normalizeCount(last)
        setBusinessesCount(n ?? null)
      }
    }

    load()
    return () => controller.abort()
  }, [API_BASE])

  return (
    <div className="landing">
      {/* Decoración global */}
      <div className="bg-scape">
        <div className="blob blob--1" />
        <div className="blob blob--2" />
        <div className="grid-overlay" aria-hidden="true" />
      </div>

      {/* Secciones */}
      <Hero onOpenDemo={openDemo} />

      <Benefits />

      <HowItWorks onOpenDemo={openDemo} />

      {/* 🔒 Pricing ocultado temporalmente */}
      {/*
      <Pricing onPrimaryCta={goPlans} />
      */}

      <Testimonials />

      <WhatsAppFab
        phone={import.meta.env?.VITE_WHATSAPP_PHONE || '34600000000'}
        message="Hola, quiero información sobre EasyPack 👋"
      />

      {/* Modal de Demo */}
      <DemoModal open={demoOpen} onClose={closeDemo} />
    </div>
  )
}
