import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { FiCheck, FiExternalLink, FiLock } from 'react-icons/fi';
import '../styles/EmailConfirmado.scss';

const CHECKOUT_URL   = '/billing/success';
const CREATE_PWD_URL = '/crear-password';

export default function EmailConfirmado() {
  const [email, setEmail] = useState('');
  const [info, setInfo]   = useState('');

  const hasCheckoutSession = useMemo(() => {
    try { return !!localStorage.getItem('last_session_id'); } catch { return false; }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const hash = window.location.hash.startsWith('#')
          ? new URLSearchParams(window.location.hash.slice(1))
          : new URLSearchParams();
        const qp = new URLSearchParams(window.location.search);

        const access_token  = hash.get('access_token');
        const refresh_token = hash.get('refresh_token');
        const error_code    = hash.get('error_code') || qp.get('error_code') || qp.get('error');
        const error_desc    = hash.get('error_description') || qp.get('error_description');

        if (error_code) setInfo(decodeURIComponent(error_desc || error_code));

        if (access_token && refresh_token) {
          try {
            await supabase.auth.setSession({ access_token, refresh_token });
            history.replaceState({}, document.title, window.location.pathname + window.location.search);
          } catch (e) {
            setInfo(e.message || 'No se pudo establecer la sesión.');
          }
        }

        const { data } = await supabase.auth.getUser();
        const u = data?.user || null;
        if (u?.email) {
          setEmail(u.email);
          try {
            localStorage.setItem('et:email_confirmed', '1');
            localStorage.setItem('signup_email', u.email);
          } catch {}

          try {
            if ('BroadcastChannel' in window) {
              const bc = new BroadcastChannel('et-auth');
              bc.postMessage({ type: 'EMAIL_CONFIRMED', email: u.email });
              bc.close();
            }
          } catch {}
        }
      } catch (e) {
        setInfo(e.message || 'Error inesperado al confirmar el email.');
      }
    })();
  }, []);

  return (
    <section className="eok">
      <div className="eok-card">
        <div className="eok-icon"><FiCheck aria-hidden="true" /></div>
        <h1 className="eok-title">¡Email confirmado!</h1>
        <p className="eok-muted">
          {email ? <>Tu usuario <strong>{email}</strong> ya está verificado.</> : 'Tu usuario ya está verificado.'}
        </p>

        <div className="eok-actions">
          <a className="eok-btn eok-btn--primary" href={CHECKOUT_URL}>
            Volver al checkout <FiExternalLink />
          </a>
          <a className="eok-btn eok-btn--ghost" href={CREATE_PWD_URL}>
            <FiLock /> Crear mi contraseña aquí
          </a>
        </div>

        {hasCheckoutSession ? (
          <p className="eok-hint">Si tenías abierto el checkout, esa ventana se actualizará automáticamente.</p>
        ) : (
          <p className="eok-hint">Si cerraste el checkout, puedes crear tu contraseña aquí y seguir.</p>
        )}

        {info && <div className="eok-alert">{info}</div>}
      </div>
    </section>
  );
}
