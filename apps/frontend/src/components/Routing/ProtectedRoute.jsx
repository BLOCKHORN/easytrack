import { useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTenant } from '../context/TenantContext'

export default function ProtectedRoute({ children }) {
  const { tenantSlug } = useParams()
  const { tenant, loading } = useTenant()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (loading) return

    if (!tenant) {
      navigate('/', { replace: true })
      return
    }

    const currentPath = location.pathname
    const tail = tenantSlug ? currentPath.replace(`/${tenantSlug}`, '') : currentPath

    if (!tenantSlug || tenantSlug !== tenant.slug) {
      navigate(`/${tenant.slug}${tail || '/dashboard'}`, { replace: true })
    }
  }, [tenant, loading, tenantSlug, navigate, location.pathname])

  if (loading || !tenant) return null

  return children
}