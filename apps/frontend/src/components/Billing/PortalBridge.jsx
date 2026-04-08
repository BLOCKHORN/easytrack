import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { openBillingPortal } from '../../services/billingService';

export default function PortalBridge() {
  const [err, setErr] = useState('');
  const navigate = useNavigate();

  const launchPortal = async () => {
    try {
      setErr('');
      const { data: sdata } = await supabase.auth.getSession();
      if (!sdata?.session) throw new Error('Debes iniciar sesión para acceder al portal.');

      const url = await openBillingPortal();
      if (!url) throw new Error('No se pudo establecer conexión con Stripe.');
      window.location.assign(url);
    } catch (e) {
      setErr(e.message || 'Error abriendo el portal seguro.');
    }
  };

  useEffect(() => { launchPortal(); }, []);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm text-center">
        {!err ? (
          <div className="animate-pulse">
            <div className="w-16 h-16 bg-white border border-zinc-200 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </div>
            <h1 className="text-xl font-black text-zinc-950 mb-2">Conectando con Stripe...</h1>
            <p className="text-zinc-500 font-medium text-sm">Abriendo tu portal de facturación seguro.</p>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 shadow-xl rounded-[2rem] p-8 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <p className="text-zinc-900 font-bold mb-8">{err}</p>
            <div className="flex flex-col gap-3">
              <button onClick={launchPortal} className="w-full py-3.5 bg-brand-500 hover:bg-brand-400 text-white font-black rounded-xl transition-all shadow-md active:scale-95">Reintentar</button>
              <button onClick={() => navigate('/dashboard')} className="w-full py-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold rounded-xl transition-colors">Volver al panel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}