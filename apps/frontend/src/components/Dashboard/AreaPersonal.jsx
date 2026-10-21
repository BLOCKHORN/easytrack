import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../../utils/fetcher";
import {
  ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, AreaChart, Area,
} from "recharts";
import {
  buildAreaApiBase, getSnapshots, createSnapshot, getFinanceSettings, updateFinanceSettings
} from "../../services/areaPersonalService";

import PinGate from "../../components/Auth/PinGate";
import { getCarrierLogo, getInitials, ImageFallback } from '../UI/CarrierLogo';
import { getPinStatus } from "../../services/pinService";

const IconEuro = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/></svg>;
const IconTrendingUp = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const IconTrendingDown = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>;
const IconHistory = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>;
const IconShield = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;

const toLocalDate = (d) => new Date(d);
const COLORS = ["#14b8a6", "#6366f1", "#f59e0b", "#ec4899", "#8b5cf6", "#0ea5e9", "#10b981", "#f43f5e", "#84cc16", "#a855f7"];

export default function AreaPersonal() {
  const { tenantSlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const apiBase = useMemo(() => buildAreaApiBase(location.pathname), [location.pathname]);
  
  const isLocal = /^(localhost|127\.0\.0\.1|100\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|.*\.ngrok-free\.dev|.*\.devtunnels\.ms|.*easytrack\.pro|.*easytrack\.es)$/.test(window.location.hostname);
  const PROD_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  const API_ROOT = isLocal ? '' : PROD_URL;
  const configApiBase = tenantSlug ? `${API_ROOT}/${tenantSlug}/api/dashboard` : `${API_ROOT}/api/dashboard`;

  const [entitlements, setEntitlements] = useState(null);
  const [tab, setTab] = useState("actual");
  const [resumen, setResumen] = useState(null);
  const [mensualSrv, setMensualSrv] = useState([]);
  const [porEmpresa, setPorEmpresa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [yearFilter, setYearFilter] = useState("all");
  const [pinEnabled, setPinEnabled] = useState(false);

  const fetchJson = async (url) => {
    const res = await apiFetch(url, { headers: { Accept: "application/json" } });
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await res.json() : await res.text();
    if (!res.ok) throw new Error((data && data.error) || `Error ${res.status}`);
    return data;
  };

  const loadAllData = async () => {
    try {
      setLoading(true); setError(null);

      const [d1, d2, d3, d5, g, neg, pinS] = await Promise.all([
        fetchJson(`${apiBase}/resumen`).catch(e => ({ __error: e })),
        fetchJson(`${apiBase}/mensual`).catch(e => ({ __error: e })),
        fetchJson(`${apiBase}/por-empresa`).catch(e => ({ __error: e })),
        fetchJson(`${apiBase}/diario`).catch(e => ({ __error: e })),
        getFinanceSettings(apiBase, null).catch(() => ({ settings: null })),
        fetchJson(`${configApiBase}/negocio`).catch(() => null),
        getPinStatus(tenantSlug).catch(() => ({ enabled: false }))
      ]);
      
      const firstErr = [d1, d2, d3].find(x => x?.__error)?.__error;
      if (firstErr) throw firstErr;

      setEntitlements(neg?.entitlements || null);
      setResumen(d1?.resumen || null);
      setMensualSrv(Array.isArray(d2?.mensual) ? [...d2.mensual].reverse() : []);
      setPorEmpresa(Array.isArray(d3?.porEmpresa) ? d3.porEmpresa : []);
      setPinEnabled(!!pinS.enabled);

      const { snapshots: list = [] } = await getSnapshots(apiBase, null, {});
      setSnapshots(list);
    } catch (e) { setError(e.message || "Error cargando datos"); } finally { setLoading(false); }
  };

  useEffect(() => { loadAllData(); }, [apiBase, tenantSlug]);

  const canView = entitlements?.features?.canViewFinancialArea ?? true;
  const activeYear = String(new Date().getFullYear());

  const ingresosMesActual = Number(resumen?.ingresoMesActual || 0);
  const proyeccionMes     = Number(resumen?.proyeccionMes || 0);
  const ingresoHoy        = Number(resumen?.ingresoHoy || 0);
  const crecimientoHoy    = Number(resumen?.ingresoAyer) > 0 ? ((ingresoHoy - Number(resumen.ingresoAyer)) / Number(resumen.ingresoAyer)) * 100 : 0;
  const ticketMedioTotal  = Number(resumen?.total_entregas) ? Number(resumen.total_ingresos) / Number(resumen.total_entregas) : 0;
  const avgTicketGlobal   = Number(resumen?.avgTicketGlobal || 0.40);
  const powerIndex        = avgTicketGlobal > 0 ? ((ticketMedioTotal / avgTicketGlobal) - 1) * 100 : 0;

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - today.getDate();

  const totalEmpresas = porEmpresa.reduce((a, c) => a + Number(c.total || 0), 0);
  const empresas = useMemo(() => porEmpresa.map((e, i) => ({
    ...e, total: Number(e.total || 0), pct: totalEmpresas ? (Number(e.total) / totalEmpresas) * 100 : 0, color: COLORS[i % COLORS.length],
  })).sort((a, b) => b.total - a.total), [porEmpresa, totalEmpresas]);

  const formatEUR = (n = 0) => new Intl.NumberFormat('es-ES', { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
  
  const Delta = ({ value, label = "" }) => {
    const isUp = value >= 0;
    const Icon = isUp ? IconTrendingUp : IconTrendingDown;
    return (
      <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${isUp ? "text-emerald-500" : "text-rose-500"}`}>
        <Icon /> {isUp ? '+' : ''}{value.toFixed(1)}% <span className="text-zinc-400 ml-0.5">{label}</span>
      </div>
    );
  };

  const d_ingresosMesActual = canView ? ingresosMesActual : 450.20;
  const d_proyeccionMes     = canView ? proyeccionMes : 1240.00;
  const d_ingresoHoy        = canView ? ingresoHoy : 42.30;
  const d_crecimientoHoy    = canView ? crecimientoHoy : 12.5;

  const yearsAvailable = useMemo(() => ["all", ...Array.from(new Set(snapshots.map(s => new Date(s.taken_at).getFullYear()))).sort((a, b) => a - b)], [snapshots]);

  const createSnapshotNow = async () => {
    try {
      await createSnapshot(apiBase, null);
      loadAllData();
    } catch (e) { alert(e.message); }
  };

  const KPIStrip = ({ label, val, sub, color = "text-zinc-950" }) => (
    <div className="p-3.5 sm:p-6 bg-white border border-zinc-200/80 rounded-xl sm:rounded-2xl shadow-sm flex flex-col justify-center transition-colors">
       <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 sm:mb-2">{label}</p>
       <div className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${color} leading-none mb-1 tabular-nums`}>{val}</div>
       {sub && <div className="mt-1">{sub}</div>}
    </div>
  );

  return (
    <PinGate tenantSlug={tenantSlug}>
      <div className="pb-20 max-w-7xl mx-auto px-2 sm:px-8 font-sans text-zinc-950">
        
        {/* HEADER & SECURITY BANNER */}
        <header className="py-3 sm:py-8 border-b border-zinc-100 mb-4 sm:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
          <div className="space-y-3">
             <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-950 leading-tight">
               Balance <span className="text-zinc-400 font-medium italic">Financiero</span>
             </h1>
             <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200/60 w-fit">
                <button onClick={() => setTab("actual")} className={`px-4 sm:px-6 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${tab === 'actual' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>Actual</button>
                <button onClick={() => setTab("historico")} className={`px-4 sm:px-6 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${tab === 'historico' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>Auditorías</button>
             </div>
          </div>

          {!pinEnabled && (
            <motion.div 
               onClick={() => navigate(tenantSlug ? `/${tenantSlug}/dashboard/configuracion` : '/dashboard/configuracion')} 
               initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} 
               className="p-3 sm:p-4 bg-amber-50/80 rounded-xl border border-amber-200/70 cursor-pointer hover:bg-amber-100/70 transition-colors max-w-sm shadow-sm"
            >
               <div className="flex items-center gap-2 text-amber-700 mb-1">
                  <IconShield /><span className="text-[10px] font-bold uppercase tracking-wider">Seguridad Recomendada</span>
               </div>
               <p className="text-xs font-semibold text-amber-900 leading-tight">Configura un PIN para proteger la caja frente a terceros.</p>
            </motion.div>
          )}
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4"><div className="w-8 h-8 border-3 border-zinc-200 border-t-brand-600 rounded-full animate-spin" /><p className="text-xs font-bold text-zinc-400 uppercase tracking-wider animate-pulse">Sincronizando caja...</p></div>
        ) : (
          <AnimatePresence mode="wait">
            {tab === "actual" ? (
              <motion.div key="actual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4 sm:space-y-6">
                
                {/* 3 TACTICAL ROWS OF FINANCE */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
                   <KPIStrip label="Acumulado este Mes" val={formatEUR(d_ingresosMesActual)} sub={<div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex justify-between"><span>Día {today.getDate()} de {daysInMonth}</span><span>{daysLeft} d. restantes</span></div>} />
                   <KPIStrip label="Proyección Cierre" val={formatEUR(d_proyeccionMes)} color="text-indigo-600" sub={<p className="text-[9px] font-medium text-indigo-500 uppercase tracking-wider">Basado en volumen actual</p>} />
                   <KPIStrip label="Caja de Hoy" val={formatEUR(d_ingresoHoy)} color="text-emerald-600" sub={<Delta value={d_crecimientoHoy} label="vs ayer" />} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                   <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 flex items-center justify-between">
                      <div>
                         <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Capital en Estantes</p>
                         <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-zinc-950">{formatEUR(resumen?.capital_retenido)}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Stock Vivo</p>
                         <p className="text-lg sm:text-xl font-bold tabular-nums text-zinc-400">{resumen?.almacenActual} paq.</p>
                      </div>
                   </div>
                   <div className="bg-white border border-zinc-200/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 flex items-center justify-between shadow-sm">
                      <div>
                         <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Ticket Medio / Pack</p>
                         <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-zinc-950">{formatEUR(ticketMedioTotal)}</p>
                      </div>
                      <Delta value={powerIndex} label="vs red global" />
                   </div>
                </div>

                {/* VISUAL INTELLIGENCE */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6 items-stretch">
                   <div className="lg:col-span-8 bg-white border border-zinc-200/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                         <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Tendencia Mensual</h3>
                         <p className="text-lg sm:text-2xl font-extrabold tabular-nums text-zinc-950">{formatEUR(Number(resumen?.total_ingresos || 0))}<span className="text-[9px] font-bold text-zinc-400 uppercase ml-2 tracking-wider">Histórico</span></p>
                      </div>
                      <div className="h-[200px] sm:h-[280px] w-full">
                        <ResponsiveContainer>
                          <AreaChart data={mensualSrv}>
                            <defs><linearGradient id="cI" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7C3AED" stopOpacity={0.15}/><stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/></linearGradient></defs>
                            <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f4f4f7" />
                            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#71717a', fontWeight: 700 }} axisLine={false} tickLine={false} dy={10} />
                            <YAxis hide />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '8px' }} />
                            <Area type="monotone" dataKey="total_ingresos" stroke="#7C3AED" strokeWidth={3} fill="url(#cI)" animationDuration={600} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                   </div>
                   <div className="lg:col-span-4 bg-zinc-950 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white flex flex-col justify-center space-y-3 sm:space-y-4 shadow-md relative overflow-hidden">
                      <div className="space-y-0.5 relative z-10">
                         <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider">Optimización</p>
                         <h4 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight">Renta por Estante</h4>
                      </div>
                      <div className="space-y-3 relative z-10">
                         <p className="text-3xl sm:text-4xl font-extrabold tabular-nums text-brand-400">{(d_ingresosMesActual / 25).toFixed(2)}€</p>
                         <p className="text-xs font-normal text-zinc-400 leading-relaxed">Beneficio medio por balda física este mes. Rendimiento superior al periodo anterior.</p>
                      </div>
                   </div>
                </div>

                {/* CARRIERS STRIP: AT COLOR */}
                <div className="bg-white border border-zinc-200/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-sm">
                   <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-4 text-center">Beneficio por Agencia</h3>
                   <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4">
                      {empresas.map((e, idx) => (
                        <div key={idx} className="flex flex-col items-center text-center space-y-2 group p-2 rounded-lg hover:bg-zinc-50 transition-colors">
                           <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-50 rounded-xl flex items-center justify-center p-2 border border-zinc-200/80 group-hover:bg-white transition-colors">
                              <ImageFallback src={getCarrierLogo(e.empresa_transporte)} fallbackText={getInitials(e.empresa_transporte)} containerClassName="w-full h-full" imgClassName="max-w-full max-h-full object-contain transition-all" fallbackClassName="text-[9px] font-bold text-zinc-400" />
                           </div>
                           <div className="space-y-0.5">
                              <p className="text-xs font-bold tabular-nums text-zinc-950 leading-none">{formatEUR(e.total)}</p>
                              <p className="text-[8px] font-medium text-zinc-400 uppercase tracking-tight leading-none">{e.pct.toFixed(0)}% cuota</p>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

              </motion.div>
            ) : (
              <motion.div key="historico" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 sm:space-y-6">
                <div className="bg-zinc-950 p-6 sm:p-10 rounded-xl sm:rounded-2xl shadow-md text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                   <div className="space-y-2 relative z-10 text-center md:text-left">
                      <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">Auditorías de Cierre</h3>
                      <p className="text-zinc-400 text-sm font-normal">Historial sellado de ingresos y operaciones.</p>
                   </div>
                   <div className="flex flex-col sm:flex-row gap-3 relative z-10 w-full sm:w-auto">
                      <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-white outline-none focus:border-brand-500 transition-colors">
                        {yearsAvailable.map(y => <option key={y} value={y}>{y === "all" ? "Todos los años" : y}</option>)}
                      </select>
                      <button onClick={createSnapshotNow} className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold uppercase tracking-wider text-xs rounded-xl transition-transform active:scale-[0.97]">Realizar Cierre</button>
                   </div>
                </div>
                {!canView && (
                   <div className="py-16 text-center bg-white rounded-2xl border border-zinc-200 border-dashed space-y-4">
                      <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 mx-auto mb-2"><IconHistory /></div>
                      <h3 className="text-lg font-bold text-zinc-950 tracking-tight">Historial Protegido</h3>
                      <p className="text-zinc-500 text-xs max-w-sm mx-auto leading-relaxed">La generación de informes históricos es una función del <span className="text-brand-600 font-bold">Plan PRO</span>.</p>
                   </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </PinGate>
  );
}
