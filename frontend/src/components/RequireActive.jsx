// frontend/src/components/RequireActive.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import '../styles/require-active.scss';

export default function RequireActive({ children }) {
  const { loading, active, reason } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();

  // Evita flicker: no muestres nada si tarda <180ms
  const [showProgress, setShowProgress] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowProgress(true), 180);
    return () => clearTimeout(t);
  }, []);

  // Redirección si está inactiva
  useEffect(() => {
    if (!loading && !active) {
      const q = new URLSearchParams({ reason: reason || 'inactive' });
      navigate(`/reactivar?${q.toString()}`, {
        replace: true,
        state: { returnTo: location.pathname + location.search },
      });
    }
  }, [loading, active, reason, navigate, location]);

  // Loading: sin texto, solo topbar (y label oculta para a11y)
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
