import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/fetcher';

export default function useSubscription() {
  const [state, setState] = useState({
    loading: true,
    active: false,
    reason: null,
    entitlements: null
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchLimits() {
      try {
        const ts = Date.now();
        let res = await apiFetch(`/api/limits/me?ts=${ts}`);
        if (!res.ok) res = await apiFetch(`/api/tenants/me?ts=${ts}`);
        if (!res.ok) throw new Error('FAILED_FETCH');

        const data = await res.json();
        const ent = data?.entitlements || data;

        if (isMounted && ent) {
          setState({ loading: false, active: !!ent.canUseApp, reason: ent.reason || null, entitlements: ent });
        }
      } catch (e) {
        if (isMounted) {
          setState({ loading: false, active: false, reason: 'error', entitlements: null });
        }
      }
    }

    fetchLimits();
    return () => { isMounted = false; };
  }, []);

  return state;
}