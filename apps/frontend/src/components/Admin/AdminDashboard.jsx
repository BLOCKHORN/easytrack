import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../../utils/fetcher';
import { getCarrierLogo, getInitials, ImageFallback } from '../UI/CarrierLogo';
import PlanBadge from '../Billing/PlanBadge';
import DashboardSkeleton from '../Dashboard/DashboardSkeleton';

const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconBack = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
const IconRefresh = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;

const formatEUR = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n || 0);
const formatMicroEUR = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(n || 0);

const getAiCost = (pTokens, cTokens) => {
    const p = (Number(pTokens) || 0) / 1000000 * 0.075;
    const c = (Number(cTokens) || 0) / 1000000 * 0.30;
    return p + c;
};

const timeAgo = (dateString) => {
  if (!dateString) return 'Sin actividad';
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  let interval = seconds / 86400; if (interval > 1) return Math.floor(interval) + 'd';
  interval = seconds / 3600; if (interval > 1) return Math.floor(interval) + 'h';
  interval = seconds / 60; if (interval > 1) return Math.floor(interval) + 'm';
  return 'Ahora';
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

  const totals = useMemo(() => statsData.reduce((acc, curr) => { 
    acc.revenue += Number(curr.ingreso_total) || 0; 
    acc.volume += Number(curr.volumen) || 0; 
    return acc; 
  }, { revenue: 0, volume: 0 }), [statsData]);

  const tenantAiCost = getAiCost(tenant.ai_prompt_tokens, tenant.ai_completion_tokens);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
      <header className="flex items-center justify-between gap-6 border-b border-zinc-100 pb-6">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="w-10 h-10 bg-zinc-50 border border-zinc-100 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-950 transition-colors">
            <IconBack />
          </button>
          <div>
             <h2 className="text-2xl font-[1000] tracking-tighter uppercase leading-none">{tenant.nombre_empresa || 'Empresa S/N'}</h2>
             <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">{tenant.slug}</p>
          </div>
        </div>
        <PlanBadge />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white border border-zinc-100 rounded-[2rem] p-8 shadow-sm space-y-8">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Identidad del Cliente</p>
              <div className="space-y-6">
                 <p className="text-sm font-bold text-zinc-500 truncate">{tenant.email}</p>
                 <div className="grid grid-cols-2 gap-6 pt-6 border-t border-zinc-50">
                    <div><p className="text-[9px] font-black text-zinc-300 uppercase mb-1">Fecha Alta</p><p className="text-sm font-black text-zinc-950">{new Date(tenant.fecha_creacion).toLocaleDateString()}</p></div>
                    <div><p className="text-[9px] font-black text-zinc-300 uppercase mb-1">Estado</p><p className="text-sm font-black text-emerald-600 uppercase">{tenant.status}</p></div>
                 </div>
              </div>
           </div>

           <div className="bg-zinc-950 rounded-[2rem] p-8 text-white space-y-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-[60px] rounded-full" />
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest relative z-10">Consola de Infraestructura</p>
              <div className="space-y-6 relative z-10">
                 <div>
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-2 opacity-60">Cuota (Paquetes/Mes)</label>
                    <input type="number" value={quotaInput} onChange={e => setQuotaInput(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-lg focus:border-brand-500 outline-none transition-colors" />
                 </div>
                 <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">IA Operativa</span>
                    <input type="checkbox" checked={aiActive} onChange={e => setAiActive(e.target.checked)} className="w-5 h-5 accent-brand-500" />
                 </div>
                 <div className="pt-4 border-t border-white/5">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Gasto Gemini</span>
                        <span className="text-xs font-black text-brand-400 tabular-nums">{formatMicroEUR(tenantAiCost)}</span>
                    </div>
                    <p className="text-[8px] font-bold text-zinc-600 uppercase text-right">{tenant.ai_scans_count || 0} escaneos totales</p>
                 </div>
                 <button onClick={handleSaveLimits} disabled={saving} className="w-full py-4 bg-brand-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-600 transition-all shadow-xl shadow-brand-500/20">{saving ? 'Guardando...' : 'Actualizar Límites'}</button>
              </div>
           </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
           <div className="bg-white border border-zinc-100 rounded-[2rem] p-8 shadow-sm space-y-10">
              <div className="flex items-center justify-between">
                 <div>
                    <h3 className="text-2xl font-[1000] tracking-tighter text-zinc-950 uppercase">Rendimiento Operativo</h3>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">Desglose histórico por transportista</p>
                 </div>
                 <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-brand-500 transition-all">
                    <option value="today">Hoy</option><option value="week">Semana</option><option value="month">Mes</option><option value="all">Todo</option>
                 </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="p-6 bg-zinc-50 rounded-[1.5rem] border border-zinc-100">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Volumen</p>
                    <p className="text-4xl font-[1000] text-zinc-950 tabular-nums">{totals.volume.toLocaleString()}</p>
                 </div>
                 <div className="p-6 bg-zinc-50 rounded-[1.5rem] border border-zinc-100">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Facturación</p>
                    <p className="text-4xl font-[1000] text-emerald-600 tabular-nums">{formatEUR(totals.revenue)}</p>
                 </div>
              </div>

              <div className="overflow-x-auto pt-4">
                 <table className="w-full text-left">
                    <thead className="border-b border-zinc-50"><tr className="text-[9px] font-black text-zinc-400 uppercase tracking-widest"><th className="pb-4 px-2">Transportista</th><th className="pb-4 px-2 text-right">Volumen</th><th className="pb-4 px-2 text-right">Ticket</th><th className="pb-4 px-2 text-right">Ingreso</th></tr></thead>
                    <tbody className="divide-y divide-zinc-50 text-zinc-950 font-black">
                       {statsData.map(c => (
                         <tr key={c.empresa_transporte} className="group hover:bg-zinc-50/50 transition-colors">
                           <td className="py-4 px-2 flex items-center gap-3">
                              <ImageFallback src={getCarrierLogo(c.empresa_transporte)} fallbackText={getInitials(c.empresa_transporte)} containerClassName="w-8 h-8 rounded-lg bg-white border border-zinc-100 shadow-sm" imgClassName="max-w-full max-h-full object-contain" fallbackClassName="text-[10px] font-black text-zinc-300" />
                              <span className="text-xs uppercase">{c.empresa_transporte}</span>
                           </td>
                           <td className="py-4 px-2 text-right tabular-nums text-sm font-mono">{Number(c.volumen).toLocaleString()}</td>
                           <td className="py-4 px-2 text-right tabular-nums text-sm font-mono text-zinc-400">{formatEUR(c.ticket_medio)}</td>
                           <td className="py-4 px-2 text-right tabular-nums text-sm text-zinc-950">{formatEUR(c.ingreso_total)}</td>
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
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectingTenant, setInspectingTenant] = useState(null);
  const [globalTimeFilter, setGlobalTimeFilter] = useState('all');

  const fetchAllData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch(`/api/admin/dashboard-data?timeRange=${globalTimeFilter}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error al cargar datos');
      setTenants(data.tenants || []);
      setLeaderboard(data.globalStats || []);
    } catch (err) { 
        console.error(err); 
        setErrorMsg(err.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAllData(); }, [globalTimeFilter]);

  const VIP_SLUGS = ['blockhorn', 'estanco-benidoleig'];

  const globalMetrics = useMemo(() => {
    const totalRev = tenants.reduce((acc, t) => acc + (Number(t.ingreso_historico_local) || 0), 0);
    const totalAi = tenants.reduce((acc, t) => acc + getAiCost(t.ai_prompt_tokens, t.ai_completion_tokens), 0);
    
    const payingTenants = tenants.filter(t => !VIP_SLUGS.includes(t.slug));
    
    return {
      active: tenants.length,
      mrr: payingTenants.reduce((acc, t) => acc + (Number(t.mrr_contribution) || 0), 0),
      proCount: payingTenants.filter(t => t.plan_id === 'pro').length,
      traffic: tenants.reduce((acc, t) => acc + (Number(t.total_paquetes) || 0), 0),
      revenue: totalRev,
      aiCost: totalAi
    };
  }, [tenants]);

  const processedTenants = useMemo(() => {
    const filtered = tenants.filter(t => 
      (t.nombre_empresa?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
      (t.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
      (t.slug?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
    return filtered.map(t => ({
      ...t,
      ai_cost: getAiCost(t.ai_prompt_tokens, t.ai_completion_tokens)
    })).sort((a, b) => (Number(b.total_paquetes) || 0) - (Number(a.total_paquetes) || 0));
  }, [tenants, searchTerm]);

  if (loading && tenants.length === 0) return <DashboardSkeleton />;

  return (
    <div className="pb-32 max-w-[1400px] mx-auto px-4 sm:px-10 font-sans text-zinc-950">
      
      {/* 1. COMPACT HEADER */}
      <header className="py-10 border-b border-zinc-100 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
           <h1 className="text-4xl md:text-6xl font-[1000] tracking-tighter text-zinc-950 leading-none">Global Ops</h1>
           <div className="flex items-center gap-3">
              <span className="bg-zinc-950 text-white text-[9px] font-black px-2 py-0.5 rounded tracking-widest uppercase">Admin Panel</span>
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Sincronizado</span>
           </div>
        </div>
        <button onClick={fetchAllData} className="w-12 h-12 bg-white border border-zinc-100 rounded-2xl flex items-center justify-center text-zinc-400 hover:text-zinc-950 transition-all shadow-sm"><IconRefresh /></button>
      </header>

      {errorMsg && (
          <div className="mb-10 p-6 bg-rose-50 border border-rose-100 rounded-3xl text-rose-600 font-bold text-sm">
             ⚠️ Error: {errorMsg}
          </div>
      )}

      <AnimatePresence mode="wait">
        {inspectingTenant ? (
          <TenantInspector key="inspector" tenant={inspectingTenant} onBack={() => setInspectingTenant(null)} onUpdate={fetchAllData} />
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-12">
            
            {/* 2. TACTICAL GLOBAL ROWS */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-zinc-950 rounded-[2.5rem] p-10 text-white space-y-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-[60px] rounded-full" />
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest relative z-10">Ingresos MRR Est.</p>
                  <div className="text-5xl font-[1000] tracking-tighter text-brand-400 tabular-nums relative z-10 leading-none">{formatEUR(globalMetrics.mrr)}</div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest relative z-10">{globalMetrics.proCount} locales de pago</p>
               </div>
               <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-10 shadow-sm flex flex-col justify-between">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Salud del Negocio</p>
                  <div className="text-5xl font-[1000] tracking-tighter text-zinc-950 tabular-nums leading-none mb-4">{globalMetrics.active}</div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Locales activos en la red</p>
               </div>
               <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-10 shadow-sm flex flex-col justify-center space-y-8">
                  <div className="flex justify-between items-center">
                     <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Gasto Gemini</span>
                     <span className="text-sm font-black text-rose-600 tabular-nums">{formatMicroEUR(globalMetrics.aiCost)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-6 border-t border-zinc-50">
                     <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Flujo de Red</span>
                     <span className="text-sm font-black text-emerald-600 tabular-nums">{formatEUR(globalMetrics.revenue)}</span>
                  </div>
               </div>
            </section>

            {/* 3. LEADERBOARD & DIRECTORY */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
               {/* LEADERBOARD (GLOBAL CARRIERS) */}
               <div className="lg:col-span-4 bg-zinc-50 border border-zinc-100 rounded-[3rem] p-10 space-y-10">
                  <div className="space-y-1">
                     <h3 className="text-lg font-[1000] tracking-tight uppercase text-zinc-950">Market Share</h3>
                     <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Ranking nacional por facturación</p>
                  </div>
                  <div className="space-y-8">
                     {leaderboard.slice(0, 10).map((c, i) => (
                       <div key={i} className="flex items-center justify-between group">
                          <div className="flex items-center gap-4 min-w-0">
                             <span className="text-[9px] font-black text-zinc-300 w-4">#{i+1}</span>
                             <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-2 border border-zinc-100 shadow-sm group-hover:scale-110 transition-transform">
                                <ImageFallback src={getCarrierLogo(c.empresa_transporte)} fallbackText={getInitials(c.empresa_transporte)} containerClassName="w-full h-full" imgClassName="max-w-full max-h-full object-contain" />
                             </div>
                             <span className="text-[11px] font-black uppercase tracking-tight truncate max-w-[100px] text-zinc-700">{c.empresa_transporte}</span>
                          </div>
                          <div className="text-right shrink-0">
                             <p className="text-xs font-[1000] tabular-nums text-zinc-950">{formatEUR(c.ingreso_total)}</p>
                             <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{Number(c.volumen).toLocaleString()} paq.</p>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>

               {/* TENANT DIRECTORY */}
               <div className="lg:col-span-8 space-y-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                     <h3 className="text-lg font-[1000] tracking-tight uppercase text-zinc-950">Directorio de Red</h3>
                     <div className="relative flex-1 md:max-w-sm">
                        <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input type="text" placeholder="Buscar local, email o slug..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-3 bg-white border border-zinc-200 rounded-2xl text-xs font-black uppercase tracking-widest outline-none focus:border-brand-500 transition-all shadow-sm" />
                     </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                     {processedTenants.map(t => (
                       <motion.div key={t.id} onClick={() => setInspectingTenant(t)} whileHover={{ y: -5 }} className="bg-white border border-zinc-100 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all cursor-pointer group">
                          <div className="flex justify-between items-start mb-8">
                             <div className="space-y-1 min-w-0">
                                <h4 className="text-sm font-[1000] uppercase tracking-tight group-hover:text-brand-600 transition-colors truncate">{t.nombre_empresa || 'S/N'}</h4>
                                <p className="text-[10px] font-bold text-zinc-400 lowercase truncate">{t.email}</p>
                             </div>
                             {t.plan_id === 'pro' && <PlanBadge />}
                          </div>
                          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-zinc-50">
                             <div className="text-center"><p className="text-[9px] font-black text-zinc-300 uppercase mb-1">Volumen</p><p className="text-lg font-[1000] tabular-nums text-zinc-950">{t.total_paquetes || 0}</p></div>
                             <div className="text-center"><p className="text-[9px] font-black text-zinc-300 uppercase mb-1">Caja</p><p className="text-lg font-[1000] tabular-nums text-emerald-600">{formatEUR(t.ingreso_historico_local)}</p></div>
                             <div className="text-center"><p className="text-[9px] font-black text-zinc-300 uppercase mb-1">IA Cost</p><p className="text-lg font-[1000] tabular-nums text-rose-500">{formatMicroEUR(t.ai_cost)}</p></div>
                          </div>
                          <div className="mt-8 pt-6 border-t border-zinc-50 flex items-center justify-between">
                             <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-zinc-400">
                                <div className={`w-1.5 h-1.5 rounded-full ${t.ultima_actividad && (new Date() - new Date(t.ultima_actividad) < 3600000) ? 'bg-emerald-500' : 'bg-zinc-200'}`} />
                                {timeAgo(t.ultima_actividad)}
                             </div>
                             <p className="text-[8px] font-black text-zinc-300 uppercase">{t.ai_scans_count || 0} escaneos IA</p>
                          </div>
                       </motion.div>
                     ))}
                     {processedTenants.length === 0 && <div className="col-span-full py-20 text-center text-[10px] font-black text-zinc-300 uppercase tracking-widest italic">No se han encontrado negocios con ese criterio.</div>}
                  </div>
               </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
