import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { apiPath } from '../../utils/fetcher';

const IconLock = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;

export default function SubscriptionGate() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const reason = params.get('reason') || 'quota_exceeded';
  
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const startCheckout = async (plan) => {
    try {
      setBusy(true);
      setErr('');
      const { data: sdata } = await supabase.auth.getSession();
      const token = sdata?.session?.access_token;
      if (!token) throw new Error('Sesión no válida');

      // Llamada al backend para generar el link de Stripe
      const res = await fetch(apiPath('/api/billing/checkout'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan_code: plan }) // 'plus_monthly', 'pro_monthly', etc.
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Error al iniciar pago');
      
      window.location.assign(body.url);
    } catch (e) {
      setErr(e.message || 'Ocurrió un error inesperado al conectar con la pasarela segura.');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-lg bg-white border border-zinc-200 shadow-2xl shadow-zinc-200/50 rounded-[2.5rem] p-10 text-center">
        <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <IconLock />
        </div>
        
        <h1 className="text-3xl font-black text-zinc-950 tracking-tight mb-3">
          {reason === 'quota_exceeded' ? 'Límite alcanzado' : 'Mejora tu plan'}
        </h1>
        <p className="text-zinc-500 font-medium text-base mb-10 leading-relaxed">
          Has consumido los 250 paquetes de tu plan Freemium. Para seguir registrando entregas y desbloquear todo el potencial de tu negocio, mejora tu plan.
        </p>

        {err && <div className="mb-8 p-4 bg-red-50 text-red-700 text-sm font-bold rounded-xl border border-red-200">{err}</div>}

        <div className="flex flex-col gap-4">
          <button 
            onClick={() => startCheckout('plus_monthly')} 
            disabled={busy}
            className="w-full py-4 bg-brand-500 hover:bg-brand-400 disabled:bg-zinc-300 disabled:text-zinc-500 text-white font-black text-lg rounded-xl transition-all shadow-lg shadow-brand-500/30 active:scale-95 flex items-center justify-center gap-2"
          >
            {busy ? 'Cargando pasarela...' : 'Pasar a PLUS (19,90€/mes)'}
          </button>
          
          <button 
            onClick={() => startCheckout('pro_monthly')} 
            disabled={busy}
            className="w-full py-4 bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-300 disabled:text-zinc-500 text-white font-black text-lg rounded-xl transition-all shadow-lg shadow-zinc-950/20 active:scale-95 flex items-center justify-center gap-2"
          >
            {busy ? 'Cargando pasarela...' : 'Pasar a PRO (39,90€/mes)'}
          </button>

          <button 
            onClick={() => navigate(-1)} 
            disabled={busy}
            className="w-full py-4 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-zinc-700 font-bold text-base rounded-xl transition-colors mt-2"
          >
            Volver atrás
          </button>
        </div>
      </div>
    </div>
  );
}