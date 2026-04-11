import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { apiPath } from '../utils/apiBase';

export default function useSubscription() {
  const [state, setState] = useState({
    loading: true,
    active: false,
    reason: null,
    entitlements: null
  });

  useEffect(() => {
    let cancelled = false;

    async function checkSubscription() {
      try {
        const { data: sdata } = await supabase.auth.getSession();
        const token = sdata?.session?.access_token;
        if (!token) throw new Error('UNAUTHENTICATED');

        const opts = {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        };

        const ts = Date.now();
        let res = await fetch(apiPath(`/api/limits/me?ts=${ts}`), opts);
        
        if (!res.ok) {
          res = await fetch(apiPath(`/api/tenants/me?ts=${ts}`), opts);
        }

        if (res.ok) {
          const data = await res.json();
          const ent = data?.entitlements || data;

          if (!cancelled && ent) {
            setState({
              loading: false,
              active: !!ent.canUseApp,
              reason: ent.reason || null,
              entitlements: ent
            });
            return;
          }
        }
        
        throw new Error('FAILED_TO_FETCH_ENTITLEMENTS');
      } catch (e) {
        if (!cancelled) {
          setState({
            loading: false,
            active: false,
            reason: 'error',
            entitlements: null
          });
        }
      }
    }

    checkSubscription();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}