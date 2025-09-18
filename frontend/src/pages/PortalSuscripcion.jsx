import { useEffect, useState } from 'react';

export default function PortalSuscripcion(){
  const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/,'');
  const [sub, setSub] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Debes enviar el token de sesión en Authorization si tu backend lo exige.
    fetch(`${API}/billing/portal`, { headers:{} }) // añade Authorization si procede
      .then(r=>r.json()).then(j => j.ok ? setSub(j.subscription) : setError(j.error || 'Error'))
      .catch(e => setError(e.message));
  }, [API]);

  async function cancelar(){
    const res = await fetch(`${API}/billing/cancel`, { method:'POST', headers:{} });
    const j = await res.json();
    if (!j.ok) { alert(j.error||'Error'); return; }
    window.location.reload();
  }

  if (error) return <div>ERROR: {error}</div>;
  if (!sub) return <div>Cargando…</div>;

  return (
    <div style={{padding:'24px'}}>
      <h2>Suscripción</h2>
      <p>Plan: {sub?.billing_plans?.name} ({sub?.billing_plans?.period_months} meses)</p>
      <p>Estado: {sub?.status}</p>
      {sub?.trial_ends_at && <p>Trial hasta: {new Date(sub.trial_ends_at).toLocaleDateString()}</p>}
      <p>Renovación: {sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : '-'}</p>
      {!sub.cancel_at_period_end
        ? <button onClick={cancelar}>Cancelar al final del periodo</button>
        : <em>Cancelación programada al final del periodo.</em>}
    </div>
  );
}
