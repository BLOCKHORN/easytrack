import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../../utils/fetcher';
import { getCarrierLogo, getInitials, ImageFallback } from '../UI/CarrierLogo';
import PlanBadge from '../Billing/PlanBadge';

const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconTerminal = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>;
const IconBack = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
const IconSave = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const IconRefresh = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
const IconBuilding = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>;
const IconAlert = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconWhatsapp = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133-.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>;
const IconStar = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
const IconTrendingDown = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>;

const formatEUR = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n || 0);
const formatMicroEUR = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const timeAgo = (dateString) => {
  if (!dateString) return 'Sin actividad';
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  let interval = seconds / 86400; if (interval > 1) return Math.floor(interval) + 'd';
  interval = seconds / 3600; if (interval > 1) return Math.floor(interval) + 'h';
  interval = seconds / 60; if (interval > 1) return Math.floor(interval) + 'm';
  return 'Ahora';
};

const getAiCost = (pTokens, cTokens) => {
  const p = (Number(pTokens) || 0) / 1000000 * 0.075;
  const c = (Number(cTokens) || 0) / 1000000 * 0.30;
  return p + c;
};

const analyzeNegotiationOpportunities = (statsArray, timeRange, tenant) => {
  if (timeRange === 'today' || timeRange === 'week') return [];
  const creationDate = tenant?.fecha_creacion ? new Date(tenant.fecha_creacion) : new Date();
  const monthsActive = Math.max(1, (new Date() - creationDate) / (1000 * 60 * 60 * 24 * 30.44));
  const TIERS = { VOLUMEN: ['Amazon Logistics', 'InPost', 'Celeritas'], PREMIUM: ['DHL', 'UPS', 'FedEx'] };

  return statsArray.map(c => {
    const vol = Number(c.volumen) || 0;
    const currentTicket = Number(c.ticket_medio) || 0;
    const monthlyVol = timeRange === 'all' ? (vol / monthsActive) : vol;
    let targetTicket = 0;
    if (TIERS.VOLUMEN.includes(c.empresa_transporte)) targetTicket = monthlyVol >= 800 ? 0.35 : 0.25;
    else if (TIERS.PREMIUM.includes(c.empresa_transporte)) targetTicket = monthlyVol >= 50 ? 0.60 : 0.50;
    else targetTicket = monthlyVol >= 200 ? 0.45 : 0.35;
    
    if (targetTicket > 0 && currentTicket < targetTicket) {
      return { empresa: c.empresa_transporte, volumenMensual: Math.round(monthlyVol), ticketActual: currentTicket, ticketObjetivo: targetTicket, fugaAnual: (monthlyVol * (targetTicket - currentTicket)) * 12 };
    }
    return null;
  }).filter(Boolean);
};

const TenantInspector = ({ tenant, onBack, onUpdate }) => {
  const [statsData, setStatsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quotaInput, setQuotaInput] = useState(tenant.trial_quota !== null ? tenant.trial_quota : -1);
  const [aiActive, setAiActive] = useState(tenant.is_ai_active);
  const [saving, setSaving] = useState(false);
  const [timeRange, setTimeRange] = useState('all'); 

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/admin/tenant-stats/${tenant.id}?timeRange=${timeRange}`);
        const result = await res.json();
        setStatsData(result.stats || []);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    })();
  }, [tenant.id, timeRange]);

  const handleSaveLimits = async () => {
    setSaving(true);
    try {
      const q = parseInt(quotaInput, 10);
      await apiFetch(`/api/admin/tenant/${tenant.id}/limits`, { method: 'PATCH', body: { trial_quota: isNaN(q) || q < 0 ? null : q, is_ai_active: aiActive } });
      onUpdate(); 
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  const totals = useMemo(() => statsData.reduce((acc, curr) => { acc.revenue += Number(curr.ingreso_total) || 0; acc.volume += Number(curr.volumen) || 0; return acc; }, { revenue: 0, volume: 0 }), [statsData]);
  const opportunities = useMemo(() => analyzeNegotiationOpportunities(statsData, timeRange, tenant), [statsData, timeRange, tenant]);
  const totalCost = getAiCost(tenant.ai_prompt_tokens, tenant.ai_completion_tokens);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-100 pb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-xs font-[1000] uppercase tracking-widest text-zinc-400 hover:text-zinc-950 transition-colors">
          <IconBack /> Volver
        </button>
        <div className="flex flex-wrap items-center gap-4">
           <h2 className="text-3xl font-[1000] tracking-tighter uppercase">{tenant.nombre_empresa || 'Empresa S/N'}</h2>
           {tenant.plan_id === 'pro' && <PlanBadge />}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-4 space-y-10">
           <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-8 shadow-sm space-y-8">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Identidad</p>
              <div className="space-y-4">
                 <p className="text-sm font-bold text-zinc-500">{tenant.email}</p>
                 <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-50">
                    <div><p className="text-[9px] font-black text-zinc-400 uppercase">Alta</p><p className="text-sm font-black text-zinc-900">{new Date(tenant.fecha_creacion).toLocaleDateString()}</p></div>
                    <div><p className="text-[9px] font-black text-zinc-400 uppercase">Actividad</p><p className="text-sm font-black text-emerald-600">{timeAgo(tenant.ultima_actividad)}</p></div>
                 </div>
              </div>
           </div>

           <div className="bg-zinc-950 rounded-[2.5rem] p-8 text-white space-y-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-[60px] rounded-full" />
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest relative z-10">Consolas de Control</p>
              <div className="space-y-6 relative z-10">
                 <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-3 text-white/50">Cuota (Paquetes/Mes)</label>
                    <input type="number" value={quotaInput} onChange={e => setQuotaInput(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-lg focus:border-brand-500 outline-none transition-colors" />
                    <p className="text-[9px] font-bold text-zinc-500 mt-2">Consumido este periodo: {tenant.trial_used} paq.</p>
                 </div>
                 <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-300 text-white">IA Operativa</span>
                    <input type="checkbox" checked={aiActive} onChange={e => setAiActive(e.target.checked)} className="w-5 h-5 accent-brand-500" />
                 </div>
                 <button onClick={handleSaveLimits} disabled={saving} className="w-full py-4 bg-brand-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-brand-600 transition-all shadow-xl shadow-brand-500/10">{saving ? 'Guardando...' : 'Aplicar Límites'}</button>
              </div>
           </div>
        </div>

        <div className="lg:col-span-8 space-y-10">
           <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-10 shadow-sm space-y-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div>
                    <h3 className="text-2xl font-[1000] tracking-tighter text-zinc-950">Historial Operativo</h3>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Reparto de tráfico por transportista</p>
                 </div>
                 <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest outline-none focus:border-brand-500 transition-all">
                    <option value="today">Hoy</option><option value="week">Semana</option><option value="month">Mes</option><option value="all">Histórico</option>
                 </select>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                 <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Volumen</p>
                    <p className="text-3xl font-[1000] text-zinc-950 tabular-nums">{totals.volume.toLocaleString()}</p>
                 </div>
                 <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Facturación</p>
                    <p className="text-3xl font-[1000] text-emerald-600 tabular-nums">{formatEUR(totals.revenue)}</p>
                 </div>
                 <div className="p-6 bg-zinc-950 rounded-3xl text-white hidden md:block">
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1 text-white/50">Carga Servidor IA</p>
                    <p className="text-xl font-[1000] tabular-nums text-brand-400">{formatEUR(totalCost)}</p>
                 </div>
              </div>

              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="border-b border-zinc-50"><tr className="text-[9px] font-black text-zinc-400 uppercase tracking-widest"><th className="py-4 px-4">Transportista</th><th className="py-4 px-4 text-right">Volumen</th><th className="py-4 px-4 text-right">Ticket</th><th className="py-4 px-4 text-right">Ingreso</th></tr></thead>
                    <tbody className="divide-y divide-zinc-50 text-zinc-950 font-black">
                       {statsData.map(c => (
                         <tr key={c.empresa_transporte} className="group hover:bg-zinc-50/50 transition-colors">
                           <td className="py-4 px-4 flex items-center gap-3"><ImageFallback src={getCarrierLogo(c.empresa_transporte)} fallbackText={getInitials(c.empresa_transporte)} containerClassName="w-6 h-6 rounded-lg bg-zinc-50" imgClassName="max-w-full max-h-full object-contain" fallbackClassName="text-[8px] font-black text-zinc-300" /><span className="text-xs uppercase">{c.empresa_transporte}</span></td>
                           <td className="py-4 px-4 text-right tabular-nums text-xs font-mono">{Number(c.volumen).toLocaleString()}</td>
                           <td className="py-4 px-4 text-right tabular-nums text-xs font-mono text-zinc-400">{formatEUR(c.ticket_medio)}</td>
                           <td className="py-4 px-4 text-right tabular-nums text-sm text-zinc-950">{formatEUR(c.ingreso_total)}</td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function AdminDashboard() {
  const [tenants, setTenants] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectingTenant, setInspectingTenant] = useState(null);
  const [globalTimeFilter, setGlobalTimeFilter] = useState('all');

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/dashboard-data?timeRange=${globalTimeFilter}`);
      const data = await res.json();
      setTenants(data.tenants || []);
      setLeaderboard(data.globalStats || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAllData(); }, [globalTimeFilter]);

  const globalMetrics = useMemo(() => {
    const totalRev = tenants.reduce((acc, t) => acc + (Number(t.ingreso_historico_local) || 0), 0);
    const totalAi = tenants.reduce((acc, t) => acc + getAiCost(t.ai_prompt_tokens, t.ai_completion_tokens), 0);
    return {
      active: tenants.length,
      mrr: tenants.reduce((acc, t) => acc + (Number(t.mrr_contribution) || 0), 0),
      volume: totalRev,
      profit: totalRev - (totalAi * 10), // Simplificación estratégica
      aiCost: totalAi,
      traffic: tenants.reduce((acc, t) => acc + (Number(t.total_paquetes) || 0), 0)
    };
  }, [tenants]);

  const filteredTenants = useMemo(() => tenants.filter(t => t.nombre_empresa?.toLowerCase().includes(searchTerm.toLowerCase()) || t.email?.toLowerCase().includes(searchTerm.toLowerCase()) || t.slug?.toLowerCase().includes(searchTerm.toLowerCase())), [tenants, searchTerm]);

  if (loading && tenants.length === 0) return <DashboardSkeleton />;

  return (
    <div className="pb-32 max-w-[1600px] mx-auto px-4 sm:px-10 font-sans text-zinc-950">
      
      {/* 1. ADMIN HEADER */}
      <header className="py-12 border-b border-zinc-100 mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
           <h1 className="text-4xl md:text-6xl font-[1000] tracking-tighter text-zinc-950 leading-none">Global Ops</h1>
           <div className="flex items-center gap-3">
              <span className="bg-zinc-950 text-white text-[10px] font-black px-2 py-0.5 rounded tracking-widest uppercase">Admin Panel</span>
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Sincronización en tiempo real</span>
           </div>
        </div>
        <button onClick={fetchAllData} className="w-12 h-12 bg-white border border-zinc-100 rounded-2xl flex items-center justify-center text-zinc-400 hover:text-zinc-950 transition-all shadow-sm"><IconRefresh /></button>
      </header>

      <AnimatePresence mode="wait">
        {inspectingTenant ? (
          <TenantInspector key="inspector" tenant={inspectingTenant} onBack={() => setInspectingTenant(null)} onUpdate={fetchAllData} />
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-16">
            
            {/* 2. TACTICAL GLOBAL ROWS */}
            <section className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-zinc-950 rounded-[2.5rem] p-10 text-white space-y-6 shadow-2xl relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-[60px] rounded-full" />
                     <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest relative z-10 text-white">Ingresos MRR (Suscripciones)</p>
                     <div className="text-5xl font-[1000] tracking-tighter text-brand-400 tabular-nums relative z-10 text-white leading-none">{formatEUR(globalMetrics.mrr)}</div>
                     <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest relative z-10 text-white">{tenants.filter(t=>t.plan_id==='pro').length} locales en Plan PRO</p>
                  </div>
                  <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-10 shadow-sm flex flex-col justify-between">
                     <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 text-zinc-950">Salud del Negocio</p>
                     <div className="text-5xl font-[1000] tracking-tighter text-zinc-950 tabular-nums leading-none mb-4">{globalMetrics.active}</div>
                     <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-zinc-950">Locales activos en la red</p>
                  </div>
                  <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-10 shadow-sm flex flex-col justify-center space-y-8">
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-zinc-950">Gasto Servidor IA</span>
                        <span className="text-sm font-black text-rose-600 tabular-nums text-zinc-950">{formatEUR(globalMetrics.aiCost)}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-zinc-950">Tráfico Histórico</span>
                        <span className="text-sm font-black text-zinc-950 tabular-nums text-zinc-950">{globalMetrics.traffic.toLocaleString()} paq.</span>
                     </div>
                  </div>
               </div>
            </section>

            {/* 3. LEADERBOARD & DIRECTORY */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
               {/* LEADERBOARD (GLOBAL CARRIERS) */}
               <div className="lg:col-span-4 bg-zinc-50 border border-zinc-100 rounded-[3rem] p-10 space-y-10">
                  <div className="space-y-1">
                     <h3 className="text-lg font-[1000] tracking-tight uppercase text-zinc-950">Dominancia Nacional</h3>
                     <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Cuota de mercado global</p>
                  </div>
                  <div className="space-y-8">
                     {leaderboard.slice(0, 6).map((c, i) => (
                       <div key={i} className="flex items-center justify-between group cursor-help text-zinc-950">
                          <div className="flex items-center gap-4">
                             <span className="text-[9px] font-black text-zinc-300 w-4">#{i+1}</span>
                             <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-2 border border-zinc-100 shadow-sm group-hover:scale-110 transition-transform">
                                <ImageFallback src={getCarrierLogo(c.empresa_transporte)} fallbackText={getInitials(c.empresa_transporte)} containerClassName="w-full h-full" imgClassName="max-w-full max-h-full object-contain" />
                             </div>
                             <span className="text-[11px] font-black uppercase tracking-tight truncate max-w-[80px]">{c.empresa_transporte}</span>
                          </div>
                          <div className="text-right">
                             <p className="text-xs font-[1000] tabular-nums">{formatEUR(c.ingreso_total)}</p>
                             <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{Number(c.volumen).toLocaleString()} paq.</p>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>

               {/* TENANT DIRECTORY */}
               <div className="lg:col-span-8 space-y-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                     <h3 className="text-lg font-[1000] tracking-tight uppercase text-zinc-950">Directorio de Locales</h3>
                     <div className="relative flex-1 md:max-w-xs">
                        <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input type="text" placeholder="Buscar local, email o slug..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-3 bg-white border border-zinc-200 rounded-2xl text-xs font-black uppercase tracking-widest outline-none focus:border-brand-500 transition-all shadow-sm" />
                     </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {filteredTenants.map(t => (
                       <motion.div key={t.id} onClick={() => setInspectingTenant(t)} whileHover={{ y: -5 }} className="bg-white border border-zinc-100 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all cursor-pointer group text-zinc-950">
                          <div className="flex justify-between items-start mb-8">
                             <div className="space-y-1">
                                <h4 className="text-sm font-[1000] uppercase tracking-tight group-hover:text-brand-600 transition-colors">{t.nombre_empresa || 'S/N'}</h4>
                                <p className="text-[10px] font-bold text-zinc-400 lowercase">{t.email}</p>
                             </div>
                             {t.plan_id === 'pro' && <PlanBadge />}
                          </div>
                          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-zinc-50">
                             <div><p className="text-[9px] font-black text-zinc-300 uppercase mb-1">Volumen</p><p className="text-lg font-[1000] tabular-nums">{t.total_paquetes || 0}</p></div>
                             <div><p className="text-[9px] font-black text-zinc-300 uppercase mb-1">Facturación</p><p className="text-lg font-[1000] tabular-nums text-emerald-600">{formatEUR(t.ingreso_historico_local)}</p></div>
                          </div>
                          <div className="mt-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-zinc-400">
                             <div className={`w-1.5 h-1.5 rounded-full ${t.ultima_actividad && (new Date() - new Date(t.ultima_actividad) < 3600000) ? 'bg-emerald-500' : 'bg-zinc-200'}`} />
                             {timeAgo(t.ultima_actividad)}
                          </div>
                       </motion.div>
                     ))}
                     {filteredTenants.length === 0 && <div className="col-span-full py-20 text-center text-[10px] font-black text-zinc-300 uppercase tracking-widest italic">No se han encontrado negocios con ese criterio.</div>}
                  </div>
               </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
