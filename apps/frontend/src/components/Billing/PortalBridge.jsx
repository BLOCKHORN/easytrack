import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { openBillingPortal } from '../../services/billingService';

export default function PortalBridge() {
  const [err, setErr] = useState('');

  const launchPortal = async () => {
    try {
      setErr('');
      const { data: sdata } = await supabase.auth.getSession();
      if (!sdata?.session) throw new Error('Debes iniciar sesión para acceder al portal.');

      const url = await openBillingPortal();
      if (!url) throw new Error('No se pudo establecer conexión con el sistema de facturación.');
      
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
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-20 h-20 bg-white border border-zinc-200 rounded-3xl shadow-lg flex items-center justify-center mx-auto mb-8">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </div>
            <h1 className="text-2xl font-black text-zinc-950 mb-3">Conectando...</h1>
            <p className="text-zinc-500 font-medium text-base">Abriendo tu portal de facturación seguro.</p>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 shadow-xl rounded-[2.5rem] p-10 text-center">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <h1 className="text-2xl font-black text-zinc-950 mb-3">Error de conexión</h1>
            <p className="text-zinc-500 font-medium text-base mb-8 leading-relaxed">{err}</p>
            <button onClick={() => window.history.back()} className="w-full py-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl transition-colors">
              Volver atrás
            </button>
          </div>
        )}
      </div>
    </div>
  );
}