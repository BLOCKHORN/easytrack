// frontend/src/hooks/useSubscription.js
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

function normalizeEntitlements(src) {
  if (!src || typeof src !== 'object') return null;

  const status = String(src.status || src.subscription_status || '').toLowerCase();
  const untilStr = src.until_at || src.current_period_end || src.trial_end || null;
  const untilMs  = untilStr ? Date.parse(untilStr) : null;
  const now      = Date.now();

  const onTrial = status === 'trialing' && (!untilMs || untilMs > now);
  const active  = status === 'active' || onTrial || !!src.canUseApp;

  // límites opcionales: packages_left | remaining
  const rawLeft = src?.limits?.packages_left ?? src?.limits?.remaining;
  const left    = Number.isFinite(Number(rawLeft)) ? Number(rawLeft) : null;

  const canCreatePackage = src.canCreatePackage != null
    ? !!src.canCreatePackage
    : (active && (left == null || left > 0));

  return {
    ...src,
    status: status || (active ? 'active' : 'inactive'),
    until_at: untilMs ? new Date(untilMs).toISOString() : null,
    onTrial,
    active,
    canUseApp: src.canUseApp ?? active,
    canCreatePackage,
    limits: src.limits ?? (left != null ? { packages_left: left } : undefined),
  };
}

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
        const { data: { session} } = await supabase.auth.getSession();
        if (!session) {
          if (!cancelled) setState({ loading:false, active:false, reason:'unauthenticated', entitlements:null });
          return;
        }
        const headers = {
          Authorization: `Bearer ${session.access_token}`,
          'Cache-Control': 'no-store',
        };

        // 1) Preferido: /api/tenants/me
        try {
          const r = await fetch(`/api/tenants/me?ts=${Date.now()}`, { headers });
          if (r.ok) {
            const j = await r.json().catch(() => ({}));
            const ent = normalizeEntitlements(j?.entitlements || j);
            if (!cancelled && ent) {
              setState({ loading:false, active:!!ent.active, reason: ent.reason || null, entitlements: ent });
              return;
            }
          }
        } catch {}

        // 2) Fallback: /api/limits/me
        try {
          const r2 = await fetch(`/api/limits/me?ts=${Date.now()}`, { headers });
          if (r2.ok) {
            const j2 = await r2.json().catch(() => ({}));
            const ent2 = normalizeEntitlements(j2?.entitlements || j2);
            if (!cancelled && ent2) {
              setState({ loading:false, active:!!ent2.active, reason: ent2.reason || null, entitlements: ent2 });
              return;
            }
          }
        } catch {}

        if (!cancelled) setState({ loading:false, active:false, reason:'inactive', entitlements:null });
      } catch {
        if (!cancelled) setState({ loading:false, active:false, reason:'inactive', entitlements:null });
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return state;
}
