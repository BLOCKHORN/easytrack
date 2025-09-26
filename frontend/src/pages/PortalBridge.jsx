// src/pages/PortalBridge.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { openBillingPortal } from '../services/billingService';

export default function PortalBridge() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setErr('');
        const { data: sdata } = await supabase.auth.getSession();
        if (!sdata?.session) throw new Error('NO_SESSION');

        const url = await openBillingPortal();
        if (!url) throw new Error('No se pudo obtener el portal de facturación.');
        // Redirige al portal
        window.location.assign(url);
      } catch (e) {
        setErr(e.message || 'Error abriendo el portal.');
        setLoading(false);
      }
    })();
  }, []);

  async function retry() {
    try {
      setErr(''); setLoading(true);
      const url = await openBillingPortal();
      if (!url) throw new Error('No se pudo obtener el portal de facturación.');
      window.location.assign(url);
    } catch (e) {
      setErr(e.message || 'Error abriendo el portal.');
      setLoading(false);
    }
  }

  return (
    <section style={{ maxWidth: 520, margin: '56px auto', padding: 24 }}>
      <h1>Portal de facturación</h1>
      {loading && <p>Redirigiendo al portal…</p>}
      {!loading && err && (
        <>
          <p style={{ color: '#b91c1c' }}>{err}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={retry}>Reintentar</button>
            <a className="btn ghost" href="/dashboard">Volver al panel</a>
          </div>
        </>
      )}
    </section>
  );
}
