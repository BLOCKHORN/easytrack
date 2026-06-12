import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        const next = searchParams.get('next') || '/dashboard';
        navigate(next, { replace: true });
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-400 font-bold animate-pulse uppercase tracking-[0.2em] text-xs">Sincronizando sesión...</p>
      </div>
    </div>
  );
}
