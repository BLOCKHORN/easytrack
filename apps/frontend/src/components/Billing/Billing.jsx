'use strict';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../utils/supabaseClient';
import { openBillingPortal, startCheckout, getLimits } from '../../services/billingService';

const IconCreditCard = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
const IconCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" fill="none" className="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>;
const IconSparkles = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>;
const IconSpinner = () => <svg className="animate-spin h-5 w-5 text-current" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>;
const IconArrowRight = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
const IconLock = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;

const fmtDate = (iso) => { 
  if (!iso) return ""; 
  const d = new Date(iso); 
  return isNaN(+d) ? "" : d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }); 
};

export default function Billing() {
  const [limitsData, setLimitsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [periodSel, setPeriodSel] = useState("m1");
  const [activeAction, setActiveAction] = useState(null);

  useEffect(() => {
    async function loadLimits() {
      try {
        const data = await getLimits();
        setLimitsData(data);
        if (data?.entitlements?.plan?.cadence === 'annual') setPeriodSel('m12');
      } catch (e) {
        console.error("[Billing] Error:", e);
        setErrorMsg("No se pudieron cargar los límites de facturación.");
      } finally {
        setLoading(false);
      }
    }
    loadLimits();
  }, []);

  const handlePortal = async () => {
    try {
      setErrorMsg(""); 
      setActiveAction('portal');
      const url = await openBillingPortal();
      window.location.href = url;
    } catch (e) {
      setErrorMsg(e.message);
      setActiveAction(null);
    }
  };

  const handleUpgrade = async (tierCode) => {
    try {
      setErrorMsg(""); 
      setActiveAction(tierCode);
      const planCode = `${tierCode}_${periodSel === 'm12' ? 'annual' : 'monthly'}`;
      const url = await startCheckout(planCode);
      window.location.href = url;
    } catch (e) {
      setErrorMsg(e.message);
      setActiveAction(null);
    }
  };

  if (loading) return <div className="p-8 animate-pulse bg-zinc-50 min-h-screen" />;

  const ent = limitsData?.entitlements;
  const isPaid = !!ent?.is_paid;
  const isVip = ent?.trial?.quota > 10000;
  const isManualOverride = ent?.plan?.status === 'manual'; 
  const status = String(ent?.plan?.status || "").toLowerCase();
  const isScheduledCancel = !!ent?.plan?.cancel_at_period_end;
  const trialUsed = ent?.trial?.used || 0;
  const trialQuota = ent?.trial?.quota || 250;
  const trialPct = Math.min(100, Math.round((trialUsed / trialQuota) * 100)) || 0;
  const isQuotaExceeded = !ent?.trial?.quota_ok;

  return (
    <main className="max-w-6xl mx-auto p-6 lg:p-8 font-sans text-zinc-950">
      <div className="mb-12">
        <h1 className="text-4xl font-[1000] text-zinc-950 tracking-tight leading-none">Facturación</h1>
        <p className="text-zinc-500 font-bold mt-2">Suscripción, límites de uso y método de pago.</p>
      </div>

      {errorMsg && (
        <div className="mb-8 p-4 bg-red-50 text-red-700 font-bold rounded-2xl border border-red-100">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-10">
          
          {/* CURRENT PLAN CARD */}
          <div className="bg-white border border-zinc-200 rounded-[3rem] overflow-hidden shadow-xl shadow-zinc-200/20 transition-all">
            <div className="p-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Plan Actual</span>
                  <h2 className="text-4xl font-[1000] text-zinc-950 tracking-tight flex items-center gap-4 mt-1">
                    {isPaid ? ent.plan.name : (isVip ? 'VIP' : 'Plan de Prueba')}
                    {isPaid && <span className="px-4 py-1 bg-emerald-100 text-emerald-700 text-[10px] uppercase font-black rounded-full tracking-widest">Activo</span>}
                  </h2>
                </div>
                {isPaid && !isManualOverride && (
                  <button 
                    onClick={handlePortal}
                    disabled={activeAction === 'portal'}
                    className="px-8 py-4 bg-zinc-950 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-800 transition-all flex items-center gap-3 shadow-xl active:scale-95"
                  >
                    {activeAction === 'portal' ? <IconSpinner /> : <IconCreditCard />}
                    Gestionar en Stripe
                  </button>
                )}
              </div>

              {isPaid && ent.plan.current_period_end && (
                <div className="p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100 mb-10 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-zinc-400 border border-zinc-200 shadow-sm"><IconCreditCard /></div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Próxima renovación</p>
                    <p className="text-lg font-black text-zinc-900">{fmtDate(ent.plan.current_period_end)}</p>
                  </div>
                </div>
              )}

              {/* LIMITS SECTION */}
              <div className="space-y-8 border-t border-zinc-100 pt-10">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-xl font-[1000] text-zinc-950 tracking-tight leading-none">Capacidad del Almacén</h3>
                    <p className="text-sm font-bold text-zinc-500 mt-2">
                      {isQuotaExceeded ? 'Límite alcanzado.' : `Te quedan ${ent.trial.remaining} paquetes este periodo.`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-[1000] text-zinc-950">{trialUsed}</span>
                    <span className="text-sm font-black text-zinc-400 italic"> / {trialQuota === 1000000 ? '∞' : trialQuota}</span>
                  </div>
                </div>
                <div className="w-full h-4 bg-zinc-100 rounded-full overflow-hidden p-1 border border-zinc-200">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${trialPct}%` }} 
                    className={`h-full rounded-full ${isQuotaExceeded ? 'bg-rose-500' : 'bg-brand-500 shadow-[0_0_15px_rgba(20,184,166,0.5)]'}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {!isPaid && !isVip && (
            <div className="bg-brand-500 rounded-[3.5rem] p-10 md:p-14 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[120px] rounded-full pointer-events-none" />
              <div className="relative z-10 space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 border border-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                  <IconSparkles /> Oferta Premium
                </div>
                <h3 className="text-4xl md:text-6xl font-[1000] tracking-tighter leading-none">Pásate a PRO y <br/> olvida los límites</h3>
                <p className="text-brand-100 font-bold text-lg max-w-xl leading-relaxed">
                  Accede al Área Personal con inteligencia financiera, AI ilimitada y gestión de paquetes sin restricciones.
                </p>
                <div className="flex flex-col sm:flex-row gap-6 pt-6">
                   <div className="flex bg-white/10 p-1.5 rounded-2xl border border-white/10 w-fit">
                      <button onClick={() => setPeriodSel('m1')} className={`px-8 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${periodSel === 'm1' ? 'bg-white text-brand-600 shadow-xl' : 'text-white/60 hover:text-white'}`}>Mensual</button>
                      <button onClick={() => setPeriodSel('m12')} className={`px-8 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${periodSel === 'm12' ? 'bg-white text-brand-600 shadow-xl' : 'text-white/60 hover:text-white'}`}>Anual (-15%)</button>
                   </div>
                   <button 
                     onClick={() => handleUpgrade('pro')}
                     disabled={!!activeAction}
                     className="px-12 py-5 bg-white text-zinc-950 font-[1000] rounded-2xl text-xs uppercase tracking-widest shadow-2xl hover:scale-[1.05] active:scale-95 transition-all flex items-center justify-center gap-4"
                   >
                     {activeAction === 'pro' ? <IconSpinner /> : <IconArrowRight />}
                     Activar Suscripción
                   </button>
                </div>
              </div>
            </div>
          )}

        </div>

        <div className="lg:col-span-4 space-y-8">
           <div className="bg-zinc-950 rounded-[3rem] p-10 text-white space-y-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-brand-500/10 blur-[60px] rounded-full" />
              <h3 className="text-2xl font-[1000] tracking-tight relative z-10">Incluido en Plan PRO</h3>
              <ul className="space-y-6 relative z-10">
                {[
                  'Almacén ilimitado (sin cuotas)',
                  'Inteligencia Financiera Avanzada',
                  'AI Scan sin esperas',
                  'Fidelización de Clientes VIP',
                  'Soporte Prioritario WhatsApp'
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <div className="mt-1 w-6 h-6 bg-brand-500/20 rounded-full flex items-center justify-center shrink-0 text-brand-400 shadow-inner"><IconCheck /></div>
                    <span className="text-sm font-bold text-zinc-300 leading-tight">{f}</span>
                  </li>
                ))}
              </ul>
           </div>

           <div className="p-10 bg-white border border-zinc-200 rounded-[3rem] space-y-6 shadow-sm">
              <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 border border-zinc-100 shadow-inner"><IconLock /></div>
              <h4 className="text-xl font-[1000] text-zinc-950 tracking-tight">Seguridad Garantizada</h4>
              <p className="text-sm font-bold text-zinc-500 leading-relaxed italic">
                Tus datos bancarios nunca se guardan en nuestros servidores. Todo el proceso se gestiona a través de <strong>Stripe</strong>.
              </p>
           </div>
        </div>
      </div>
    </main>
  );
}