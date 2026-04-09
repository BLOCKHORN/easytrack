import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient'

const TenantContext = createContext(null)
const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '')

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchTenant = async (session) => {
    if (!session) {
      setTenant(null)
      setLoading(false)
      return
    }

    try {
      const r = await fetch(`${API_BASE}/api/tenants/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (!r.ok) {
        setTenant(null)
      } else {
        const data = await r.json()
        setTenant(data.tenant)
      }
    } catch (err) {
      setTenant(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let unsub
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchTenant(session)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_e, session) => {
      fetchTenant(session)
    })

    unsub = authListener?.subscription?.unsubscribe
    return () => unsub && unsub()
  }, [])

  return (
    <TenantContext.Provider value={{ tenant, loading }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  return useContext(TenantContext)
}