// src/components/navbar/useNavbarAuth.js
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../utils/supabaseClient'

export default function useNavbarAuth(navigate) {
  const [checking, setChecking] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [nombreEmpresa, setNombreEmpresa] = useState('EasyPack')
  const [slug, setSlug] = useState(null)

  const API_BASE = useMemo(() => {
    const env = import.meta.env?.VITE_API_URL
    return (env && env.replace(/\/$/, '')) || 'http://localhost:3001'
  }, [])

  const nameFromEmail = (email) => {
    if (!email) return 'Usuario'
    const base = email.split('@')[0] || 'Usuario'
    return base.charAt(0).toUpperCase() + base.slice(1)
  }

  const syncLocalFromSession = (session) => {
    try {
      if (session?.access_token) {
        localStorage.setItem('ep_access_token', session.access_token)
      } else {
        localStorage.removeItem('ep_access_token')
      }
      if (session?.refresh_token) {
        localStorage.setItem('ep_refresh_token', session.refresh_token)
      } else {
        localStorage.removeItem('ep_refresh_token')
      }
      if (session?.user?.email) {
        localStorage.setItem('ep_user_email', session.user.email)
      }
    } catch {}
  }

  const clearEpLocal = () => {
    try {
      localStorage.removeItem('empresa_id')
      localStorage.removeItem('ep_access_token')
      localStorage.removeItem('ep_refresh_token')
      localStorage.removeItem('ep_user_email')
    } catch {}
  }

  const loadTenant = async (session) => {
    try {
      const res = await fetch(`${API_BASE}/api/tenants/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (!res.ok) { setSlug(null); return }
      const { tenant } = await res.json()
      setSlug(tenant?.slug || null)
      setNombreEmpresa(tenant?.nombre_empresa || 'EasyPack')
    } catch {
      setSlug(null)
    }
  }

  useEffect(() => {
    let unsub = null
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user || null
        const email = user?.email || ''
        setIsLoggedIn(!!user)
        setUserEmail(email)
        setAvatarUrl(user?.user_metadata?.avatar_url || null)
        const fullname = user?.user_metadata?.full_name || user?.user_metadata?.name
        setDisplayName(fullname || nameFromEmail(email))
        if (session) {
          syncLocalFromSession(session) // 👈 mantenemos ep_* sincronizado
          await loadTenant(session)
        } else {
          clearEpLocal()
        }
      } finally {
        setChecking(false)
      }

      const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
        // Sincroniza/limpia tokens espejo
        if (event === 'TOKEN_REFRESHED') {
          syncLocalFromSession(session)
        }
        if (event === 'SIGNED_OUT') {
          clearEpLocal()
          setIsLoggedIn(false)
          setUserEmail('')
          setAvatarUrl(null)
          setDisplayName('Usuario')
          setSlug(null)
          // Evita quedarse zombi en rutas protegidas
          navigate('/', { replace: true })
          return
        }

        // Actualiza UI básica
        const user = session?.user || null
        const email = user?.email || ''
        setIsLoggedIn(!!user)
        setUserEmail(email)
        setAvatarUrl(user?.user_metadata?.avatar_url || null)
        const fullname = user?.user_metadata?.full_name || user?.user_metadata?.name
        setDisplayName(fullname || nameFromEmail(email))
        if (session) await loadTenant(session); else setSlug(null)
      })
      unsub = subscription?.subscription?.unsubscribe
    }
    init()
    return () => { if (unsub) unsub() }
  }, [API_BASE, navigate])

  // 🔒 Cerrar sesión SOLO en este dispositivo
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' }) // << clave: local, no global
    } finally {
      clearEpLocal()
      setSlug(null)
      navigate('/')
    }
  }

  const goConfig = () => navigate(slug ? `/${slug}/dashboard/configuracion` : '/configuracion')

  return {
    checking,
    isLoggedIn,
    userEmail,
    avatarUrl,
    displayName,
    nombreEmpresa,
    slug,
    handleLogout,
    goConfig,
  }
}
