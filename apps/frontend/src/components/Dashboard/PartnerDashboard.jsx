'use strict';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

const IconUsers = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconWallet = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>;
const IconTrendingUp = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const IconRefresh = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
const IconCalculator = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="16" y1="18" x2="16" y2="18"/><line x1="12" y1="18" x2="12" y2="18"/><line x1="8" y1="18" x2="8" y2="18"/><line x1="16" y1="10" x2="16" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="8" y1="10" x2="8" y2="10"/></svg>;
const IconClock = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconGift = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>;
const IconShield = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;

const formatEUR = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n || 0);

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');

export default function PartnerDashboard() {
  const [partner, setPartner] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  
  const [activeTab, setActiveTab] = useState('negocios');
  const [calcClients, setCalcClients] = useState(20);
  const [calcType, setCalcType] = useState('mensual'); // 'mensual' | 'anual'

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${API_BASE}/api/partners/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      
      if (data.ok && data.isPartner) {
        setPartner(data.partner);
        setReferrals(data.referredTenants || []);
        setPayouts(data.payouts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const metrics = useMemo(() => {
    const activeClients = referrals.filter(r => r.status === 'active');
    
    let monthlyTotal = 0;
    activeClients.forEach((_, index) => {
      const position = index + 1;
      if (position <= 10) monthlyTotal += 5;
      else if (position <= 50) monthlyTotal += 7.5;
      else monthlyTotal += 10;
    });

    const activeCount = activeClients.length;
    let tier = 'Rookie';
    let nextTier = 'Pro';
    let nextTarget = 11;
    let currentProgress = activeCount;
    let maxProgress = 10;

    if (activeCount >= 51) {
      tier = 'Elite';
      nextTier = 'MAX';
      nextTarget = activeCount;
      currentProgress = 100;
      maxProgress = 100;
    } else if (activeCount >= 11) {
      tier = 'Pro';
      nextTier = 'Elite';
      nextTarget = 51;
      currentProgress = activeCount - 10;
      maxProgress = 40;
    }

    const percentage = Math.min((currentProgress / maxProgress) * 100, 100);

    return { activeCount, monthlyTotal, tier, nextTier, nextTarget, percentage, missing: nextTarget - activeCount };
  }, [referrals]);

  const hasPendingPayout = useMemo(() => payouts.some(p => p.status === 'pending'), [payouts]);

  const calcResult = useMemo(() => {
    let c = Number(calcClients) || 0;
    let mrr = 0;
    let bono = 0;
    let currentTier = 'Rookie';
    
    if (calcType === 'mensual') {
      if (c > 0) { const t1 = Math.min(c, 10); mrr += t1 * 5; bono += t1 * 10; c -= t1; }
      if (c > 0) { const t2 = Math.min(c, 40); mrr += t2 * 7.5; bono += t2 * 20; c -= t2; currentTier = 'Pro'; }
      if (c > 0) { mrr += c * 10; bono += c * 30; currentTier = 'Elite'; }
    } else {
      if (c > 0) { const t1 = Math.min(c, 10); bono += t1 * 60; c -= t1; }
      if (c > 0) { const t2 = Math.min(c, 40); bono += t2 * 80; c -= t2; currentTier = 'Pro'; }
      if (c > 0) { bono += c * 100; currentTier = 'Elite'; }
    }
    
    return { mrr, bono, currentTier };
  }, [calcClients, calcType]);

  const handleRequestPayout = async () => {
    if (!partner || partner.saldo_acumulado < 20) return;
    if (!window.confirm(`¿Solicitar retiro de ${formatEUR(partner.saldo_acumulado)}?`)) return;
    
    setRequesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE}/api/partners/payout/request`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}` 
        }
      });
      const data = await res.json();
      
      if (!data.ok) throw new Error(data.error);
      fetchDashboard();
    } catch (err) {
      alert(err.message);
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 font-medium text-sm">
        Sincronizando registros...
      </div>
    );
  }

  if (!partner) return null;

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 font-sans pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-zinc-950 flex items-center gap-3">
            Programa de Afiliados
            <button onClick={fetchDashboard} className="text-zinc-400 hover:text-zinc-900 transition-colors p-2 rounded-md hover:bg-zinc-100" title="Actualizar datos">
               <IconRefresh />
            </button>
          </h1>
          <p className="text-zinc-500 mt-1 font-medium">Gestión de cartera, métricas de captación y liquidación de comisiones.</p>
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-zinc-500">
                <IconUsers />
                <h2 className="text-xs font-bold uppercase tracking-widest">Cartera Activa</h2>
              </div>
              <span className="bg-brand-50 border border-brand-200 text-brand-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">{metrics.tier}</span>
            </div>
            <p className="text-4xl font-mono font-black text-brand-600">{metrics.activeCount}</p>
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-100">
            {metrics.tier !== 'Elite' ? (
              <p className="text-xs text-zinc-500">Restan <span className="font-bold text-zinc-900">{metrics.missing} locales</span> para el nivel {metrics.nextTier}</p>
            ) : (
              <p className="text-xs font-bold text-zinc-900">Rango máximo operativo alcanzado.</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-zinc-500 mb-4">
              <IconTrendingUp />
              <h2 className="text-xs font-bold uppercase tracking-widest">Proyección MRR</h2>
            </div>
            <p className="text-4xl font-mono font-black text-brand-600">{formatEUR(metrics.monthlyTotal)}</p>
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-100">
            <p className="text-xs text-zinc-500">Comisión recurrente estimada para el próximo ciclo.</p>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-zinc-400">
                <IconWallet />
                <h2 className="text-xs font-bold uppercase tracking-widest">Saldo Liquidable</h2>
              </div>
              {hasPendingPayout && (
                <span className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 uppercase tracking-widest">
                  <IconClock /> En curso
                </span>
              )}
            </div>
            <p className="text-4xl font-mono font-black text-brand-400">{formatEUR(partner.saldo_acumulado)}</p>
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">Mín: 20.00 €</span>
            <button 
              onClick={handleRequestPayout}
              disabled={requesting || partner.saldo_acumulado < 20 || hasPendingPayout}
              className="bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors"
            >
              {requesting ? 'Procesando' : hasPendingPayout ? 'Retiro en curso' : 'Solicitar Retiro'}
            </button>
          </div>
        </div>
      </div>

      {/* Simulator & Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2">
              <IconCalculator className="text-zinc-900" />
              <h3 className="text-lg font-black text-zinc-900">Simulador de Rendimiento</h3>
            </div>
            <div className="flex bg-zinc-100 rounded-lg p-1 border border-zinc-200">
              <button 
                onClick={() => setCalcType('mensual')} 
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${calcType === 'mensual' ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-700'}`}
              >
                Plan Mensual
              </button>
              <button 
                onClick={() => setCalcType('anual')} 
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${calcType === 'anual' ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-700'}`}
              >
                Plan Anual
              </button>
            </div>
          </div>
          
          <div className="space-y-8 flex-1 flex flex-col justify-center">
            <div>
              <div className="flex justify-between items-end mb-4">
                <label className="text-sm font-bold text-zinc-900">Volumen de captación objetivo</label>
                <span className="text-xl font-mono font-black text-brand-600">{calcClients} locales</span>
              </div>
              <input 
                type="range" min="1" max="150" value={calcClients} onChange={e => setCalcClients(e.target.value)}
                className="w-full accent-brand-500 h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-black text-zinc-400 mt-2 uppercase tracking-widest">
                <span>1</span>
                <span>150+</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={`border rounded-xl p-5 transition-colors ${calcType === 'anual' ? 'bg-zinc-50 border-zinc-300 col-span-2 text-center' : 'bg-white border-zinc-200'}`}>
                <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-2 ${calcType === 'anual' ? 'text-zinc-900 justify-center' : 'text-zinc-500'}`}>
                  <IconGift /> {calcType === 'anual' ? 'Bono Único de Alta' : 'Bono de Alta'}
                </span>
                <p className={`font-mono font-black ${calcType === 'anual' ? 'text-4xl text-brand-600 py-2' : 'text-2xl text-brand-600'}`}>{formatEUR(calcResult.bono)}</p>
              </div>
              {calcType === 'mensual' && (
                <div className="bg-zinc-50 border border-zinc-300 rounded-xl p-5">
                  <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <IconTrendingUp /> Recurrente (MRR)
                  </span>
                  <p className="text-2xl font-mono font-black text-brand-600">{formatEUR(calcResult.mrr)} <span className="text-xs text-zinc-500 font-sans">/ mes</span></p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end pt-2">
              <span className={`text-[10px] font-black px-3 py-1.5 rounded border uppercase tracking-widest ${
                calcResult.currentTier === 'Elite' ? 'bg-zinc-950 text-white border-zinc-950' : 
                calcResult.currentTier === 'Pro' ? 'bg-zinc-100 text-zinc-900 border-zinc-300' : 
                'bg-white text-zinc-500 border-zinc-200'
              }`}>
                Proyección en Rango {calcResult.currentTier}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-black text-zinc-950 mb-6">Estructura de Comisiones</h3>
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border transition-all ${metrics.tier === 'Rookie' ? 'bg-brand-50 border-brand-200 shadow-sm' : 'bg-white border-zinc-100'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className={`font-black text-base ${metrics.tier === 'Rookie' ? 'text-brand-700' : 'text-zinc-950'}`}>Rookie</span>
                <div className="text-right">
                  <span className={`font-mono font-black text-base ${metrics.tier === 'Rookie' ? 'text-brand-700' : 'text-zinc-950'}`}>5,00 € <span className={`text-xs font-sans ${metrics.tier === 'Rookie' ? 'text-brand-600/70' : 'text-zinc-500'}`}>/ mes</span></span>
                  <span className={`block text-[10px] font-black uppercase tracking-widest mt-1 ${metrics.tier === 'Rookie' ? 'text-brand-600/70' : 'text-zinc-500'}`}>+ 10,00 € Bono Alta</span>
                </div>
              </div>
              <p className={`text-xs font-medium ${metrics.tier === 'Rookie' ? 'text-brand-700/80' : 'text-zinc-500'}`}>De 1 a 10 locales operativos.</p>
            </div>
            
            <div className={`p-4 rounded-xl border transition-all ${metrics.tier === 'Pro' ? 'bg-brand-50 border-brand-200 shadow-sm' : 'bg-white border-zinc-100'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className={`font-black text-base ${metrics.tier === 'Pro' ? 'text-brand-700' : 'text-zinc-950'}`}>Pro</span>
                <div className="text-right">
                  <span className={`font-mono font-black text-base ${metrics.tier === 'Pro' ? 'text-brand-700' : 'text-zinc-950'}`}>7,50 € <span className={`text-xs font-sans ${metrics.tier === 'Pro' ? 'text-brand-600/70' : 'text-zinc-500'}`}>/ mes</span></span>
                  <span className={`block text-[10px] font-black uppercase tracking-widest mt-1 ${metrics.tier === 'Pro' ? 'text-brand-600/70' : 'text-zinc-500'}`}>+ 20,00 € Bono Alta</span>
                </div>
              </div>
              <p className={`text-xs font-medium ${metrics.tier === 'Pro' ? 'text-brand-700/80' : 'text-zinc-500'}`}>De 11 a 50 locales operativos.</p>
            </div>

            <div className={`p-4 rounded-xl border transition-all ${metrics.tier === 'Elite' ? 'bg-brand-50 border-brand-200 shadow-sm' : 'bg-white border-zinc-100'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className={`font-black text-base ${metrics.tier === 'Elite' ? 'text-brand-700' : 'text-zinc-950'}`}>Elite</span>
                <div className="text-right">
                  <span className={`font-mono font-black text-base ${metrics.tier === 'Elite' ? 'text-brand-700' : 'text-zinc-950'}`}>10,00 € <span className={`text-xs font-sans ${metrics.tier === 'Elite' ? 'text-brand-600/70' : 'text-zinc-500'}`}>/ mes</span></span>
                  <span className={`block text-[10px] font-black uppercase tracking-widest mt-1 ${metrics.tier === 'Elite' ? 'text-brand-600/70' : 'text-zinc-500'}`}>+ 30,00 € Bono Alta</span>
                </div>
              </div>
              <p className={`text-xs font-medium ${metrics.tier === 'Elite' ? 'text-brand-700/80' : 'text-zinc-500'}`}>Más de 50 locales operativos.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Policies */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 md:p-8">
        <div className="flex items-center gap-2 text-zinc-950 mb-6">
          <h3 className="text-lg font-black">Políticas de Operación y Antifraude</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h4 className="text-sm font-black text-zinc-900 mb-2">1. Liberación del Bono</h4>
            <p className="text-xs text-zinc-600 leading-relaxed font-medium">
              El Bono de Alta (10€, 20€ o 30€) queda retenido tras el registro. <strong>Se libera y liquida automáticamente cuando el local abona su segunda mensualidad</strong> (Día 30). Esta medida protege el sistema contra altas fraudulentas o cuentas temporales.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-black text-zinc-900 mb-2">2. Retención (Churn)</h4>
            <p className="text-xs text-zinc-600 leading-relaxed font-medium">
              El ingreso recurrente (MRR) exige una suscripción operativa. Si el local cancela la cuenta o el método de pago falla consecutivamente, la mensualidad asociada se detiene y el local se resta del volumen total para el cálculo de tu Rango.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-black text-zinc-900 mb-2">3. Planes Anuales</h4>
            <p className="text-xs text-zinc-600 leading-relaxed font-medium">
              Los planes de pago anual (299€) no generan MRR mensual. En su lugar, otorgan un <strong>Bono Único de 60€, 80€ o 100€</strong> (dependiendo de tu Nivel), que se liquida a los 15 días (superado el marco legal de desistimiento). El local computa como 1 activo durante 12 meses.
            </p>
          </div>
        </div>
      </div>

      {/* Tables Area */}
      <div className="pt-4">
        <div className="flex gap-2 p-1.5 bg-zinc-100 border border-zinc-200 rounded-xl w-fit mb-6">
          <button
            onClick={() => setActiveTab('negocios')}
            className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'negocios' ? 'bg-white text-brand-600 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50'
            }`}
          >
            Locales Vinculados
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'historial' ? 'bg-white text-brand-600 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50'
            }`}
          >
            Libro Mayor (Retiros)
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'negocios' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black text-zinc-500 uppercase tracking-widest select-none">
                      <th className="px-6 py-4">Negocio</th>
                      <th className="px-6 py-4">Fecha de Alta</th>
                      <th className="px-6 py-4 text-right">Estado Operativo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {referrals.length === 0 ? (
                      <tr><td colSpan="3" className="px-6 py-16 text-center text-zinc-500 font-bold text-xs uppercase tracking-widest">Cartera vacía.</td></tr>
                    ) : (
                      referrals.map(t => (
                        <tr key={t.id} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-zinc-950">{t.nombre_empresa || 'S/N'}</td>
                          <td className="px-6 py-4 text-zinc-500 font-mono text-xs">{new Date(t.fecha_creacion).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-right">
                            {t.status === 'active' ? (
                              <span className="bg-brand-50 text-brand-700 border border-brand-200 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">Activo</span>
                            ) : (
                              <span className="bg-zinc-100 text-zinc-500 border border-zinc-200 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">Baja / Impago</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'historial' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black text-zinc-500 uppercase tracking-widest select-none">
                      <th className="px-6 py-4">ID Transacción</th>
                      <th className="px-6 py-4">Fecha de Solicitud</th>
                      <th className="px-6 py-4 text-right">Importe</th>
                      <th className="px-6 py-4 text-right">Estado de Liquidación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {payouts.length === 0 ? (
                      <tr><td colSpan="4" className="px-6 py-16 text-center text-zinc-500 font-bold text-xs uppercase tracking-widest">Sin registros contables.</td></tr>
                    ) : (
                      payouts.map(pay => (
                        <tr key={pay.id} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-6 py-4 font-mono text-zinc-500 text-xs">#{pay.id.split('-')[0]}</td>
                          <td className="px-6 py-4 text-zinc-900 font-mono text-xs font-bold">{new Date(pay.created_at).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right font-mono font-black text-zinc-950">{formatEUR(pay.amount)}</td>
                          <td className="px-6 py-4 flex justify-end">
                            {pay.status === 'paid' ? (
                              <span className="flex items-center gap-1.5 text-brand-600 font-bold text-[10px] uppercase tracking-widest bg-brand-50 px-2 py-1 rounded border border-brand-200">
                                <IconCheck /> Ejecutado ({new Date(pay.paid_at).toLocaleDateString()})
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-zinc-600 font-bold text-[10px] uppercase tracking-widest bg-zinc-50 px-2 py-1 rounded border border-zinc-200">
                                <IconClock /> En revisión
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}