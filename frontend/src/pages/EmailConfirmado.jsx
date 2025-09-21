import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { FiCheck, FiExternalLink, FiLock } from 'react-icons/fi';
import '../styles/EmailConfirmado.scss';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/,'');
// Dónde está tu checkout de éxito:
const CHECKOUT_URL = '/billing/success';
// Dónde creas password inline/standalone:
const CREATE_PWD_URL = '/crear-password';

export default function EmailConfirmado() {
  const [ok, setOk] = useState(false);
  const [email, setEmail] = useState('');
  const [info, setInfo] = useState('');

  // ¿Tenemos un session_id previo guardado por el checkout?
  const hasCheckoutSession = useMemo(() => {
    try { return !!localStorage.getItem('last_session_id'); } catch { return false; }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // 1) Tokens en el hash del enlace de Supabase
        const hash = window.location.hash.startsWith('#')
          ? new URLSearchParams(window.location.hash.slice(1))
          : new URLSearchParams();

        const qp = new URLSearchParams(window.location.search);

        const access_token  = hash.get('access_token');
        const refresh_token = hash.get('refresh_token');
        const error_code    = hash.get('error_code') || qp.get('error_code') || qp.get('error');
        const error_desc    = hash.get('error_description') || qp.get('error_description');

        if (error_code) {
          setInfo(decodeURIComponent(error_desc || error_code));
        }

        if (access_token && refresh_token) {
          try {
            await supabase.auth.setSession({ access_token, refresh_token });
            // limpia el hash para no dejar los tokens en la barra
            history.replaceState({}, document.title, window.location.pathname + window.location.search);
          } catch (e) {
            setInfo(e.message || 'No se pudo establecer la sesión.');
          }
        }

        // 2) Confirma usuario y guarda email compartido
        const { data } = await supabase.auth.getUser();
        const u = data?.user || null;
        if (u?.email) {
          setEmail(u.email);
          try {
            localStorage.setItem('et:email_confirmed', '1');
            localStorage.setItem('signup_email', u.email); // por si cerró el checkout y viene directo aquí
          } catch {}

          // Broadcast opcional para la pestaña del checkout (si está abierta)
          try {
            if ('BroadcastChannel' in window) {
              const bc = new BroadcastChannel('et-auth');
              bc.postMessage({ type: 'EMAIL_CONFIRMED', email: u.email });
              bc.close();
            }
          } catch {}
        }

        setOk(true);
      } catch (e) {
        setInfo(e.message || 'Error inesperado al confirmar el email.');
      }
    })();
  }, []);

  return (
    <section className="email-ok">
      <div className="card">
        <div className="icon-ok"><FiCheck aria-hidden="true" /></div>
        <h1>¡Email confirmado!</h1>
        <p className="muted">
          {email ? <>Tu usuario <strong>{email}</strong> ya está verificado.</> : 'Tu usuario ya está verificado.'}
        </p>

        <div className="actions">
          {/* CTA 1: volver al checkout (siempre disponible; si no hay last_session_id, igualmente muestra el resumen y permite reenviar) */}
          <a className="btn primary" href={CHECKOUT_URL}>
            Volver al checkout <FiExternalLink />
          </a>

          {/* CTA 2: crear contraseña aquí mismo (para el caso de que cerró todo) */}
          <a className="btn ghost" href={CREATE_PWD_URL}>
            <FiLock /> Crear mi contraseña aquí
          </a>
        </div>

        {hasCheckoutSession ? (
          <p className="hint">Si tenías abierto el checkout, esa ventana se actualizará automáticamente.</p>
        ) : (
          <p className="hint">Si cerraste el checkout, puedes crear tu contraseña aquí y seguir.</p>
        )}

        {ok && !hasCheckoutSession && (
          <details className="tips">
            <summary>¿Y si no recuerdo mi email?</summary>
            <p>
              Si necesitas un nuevo enlace, en <code>{CREATE_PWD_URL}</code> puedes pedir “Reenviar” con tu email.
            </p>
          </details>
        )}

        {info && <div className="alert">{info}</div>}
      </div>
    </section>
  );
}
