// frontend/src/hooks/useSubscription.js
import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/fetcher';

export function useSubscription() {
  const [state, setState] = useState({ loading: true, active: false, tenant: null, reason: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await apiFetch('/api/tenants/me');
        if (r.status === 200) {
          const json = await r.json(); // { tenant, subscription }
          const sub  = json?.subscription;
          const now = Date.now();
          const status = String(sub?.status || '').toLowerCase();
          const cpe = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : null;
          const trialEnd = sub?.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : null;

          let active = false;
          if (status === 'active') active = (cpe == null) || (cpe > now);
          else if (status === 'trialing') active = (trialEnd == null) || (trialEnd > now);
          else if (status === 'canceled') active = (cpe != null) && (cpe > now);

          if (!cancelled) {
            setState({
              loading: false,
              active,
              tenant: json?.tenant || null,
              reason: active ? null : (status || 'inactive'),
            });
          }
        } else {
          if (!cancelled) setState({ loading: false, active: false, tenant: null, reason: 'inactive' });
        }
      } catch {
        if (!cancelled) setState({ loading: false, active: false, tenant: null, reason: 'inactive' });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return state;
}
