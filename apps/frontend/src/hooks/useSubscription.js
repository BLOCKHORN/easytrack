import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { apiPath } from '../utils/fetcher';

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
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('UNAUTHENTICATED');

        const opts = { headers: { 'Authorization': `Bearer ${session.access_token}` } };
        const ts = Date.now();
        
        let res = await fetch(apiPath(`/api/limits/me?ts=${ts}`), opts);
        if (!res.ok) res = await fetch(apiPath(`/api/tenants/me?ts=${ts}`), opts);
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