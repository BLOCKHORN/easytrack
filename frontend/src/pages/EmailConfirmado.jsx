// src/pages/EmailConfirmado.jsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import '../styles/EmailConfirmado.scss';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/,'');
const LOGIN_URL = '/login';

export default function EmailConfirmado() {
  const [msg, setMsg] = useState('Conectando con tu cuenta…');

  const lastKnownSlug = useMemo(() => {
    try { return localStorage.getItem('et:last_slug') || ''; } catch { return ''; }
  }, []);

  const goCreatePassword = (slugMaybe) => {
    const slug = slugMaybe || lastKnownSlug || '';
    const nextDash = (slug ? `/${slug}/dashboard` : '/dashboard').replace(/\/{2,}/g,'/');
    const qp = new URLSearchParams({ next: nextDash });
    window.location.replace(`/crear-password?${qp.toString()}`);
  };

  const goLogin = () => {
    const next = encodeURIComponent('/auth/email-confirmado');
    window.location.replace(`${LOGIN_URL}?next=${next}`);
  };

  useEffect(() => {
    (async () => {
      try {
        // 1) tokens de Supabase
        const hash = window.location.hash?.startsWith('#')
          ? new URLSearchParams(window.location.hash.slice(1))
          : new URLSearchParams();
        const qp = new URLSearchParams(window.location.search);

        const access_token  = hash.get('access_token');
        const refresh_token = hash.get('refresh_token');
        const error_code    = hash.get('error_code') || qp.get('error_code') || qp.get('error');
        const error_desc    = hash.get('error_description') || qp.get('error_description');

        if (error_code) setMsg(decodeURIComponent(error_desc || error_code));

        const { data: sdata } = await supabase.auth.getSession();
        const hasSession = !!sdata?.session;

        if (!access_token && !refresh_token && !hasSession) {
          return goLogin();
        }

        if (access_token && refresh_token) {
          setMsg('Verificando tu email…');
          await supabase.auth.setSession({ access_token, refresh_token });
          history.replaceState({}, document.title, window.location.pathname + window.location.search);
        }

        // 2) guardar email y bootstrap
        const { data: udata } = await supabase.auth.getUser();
        const u = udata?.user || null;
        if (u?.email) {
          try {
            localStorage.setItem('et:email_confirmed', '1');
            localStorage.setItem('signup_email', u.email);
          } catch {}
        }

        // 3) asegurar tenant + membership
        const { data: fresh } = await supabase.auth.getSession();
        const token = fresh?.session?.access_token;
        if (!token) return goLogin();

        setMsg('Preparando tu espacio…');
        const resp = await fetch(`${API}/api/auth/bootstrap`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({}),
        });
        const j = await resp.json().catch(() => ({}));
        if (!resp.ok || j?.ok === false) {
          throw new Error(j?.error || `HTTP ${resp.status}`);
        }

        const slug = j?.tenant?.slug || '';
        if (slug) {
          try { localStorage.setItem('et:last_slug', slug); } catch {}
          try {
            if ('BroadcastChannel' in window) {
              const bc = new BroadcastChannel('et-auth');
              bc.postMessage({ type: 'EMAIL_CONFIRMED', email: u?.email || '' });
              bc.close();
            }
          } catch {}
        }

        // 4) en vez de dashboard → crea tu contraseña
        setMsg('Todo listo. Abriendo la creación de contraseña…');
        goCreatePassword(slug);
      } catch (e) {
        setMsg('No hemos podido completar el acceso de forma segura. Redirigiendo al login…');
        setTimeout(goLogin, 800);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="eok eok--gate">
      <div className="eok-loader">
        <div className="eok-loader__spinner" aria-hidden="true" />
        <p className="eok-loader__msg" role="status">{msg}</p>
      </div>
    </section>
  );
}
