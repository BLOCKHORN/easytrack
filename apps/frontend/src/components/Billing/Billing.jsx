import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

const IconCreditCard = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
const IconCheckSmall = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500"><path d="M20 6 9 17l-5-5"/></svg>;
const IconSparkles = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>;
const IconExternalLink = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
const IconSpinner = () => <svg className="animate-spin h-5 w-5 text-current" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>;
const IconArrowRight = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;

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
      <div className="max-w-5xl mx-auto space-y-10 pt-8 px-4 sm:px-6">
        <div className="h-32 bg-zinc-100 animate-pulse rounded-b-3xl -mx-4 sm:-mx-6 mb-8" />
        <div className="h-64 bg-zinc-100 animate-pulse rounded-[2rem]" />
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
    <main className="max-w-5xl mx-auto space-y-8 pb-28 pt-8 px-4 sm:px-6 lg:px-8">
      <header className="sticky top-0 z-40 bg-zinc-50/90 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6 py-6 border-b border-zinc-200/60 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] rounded-b-3xl -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 mb-8 transition-all">
        <div>
          <h1 className="text-3xl font-black text-zinc-950 tracking-tight">Facturacion</h1>
          <p className="text-zinc-500 font-medium mt-1">Suscripcion, limites de uso y facturas.</p>
        </div>
      </header>

      {errorMsg && (
        <div className="p-4 bg-red-50/80 backdrop-blur-sm text-red-700 font-bold rounded-2xl border border-red-200/60 shadow-sm animate-in fade-in slide-in-from-top-4">
          {errorMsg}
        </div>
      )}

      <section className="bg-white rounded-[2rem] border border-zinc-200/80 shadow-sm overflow-hidden transition-all hover:shadow-md">
        <div className="p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-zinc-950 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-zinc-950/20 shrink-0">
              <IconCreditCard />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-zinc-950 tracking-tight uppercase">
                  {ent?.plan?.name || 'Freemium'}
                </h2>
                <div className={`text-[10px] font-black px-3 py-1 rounded-md border tracking-widest ${isPaid || isVip ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : isQuotaExceeded ? 'bg-red-50 text-red-700 border-red-200' : 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                  {isPaid || isVip ? 'ACTIVO' : isQuotaExceeded ? 'AL LIMITE' : 'GRATUITO'}
                </div>
              </div>
              <p className="text-zinc-500 font-medium text-sm mt-1">Estado de espacio de trabajo.</p>
            </div>
          </div>
          
          {(isPaid || isVip) && (
            <div className="flex gap-8 bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Ciclo</p>
                <p className="text-sm font-bold text-zinc-900">{isManualOverride ? 'Manual' : (ent.plan.cadence === 'annual' ? 'Anual' : 'Mensual')}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Renovacion</p>
                <p className="text-sm font-bold text-zinc-900">{isManualOverride ? '' : fmtDate(ent.plan.current_period_end)}</p>
              </div>
            </div>
          )}
        </div>

        {!isPaid && !isVip ? (
          <div className="p-6 md:p-8 border-t border-zinc-100 bg-zinc-50/30">
            <div className="mb-10 max-w-2xl">
              <h4 className="text-sm font-black text-zinc-900 mb-2">Cuota</h4>
              <p className="text-sm text-zinc-500 mb-4">Cuota gratuita mensual.</p>
              <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Consumo</span>
                  <span className="text-sm font-black text-zinc-900">{trialUsed} <span className="text-zinc-400 font-medium">/ {trialQuota}</span></span>
                </div>
                <div className="w-full bg-zinc-100 rounded-full h-2.5 overflow-hidden">
                  <div className={`h-full transition-all duration-700 ease-out rounded-full ${trialPct >= 100 ? 'bg-red-500' : trialPct > 80 ? 'bg-amber-500' : 'bg-brand-500'}`} style={{ width: `${trialPct}%` }} />
                </div>
              </div>
            </div>

            <div className="border border-zinc-200 bg-white rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h4 className="text-xl font-black text-zinc-950 tracking-tight">Planes</h4>
                </div>
                <div className="inline-flex bg-zinc-100 p-1.5 rounded-xl border border-zinc-200/60 shadow-inner">
                  <button onClick={() => setPeriodSel('m1')} className={`px-5 py-2 text-xs font-black rounded-lg transition-all duration-200 ${periodSel === 'm1' ? 'bg-white text-zinc-950 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)]' : 'text-zinc-500 hover:text-zinc-900'}`}>Mensual</button>
                  <button onClick={() => setPeriodSel('m12')} className={`px-5 py-2 text-xs font-black rounded-lg transition-all duration-200 flex items-center gap-2 ${periodSel === 'm12' ? 'bg-white text-zinc-950 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)]' : 'text-zinc-500 hover:text-zinc-900'}`}>
                    Anual <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">-16%</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 lg:p-8 rounded-[2rem] border-2 border-indigo-50 bg-gradient-to-b from-white to-indigo-50/30 hover:border-indigo-200 transition-all flex flex-col justify-between group shadow-sm hover:shadow-md">
                  <div>
                    <h4 className="text-xl font-black text-indigo-950">Plus</h4>
                    <div className="my-6 flex items-baseline gap-1">
                      <span className="text-4xl font-black text-indigo-950 tracking-tighter">{periodSel === 'm12' ? '199' : '19,90'}</span>
                      <span className="text-sm font-bold text-indigo-950/50">/{periodSel === 'm12' ? 'ano' : 'mes'}</span>
                    </div>
                    <ul className="space-y-3 mb-8">
                      <li className="flex items-start gap-3 text-sm text-indigo-950/80 font-medium"><IconCheckSmall className="text-indigo-500" /> Ilimitado</li>
                      <li className="flex items-start gap-3 text-sm text-indigo-950/80 font-medium"><IconCheckSmall className="text-indigo-500" /> Analitica</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => startPeriodCheckout('plus')} 
                    disabled={!!activeAction} 
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2 shadow-md hover:shadow-lg shadow-indigo-600/20"
                  >
                    {activeAction === 'plus' ? <IconSpinner /> : 'Elegir Plus'}
                  </button>
                </div>

                <div className="p-6 lg:p-8 rounded-[2rem] border-2 border-zinc-800 bg-gradient-to-br from-zinc-900 via-black to-zinc-950 flex flex-col justify-between relative overflow-hidden group shadow-2xl shadow-emerald-900/20">
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-emerald-500 to-emerald-400 text-zinc-950 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-bl-2xl shadow-sm">Top</div>
                  <div>
                    <h4 className="text-xl font-black text-white">Pro</h4>
                    <div className="my-6 flex items-baseline gap-1">
                      <span className="text-4xl font-black text-white tracking-tighter">{periodSel === 'm12' ? '399' : '39,90'}</span>
                      <span className="text-sm font-bold text-zinc-500">/{periodSel === 'm12' ? 'ano' : 'mes'}</span>
                    </div>
                    <ul className="space-y-3 mb-8">
                      <li className="flex items-start gap-3 text-sm text-zinc-300 font-medium"><IconCheckSmall className="text-emerald-500" /> <span className="text-white">Todo Plus</span></li>
                      <li className="flex items-start gap-3 text-sm text-zinc-300 font-medium"><IconSparkles className="text-emerald-400" /> <span className="text-white">IA Ilimitada</span></li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => startPeriodCheckout('pro')} 
                    disabled={!!activeAction} 
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-zinc-950 text-sm font-black rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {activeAction === 'pro' ? <IconSpinner /> : 'Elegir Pro'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 md:p-8 border-t border-zinc-100 bg-zinc-50/30">
            {isScheduledCancel && (
              <div className="mb-6 text-sm font-bold text-amber-700 bg-amber-50 p-4 rounded-2xl border border-amber-200/60 flex items-center gap-3 animate-in fade-in">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Cancelado
              </div>
            )}
            {isPaymentIssue && (
              <div className="mb-6 text-sm font-bold text-red-700 bg-red-50 p-4 rounded-2xl border border-red-200/60 flex items-center gap-3 animate-in fade-in">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Error de pago
              </div>
            )}
            {isPaid && isManualOverride && (
              <div className="mb-6 bg-emerald-50/80 border border-emerald-200/60 rounded-2xl p-6 flex items-start gap-4">
                 <div className="text-emerald-600 mt-1"><IconSparkles className="text-emerald-500" /></div>
                 <div>
                    <h3 className="text-base font-black text-emerald-900">Admin</h3>
                 </div>
              </div>
            )}

            {!isManualOverride && (
              <div className="bg-white border border-zinc-200/80 rounded-[2rem] p-6 sm:p-8 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 group">
                <div className="max-w-xl">
                  <h3 className="text-xl font-black text-zinc-900 tracking-tight mb-2">Portal</h3>
                  <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                    Gestiona facturas.
                  </p>
                </div>
                <div className="w-full lg:w-auto shrink-0">
                  <button 
                    onClick={openPortal} 
                    disabled={!!activeAction} 
                    className="w-full lg:w-auto px-8 py-4 bg-zinc-950 hover:bg-zinc-800 text-white text-sm font-black rounded-2xl transition-all shadow-md hover:shadow-xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group-hover:-translate-y-0.5"
                  >
                    {activeAction === 'portal' ? <IconSpinner /> : <>Acceder <IconArrowRight /></>}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}