import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'

export default function ProtectedRoute({ children }) {
  const { tenantSlug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let unsub
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/', { replace: true }); return }

      // Verifica que el backend reconoce al usuario y devuelve su tenant
      const r = await fetch('http://localhost:3001/api/tenants/me', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (!r.ok) { navigate('/', { replace: true }); return }
      const { tenant } = await r.json()

      // Mantén la ruta actual (tail), reemplazando el slug si venía
      const currentPath = location.pathname
      const tail = tenantSlug
        ? currentPath.replace(`/${tenantSlug}`, '')
        : currentPath

      // Si no hay slug en la URL (o no coincide), redirige a la misma ruta con su slug
      if (!tenantSlug || tenantSlug !== tenant.slug) {
        navigate(`/${tenant.slug}${tail || '/dashboard'}`, { replace: true })
        return
      }

      setChecking(false)
    })()

    // Si se cierra sesión, vete al home
    const s = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate('/', { replace: true })
    })
    unsub = s?.data?.subscription?.unsubscribe

    return () => unsub && unsub()
  }, [tenantSlug, navigate, location.pathname])

  if (checking) return null // o un spinner si prefieres
  return children
}
