import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { FiZap, FiExternalLink, FiAlertCircle } from 'react-icons/fi';
import UpgradeModal from './UpgradeModal';
import './BillingCard.scss';

export default function BillingCard({ className = "", onStarted }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('NO_SESSION');
      } catch (e) {
        setErr(e?.message || 'Error de sesión');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function start() {
    setOpen(true);
    setBusy(false);
    setErr('');
    onStarted?.();
  }

  return (
    <div className={`bc ${className}`}>
      <div className="bc__left">
        <div className="bc__badge">Versión de prueba</div>
        <h4>Desbloquea EasyTrack completo</h4>
        <p>Primer mes gratis. Sin permanencia. Gestiona tu suscripción cuando quieras.</p>
        <div className="bc__actions">
          <button className="btn btn--primary" onClick={start} disabled={loading || busy}>
            <FiZap/> Desbloquear todo
          </button>
          <a className="btn btn--ghost" href="/precios"><FiExternalLink/> Ver planes</a>
        </div>
        {err && <div className="bc__error"><FiAlertCircle/> {err}</div>}
      </div>
      <div className="bc__right" aria-hidden="true"/>
      <UpgradeModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
