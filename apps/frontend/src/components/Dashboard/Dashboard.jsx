import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate, useParams, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from "recharts";
import AnadirPaquete from "./AnadirPaquete";
import DashboardSkeleton from "./DashboardSkeleton";
import { apiFetch } from "../../utils/fetcher";
import PlanBadge from '../../components/Billing/PlanBadge';
import { getCarrierLogo, getInitials, ImageFallback } from '../UI/CarrierLogo';
import { getPinStatus } from "../../services/pinService";

let __DASHBOARD_CACHE = {
  loaded: false,
  negocio: null, entitlements: null, slug: null,
  resumen: { recibidosHoy: 0, entregadosHoy: 0, almacenActual: 0, capital_retenido: 0, total_ingresos: 0, ingresoHoy: 0, huerfanosMaestros: [], diario: [] },
  actividad: []
};

const IconPlus = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const IconClose = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const IconPhone = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const IconLock = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconClock = ({ className = "" }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

const formatEUR = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n || 0);
const calcularDias = (f) => f ? Math.floor((new Date() - new Date(f)) / 86400000) : 0;
const ymd = (d) => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : null;
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

export default function Dashboard(props) {
  const { tenantSlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const contextData = useOutletContext() || {};
  const paquetes = contextData.paquetes || props.paquetes || [];
  const actualizarPaquetes = contextData.actualizarPaquetes || props.actualizarPaquetes;
  const paquetesHash = useMemo(() => paquetes.map(p => `${p.id}-${p.entregado}`).join('|'), [paquetes]);

  const apiBase = useMemo(() => {
    const isLocal = /^(localhost|127\.0\.0\.1|100\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|.*\.ngrok-free\.dev|.*\.devtunnels\.ms|.*easytrack\.pro|.*easytrack\.es)$/.test(window.location.hostname);
    const API_URL = isLocal ? "" : (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
    const segs = location.pathname.split("/").filter(Boolean);
    if (segs.length >= 2 && (segs[1] === "dashboard" || segs[1] === "area-personal")) return `${API_URL}/${segs[0]}/api/dashboard`;
    return `${API_URL}/api/dashboard`;
  }, [location.pathname]);
  
  const [mostrarModal, setMostrarModal] = useState(false);
  const [negocio, setNegocio] = useState(__DASHBOARD_CACHE.negocio);
  const [entitlements, setEntitlements] = useState(__DASHBOARD_CACHE.entitlements);
  const [slug, setSlug] = useState(__DASHBOARD_CACHE.slug);
  const [cargando, setCargando] = useState(!__DASHBOARD_CACHE.loaded);
  const [resumen, setResumen] = useState(__DASHBOARD_CACHE.resumen);
  const [actividad, setActividad] = useState(__DASHBOARD_CACHE.actividad);
  const [diasHuerfano, setDiasHuerfano] = useState(3);
  const [topClientes, setTopClientes] = useState([]);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [sessionUnlocked, setSessionUnlocked] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [nRes, rRes, actRes, finRes, tcRes, pinS] = await Promise.all([
          apiFetch(`${apiBase}/negocio`),
          apiFetch(`${apiBase}/resumen`),
          apiFetch(`${apiBase.replace('dashboard', 'paquetes')}/recientes`).then(r => r.json()).then(d => ({ data: d?.paquetes || [] })).catch(() => ({ data: [] })),
          apiFetch(`${apiBase.replace('dashboard', 'area-personal')}/resumen`).catch(() => null),
          apiFetch(`${apiBase.replace('dashboard', 'area-personal')}/top-clientes`).catch(() => null),
          getPinStatus(tenantSlug).catch(() => ({ enabled: false }))
        ]);

        const n = nRes?.ok ? await nRes.json().catch(() => ({})) : {};
        const r = rRes?.ok ? await rRes.json().catch(() => ({})) : {};
        const f = finRes?.ok ? await finRes.json().catch(() => null) : null;
        const tc = tcRes?.ok ? await tcRes.json().catch(() => null) : null;

        if (cancel) return;

        setPinEnabled(!!pinS?.enabled);
        setSessionUnlocked(sessionStorage.getItem(`et_pin_${tenantSlug}`) === "unlocked");

        const newRes = {
          recibidosHoy: r.resumen?.hoy_recibidos ?? 0,
          entregadosHoy: r.resumen?.hoy_entregados ?? 0,
          almacenActual: r.resumen?.pendientes ?? 0,
          capital_retenido: r.resumen?.capital_retenido ?? 0,
          total_ingresos: f?.resumen?.total_ingresos ?? 0,
          ingresoHoy: f?.resumen?.ingresoHoy ?? 0,
          huerfanosMaestros: r.huerfanos || [],
          diario: r.diario || []
        };

        setNegocio(n?.negocio || n); 
        setEntitlements(n?.entitlements || null); 
        setResumen(newRes); 
        setSlug(n?.negocio?.slug || n?.slug);
        if (!actRes?.error && actRes?.data) setActividad(actRes.data);
        if (tc?.topClientes) setTopClientes(tc.topClientes);

        __DASHBOARD_CACHE = { 
          loaded: true, 
          negocio: n?.negocio || n, 
          entitlements: n?.entitlements, 
          slug: n?.negocio?.slug || n?.slug, 
          resumen: newRes, 
          actividad: actRes?.data || [] 
        };
      } catch (e) {
        console.error("Error en Dashboard:", e);
      } finally {
        if (!cancel) setCargando(false);
      }
    })();
    return () => { cancel = true; };
  }, [apiBase, paquetesHash, tenantSlug]);

  const chartData = useMemo(() => {
    if (!resumen.diario?.length) return [];
    const bd = new Date(); const map = {};
    for (let i = 13; i >= 0; i--) { const d = addDays(bd, -i); map[ymd(d)] = { date: ymd(d), in: 0, out: 0 }; }
    resumen.diario.forEach(d => { const k = d.fecha?.split("T")[0]; if (k && map[k]) { map[k].in = d.recibidos; map[k].out = d.entregados; } });
    return Object.values(map);
  }, [resumen.diario]);

  const huerfanos = useMemo(() => resumen.huerfanosMaestros.filter(p => calcularDias(p.fecha_llegada) >= diasHuerfano), [resumen.huerfanosMaestros, diasHuerfano]);

  if (cargando) return <DashboardSkeleton />;

  const go = (path) => { if (slug) navigate(`/${slug}${path}`); else navigate(path); };

  const handleEntregarHuerfano = async (id) => {
    try {
      setResumen(prev => ({
        ...prev,
        huerfanosMaestros: prev.huerfanosMaestros.filter(p => p.id !== id),
        almacenActual: Math.max(0, prev.almacenActual - 1),
        entregadosHoy: prev.entregadosHoy + 1
      }));
      await apiFetch(`${apiBase.replace('dashboard', 'paquetes')}/entregar/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (actualizarPaquetes) actualizarPaquetes();
    } catch (e) {
      console.error(e);
    }
  };

  const LockedValue = ({ children, isLocked }) => {
    if (!isLocked) return children;
    return (
      <div onClick={() => go('/area-personal')} className="group/lock flex items-center gap-2 cursor-pointer bg-zinc-50 px-3 py-1 rounded-lg border border-dashed border-zinc-200 hover:border-brand-500 transition-colors">
         <IconLock className="text-zinc-300 group-hover/lock:text-brand-500" />
         <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest group-hover/lock:text-brand-600 transition-colors">Ver PIN</span>
      </div>
    );
  };

  const isFinanceLocked = pinEnabled && !sessionUnlocked;

  return (
    <div className="pb-16 max-w-7xl mx-auto px-2 sm:px-8 font-sans text-zinc-950">
      
      {/* 1. HEADER: BRAND ONLY */}
      <header className="py-3 sm:py-6 flex items-center justify-between gap-4 border-b border-zinc-100 mb-4 sm:mb-8">
        <div className="flex items-center gap-3">
           <h1 className="text-xl sm:text-3xl font-[1000] tracking-tight text-zinc-950 leading-none uppercase">
             {negocio?.nombre || negocio?.nombre_empresa || "Tu Negocio"}
           </h1>
           <PlanBadge />
        </div>
        <button onClick={() => setMostrarModal(true)} className="bg-zinc-950 hover:bg-brand-600 text-white px-4 sm:px-8 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-transform active:scale-[0.97] shadow-sm flex items-center gap-2 min-h-[40px]">
          <IconPlus /> <span className="hidden sm:inline">Registrar Paquete</span><span className="sm:hidden">Añadir</span>
        </button>
      </header>

      {/* 2. TACTICAL ROWS: 3 COMPACT BANDS ON MOBILE */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-8 text-zinc-950">
         {/* ROW 1: STOCK */}
         <div className="bg-white border border-zinc-200/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-6 shadow-sm flex flex-col justify-center">
            <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 sm:mb-4">Stock</p>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
               <span className="text-xl sm:text-4xl font-[1000] tracking-tighter tabular-nums leading-none">{resumen.almacenActual}</span>
               <div className="text-[8px] sm:text-[9px] font-bold text-zinc-400 uppercase leading-tight sm:leading-none">en almacén</div>
            </div>
         </div>

         {/* ROW 2: FLOW */}
         <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-6 shadow-sm flex flex-col justify-center">
            <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 sm:mb-4">Flujo Hoy</p>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-8 tabular-nums font-[1000]">
               <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-[8px] sm:text-[9px] font-bold text-zinc-400 uppercase">IN</span>
                  <span className="text-xs sm:text-2xl text-zinc-950 leading-none">+{resumen.recibidosHoy}</span>
               </div>
               <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-[8px] sm:text-[9px] font-bold text-zinc-400 uppercase">OUT</span>
                  <span className="text-xs sm:text-2xl text-emerald-600 leading-none">-{resumen.entregadosHoy}</span>
               </div>
            </div>
         </div>

         {/* ROW 3: CASH (PROTECTED) */}
         <div className="bg-white border border-zinc-200/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-6 shadow-sm flex flex-col justify-center">
            <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 sm:mb-4">Caja Hoy</p>
            <div className="h-6 sm:h-10 flex items-center">
               <LockedValue isLocked={isFinanceLocked}>
                  <span className="text-xs sm:text-3xl font-[1000] tracking-tighter text-emerald-600 tabular-nums leading-none">{formatEUR(resumen.ingresoHoy)}</span>
               </LockedValue>
            </div>
         </div>
      </div>

      {/* 3. OPERATIONAL GRID: DENSE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6 items-stretch mb-4 sm:mb-6">
        <div className="lg:col-span-8 bg-white border border-zinc-200/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-8 shadow-sm flex flex-col h-[220px] sm:h-[350px]">
           <div className="flex items-center justify-between mb-3 sm:mb-8">
              <h3 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-zinc-400">Actividad Operativa (14d)</h3>
              <div className="flex gap-3 sm:gap-4">
                 <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-500 uppercase"><span className="w-1.5 h-1.5 rounded-full bg-brand-500" /> In</div>
                 <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-500 uppercase"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Out</div>
              </div>
           </div>
           <div className="flex-1 w-full min-h-0">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f4f4f7" />
                 <XAxis dataKey="date" hide />
                 <YAxis hide />
                 <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '8px' }} />
                 <Bar dataKey="in" fill="#7C3AED" radius={[3, 3, 0, 0]} animationDuration={500} />
                 <Bar dataKey="out" fill="#10b981" radius={[3, 3, 0, 0]} animationDuration={500} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="lg:col-span-4 bg-zinc-950 rounded-xl sm:rounded-2xl p-4 sm:p-8 text-white shadow-md relative overflow-hidden flex flex-col h-[220px] sm:h-[350px]">
           <h3 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-3 sm:mb-8 text-center">Últimas Operaciones</h3>
           <div className="flex-1 space-y-3 sm:space-y-4 overflow-y-auto pr-1 custom-scrollbar relative z-10">
              {actividad.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500 font-medium">Sin operaciones recientes.</div>
              ) : actividad.map(pkg => (
                <div key={pkg.id} className="flex gap-3 group items-center">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${pkg.entregado ? 'bg-emerald-500' : 'bg-brand-500'}`} />
                  <div className="min-w-0 flex-1">
                     <p className="text-xs font-bold uppercase tracking-tight group-hover:text-brand-400 transition-colors truncate leading-tight">{pkg.nombre_cliente}</p>
                     <p className="text-[9px] font-medium text-zinc-400 tracking-normal leading-tight">{pkg.empresa_transporte} · {new Date(pkg.updated_at).toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* 4. LOYALTY RANKING (NEW INTEGRATED BAND) */}
      <div className="bg-white border border-zinc-200/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-sm flex flex-col space-y-3 sm:space-y-4 mb-4 sm:mb-6">
         <div className="flex items-center justify-between border-b border-zinc-100 pb-2 sm:pb-3">
            <h3 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-zinc-400">Ranking Clientes VIP</h3>
            <span className="text-[9px] font-bold text-brand-600 uppercase tracking-wider">Top 5</span>
         </div>
         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            {topClientes.slice(0, 5).map((c, i) => (
              <div key={i} className={`flex items-center justify-between py-2 px-3 sm:py-3 sm:px-4 rounded-lg sm:rounded-xl border ${i === 0 ? 'bg-amber-50/60 text-amber-900 border-amber-200/60' : i === 1 ? 'bg-indigo-50/60 text-indigo-900 border-indigo-200/60' : i === 2 ? 'bg-emerald-50/60 text-emerald-900 border-emerald-200/60' : 'bg-zinc-50 text-zinc-600 border-zinc-200/80'}`}>
                 <div className="flex items-center gap-2 min-w-0 text-zinc-950">
                    <span className="text-[9px] font-black opacity-40 text-zinc-400">#{i+1}</span>
                    <span className="text-xs font-bold uppercase truncate">{c.nombre_cliente}</span>
                 </div>
                 <LockedValue isLocked={isFinanceLocked}>
                    <span className="text-xs font-bold tabular-nums text-zinc-950">{formatEUR(c.total_ingresos)}</span>
                 </LockedValue>
              </div>
            ))}
         </div>
      </div>

      {/* 5. AUDIT: MINIMAL FOOTER */}
      <div className="bg-white border border-zinc-200/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-sm text-zinc-950">
         <div className="flex items-center justify-between mb-4">
            <h3 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-zinc-400">Auditoría de Retención</h3>
            <select value={diasHuerfano} onChange={e => setDiasHuerfano(Number(e.target.value))} className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-transparent outline-none cursor-pointer">
               <option value={3}>+3 Días</option>
               <option value={7}>+7 Días</option>
            </select>
         </div>
         <div className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
            {huerfanos.length === 0 ? (
               <div className="py-8 text-center text-xs font-bold text-zinc-400 uppercase tracking-wider">Stock saneado.</div>
            ) : huerfanos.slice(0, 50).map(p => {
               const dias = calcularDias(p.fecha_llegada);
               const isCritical = dias >= 7;
               return (
                 <div key={p.id} className="group bg-white border border-zinc-200/80 hover:border-zinc-300 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-center p-1 shrink-0">
                        <ImageFallback src={getCarrierLogo(p.empresa_transporte)} fallbackText={getInitials(p.empresa_transporte)} containerClassName="w-full h-full" imgClassName="max-w-full max-h-full object-contain filter grayscale group-hover:grayscale-0 transition-all" fallbackClassName="text-[8px] font-bold text-zinc-400" />
                     </div>
                     <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-bold text-zinc-950 uppercase tracking-tight truncate pr-2">{p.nombre_cliente}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                           <span className="bg-zinc-900 text-white font-mono font-bold text-[10px] px-1.5 py-0.5 rounded">{p.ubicacion_label}</span>
                           <span className={`text-[10px] font-semibold flex items-center gap-1 ${isCritical ? 'text-rose-600' : 'text-zinc-500'}`}>
                              <IconClock className="w-3 h-3" /> {dias} días
                           </span>
                        </div>
                     </div>
                   </div>
                   
                   <div className="flex items-center gap-2 w-full md:w-auto pt-2 md:pt-0 border-t border-zinc-100 md:border-0">
                     {p.telefono ? (
                        <a href={`https://wa.me/34${p.telefono.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors min-h-[40px] active:scale-[0.97]">
                           <IconPhone /> Avisar
                        </a>
                     ) : (
                        <span className="flex-1 md:flex-none text-center text-[10px] font-medium text-zinc-400 italic px-3 py-2 bg-zinc-50 rounded-lg">Sin Tel.</span>
                     )}
                     <button onClick={() => handleEntregarHuerfano(p.id)} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-100 text-zinc-800 hover:bg-zinc-950 hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors min-h-[40px] active:scale-[0.97]">
                        <IconCheck /> Entregar
                     </button>
                   </div>
                 </div>
               );
            })}
         </div>
      </div>

      <AnimatePresence>
        {mostrarModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-950/75" onClick={() => setMostrarModal(false)} />
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col overflow-hidden border border-zinc-200 text-zinc-950">
              <div className="p-4 sm:p-6 border-b border-zinc-100 flex items-center justify-between text-zinc-950">
                <div><h3 className="text-lg sm:text-xl font-bold tracking-tight">Registro de Paquete</h3><p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Entrada rápida</p></div>
                <button onClick={() => setMostrarModal(false)} className="w-9 h-9 flex items-center justify-center bg-zinc-100 text-zinc-500 hover:text-zinc-950 rounded-lg transition-colors"><IconClose /></button>
              </div>
              <div className="p-4 sm:p-6 overflow-y-auto max-h-[80vh] custom-scrollbar text-zinc-950">
                <AnadirPaquete modoRapido paquetes={paquetes} actualizarPaquetes={actualizarPaquetes} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
