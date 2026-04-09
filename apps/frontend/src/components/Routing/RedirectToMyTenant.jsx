import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../context/TenantContext'

export default function RedirectToMyTenant() {
  const navigate = useNavigate()
  const { tenant, loading } = useTenant()

  useEffect(() => {
    if (loading) return
    
    if (!tenant) {
      navigate('/', { replace: true })
    } else {
      navigate(`/${tenant.slug}/dashboard`, { replace: true })
    }
  }, [tenant, loading, navigate])

  return null
}