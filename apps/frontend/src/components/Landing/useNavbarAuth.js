import { useEffect, useState, useCallback } from 'react';
import { supabase } from "../../utils/supabaseClient";

export default function useNavbarAuth(navigate) {
  const [checking, setChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const nameFromEmail = (email) => {
    if (!email) return 'Usuario';
    const base = email.split('@')[0] || 'Usuario';
    return base.charAt(0).toUpperCase() + base.slice(1);
  };

  // Función para procesar los datos del usuario sin bloquear la UI
  const updateUserState = useCallback(async (user) => {
    if (!user) {
      setIsLoggedIn(false);
      setUserEmail('');
      setAvatarUrl(null);
      setDisplayName('Usuario');
      setIsAdmin(false);
      return;
    }

    const email = user.email || '';
    setIsLoggedIn(true);
    setUserEmail(email);
    setAvatarUrl(user.user_metadata?.avatar_url || null);
    setDisplayName(user.user_metadata?.full_name || user.user_metadata?.name || nameFromEmail(email));

    // Verificamos admin en SEGUNDO PLANO sin esperar el await para soltar la UI
    supabase.rpc('is_superadmin').then(({ data }) => {
      setIsAdmin(!!data);
    }).catch(() => setIsAdmin(false));
  }, []);

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (e) {}
    localStorage.clear();
    sessionStorage.clear();
    setIsLoggedIn(false);
    setIsAdmin(false);
    navigate('/', { replace: true });
    window.location.reload();
  };

  useEffect(() => {
    const init = async () => {
      // getSession es rápido porque lee de la memoria local/cookies primero
      const { data: { session } } = await supabase.auth.getSession();
      await updateUserState(session?.user || null);
      
      // SOLTAMOS LA UI INMEDIATAMENTE
      setChecking(false);

      // Suscripción para cambios futuros
      const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          await updateUserState(null);
          navigate('/', { replace: true });
        } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          await updateUserState(session?.user || null);
        }
      });

      return subscription?.subscription?.unsubscribe;
    };
    
    const unsubPromise = init();
    return () => { unsubPromise.then(unsub => unsub && unsub()); };
  }, [navigate, updateUserState]);

  return { checking, isLoggedIn, userEmail, avatarUrl, displayName, isAdmin, handleLogout };
}