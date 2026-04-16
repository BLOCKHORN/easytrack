'use strict';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startCheckout } from '../../services/billingService';

const IconLock = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

export default function SubscriptionGate() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const reason = params.get('reason') || 'quota_exceeded';
  
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const handleUpgrade = async (plan) => {
    try {
      setBusy(true);
      setErr('');
      const url = await startCheckout(plan);
      window.location.assign(url);
    } catch (e) {
      setErr(e.message || 'Error al conectar con la pasarela de pago.');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-zinc-200 shadow-2xl rounded-[2.5rem] p-10 text-center">
        <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <IconLock />
        </div>
        
        <h1 className="text-3xl font-black text-zinc-950 mb-3">
          {reason === 'quota_exceeded' ? 'Límite alcanzado' : 'Mejora tu plan'}
        </h1>
        <p className="text-zinc-500 font-medium mb-10 leading-relaxed">
          Has consumido los paquetes de tu plan actual. Para seguir registrando entregas y desbloquear la IA inteligente, actualiza a PRO.
        </p>

        {err && <div className="mb-8 p-4 bg-red-50 text-red-700 text-sm font-bold rounded-xl border border-red-200">{err}</div>}

        <div className="flex flex-col gap-4">
          <button 
            onClick={() => handleUpgrade('pro_monthly')} 
            disabled={busy}
            className="w-full py-5 bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-300 text-white font-black text-lg rounded-2xl transition-all active:scale-95"
          >
            {busy ? 'Cargando pasarela...' : 'Probar PRO Gratis (7 días)'}
          </button>
          
          <p className="text-xs text-zinc-400 font-bold">
            Luego 29,90€/mes. Cancela cuando quieras.
          </p>

          <button 
            onClick={() => navigate(-1)} 
            disabled={busy}
            className="w-full py-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl mt-4"
          >
            Volver atrás
          </button>
        </div>
      </div>
    </div>
  );
}