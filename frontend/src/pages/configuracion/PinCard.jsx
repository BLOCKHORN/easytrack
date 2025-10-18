// src/pages/config/PinCard.jsx
import { useEffect, useState } from 'react';
import { getPinStatus, setPin, disablePin } from '../../services/pinService';
import '../../styles/PinCard.scss';

export default function PinCard({ tenantId, onToast }) {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  // inputs
  const [oldPin, setOldPin] = useState('');   // SOLO cuando enabled
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const s = await getPinStatus(tenantId);
      setEnabled(!!s.enabled);
      setUpdatedAt(s.updatedAt || null);
      setOldPin(''); setPin1(''); setPin2('');
    } catch (e) {
      onToast?.(e.message || 'No se pudo cargar el PIN', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (tenantId) load(); }, [tenantId]); // eslint-disable-line

  const handleSave = async () => {
    if (enabled && (!oldPin || oldPin.length < 4)) {
      onToast?.('Introduce tu PIN actual para actualizarlo.', 'error'); return;
    }
    if (!pin1 || pin1.length < 4 || pin1.length > 10) {
      onToast?.('El nuevo PIN debe tener entre 4 y 10 dígitos.', 'error'); return;
    }
    if (pin1 !== pin2) { onToast?.('Los nuevos PIN no coinciden.', 'error'); return; }

    setSaving(true);
    try {
      await setPin(tenantId, pin1, enabled ? oldPin : null);
      await load();
      onToast?.(enabled ? 'PIN actualizado.' : 'PIN creado.', 'success');
    } catch (e) {
      onToast?.(e.message || 'No se pudo guardar el PIN', 'error');
    } finally { setSaving(false); }
  };

  const handleDisable = async () => {
    if (!window.confirm('¿Eliminar el PIN de acceso?')) return;
    setSaving(true);
    try {
      await disablePin(tenantId);
      await load();
      onToast?.('PIN desactivado.', 'success');
    } catch (e) {
      onToast?.(e.message || 'No se pudo desactivar el PIN', 'error');
    } finally { setSaving(false); }
  };

  return (
    <section className="pin-card" aria-live="polite">
      <header className="pin-card__header">
        <div className="pc-title">
          <h3>PIN de acceso al Área Personal</h3>
          <span className="subtitle">Protege la entrada a tu panel financiero</span>
          {!loading && updatedAt && enabled && (
            <span className="subtitle small">Última actualización: {new Date(updatedAt).toLocaleString()}</span>
          )}
        </div>
        {!loading && (
          <span className={`status-badge ${enabled ? 'status-badge--ok' : 'status-badge--off'}`}>
            {enabled ? 'Activo' : 'Desactivado'}
          </span>
        )}
      </header>

      <div className="pin-card__body">
        {enabled && (
          <label>
            PIN actual
            <input
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              placeholder="PIN actual"
              value={oldPin}
              onChange={(e)=>setOldPin(e.target.value.replace(/\s+/g,''))}
            />
          </label>
        )}
        <label>
          Nuevo PIN
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            placeholder="4–10 dígitos"
            value={pin1}
            onChange={(e)=>setPin1(e.target.value.replace(/\s+/g,''))}
          />
        </label>
        <label>
          Repetir PIN
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            placeholder="Repite el PIN"
            value={pin2}
            onChange={(e)=>setPin2(e.target.value.replace(/\s+/g,''))}
          />
        </label>
      </div>

      <footer className="pin-card__footer">
        {enabled && (
          <button className="pc-btn pc-btn--ghost" onClick={handleDisable} disabled={saving}>
            Eliminar PIN
          </button>
        )}
        <button className="pc-btn pc-btn--primary" onClick={handleSave} disabled={saving || (!pin1 || !pin2) || (enabled && !oldPin)}>
          {saving ? 'Guardando…' : (enabled ? 'Actualizar PIN' : 'Crear PIN')}
        </button>
      </footer>

      <p className="pin-card__help">El PIN se guarda cifrado (bcrypt) y nunca en texto plano.</p>
    </section>
  );
}
