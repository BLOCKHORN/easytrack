import { useEffect, useState } from 'react';
import { supabase } from "../../../utils/supabaseClient";

export default function useNavbarAuth(navigate) {
  const [checking, setChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [displayName, setDisplayName] = useState('');

  const nameFromEmail = (email) => {
    if (!email) return 'Usuario';
    const base = email.split('@')[0] || 'Usuario';
    return base.charAt(0).toUpperCase() + base.slice(1);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
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
      
      setChecking(false);

      const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          setIsLoggedIn(false);
          setUserEmail('');
          setAvatarUrl(null);
          setDisplayName('Usuario');
          navigate('/', { replace: true });
          return;
        }

        const u = session?.user || null;
        const e = u?.email || '';
        setIsLoggedIn(!!u);
        setUserEmail(e);
        setAvatarUrl(u?.user_metadata?.avatar_url || null);
        setDisplayName(u?.user_metadata?.full_name || u?.user_metadata?.name || nameFromEmail(e));
      });
      
      unsub = subscription?.subscription?.unsubscribe;
    };
    
    init();
    return () => { if (unsub) unsub(); };
  }, [navigate]);

  return { checking, isLoggedIn, userEmail, avatarUrl, displayName, handleLogout };
}