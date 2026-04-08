// src/hooks/usePasswordFirstGuard.jsx
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

export function usePasswordFirstGuard() {
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const needs = u?.user?.user_metadata?.needs_password;
        const isOnCreate = loc.pathname.startsWith('/crear-password');
        if (needs && !isOnCreate) {
          const qp = new URLSearchParams({ next: loc.pathname + loc.search });
          if (!stop) nav(`/crear-password?${qp.toString()}`, { replace: true });
        }
      } catch {
        /* noop */
      }
    })();
    return () => { stop = true; };
  }, [nav, loc]);
}
