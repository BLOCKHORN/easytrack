// frontend/src/hooks/useSubscription.js
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export function useSubscription() {
  const [state, setState] = useState({
    loading: true,
    active: false,
    reason: null,
    entitlements: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (!cancelled) setState({ loading:false, active:false, reason:'unauthenticated', entitlements:null });
          return;
        }

        // 1) Canon: /api/tenants/me
        const r = await fetch('/api/tenants/me', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (r.ok) {
          const j = await r.json().catch(() => ({}));
          const ent = j?.entitlements || null;
          if (!cancelled && ent) {
            setState({
              loading: false,
              active: !!ent.canUseApp,
              reason: ent.reason || null,
              entitlements: ent,
            });
            return;
          }
        }

        // 2) Fallback: /api/limits/me
        const r2 = await fetch('/api/limits/me', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (r2.ok) {
          const j2 = await r2.json().catch(() => ({}));
          const ent2 = j2?.entitlements || null;
          if (!cancelled && ent2) {
            setState({
              loading: false,
              active: !!ent2.canUseApp,
              reason: ent2.reason || null,
              entitlements: ent2,
            });
            return;
          }
          const remaining = Number(j2?.limits?.remaining ?? 0);
          const softBlocked = !!j2?.limits?.soft_blocked;
          const can = !softBlocked && remaining > 0;
          if (!cancelled) {
            setState({
              loading: false,
              active: can,
              reason: can ? null : 'trial_exhausted',
              entitlements: null,
            });
            return;
          }
        }

        if (!cancelled) setState({ loading:false, active:false, reason:'inactive', entitlements:null });
      } catch {
        if (!cancelled) setState({ loading:false, active:false, reason:'inactive', entitlements:null });
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return state;
}
