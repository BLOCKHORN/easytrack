import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshSession } = useAuth();

  useEffect(() => {
    let active = true;

    const syncSession = async () => {
      try {
        await refreshSession();
      } catch {}

      if (active) {
        const next = searchParams.get('next') || '/dashboard';
        navigate(next, { replace: true });
      }
    };

    syncSession();
    return () => { active = false; };
  }, [navigate, searchParams, refreshSession]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-200 rounded-full animate-spin" />
        <p className="text-zinc-400 font-medium tracking-tight text-xs">Sincronizando sesión...</p>
      </div>
    </div>
  );
}
