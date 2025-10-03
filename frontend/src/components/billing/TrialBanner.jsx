import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { FiShield, FiAlertTriangle, FiGift } from 'react-icons/fi';
import './TrialBanner.scss';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/,'');

export default function TrialBanner() {
  const [loading, setLoading] = useState(true);
  const [limits, setLimits]   = useState(null);
  const [err, setErr]         = useState('');

  const authFetch = useCallback(async (path, opts = {}) => {
    const { data: sdata } = await supabase.auth.getSession();
    const token = sdata?.session?.access_token;
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${res.status}`);
    return j;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr('');
        const lim = await authFetch('/api/limits/me');
        setLimits(lim);
      } catch (e) {
        setErr(e.message || 'No se pudo cargar el estado de prueba.');
      } finally {
        setLoading(false);
      }
    })();
  }, [authFetch]);

  if (loading || !limits) return null;
  if (limits.subscription?.active) return null; // oculto si ya está de pago

  // Si el backend expone días restantes, lo mostramos; si no, se oculta
  const daysLeft =
    Number.isFinite(limits?.trial?.days_remaining)
      ? Math.max(0, Number(limits.trial.days_remaining))
      : null;

  return (
    <section className="trial trial--noquota">
      <div className="trial__header">
        <div className="trial__title">
          <span className="chip chip--info">Versión de prueba</span>
          <h3>Estás usando la versión de prueba (sin límite de paquetes)</h3>
          <p>
            La prueba dura aproximadamente un mes. Nos pondremos en contacto contigo
            <strong> 5 días antes de finalizar</strong> para ofrecerte un plan adaptado a tu uso.
          </p>
          {Number.isFinite(daysLeft) && (
            <p className="trial__days">
              Te quedan <b>{daysLeft}</b> día{daysLeft === 1 ? '' : 's'} de prueba.
            </p>
          )}
        </div>

        <div className="trial__cta">
          <a className="btn btn--primary" href="/soporte#contacto">
            Hablar con nosotros
          </a>

          {/* Si en algún momento quieres volver a permitir activación directa:
          <button className="btn btn--ghost" onClick={() => {/* abrir modal de activación *!/}}>
            Activar ahora
          </button>
          */}
        </div>
      </div>

      {/* Sin progress bar ni límite de paquetes */}
      <div className="trial__features">
        <div className="f"><FiShield/> Tus datos están protegidos durante toda la prueba.</div>
        <div className="f"><FiGift/> Evaluamos tu uso y te proponemos un plan a medida al final.</div>
        <div className="f"><FiAlertTriangle/> Sin permanencia: podrás cancelar en cualquier momento.</div>
      </div>

      {err && <div className="trial__error">{err}</div>}
    </section>
  );
}
