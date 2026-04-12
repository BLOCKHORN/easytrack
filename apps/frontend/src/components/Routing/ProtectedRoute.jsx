import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { useTenant } from '../../context/TenantContext';

export default function ProtectedRoute({ children }) {
  const { tenantSlug } = useParams();
  const { tenant, loading: tenantLoading } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (tenantLoading) return;

    if (!tenant) {
      navigate('/', { replace: true });
      return;
    }

    let stop = false;

    // Vigila si necesita crear contraseña (absorbido de usePasswordFirstGuard)
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const needsPassword = u?.user?.user_metadata?.needs_password;
        
        if (needsPassword) {
          const qp = new URLSearchParams({ next: location.pathname + location.search });
          if (!stop) {
            navigate(`/crear-password?${qp.toString()}`, { replace: true });
            return;
          }
        }
        if (!stop) setCheckingAuth(false);
      } catch {
        if (!stop) setCheckingAuth(false);
      }
    })();

    // Mantiene la URL limpia
    if (!tenantSlug || tenantSlug !== tenant.slug) {
      const currentPath = location.pathname;
      const tail = tenantSlug ? currentPath.replace(`/${tenantSlug}`, '') : currentPath;
      const cleanTail = tail === '/dashboard' || tail === '/' ? '/dashboard' : tail;
      if (!stop) navigate(`/${tenant.slug}${cleanTail}`, { replace: true });
    }

    return () => { stop = true; };
  }, [tenant, tenantLoading, tenantSlug, navigate, location]);

  if (tenantLoading || !tenant || checkingAuth || (tenantSlug && tenantSlug !== tenant.slug)) return null;

  return children;
}