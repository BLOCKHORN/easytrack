import { useEffect, useState } from 'react';
import { getPinStatus, setPin, disablePin } from '../../services/pinService';

const IconLock = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;

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
    <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
      
      <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white border border-zinc-200 rounded-xl flex items-center justify-center text-zinc-900 shadow-sm shrink-0">
            <IconLock />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-950">PIN de acceso al Área Financiera</h3>
            <p className="text-zinc-500 text-sm">
              Protege la entrada a tu panel de analítica. 
              {!loading && updatedAt && enabled && <span className="ml-2 font-medium text-zinc-400 border-l border-zinc-300 pl-2">Última actualización: {new Date(updatedAt).toLocaleString()}</span>}
            </p>
          </div>
        </div>

        {!loading && (
          <div className="shrink-0">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${enabled ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-zinc-100 text-zinc-400 border-zinc-200'}`}>
              {enabled ? 'Activo' : 'Desactivado'}
            </span>
          </div>
        )}
      </div>

      <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white">
        {enabled && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">PIN Actual</label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              placeholder="••••"
              value={oldPin}
              onChange={(e) => setOldPin(e.target.value.replace(/\s+/g, ''))}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-black tracking-widest text-zinc-900 transition-all placeholder:tracking-normal placeholder:font-medium"
            />
          </div>
        )}
        
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Nuevo PIN</label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            placeholder="4–10 dígitos"
            value={pin1}
            onChange={(e) => setPin1(e.target.value.replace(/\s+/g, ''))}
            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-black tracking-widest text-zinc-900 transition-all placeholder:tracking-normal placeholder:font-medium"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Repetir PIN</label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            placeholder="Repite el PIN"
            value={pin2}
            onChange={(e) => setPin2(e.target.value.replace(/\s+/g, ''))}
            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-black tracking-widest text-zinc-900 transition-all placeholder:tracking-normal placeholder:font-medium"
          />
        </div>
      </div>

      <div className="px-6 md:px-8 pb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">El PIN se guarda cifrado (bcrypt) y nunca en texto plano.</p>
        
        <div className="flex items-center gap-3">
          {enabled && (
            <button 
              onClick={handleDisable} 
              disabled={saving}
              className="px-5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl disabled:opacity-50 transition-colors"
            >
              Eliminar PIN
            </button>
          )}
          <button 
            onClick={handleSave} 
            disabled={saving || (!pin1 || !pin2) || (enabled && !oldPin)}
            className="px-6 py-2.5 bg-zinc-950 text-white font-bold text-sm rounded-xl hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 transition-all active:scale-95 shadow-sm"
          >
            {saving ? 'Guardando…' : (enabled ? 'Actualizar PIN' : 'Crear PIN')}
          </button>
        </div>
      </div>

    </div>
  );
}