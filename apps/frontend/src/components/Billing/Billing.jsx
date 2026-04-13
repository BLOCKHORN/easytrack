import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

const IconCreditCard = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
const IconCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>;
const IconSparkles = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>;
const IconSpinner = () => <svg className="animate-spin h-5 w-5 text-current" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>;
const IconArrowRight = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
const IconLock = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;

async function authedFetch(path, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("No auth");
  return fetch(`${API_BASE}${path}`, {
    method: opts.method || "GET",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

const fmtDate = (iso) => { if (!iso) return ""; const d = new Date(iso); return isNaN(+d) ? "" : d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }); };

export default function Billing() {
  const [limitsData, setLimitsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [periodSel, setPeriodSel] = useState("m1");
  const [activeAction, setActiveAction] = useState(null);

  useEffect(() => {
    async function loadLimits() {
      try {
        const r = await authedFetch("/api/limits/me");
        if (!r.ok) throw new Error("ERROR_LIMITS");
        const data = await r.json();
        setLimitsData(data);
        if (data?.entitlements?.plan?.cadence === 'annual') setPeriodSel('m12');
        else setPeriodSel('m1');
      } catch (e) {
        setErrorMsg(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadLimits();
  }, []);

  const openPortal = async () => {
    try {
      setErrorMsg(""); 
      setActiveAction('portal');
      const r = await authedFetch("/api/billing/portal", { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "PORTAL_ERROR");
      if (data.url) return window.location.href = data.url;
      throw new Error("PORTAL_ERROR");
    } catch (e) {
      setErrorMsg(e.message);
      setActiveAction(null);
    }
  };

  const startPeriodCheckout = async (tierCode) => {
    try {
      setErrorMsg(""); 
      setActiveAction(tierCode);
      const planCode = `${tierCode}_${periodSel === 'm12' ? 'annual' : 'monthly'}`;
      
      const r = await authedFetch("/api/billing/checkout", {
        method: "POST",
        body: { plan_code: planCode }
      });
      
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "CHECKOUT_ERROR");
      
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setErrorMsg(e.message);
      setActiveAction(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 lg:p-8 animate-pulse flex flex-col gap-8">
        <div className="h-10 w-48 bg-zinc-200 rounded-lg"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 h-64 bg-zinc-100 rounded-2xl"></div>
          <div className="lg:col-span-7 h-96 bg-zinc-100 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const ent = limitsData?.entitlements;
  const isPaid = !!ent?.is_paid;
  const isVip = ent?.trial?.quota > 10000;
  const isManualOverride = ent?.plan?.status === 'manual'; 
  
  const status = String(ent?.plan?.status || "").toLowerCase();
  const isPaymentIssue = ["past_due", "unpaid", "incomplete"].includes(status);
  const isScheduledCancel = !!ent?.plan?.cancel_at_period_end;

  const trialUsed = ent?.trial?.used || 0;
  const trialQuota = ent?.trial?.quota || 250;
  const trialPct = Math.min(100, Math.round((trialUsed / trialQuota) * 100)) || 0;
  const isQuotaExceeded = !ent?.trial?.quota_ok;

  return (
    <main className="max-w-6xl mx-auto p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-zinc-950 tracking-tight">Facturación</h1>
        <p className="text-zinc-500 font-medium mt-1">Suscripción, límites de uso y método de pago.</p>
      </div>

      {errorMsg && (
        <div className="mb-8 p-4 bg-red-50 text-red-700 font-bold rounded-xl border border-red-200">
          {errorMsg}
        </div>
      )}

      {isScheduledCancel && (
        <div className="mb-8 p-4 bg-amber-50 text-amber-800 font-bold rounded-xl border border-amber-200 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Suscripción cancelada. Estará activa hasta el final del ciclo de facturación.
        </div>
      )}

      {isPaymentIssue && (
        <div className="mb-8 p-4 bg-red-50 text-red-800 font-bold rounded-xl border border-red-200 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Problema de pago detectado. Por favor, actualiza tu tarjeta en el portal.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-600">
                <IconCreditCard />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Plan Actual</h2>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xl font-black text-zinc-950 uppercase">{ent?.plan?.name || 'Freemium'}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-md border ${isPaid || isVip ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : isQuotaExceeded ? 'bg-red-50 text-red-700 border-red-200' : 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                    {isPaid || isVip ? 'ACTIVO' : isQuotaExceeded ? 'AL LÍMITE' : 'GRATUITO'}
                  </span>
                </div>
              </div>
            </div>

            {(isPaid || isVip) && !isManualOverride && (
              <div className="pt-6 border-t border-zinc-100 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Ciclo de facturación</p>
                  <p className="text-sm font-bold text-zinc-900">{ent.plan.cadence === 'annual' ? 'Anual' : 'Mensual'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Próxima renovación</p>
                  <p className="text-sm font-bold text-zinc-900">{fmtDate(ent.plan.current_period_end)}</p>
                </div>
              </div>
            )}
            
            {isManualOverride && (
              <div className="pt-6 border-t border-zinc-100">
                 <p className="text-sm font-bold text-emerald-700">Cuenta de administración con acceso vitalicio.</p>
              </div>
            )}
          </div>

          {!isPaid && !isVip && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-900 mb-4">Uso de este mes</h3>
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-zinc-500">Paquetes registrados</span>
                <span className="text-sm font-black text-zinc-950">{trialUsed} <span className="text-zinc-400 font-medium">/ {trialQuota}</span></span>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden mb-6">
                <div className={`h-full transition-all duration-500 ${trialPct >= 100 ? 'bg-red-500' : trialPct > 80 ? 'bg-amber-500' : 'bg-zinc-900'}`} style={{ width: `${trialPct}%` }} />
              </div>
              
              <div className="pt-6 border-t border-zinc-100">
                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Limitaciones actuales</h4>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm text-zinc-500 font-medium">
                    <IconLock /> Escáner IA desactivado
                  </li>
                  <li className="flex items-center gap-3 text-sm text-zinc-500 font-medium">
                    <IconLock /> Avisos de WhatsApp manuales
                  </li>
                  <li className="flex items-center gap-3 text-sm text-zinc-500 font-medium">
                    <IconLock /> Sin analítica financiera
                  </li>
                </ul>
              </div>
            </div>
          )}

          {(isPaid || isScheduledCancel || isPaymentIssue) && !isManualOverride && (
            <button 
              onClick={openPortal} 
              disabled={!!activeAction} 
              className="w-full py-4 bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-900 text-sm font-bold rounded-2xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {activeAction === 'portal' ? <IconSpinner /> : <>Gestionar suscripción y facturas <IconArrowRight /></>}
            </button>
          )}
        </div>

        {!isPaid && !isVip && (
          <div className="lg:col-span-7">
            <div className="bg-zinc-950 rounded-3xl p-8 sm:p-10 shadow-xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6">
                <span className="bg-white/10 text-white text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
                  7 DÍAS GRATIS
                </span>
              </div>

              <div className="mb-8 pr-32">
                <h3 className="text-2xl font-black tracking-tight mb-2">Plan PRO</h3>
                <p className="text-zinc-400 text-sm font-medium">Automatización logística total para escalar tu negocio sin límites operativos.</p>
              </div>

              <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-xl w-fit mb-8 border border-zinc-800">
                <button 
                  onClick={() => setPeriodSel('m1')} 
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${periodSel === 'm1' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  Mensual
                </button>
                <button 
                  onClick={() => setPeriodSel('m12')} 
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${periodSel === 'm12' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  Anual <span className="text-emerald-400 text-[10px] uppercase tracking-wider">-16%</span>
                </button>
              </div>

              <div className="mb-8 flex items-end gap-1 border-b border-zinc-800 pb-8">
                <span className="text-5xl font-black tracking-tighter">{periodSel === 'm12' ? '299€' : '29,90€'}</span>
                <span className="text-zinc-500 font-bold mb-1">/{periodSel === 'm12' ? 'año' : 'mes'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 mb-10">
                <div className="flex items-center gap-3"><IconSparkles /> <span className="text-sm font-bold text-zinc-200">Escáner IA Ilimitado</span></div>
                <div className="flex items-center gap-3"><IconCheck /> <span className="text-sm font-bold text-zinc-200">Paquetes ilimitados</span></div>
                <div className="flex items-center gap-3"><IconCheck /> <span className="text-sm font-bold text-zinc-200">Avisos de WhatsApp automáticos</span></div>
                <div className="flex items-center gap-3"><IconCheck /> <span className="text-sm font-bold text-zinc-200">Analítica Financiera</span></div>
                <div className="flex items-center gap-3"><IconCheck /> <span className="text-sm font-bold text-zinc-200">Soporte prioritario</span></div>
              </div>

              <button 
                onClick={() => startPeriodCheckout('pro')} 
                disabled={!!activeAction} 
                className="w-full py-4 bg-white hover:bg-zinc-200 text-zinc-950 text-sm font-black rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {activeAction === 'pro' ? <IconSpinner /> : 'Comenzar prueba gratuita'}
              </button>
              
              <p className="text-center text-xs text-zinc-500 font-medium mt-4">
                Cancela sin compromiso antes de 7 días. No se aplicarán cargos.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}