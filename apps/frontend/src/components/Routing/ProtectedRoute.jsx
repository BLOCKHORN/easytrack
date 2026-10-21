import { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { tenantSlug } = useParams();
  const { user, tenant, isInitializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isInitializing) return;

    if (!user || !tenant) {
      navigate('/', { replace: true });
      return;
    }

    const needsPassword = user?.user_metadata?.needs_password;
    if (needsPassword) {
      const qp = new URLSearchParams({ next: location.pathname + location.search });
      navigate(`/crear-password?${qp.toString()}`, { replace: true });
      return;
    }

    // Mantiene la URL limpia con el slug del negocio
    if (!tenantSlug || tenantSlug !== tenant.slug) {
      const currentPath = location.pathname;
      const tail = tenantSlug ? currentPath.replace(`/${tenantSlug}`, '') : currentPath;
      const cleanTail = tail === '/dashboard' || tail === '/' ? '/dashboard' : tail;
      navigate(`/${tenant.slug}${cleanTail}`, { replace: true });
    }
  }, [user, tenant, isInitializing, tenantSlug, navigate, location]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex antialiased">
        <aside className="hidden md:flex w-64 border-r border-zinc-800/80 p-6 flex-col justify-between">
          <div className="space-y-6">
            <div className="h-8 w-32 bg-zinc-900 animate-pulse rounded-lg" />
            <div className="space-y-2 mt-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-zinc-900/60 animate-pulse rounded-xl" />
              ))}
            </div>
          </div>
        </aside>
        <main className="flex-1 p-6 md:p-10 max-w-7xl">
          <div className="h-8 w-48 bg-zinc-900/80 animate-pulse rounded-lg mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-zinc-900/50 animate-pulse rounded-2xl border border-zinc-800/50" />
            ))}
          </div>
          <div className="h-64 bg-zinc-900/40 animate-pulse rounded-2xl border border-zinc-800/50" />
        </main>
      </div>
    );
  }

  if (!user || !tenant || (tenantSlug && tenantSlug !== tenant.slug)) return null;

  return children;
}