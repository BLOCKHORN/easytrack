import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { apiPath } from '../../utils/apiBase';

const IconLock = () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IconCheck = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>;

export default function SubscriptionGate() {
  const params  = new URLSearchParams(window.location.search);
  const [reason, setReason] = useState(params.get('reason') || 'inactive');

  // Contexto guardado por el fetcher cuando recibió 402
  const ctx = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem('sub_block') || '{}'); }
    catch { return {}; }
  }, []);

  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const r = await fetch(apiPath('/api/tenants/me'), {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        
        if (r.ok) {
          const json = await r.json().catch(() => ({}));
          const ent  = json?.entitlements || json;
          
          // Si ya puede crear paquetes (pagó), lo mandamos de vuelta
          if (ent?.canCreatePackage) {
            try { sessionStorage.removeItem('sub_block'); } catch {}
            const back = ctx?.returnTo || '/dashboard';
            return window.location.replace(back);
          }
          if (ent) setReason(ent?.reason || 'inactive');
        }
      } catch { /* silencioso */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headline = {
    inactive: 'Suscripción inactiva',
    quota_exceeded: 'Límite de paquetes alcanzado',
    past_due: 'Problema con el método de pago',
    canceled: 'Suscripción cancelada'
  }[reason] || 'Acceso bloqueado';

  function volver() {
    const back = ctx?.returnTo || '/dashboard';
    window.location.assign(back);
  }

  async function startCheckout() {
    setBusy(true); setErr('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(apiPath('/api/billing/checkout'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({ plan_code: 'monthly' }) // Forzamos mensual, en el portal de Stripe podrán elegir anual si quieren
      });
      
      const res = await r.json();
      if (res.ok && res.url) {
        window.location.assign(res.url);
      } else {
        throw new Error(res.error || 'Error al iniciar el pago.');
      }
    } catch (e) {
      setErr(e.message || 'No se pudo conectar con la pasarela de pago.');
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-center p-4 selection:bg-brand-100 selection:text-brand-900 font-sans">
      <div className="w-full max-w-[420px] bg-white border border-zinc-200 shadow-2xl shadow-zinc-200/50 rounded-[2rem] p-8 text-center relative overflow-hidden">
        
        {/* Barra superior decorativa */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-500"></div>

        <div className="w-20 h-20 bg-brand-50 border border-brand-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <IconLock />
        </div>

        <h1 className="text-2xl font-black text-zinc-950 tracking-tight mb-3">{headline}</h1>
        
        <p className="text-zinc-500 font-medium text-sm mb-8 leading-relaxed">
          {reason === 'quota_exceeded' 
            ? 'Has utilizado tus 100 paquetes gratuitos. Pásate al plan Premium para desbloquear el uso ilimitado y seguir teniendo tu almacén bajo control.'
            : 'Para continuar registrando envíos necesitas tener tu suscripción activa. Tus datos y el inventario actual están totalmente a salvo.'}
        </p>

        <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-6 mb-8 text-left space-y-3">
          <div className="flex items-center gap-3">
            <IconCheck /> <span className="text-sm font-bold text-zinc-800">Paquetes ilimitados al mes</span>
          </div>
          <div className="flex items-center gap-3">
            <IconCheck /> <span className="text-sm font-bold text-zinc-800">Gestión de ubicaciones</span>
          </div>
          <div className="flex items-center gap-3">
            <IconCheck /> <span className="text-sm font-bold text-zinc-800">Importación masiva por IA</span>
          </div>
          <div className="flex items-center gap-3">
            <IconCheck /> <span className="text-sm font-bold text-zinc-800">Soporte prioritario</span>
          </div>
          <div className="mt-5 pt-5 border-t border-zinc-200 text-center">
            <span className="text-3xl font-black text-zinc-950">19,90€</span><span className="text-zinc-500 font-bold text-sm"> / mes</span>
          </div>
        </div>

        {err && <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm font-bold rounded-xl border border-red-200">{err}</div>}

        <div className="flex flex-col gap-3">
          <button 
            onClick={startCheckout} 
            disabled={busy}
            className="w-full py-4 bg-brand-500 hover:bg-brand-400 disabled:bg-zinc-300 disabled:text-zinc-500 text-white font-black text-lg rounded-xl transition-all shadow-lg shadow-brand-500/30 active:scale-95"
          >
            {busy ? 'Cargando pasarela...' : 'Activar Plan Premium'}
          </button>
          <button 
            onClick={volver} 
            disabled={busy}
            className="w-full py-3.5 bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 font-bold text-sm rounded-xl transition-colors"
          >
            Volver al panel (Modo lectura)
          </button>
        </div>
      </div>
    </div>
  );
}