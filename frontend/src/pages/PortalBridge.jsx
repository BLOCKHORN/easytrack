// frontend/src/pages/PortalBridge.jsx
import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/fetcher';
import { supabase } from '../utils/supabaseClient';

export default function PortalBridge() {
  const [err, setErr] = useState('');

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        // fuerza sesión fresca por si el tab cambió
        await supabase.auth.getSession();

        const res = await apiFetch('/api/billing/portal', { method: 'GET' });

        if (res.status === 401) {
          if (!abort) window.location.replace('/');
          return;
        }
        if (!res.ok) throw new Error('No se pudo generar el portal');

        const data = await res.json().catch(() => ({}));
        const url = data.url || data.portal_url;
        if (!url) throw new Error('Respuesta del portal inválida');

        if (!abort) window.location.replace(url);
      } catch (e) {
        if (!abort) setErr(e.message || 'Error al abrir el portal');
      }
    })();
    return () => { abort = true; };
  }, []);

  return (
    <section style={{ maxWidth: 560, margin: '56px auto', padding: 24 }}>
      <h1>Abriendo portal de facturación…</h1>
      <p>Te estamos llevando al portal seguro para ver/actualizar tu método de pago.</p>
      {err && (
        <p style={{ color: 'crimson' }}>
          {err} — <button onClick={() => window.location.reload()}>Reintentar</button>
        </p>
      )}
      <p><a className="btn" href="/">Volver al inicio</a></p>
    </section>
  );
}
