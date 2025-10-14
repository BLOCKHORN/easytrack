// src/App.jsx
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';

import AuthView from './components/auth/AuthView.jsx';

// Superadmin
import SuperAdminLayout from './components/superadmin/SuperAdminLayout.jsx';
import SuperAdminHome from './components/superadmin/SuperAdminHome.jsx';
import TenantsPage from './components/superadmin/TenantsPage.jsx';
import RequestsPage from './components/superadmin/RequestsPage.jsx';

export default function App() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let unsub;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      if (data.session) localStorage.setItem('sb-session', JSON.stringify(data.session));
      setChecking(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      if (s) localStorage.setItem('sb-session', JSON.stringify(s));
      else localStorage.removeItem('sb-session');
    });

    unsub = sub?.subscription?.unsubscribe;
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  if (checking) return null;
  if (!session) return <AuthView />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/superadmin" element={<SuperAdminLayout />}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<SuperAdminHome />} />
          <Route path="tenants" element={<TenantsPage />} />
          <Route path="requests" element={<RequestsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/superadmin/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
