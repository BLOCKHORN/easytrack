import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import '../styles/require-active.scss';

/**
 * Guard que SOLO redirige a /reactivar cuando es un bloqueo “duro”.
 * Si el motivo es trial_exhausted, permitimos ver el panel (no crear).
 */
export default function RequireActive({ children }) {
  const { loading, active, reason } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();

  const [showProgress, setShowProgress] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowProgress(true), 180);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (loading) return;

    // Permitimos trial_exhausted: se puede entrar a ver el panel.
    const allowedWhileInactive = new Set(['trial_exhausted']);

    if (!active && !allowedWhileInactive.has(reason || '')) {
      const q = new URLSearchParams({ reason: reason || 'inactive' });
      navigate(`/reactivar?${q.toString()}`, {
        replace: true,
        state: { returnTo: location.pathname + location.search },
      });
    }
  }, [loading, active, reason, navigate, location]);

  if (loading) {
    if (!showProgress) return null;
    return (
      <div className="require-active-guard" aria-hidden="true">
        <div className="topbar-progress" />
        <span className="sr-only" aria-live="polite">Verificando acceso</span>
      </div>
    );
  }

  return children;
}
