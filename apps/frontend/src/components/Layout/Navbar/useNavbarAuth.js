import { useEffect, useMemo, useState } from 'react';
import { supabase } from "../../../utils/supabaseClient";

export default function useNavbarAuth(navigate) {
  const [checking, setChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [nombreEmpresa, setNombreEmpresa] = useState('Negocio');
  const [slug, setSlug] = useState(null);

  const API_BASE = useMemo(() => {
    const env = import.meta.env?.VITE_API_URL;
    return (env && env.replace(/\/$/, '')) || '';
  }, []);

  const nameFromEmail = (email) => {
    if (!email) return 'Usuario';
    const base = email.split('@')[0] || 'Usuario';
    return base.charAt(0).toUpperCase() + base.slice(1);
  };

  const loadTenant = async (session) => {
    try {
      const r = await fetch(`${API_BASE}/api/tenants/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!r.ok) {
        setSlug(null);
        return;
      }
      const data = await r.json();
      if (data?.tenant) {
        setSlug(data.tenant.slug);
        setNombreEmpresa(data.tenant.nombre_empresa || 'Negocio');
      }
    } catch (e) {
      setSlug(null);
    }
  };

  useEffect(() => {
    let unsub = null;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || null;
      const email = user?.email || '';
      
      setIsLoggedIn(!!user);
      setUserEmail(email);
      setAvatarUrl(user?.user_metadata?.avatar_url || null);
      setDisplayName(user?.user_metadata?.full_name || user?.user_metadata?.name || nameFromEmail(email));
      
      if (session) await loadTenant(session);
      setChecking(false);

      const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setIsLoggedIn(false);
          setUserEmail('');
          setAvatarUrl(null);
          setDisplayName('Usuario');
          setSlug(null);
          navigate('/', { replace: true });
          return;
        }

        const u = session?.user || null;
        const e = u?.email || '';
        setIsLoggedIn(!!u);
        setUserEmail(e);
        setAvatarUrl(u?.user_metadata?.avatar_url || null);
        setDisplayName(u?.user_metadata?.full_name || u?.user_metadata?.name || nameFromEmail(e));
        if (session) await loadTenant(session);
      });
      
      unsub = subscription?.subscription?.unsubscribe;
    };
    
    init();
    return () => { if (unsub) unsub(); };
  }, [API_BASE, navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } finally {
      setSlug(null);
      navigate('/');
    }
  };

  return { checking, isLoggedIn, userEmail, avatarUrl, displayName, nombreEmpresa, slug, handleLogout };
}