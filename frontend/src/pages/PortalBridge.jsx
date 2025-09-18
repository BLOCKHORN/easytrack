import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function PortalBridge() {
  const [err, setErr] = useState('');

  useEffect(() => {
    let abort = false;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = {
          Accept: 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        };

        // GET o POST según tu backend; aquí asumo GET
        const res = await fetch('/billing/portal', { method: 'GET', headers, credentials: 'include' });

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
