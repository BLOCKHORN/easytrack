import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../utils/supabaseClient";
import {
  ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, AreaChart, Area,
} from "recharts";
import {
  buildAreaApiBase, getSnapshots, createSnapshot, getFinanceSettings, updateFinanceSettings
} from "../../services/areaPersonalService";

import PinGate from "../../components/Auth/PinGate";
import { getCarrierLogo, getInitials, ImageFallback } from '../UI/CarrierLogo';

const IconEuro = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/></svg>;
const IconChart = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>;
const IconTrendingUp = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const IconTrendingDown = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>;
const IconTruck = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
const IconSave = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const IconHistory = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>;
const IconSparkles = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>;
const IconTimes = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

const toLocalDate = (d) => new Date(d);
const COLORS = ["#14b8a6", "#6366f1", "#f59e0b", "#ec4899", "#8b5cf6", "#0ea5e9", "#10b981", "#f43f5e", "#84cc16", "#a855f7"];

export default function AreaPersonal() {
  const { tenantSlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const apiBase = useMemo(() => buildAreaApiBase(location.pathname), [location.pathname]);
  
  const isLocal = /^(localhost|127\.0\.0\.1|.*\.ngrok-free\.dev|.*\.devtunnels\.ms)$/.test(window.location.hostname);
  const PROD_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  const API_ROOT = isLocal ? '' : PROD_URL;
  const configApiBase = tenantSlug ? `${API_ROOT}/${tenantSlug}/api/dashboard` : `${API_ROOT}/api/dashboard`;

  const [entitlements, setEntitlements] = useState(null);
  const [tab, setTab] = useState("actual");
  const [resumen, setResumen] = useState(null);
  const [mensualSrv, setMensualSrv] = useState([]);
  const [porEmpresa, setPorEmpresa] = useState([]);
  const [topClientes, setTopClientes] = useState([]);
  const [diario, setDiario] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [goalServer, setGoalServer] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loadingSnap, setLoadingSnap] = useState(false);
  const [yearFilter, setYearFilter] = useState("all");

  const fetchJson = async (url, headers) => {
    const res = await fetch(url, { headers });
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await res.json() : await res.text();
    if (!res.ok) throw new Error((data && data.error) || `Error ${res.status}`);
    return data;
  };

  const loadAllData = async () => {
    try {
      setLoading(true); setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa.");
      const headers = { Authorization: `Bearer ${session.access_token}`, Accept: "application/json" };

      const [d1, d2, d3, d4, d5, g, neg] = await Promise.all([
        fetchJson(`${apiBase}/resumen`, headers).catch(e => ({ __error: e })),
        fetchJson(`${apiBase}/mensual`, headers).catch(e => ({ __error: e })),
        fetchJson(`${apiBase}/por-empresa`, headers).catch(e => ({ __error: e })),
        fetchJson(`${apiBase}/top-clientes`, headers).catch(e => ({ __error: e })),
        fetchJson(`${apiBase}/diario`, headers).catch(e => ({ __error: e })),
        getFinanceSettings(apiBase, session.access_token).catch(() => ({ settings: null })),
        fetchJson(`${configApiBase}/negocio`, headers).catch(() => null)
      ]);
      
      const firstErr = [d1, d2, d3, d4].find(x => x?.__error)?.__error;
      if (firstErr) throw firstErr;

      setEntitlements(neg?.entitlements || null);
      setResumen(d1?.resumen || null);
      setMensualSrv(Array.isArray(d2?.mensual) ? d2.mensual : []);
      setPorEmpresa(Array.isArray(d3?.porEmpresa) ? d3.porEmpresa : []);
      setTopClientes(Array.isArray(d4?.topClientes) ? d4.topClientes : []);

      const diarioArr = Array.isArray(d5?.diario) ? d5.diario : [];
      setDiario(diarioArr.map(x => ({
        fecha: x.fecha,
        ingresos: Number(x.ingresos || 0),
        entregas: Number(x.entregas || 0),
      })));
      setGoalServer(Number(g?.settings?.goal_annual_eur || 0) || null);
      
      const { snapshots: list = [] } = await getSnapshots(apiBase, session.access_token, {});
      setSnapshots(list);

    } catch (e) {
      setError(e.message || "Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAllData(); }, [apiBase]);

  const canView = entitlements?.features?.canViewFinancialArea ?? true;
  const activeYear = String(new Date().getFullYear());

  // BI METRICS
  const ingresosMesActual = Number(resumen?.ingresoMesActual || 0);
  const proyeccionMes     = Number(resumen?.proyeccionMes || 0);
  const avgTicketGlobal   = Number(resumen?.avgTicketGlobal || 0.40);
  const ingresoHoy        = Number(resumen?.ingresoHoy || 0);
  const ingresoAyer       = Number(resumen?.ingresoAyer || 0);
  const crecimientoHoy    = ingresoAyer > 0 ? ((ingresoHoy - ingresoAyer) / ingresoAyer) * 100 : 0;
  const ticketMedioTotal  = Number(resumen?.total_entregas) ? Number(resumen.total_ingresos) / Number(resumen.total_entregas) : 0;
  const powerIndex        = avgTicketGlobal > 0 ? ((ticketMedioTotal / avgTicketGlobal) - 1) * 100 : 0;

  const todayDate = new Date();
  const daysInMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - todayDate.getDate();

  const totalEmpresas = porEmpresa.reduce((a, c) => a + Number(c.total || 0), 0);
  const empresas = useMemo(() => porEmpresa.map((e, i) => ({
    ...e,
    total: Number(e.total || 0),
    entregas: Number(e.entregas || 0),
    pct: totalEmpresas ? (Number(e.total) / totalEmpresas) * 100 : 0,
    color: COLORS[i % COLORS.length],
  })).sort((a, b) => b.total - a.total), [porEmpresa, totalEmpresas]);

  const formatEUR = (n = 0) => new Intl.NumberFormat('es-ES', { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
  
  const Delta = ({ value, label = "" }) => {
    const isUp = value >= 0;
    const Icon = isUp ? IconTrendingUp : IconTrendingDown;
    return (
      <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${isUp ? "text-emerald-500" : "text-rose-500"}`}>
        <div className={`p-1 rounded-md ${isUp ? 'bg-emerald-50' : 'bg-rose-50'}`}><Icon /></div>
        {isUp ? '+' : ''}{value.toFixed(1)}% <span className="text-zinc-400 font-bold ml-0.5">{label}</span>
      </div>
    );
  };

  const d_ingresosMesActual = canView ? ingresosMesActual : 450.20;
  const d_proyeccionMes     = canView ? proyeccionMes : 1240.00;
  const d_ingresoHoy        = canView ? ingresoHoy : 42.30;
  const d_crecimientoHoy    = canView ? crecimientoHoy : 12.5;
  const d_ticketMedioTotal  = canView ? ticketMedioTotal : 0.44;
  const d_powerIndex        = canView ? powerIndex : 8.2;
  const d_mensualSrv        = canView ? mensualSrv : [
    { mes: "Ene", total_ingresos: 310 }, { mes: "Feb", total_ingresos: 420 }, { mes: "Mar", total_ingresos: 540 }, { mes: "Abr", total_ingresos: 675 }
  ];
  const d_empresas          = canView ? empresas : [
    { empresa_transporte: "Celeritas", pct: 35, total: 236.42, color: COLORS[0] },
    { empresa_transporte: "Amazon Logistics", pct: 20, total: 135.10, color: COLORS[1] },
    { empresa_transporte: "InPost", pct: 15, total: 101.32, color: COLORS[2] }
  ];
  const d_topClientes       = canView ? topClientes : [
    { nombre_cliente: "María García", total_entregas: 82, total_ingresos: 36.90 },
    { nombre_cliente: "John Doe", total_entregas: 50, total_ingresos: 22.50 },
    { nombre_cliente: "Elena Gómez", total_entregas: 31, total_ingresos: 13.95 }
  ];

  const snapshotsFiltered = useMemo(() => {
    let base = [...snapshots].sort((a, b) => new Date(a.taken_at) - new Date(b.taken_at));
    if (yearFilter !== "all") base = base.filter(s => new Date(s.taken_at).getFullYear() === Number(yearFilter));
    return base;
  }, [snapshots, yearFilter]);

  const yearsAvailable = useMemo(() => ["all", ...Array.from(new Set(snapshots.map(s => new Date(s.taken_at).getFullYear()))).sort((a, b) => a - b)], [snapshots]);

  const createSnapshotNow = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await createSnapshot(apiBase, session.access_token);
      loadAllData();
    } catch (e) { alert(e.message); }
  };

  return (
    <PinGate tenantSlug={tenantSlug}>
      <div className="pb-32 relative max-w-6xl mx-auto px-4 sm:px-6 font-sans text-zinc-950 selection:bg-brand-500/30">
        
        {/* NARRATIVE HEADER */}
        <header className="py-12 md:py-20 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-zinc-100 mb-16">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
             <h1 className="text-5xl md:text-8xl font-[1000] tracking-tighter leading-[0.85] text-zinc-950">
               Balance <br/> <span className="text-zinc-300 italic font-[900]">Económico</span>
             </h1>
             <div className="flex bg-zinc-100 p-1.5 rounded-2xl border border-zinc-200/60 w-fit shadow-inner">
                <button onClick={() => setTab("actual")} className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${tab === 'actual' ? 'bg-white text-zinc-950 shadow-md' : 'text-zinc-500 hover:text-zinc-700'}`}>Tiempo Real</button>
                <button onClick={() => setTab("historico")} className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${tab === 'historico' ? 'bg-white text-zinc-950 shadow-md' : 'text-zinc-500 hover:text-zinc-700'}`}>Histórico</button>
             </div>
          </motion.div>

          <div className="text-right hidden md:block pb-2">
             <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mb-2">Rendimiento de Red</p>
             <p className="text-xl font-[1000] text-zinc-950">Superior al <span className="text-emerald-600 underline decoration-emerald-100 underline-offset-4 decoration-8">85% de locales</span></p>
             <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2">Comparativa Easytrack España</p>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <div className="w-16 h-16 border-[6px] border-zinc-100 border-t-brand-500 rounded-full animate-spin" />
            <p className="text-sm font-black text-zinc-400 uppercase tracking-[0.3em] animate-pulse">Sincronizando finanzas...</p>
          </div>
        ) : error ? (
          <div className="p-12 bg-rose-50 text-rose-700 border border-rose-100 rounded-[3rem] text-center space-y-4 shadow-sm">
             <p className="text-lg font-black">{error}</p>
             <button onClick={loadAllData} className="px-10 py-4 bg-rose-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-rose-200 active:scale-95 transition-transform">Reintentar conexión</button>
          </div>
        ) : (
          <div className="relative">
            <AnimatePresence mode="wait">
              {tab === "actual" ? (
                <motion.div key="actual" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-28">
                  
                  {/* SECTION 1: HERO STORY */}
                  <section className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
                    <div className="lg:col-span-7 space-y-12">
                       <div className="space-y-4">
                         <p className="text-xs font-black text-brand-600 uppercase tracking-[0.5em] ml-1">Acumulado este mes</p>
                         <h2 className="text-8xl md:text-[120px] font-[1000] text-zinc-950 tracking-tighter tabular-nums leading-none">
                           {formatEUR(d_ingresosMesActual)}
                         </h2>
                       </div>
                       
                       <div className="p-12 bg-zinc-950 rounded-[4rem] text-white relative overflow-hidden shadow-2xl">
                          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 blur-[120px] rounded-full" />
                          <div className="relative z-10 space-y-10">
                             <span className="text-[10px] font-[1000] uppercase tracking-[0.4em] text-zinc-600">Estimación de Cierre</span>
                             
                             <div className="space-y-3">
                                <p className="text-5xl md:text-6xl font-[1000] tracking-tighter leading-none text-white tabular-nums">{formatEUR(d_proyeccionMes)}</p>
                                <p className="text-zinc-500 font-bold text-base italic">Proyección calculada según tu volumen actual</p>
                             </div>

                             <div className="space-y-5">
                                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-zinc-400">
                                   <span>Mes en curso</span>
                                   <span>Quedan {daysLeft} días</span>
                                </div>
                                <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-800">
                                   <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, ((daysInMonth - daysLeft) / daysInMonth) * 100)}%` }} className="h-full bg-brand-500 rounded-full shadow-[0_0_15px_rgba(20,184,166,0.4)]" />
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="lg:col-span-5 grid grid-cols-1 gap-8">
                       <div className="p-10 bg-white rounded-[3rem] border border-zinc-200 shadow-2xl shadow-zinc-200/30 space-y-8 group hover:scale-[1.02] transition-transform duration-500">
                          <div className="flex justify-between items-center">
                             <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Actividad de hoy</p>
                             <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-950 shadow-inner group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors"><IconEuro /></div>
                          </div>
                          <div className="space-y-2">
                             <div className="text-6xl font-[1000] text-zinc-950 tracking-tighter leading-none tabular-nums">{formatEUR(d_ingresoHoy)}</div>
                             <Delta value={d_crecimientoHoy} label="vs ayer" />
                          </div>
                       </div>

                       <div className="p-10 bg-zinc-50 rounded-[3rem] border border-zinc-100 space-y-8 group hover:scale-[1.02] transition-transform duration-500 shadow-sm">
                          <div className="flex justify-between items-center">
                             <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Ticket Medio por Paquete</p>
                             <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm border border-zinc-100 group-hover:bg-amber-50 transition-colors"><IconTruck /></div>
                          </div>
                          <div className="space-y-2">
                             <div className="text-6xl font-[1000] text-zinc-950 tracking-tighter leading-none tabular-nums">{formatEUR(d_ticketMedioTotal)}</div>
                             <Delta value={d_powerIndex} label="vs media nacional" />
                          </div>
                       </div>
                    </div>
                  </section>

                  {/* SECTION 2: INSIGHTS */}
                  <section className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-stretch">
                     <div className="lg:col-span-8 bg-zinc-50 rounded-[4rem] border border-zinc-100 p-12 md:p-16 space-y-12">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                           <div className="space-y-2">
                              <h3 className="text-3xl font-[1000] tracking-tight leading-none text-zinc-950">Historial de Ingresos</h3>
                              <p className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em]">Rendimiento acumulado total</p>
                           </div>
                           <div className="text-right bg-white px-8 py-5 rounded-[2rem] border border-zinc-100 shadow-sm">
                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Ganancia Histórica</p>
                              <p className="text-4xl font-[1000] text-zinc-950 tracking-tight leading-none tabular-nums">{formatEUR(Number(resumen?.total_ingresos || 0))}</p>
                           </div>
                        </div>
                        <div className="h-[350px] w-full">
                          <ResponsiveContainer>
                            <AreaChart data={d_mensualSrv}>
                              <defs>
                                <linearGradient id="colorIng" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.25} />
                                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="12 12" vertical={false} stroke="#e2e2e7" />
                              <XAxis dataKey="mes" tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 900 }} axisLine={false} tickLine={false} dy={25} />
                              <YAxis tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 900 }} axisLine={false} tickLine={false} dx={-25} />
                              <Tooltip contentStyle={{ borderRadius: '28px', border: 'none', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.2)', padding: '20px' }} />
                              <Area type="monotone" dataKey="total_ingresos" stroke="#14b8a6" fill="url(#colorIng)" strokeWidth={7} activeDot={{ r: 14, strokeWidth: 0, fill: '#09090b' }} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                     </div>

                     <div className="lg:col-span-4 space-y-8">
                        {/* TOP 10 CLIENTS TABLE */}
                        <div className="p-10 bg-white rounded-[3.5rem] border border-zinc-200 shadow-2xl shadow-zinc-200/40 flex flex-col space-y-10 relative overflow-hidden h-full">
                           <div className="space-y-2 relative z-10">
                              <p className="text-zinc-400 font-black text-[10px] uppercase tracking-[0.3em]">Ranking de Fidelidad</p>
                              <h4 className="text-3xl font-[1000] leading-none tracking-tighter">Top Clientes</h4>
                           </div>
                           
                           <div className="relative z-10 space-y-2.5 flex-1">
                              {canView ? (
                                d_topClientes.map((c, i) => (
                                  <div key={i} className={`flex items-center justify-between py-3.5 px-5 rounded-[1.25rem] transition-all duration-300 ${i === 0 ? 'bg-amber-50 text-amber-900 border border-amber-100/50 scale-[1.05] shadow-sm' : i === 1 ? 'bg-indigo-50 text-indigo-900 border border-indigo-100/50' : i === 2 ? 'bg-emerald-50 text-emerald-900 border border-emerald-100/50' : 'bg-transparent text-zinc-500 hover:bg-zinc-50 border border-transparent'}`}>
                                     <div className="flex items-center gap-4 min-w-0">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${i === 0 ? 'bg-amber-200' : i === 1 ? 'bg-indigo-200' : i === 2 ? 'bg-emerald-200' : 'bg-zinc-100'}`}>{i+1}</div>
                                        <span className="text-xs font-[1000] truncate uppercase tracking-tight">{c.nombre_cliente}</span>
                                     </div>
                                     <span className="text-xs font-[1000] tabular-nums whitespace-nowrap">{formatEUR(c.total_ingresos)}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="py-20 text-center text-zinc-300 font-black uppercase tracking-[0.2em] italic">Análisis Bloqueado</div>
                              )}
                           </div>
                        </div>
                     </div>
                  </section>

                  {/* SECTION 3: CARRIERS */}
                  <section className="space-y-16 pb-24 text-zinc-950">
                     <div className="text-center space-y-4">
                        <h3 className="text-5xl font-[1000] tracking-tighter">Socios Logísticos</h3>
                        <div className="w-20 h-1.5 bg-brand-500 mx-auto rounded-full" />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                        {d_empresas.map((e, idx) => (
                          <motion.div 
                            key={idx} 
                            initial={{ opacity: 0, y: 30 }} 
                            whileInView={{ opacity: 1, y: 0 }} 
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1, duration: 0.8 }}
                            className="bg-white p-12 rounded-[4rem] border border-zinc-100 hover:border-brand-500/20 transition-all hover:shadow-2xl group relative overflow-hidden"
                          >
                            <div className="flex flex-col items-center text-center space-y-8 relative z-10">
                               <div className="w-24 h-24 bg-zinc-50 rounded-[2.5rem] border border-zinc-100 flex items-center justify-center p-6 shadow-inner group-hover:scale-110 transition-transform duration-700 group-hover:bg-white">
                                  <ImageFallback 
                                    src={getCarrierLogo(e.empresa_transporte)}
                                    fallbackText={getInitials(e.empresa_transporte)}
                                    containerClassName="w-full h-full"
                                    imgClassName="max-w-full max-h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-700"
                                    fallbackClassName="text-lg font-black text-zinc-300 uppercase"
                                  />
                               </div>
                               <div className="space-y-1">
                                  <h4 className="text-xl font-[1000] text-zinc-950 uppercase tracking-tight">{e.empresa_transporte}</h4>
                                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">{e.pct.toFixed(1)}% de cuota</p>
                               </div>
                               <div className="w-full space-y-6">
                                  <div className="text-5xl font-[1000] text-zinc-950 tracking-tighter tabular-nums leading-none">{formatEUR(e.total)}</div>
                                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden p-0.5">
                                     <motion.div initial={{ width: 0 }} whileInView={{ width: `${e.pct}%` }} transition={{ duration: 1.5, delay: 0.3 }} className="h-full bg-zinc-950 rounded-full shadow-lg" />
                                  </div>
                               </div>
                            </div>
                            <div className="absolute top-0 right-0 w-48 h-48 bg-zinc-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-brand-50 transition-colors duration-700" />
                          </motion.div>
                        ))}
                     </div>
                  </section>

                </motion.div>
              ) : (
                <motion.div key="historico" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12 pb-20 font-sans">
                  <div className="bg-zinc-950 p-12 md:p-20 rounded-[4rem] shadow-2xl text-white space-y-10 relative overflow-hidden uppercase">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/10 blur-[150px] rounded-full pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row gap-12 justify-between items-center uppercase">
                       <div className="space-y-3">
                          <h3 className="text-4xl md:text-6xl font-[1000] tracking-tighter leading-none text-white">Archivo de <br/> Auditorías</h3>
                          <p className="text-zinc-500 font-bold normal-case text-lg">Historial sellado de tu rendimiento económico.</p>
                       </div>
                       <div className="flex flex-col sm:flex-row gap-6 w-full md:w-auto">
                          <div className="relative">
                             <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="w-full pl-8 pr-16 py-5 bg-zinc-900 border border-zinc-800 rounded-3xl text-sm font-black text-white outline-none appearance-none focus:border-brand-500 transition-colors shadow-xl">
                                {yearsAvailable.map(y => <option key={y} value={y}>{y === "all" ? "Todos los años" : y}</option>)}
                             </select>
                             <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600 font-black">↓</div>
                          </div>
                          <button onClick={createSnapshotNow} className="px-12 py-5 bg-brand-500 hover:bg-brand-400 text-white font-[1000] uppercase tracking-widest text-xs rounded-3xl transition-all shadow-2xl shadow-brand-500/30 active:scale-95">
                            Realizar Cierre Ahora
                          </button>
                       </div>
                    </div>
                  </div>
                  
                  {!canView ? (
                    <div className="p-32 text-center bg-white rounded-[5rem] border-2 border-zinc-100 border-dashed space-y-8 shadow-inner">
                       <div className="w-28 h-24 bg-zinc-50 rounded-[3rem] flex items-center justify-center text-zinc-300 mx-auto mb-6 shadow-inner font-black"><IconHistory /></div>
                       <div className="space-y-2">
                          <h3 className="text-3xl font-[1000] text-zinc-950 tracking-tighter uppercase">Historial Protegido</h3>
                          <p className="text-zinc-500 font-bold max-w-sm mx-auto leading-relaxed text-xl italic normal-case text-zinc-400">La generación de informes históricos es una función del <span className="text-brand-500 font-[1000]">Plan PRO</span>.</p>
                       </div>
                    </div>
                  ) : snapshotsFiltered.length === 0 && !loadingSnap ? (
                    <div className="p-32 text-center bg-white rounded-[5rem] border border-zinc-100 shadow-inner">
                       <p className="text-zinc-400 font-black uppercase tracking-[0.4em] italic">No hay registros guardados en este periodo.</p>
                    </div>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </PinGate>
  );
}
