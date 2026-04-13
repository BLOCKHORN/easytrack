import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';

export default function AdminRoute() {
  const [isAuth, setIsAuth] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const checkAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (isMounted) setIsAuth(false);
          return;
        }

        const { data, error } = await supabase.rpc('is_superadmin');
        if (error || !data) {
          if (isMounted) setIsAuth(false);
          return;
        }

        if (isMounted) setIsAuth(true);
      } catch {
        if (isMounted) setIsAuth(false);
      }
    };
    
    checkAdmin();
    return () => { isMounted = false; };
  }, []);

  if (isAuth === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuth ? <Outlet /> : <Navigate to="/" replace />;
}