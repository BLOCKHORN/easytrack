// src/components/PinGate.jsx
import { useEffect, useRef, useState } from 'react';
import { getPinStatus, verifyPin } from '../services/pinService';
import '../styles/PinGate.scss';

export default function PinGate({ tenantId, onGranted, onError }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState('');
  const fired = useRef(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        const s = await getPinStatus(tenantId);
        if (!cancel) setEnabled(!!s.enabled);
      } catch (e) {
        if (!cancel) onError?.(e.message || 'No se pudo verificar el PIN');
      } finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [tenantId, onError]);

  // Si el PIN no está activado, concedemos paso tras montar (no en render)
  useEffect(() => {
    if (!loading && !enabled && !fired.current) {
      fired.current = true;
      onGranted?.();
    }
  }, [loading, enabled, onGranted]);

  const submit = async (e) => {
    e?.preventDefault();
    setErr('');
    if (!pin || pin.length < 4) { setErr('PIN inválido'); return; }
    try {
      setChecking(true);
      const ok = await verifyPin(tenantId, pin);
      if (ok) onGranted?.();
      else setErr('PIN incorrecto');
    } catch (e2) {
      setErr(e2.message || 'Error verificando PIN');
    } finally { setChecking(false); }
  };

  if (loading || !enabled) return null;

  return (
    <div className="pin-gate" role="presentation">
      <div className="pin-gate__dialog" role="dialog" aria-modal="true" aria-labelledby="pin-title">
        <h3 id="pin-title">Introduce tu PIN</h3>
        <p className="muted">Protección de acceso al Área Personal</p>
        <form onSubmit={submit}>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="PIN"
            value={pin}
            onChange={(e)=>setPin(e.target.value.replace(/\s+/g,''))}
            aria-label="PIN"
            autoFocus
          />
          {err && <div className="error" role="status">{err}</div>}
          <button type="submit" className="btn-primary" disabled={checking}>
            {checking ? 'Verificando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
