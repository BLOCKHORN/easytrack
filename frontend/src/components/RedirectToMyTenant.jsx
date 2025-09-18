import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'

export default function RedirectToMyTenant() {
  const navigate = useNavigate()
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return navigate('/', { replace: true })
      const r = await fetch('http://localhost:3001/api/tenants/me', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (!r.ok) return navigate('/', { replace: true })
      const { tenant } = await r.json()
      navigate(`/${tenant.slug}/dashboard`, { replace: true })
    })()
  }, [navigate])
  return null
}
