import { useEffect, useState } from 'react';
import { supabase } from './utils/supabaseClient';
import AuthView from './components/auth/AuthView.jsx';
import SuperAdmin from './pages/SuperAdmin.jsx';

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      if (data.session) localStorage.setItem('sb-session', JSON.stringify(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      if (s) localStorage.setItem('sb-session', JSON.stringify(s));
      else localStorage.removeItem('sb-session');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!session) return <AuthView />;

  return <SuperAdmin />;
}
