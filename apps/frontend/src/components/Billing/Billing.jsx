'use strict';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { openBillingPortal, startCheckout, getLimits } from '../../services/billingService';

const IconCreditCard = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
const IconCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" fill="none" className="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>;
const IconSparkles = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>;
const IconSpinner = () => <svg className="animate-spin h-5 w-5 text-current" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>;
const IconArrowRight = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
const IconLock = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const StripeLogo = ({ className = "h-4 w-auto", fill = "#635BFF" }) => (
  <svg viewBox="0 0 512 214" className={className} xmlns="http://www.w3.org/2000/svg" fill={fill} preserveAspectRatio="xMidYMid meet">
    <path d="M512 110.08c0-36.409-17.636-65.138-51.342-65.138c-33.85 0-54.33 28.73-54.33 64.854c0 42.808 24.179 64.426 58.88 64.426c16.925 0 29.725-3.84 39.396-9.244v-28.445c-9.67 4.836-20.764 7.823-34.844 7.823c-13.796 0-26.027-4.836-27.591-21.618h69.547c0-1.85.284-9.245.284-12.658m-70.258-13.511c0-16.071 9.814-22.756 18.774-22.756c8.675 0 17.92 6.685 17.92 22.756zm-90.31-51.627c-13.939 0-22.899 6.542-27.876 11.094l-1.85-8.818h-31.288v165.83l35.555-7.537l.143-40.249c5.12 3.698 12.657 8.96 25.173 8.96c25.458 0 48.64-20.48 48.64-65.564c-.142-41.245-23.609-63.716-48.498-63.716m-8.534 97.991c-8.391 0-13.37-2.986-16.782-6.684l-.143-52.765c3.698-4.124 8.818-6.968 16.925-6.968c12.942 0 21.902 14.506 21.902 33.137c0 19.058-8.818 33.28-21.902 33.28M241.493 36.551l35.698-7.68V0l-35.698 7.538zm0 10.809h35.698v124.444h-35.698zm-38.257 10.524L200.96 47.36h-30.72v124.444h35.556V87.467c8.39-10.951 22.613-8.96 27.022-7.396V47.36c-4.551-1.707-21.191-4.836-29.582 10.524m-71.112-41.386l-34.702 7.395l-.142 113.92c0 21.05 15.787 36.551 36.836 36.551c11.662 0 20.195-2.133 24.888-4.693V140.8c-4.55 1.849-27.022 8.391-27.022-12.658V77.653h27.022V47.36h-27.022zM35.982 83.484c0-5.546 4.551-7.68 12.09-7.68c10.808 0 24.461 3.272 35.27 9.103V51.484c-11.804-4.693-23.466-6.542-35.27-6.542C19.2 44.942 0 60.018 0 85.192c0 39.252 54.044 32.995 54.044 49.92c0 6.541-5.688 8.675-13.653 8.675c-11.804 0-26.88-4.836-38.827-11.378v33.849c13.227 5.689 26.596 8.106 38.827 8.106c29.582 0 49.92-14.648 49.92-40.106c-.142-42.382-54.329-34.845-54.329-50.774" />
  </svg>
);

const LogoPciDss = ({ className = "h-5 w-auto" }) => (
  <svg viewBox="0 0 116 26" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 2L2.5 5.5V12C2.5 17.5 6.1 22.5 11 24.5C15.9 22.5 19.5 17.5 19.5 12V5.5L11 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="currentColor" fillOpacity="0.05" />
    <path d="M7.8 12.2L10 14.4L14.2 9.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <text x="25" y="13.5" fill="currentColor" fontSize="10.5" fontWeight="800" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.05em">PCI-DSS</text>
    <text x="25" y="21.5" fill="currentColor" fillOpacity="0.5" fontSize="6.5" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.08em">LEVEL 1 CERTIFIED</text>
  </svg>
);

const Logo3DSecure = ({ className = "h-5 w-auto" }) => (
  <svg viewBox="0 0 116 26" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="11" cy="13" r="8.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3.5 2" />
    <path d="M7.8 13L10 15.2L14.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <text x="25" y="13.5" fill="currentColor" fontSize="10.5" fontWeight="800" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.03em">3-D SECURE</text>
    <text x="25" y="21.5" fill="currentColor" fillOpacity="0.5" fontSize="6.5" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.08em">PSD2 · SCA READY</text>
  </svg>
);

const LogoEncryption = ({ className = "h-5 w-auto" }) => (
  <svg viewBox="0 0 116 26" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5.5" y="9.5" width="11" height="10.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M7.5 9.5V6.5C7.5 4.6 9 3 11 3C13 3 14.5 4.6 14.5 6.5V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="11" cy="14.8" r="1.1" fill="currentColor" />
    <text x="25" y="13.5" fill="currentColor" fontSize="10.5" fontWeight="800" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.05em">TLS 1.3</text>
    <text x="25" y="21.5" fill="currentColor" fillOpacity="0.5" fontSize="6.5" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.08em">AES-256 BIT CIPHER</text>
  </svg>
);

const LogoGdpr = ({ className = "h-5 w-auto" }) => (
  <svg viewBox="0 0 116 26" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="11" cy="13" r="8.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.35" />
    <circle cx="11" cy="6.8" r="0.9" fill="currentColor" />
    <circle cx="17.2" cy="13" r="0.9" fill="currentColor" />
    <circle cx="11" cy="19.2" r="0.9" fill="currentColor" />
    <circle cx="4.8" cy="13" r="0.9" fill="currentColor" />
    <text x="25" y="13.5" fill="currentColor" fontSize="10.5" fontWeight="800" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.04em">RGPD · GDPR</text>
    <text x="25" y="21.5" fill="currentColor" fillOpacity="0.5" fontSize="6.5" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.08em">EU PRIVACY SHIELD</text>
  </svg>
);

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
    <main className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 py-3 sm:py-8 font-sans text-zinc-950 pb-20">
      <div className="mb-4 sm:mb-8">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight leading-tight">Facturación</h1>
        <p className="text-zinc-500 font-medium text-xs sm:text-sm mt-0.5">Suscripción, límites de uso y método de pago.</p>
      </div>

      {errorMsg && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-rose-50 text-rose-700 font-semibold text-xs sm:text-sm rounded-xl border border-rose-200/80">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
        <div className="lg:col-span-8 space-y-4 sm:space-y-6">
          
          {/* CURRENT PLAN CARD */}
          <div className="bg-white border border-zinc-200/80 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm transition-all">
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-6 mb-4 sm:mb-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                    <span>Plan actual</span>
                    {isPaid && (
                      <>
                        <span className="text-zinc-300">·</span>
                        <span className="text-emerald-600 font-semibold">Activo</span>
                      </>
                    )}
                    {isScheduledCancel && (
                      <>
                        <span className="text-zinc-300">·</span>
                        <span className="text-amber-600 font-medium">Cancela al fin de ciclo</span>
                      </>
                    )}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight mt-0.5">
                    {isPaid ? ent.plan.name : (isVip ? 'VIP' : 'Plan de Prueba')}
                  </h2>
                </div>
                {isPaid && !isManualOverride && (
                  <button 
                    onClick={handlePortal}
                    disabled={activeAction === 'portal'}
                    className="w-full sm:w-auto px-5 py-2.5 bg-zinc-950 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 shadow-sm min-h-[44px] active:scale-[0.97]"
                  >
                    {activeAction === 'portal' ? (
                      <IconSpinner />
                    ) : (
                      <>
                        <IconCreditCard />
                        <span>Gestionar en</span>
                        <StripeLogo className="h-4 w-auto inline-block -mt-0.5" fill="#635BFF" />
                      </>
                    )}
                  </button>
                )}
              </div>

              {isPaid && ent.plan.current_period_end && (
                <div className="p-3.5 sm:p-4 bg-zinc-50 rounded-xl border border-zinc-200/80 mb-4 sm:mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-zinc-500 border border-zinc-200 shadow-sm shrink-0"><IconCreditCard /></div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Próxima renovación</p>
                    <p className="text-sm sm:text-base font-bold text-zinc-900">{fmtDate(ent.plan.current_period_end)}</p>
                  </div>
                </div>
              )}

              {/* LIMITS SECTION */}
              <div className="space-y-4 border-t border-zinc-100 pt-4 sm:pt-6">
                <div className="flex justify-between items-end gap-2">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-zinc-950 tracking-tight leading-none">Capacidad del Almacén</h3>
                    <p className="text-xs sm:text-sm font-medium text-zinc-500 mt-1">
                      {isQuotaExceeded ? 'Límite alcanzado.' : `Te quedan ${ent.trial.remaining} paquetes este periodo.`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xl sm:text-2xl font-extrabold tabular-nums text-zinc-950">{trialUsed}</span>
                    <span className="text-xs font-bold text-zinc-400"> / {trialQuota === 1000000 ? '∞' : trialQuota}</span>
                  </div>
                </div>
                <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden p-0.5 border border-zinc-200">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${trialPct}%` }} 
                    className={`h-full rounded-full transition-all ${isQuotaExceeded ? 'bg-rose-500' : 'bg-brand-600'}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {!isPaid && !isVip && (
            <div className="bg-brand-600 rounded-xl sm:rounded-2xl p-4 sm:p-8 text-white relative overflow-hidden shadow-md">
              <div className="relative z-10 space-y-4 sm:space-y-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 border border-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  <IconSparkles /> Oferta Premium
                </div>
                <h3 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">Pásate a PRO y <br className="hidden sm:inline"/> olvida los límites</h3>
                <p className="text-brand-100 font-normal text-xs sm:text-base max-w-xl leading-relaxed">
                  Accede al Área Personal con inteligencia financiera, escaneo de IA ilimitado y gestión sin restricciones.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                   <div className="flex bg-white/10 p-1 rounded-xl border border-white/20 w-full sm:w-fit">
                      <button onClick={() => setPeriodSel('m1')} className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${periodSel === 'm1' ? 'bg-white text-brand-700 shadow-sm' : 'text-white/80 hover:text-white'}`}>Mensual</button>
                      <button onClick={() => setPeriodSel('m12')} className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${periodSel === 'm12' ? 'bg-white text-brand-700 shadow-sm' : 'text-white/80 hover:text-white'}`}>Anual (-15%)</button>
                   </div>
                   <button 
                     onClick={() => handleUpgrade('pro')}
                     disabled={!!activeAction}
                     className="w-full sm:w-auto px-6 py-3 bg-white text-zinc-950 font-bold rounded-xl text-xs uppercase tracking-wider shadow-md hover:bg-zinc-100 active:scale-[0.97] transition-all flex items-center justify-center gap-2 min-h-[44px]"
                   >
                     {activeAction === 'pro' ? <IconSpinner /> : <IconArrowRight />}
                     Activar Suscripción
                   </button>
                </div>
              </div>
            </div>
          )}

        </div>

        <div className="lg:col-span-4 space-y-4 sm:space-y-6">
           <div className="bg-zinc-950 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white space-y-4 shadow-md relative overflow-hidden">
              <h3 className="text-lg sm:text-xl font-bold tracking-tight">Incluido en Plan PRO</h3>
              <ul className="space-y-3">
                {[
                  'Almacén ilimitado (sin cuotas)',
                  'Inteligencia Financiera Avanzada',
                  'AI Scan sin esperas',
                  'Fidelización de Clientes VIP',
                  'Soporte Prioritario WhatsApp'
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <div className="mt-0.5 w-4 h-4 bg-brand-500/20 rounded flex items-center justify-center shrink-0 text-brand-400"><IconCheck /></div>
                    <span className="text-xs sm:text-sm font-medium text-zinc-300 leading-snug">{f}</span>
                  </li>
                ))}
              </ul>
           </div>

           {/* ESTÁNDARES BANCARIOS Y SEGURIDAD (MINIMALISTA · BORDES INFINITOS) */}
           <div className="pt-6 sm:pt-7 border-t border-zinc-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-950 tracking-tight">Estándares y Seguridad de Pago</h4>
                  <p className="text-[11px] text-zinc-400 font-medium">Operativa tokenizada y custodiada por Stripe Payments Europe</p>
                </div>
                <StripeLogo className="h-4 w-auto shrink-0 opacity-90 hover:opacity-100 transition-opacity" fill="#635BFF" />
              </div>

              {/* LOGOS VECTORIALES DE ESTÁNDARES (SIN ENCAJONAR · BORDES INFINITOS) */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 pt-1 text-zinc-800">
                <div className="flex items-center" title="Certificación PCI-DSS Nivel 1">
                  <LogoPciDss className="h-5.5 w-auto text-zinc-800 hover:text-zinc-950 transition-colors" />
                </div>
                <div className="flex items-center" title="Autenticación Reforzada PSD2 y 3D Secure 2.0">
                  <Logo3DSecure className="h-5.5 w-auto text-zinc-800 hover:text-zinc-950 transition-colors" />
                </div>
                <div className="flex items-center" title="Cifrado TLS 1.3 con clave AES-256">
                  <LogoEncryption className="h-5.5 w-auto text-zinc-800 hover:text-zinc-950 transition-colors" />
                </div>
                <div className="flex items-center" title="Cumplimiento RGPD Unión Europea">
                  <LogoGdpr className="h-5.5 w-auto text-zinc-800 hover:text-zinc-950 transition-colors" />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-400 font-medium">
                <span>Arquitectura Zero-Storage</span>
                <span>·</span>
                <span>Sin custodia local de tarjetas</span>
              </div>
           </div>
        </div>
      </div>
    </main>
  );
}