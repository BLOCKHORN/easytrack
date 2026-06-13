import { useEffect, useState } from 'react';
import { getPinStatus, setPin, disablePin } from '../../services/pinService';

const IconLock = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;

export default function PinCard({ tenantId, onToast }) {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  const [oldPin, setOldPin] = useState('');
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
    <section className="bg-white md:rounded-[2rem] border-y md:border border-zinc-200 shadow-sm overflow-hidden">
      <header className="p-6 md:p-8 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-zinc-950 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0">
            <IconLock />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-black text-zinc-950 tracking-tight">PIN Área Financiera</h3>
            <p className="text-zinc-500 font-medium text-xs md:text-sm mt-1 max-w-md">Protege la entrada a tu analítica de ingresos y comisiones.</p>
          </div>
        </div>

        {!loading && (
          <div className="shrink-0 flex items-center">
            <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${enabled ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-zinc-100 text-zinc-400 border-zinc-200'}`}>
              {enabled ? 'Activo' : 'Desactivado'}
            </span>
          </div>
        )}
      </header>

      <div className="p-6 md:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl">
          {enabled && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">PIN Actual</label>
              <input
                type="password" inputMode="numeric" autoComplete="current-password" placeholder="••••" value={oldPin}
                onChange={(e) => setOldPin(e.target.value.replace(/\s+/g, ''))}
                className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none font-mono font-black tracking-widest text-zinc-900 transition-all placeholder:tracking-normal placeholder:font-medium placeholder:text-zinc-300"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nuevo PIN</label>
            <input
              type="password" inputMode="numeric" autoComplete="new-password" placeholder="4–10 dígitos" value={pin1}
              onChange={(e) => setPin1(e.target.value.replace(/\s+/g, ''))}
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none font-mono font-black tracking-widest text-zinc-900 transition-all placeholder:tracking-normal placeholder:font-medium placeholder:text-zinc-300"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Repetir PIN</label>
            <input
              type="password" inputMode="numeric" autoComplete="new-password" placeholder="Repite el PIN" value={pin2}
              onChange={(e) => setPin2(e.target.value.replace(/\s+/g, ''))}
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none font-mono font-black tracking-widest text-zinc-900 transition-all placeholder:tracking-normal placeholder:font-medium placeholder:text-zinc-300"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-zinc-100">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Cifrado con algoritmo BCRYPT.</p>
          
          <div className="flex items-center gap-3">
            {enabled && (
              <button 
                onClick={handleDisable} 
                disabled={saving}
                className="px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
              >
                Eliminar
              </button>
            )}
            <button 
              onClick={handleSave} 
              disabled={saving || (!pin1 || !pin2) || (enabled && !oldPin)}
              className="px-5 py-2.5 bg-zinc-950 text-white font-black text-[11px] uppercase tracking-widest rounded-lg hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400 transition-all active:scale-95 shadow-sm"
            >
              {saving ? 'Guardando…' : (enabled ? 'Actualizar PIN' : 'Crear PIN')}
            </button>
          </div>
        </div>
      </div>

    </section>
  );
}