import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient'

const TenantContext = createContext(null)

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsub
    const init = async () => {
      try {
        const { data: { session} } = await supabase.auth.getSession()
        if (!session) { setTenant(null); setLoading(false); return }
        const r = await fetch('http://localhost:3001/api/tenants/me', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        })
        if (!r.ok) { setTenant(null); setLoading(false); return }
        const { tenant } = await r.json()
        setTenant(tenant)
      } finally {
        setLoading(false)
      }
    }
    init()

    const s = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) { setTenant(null); setLoading(false); return }
      // refrescamos el tenant en cambios de sesión
      fetch('http://localhost:3001/api/tenants/me', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
        .then(r => r.ok ? r.json() : Promise.resolve({ tenant: null }))
        .then(({ tenant }) => setTenant(tenant))
    })
    unsub = s?.data?.subscription?.unsubscribe
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
