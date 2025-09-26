import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { getPlans } from '../../services/billingService';
import UpgradeModal from './UpgradeModal';
import { FiShield, FiZap, FiGift, FiAlertTriangle } from 'react-icons/fi';
import './TrialBanner.scss';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/,'');

export default function TrialBanner() {
  const [loading, setLoading] = useState(true);
  const [limits, setLimits]   = useState(null);
  const [plans, setPlans]     = useState([]);
  const [err, setErr]         = useState('');
  const [open, setOpen]       = useState(false);

  const authFetch = useCallback(async (path, opts={}) => {
    const { data: sdata } = await supabase.auth.getSession();
    const token = sdata?.session?.access_token;
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      credentials: 'include'
    });
    const j = await res.json().catch(()=> ({}));
    if (!res.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${res.status}`);
    return j;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr('');
        const [lim, planList] = await Promise.all([
          authFetch('/api/limits/me'),
          getPlans()
        ]);
        setLimits(lim);
        setPlans(Array.isArray(planList) ? planList : planList?.plans || []);
      } catch (e) {
        setErr(e.message || 'No se pudo cargar el estado de prueba.');
      } finally {
        setLoading(false);
      }
    })();
  }, [authFetch]);

  const monthlyCode = useMemo(
    () => (plans.find(p => Number(p.period_months) === 1) || plans[0])?.code || null,
    [plans]
  );

  if (loading || !limits) return null;
  if (limits.subscription?.active) return null; // oculto si ya está de pago

  const quota = Number(limits.limits?.trial_quota || 20);
  const used  = Number(limits.limits?.trial_used || 0);
  const remaining = Math.max(0, quota - used);
  const pct = Math.min(100, (used / Math.max(1, quota)) * 100);
  const exhausted = remaining === 0;

  return (
    <>
      <section className={`trial ${exhausted ? 'is-exhausted' : ''}`}>
        <div className="trial__header">
          <div className="trial__title">
            <span className="chip chip--warn">{exhausted ? 'Prueba agotada' : 'Versión de prueba'}</span>
            <h3>{exhausted ? 'Has agotado tu prueba gratuita' : 'Estás usando la versión de prueba'}</h3>
            <p>{exhausted
              ? 'Reactiva tu cuenta para seguir registrando paquetes. Tus datos están a salvo.'
              : `Puedes crear hasta ${quota} paquetes. Te quedan ${remaining}.`
            }</p>
          </div>
          <div className="trial__cta">
            <button className="btn btn--primary" onClick={() => setOpen(true)}>
              <FiZap/> {exhausted ? 'Reactivar ahora' : 'Desbloquear todo (1er mes gratis)'}
            </button>
            <a className="btn btn--ghost" href="/precios">Ver planes</a>
          </div>
        </div>

        <div className="trial__progress" aria-label="Consumo de prueba">
          <div className="trial__bar">
            <div className="trial__bar-fill" style={{ width: `${pct}%` }}/>
          </div>
          <div className="trial__legend">
            <span>Usados: <b>{used}</b></span>
            <span>Restantes: <b>{remaining}</b></span>
          </div>
        </div>

        <div className="trial__features">
          <div className="f"><FiShield/> Datos protegidos; nada se borra al reactivar.</div>
          <div className="f"><FiGift/> Primer mes gratis en el plan mensual.</div>
          <div className="f"><FiAlertTriangle/> Sin permanencia: cancela cuando quieras.</div>
        </div>

        {err && <div className="trial__error">{err}</div>}
      </section>

      <UpgradeModal open={open} onClose={() => setOpen(false)} defaultPlanCode={monthlyCode} />
    </>
  );
}
