import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate, useParams, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";
import AnadirPaquete from "./AnadirPaquete";
import DashboardSkeleton from "./DashboardSkeleton";
import { supabase } from "../../utils/supabaseClient";
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
    const isLocal = /^(localhost|127\.0\.0\.1|.*\.ngrok-free\.dev|.*\.devtunnels\.ms)$/.test(window.location.hostname);
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
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const [nRes, rRes, actRes, finRes, pinS] = await Promise.all([
          fetch(`${apiBase}/negocio`, { headers: { Authorization: `Bearer ${session.access_token}` } }),
          fetch(`${apiBase}/resumen`, { headers: { Authorization: `Bearer ${session.access_token}` } }),
          supabase.from('packages').select('*').order('updated_at', { ascending: false }).limit(6),
          fetch(`${apiBase.replace('dashboard', 'area-personal')}/resumen`, { headers: { Authorization: `Bearer ${session.access_token}` } }).catch(() => null),
          getPinStatus(tenantSlug).catch(() => ({ enabled: false }))
        ]);

        const n = await nRes.json();
        const r = await rRes.json();
        const f = finRes ? await finRes.json() : null;

        if (cancel) return;

        setPinEnabled(!!pinS.enabled);
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

        setNegocio(n?.negocio || n); setEntitlements(n?.entitlements || null); setResumen(newRes); setSlug(n?.negocio?.slug || n?.slug);
        if (!actRes.error) setActividad(actRes.data);
        if (f?.topClientes) setTopClientes(f.topClientes);

        __DASHBOARD_CACHE = { loaded: true, negocio: n?.negocio || n, entitlements: n?.entitlements, slug: n?.negocio?.slug || n?.slug, resumen: newRes, actividad: actRes.data || [] };
        setCargando(false);
      } catch (e) { setCargando(false); }
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
    <div className="pb-16 max-w-7xl mx-auto px-4 sm:px-8 font-sans text-zinc-950">
      
      {/* 1. HEADER: BRAND ONLY */}
      <header className="py-6 flex items-center justify-between gap-6 border-b border-zinc-100 mb-8">
        <div className="flex items-center gap-4">
           <h1 className="text-2xl md:text-3xl font-[1000] tracking-tight text-zinc-950 leading-none uppercase">
             {negocio?.nombre || negocio?.nombre_empresa || "Tu Negocio"}
           </h1>
           <PlanBadge />
        </div>
        <button onClick={() => setMostrarModal(true)} className="bg-zinc-950 hover:bg-brand-600 text-white px-8 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg flex items-center gap-2">
          <IconPlus /> Registrar Paquete
        </button>
      </header>

      {/* 2. TACTICAL ROWS: 3 HARMONIOUS BANDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-zinc-950">
         {/* ROW 1: STOCK */}
         <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm flex flex-col justify-center">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Inventario</p>
            <div className="flex items-baseline gap-4">
               <span className="text-4xl font-[1000] tracking-tighter tabular-nums">{resumen.almacenActual}</span>
               <div className="text-[9px] font-black text-zinc-300 uppercase leading-none">Paquetes<br/>en stock</div>
            </div>
         </div>

         {/* ROW 2: FLOW */}
         <div className="bg-zinc-50 border border-zinc-100 rounded-3xl p-6 shadow-sm flex flex-col justify-center">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Flujo Diario</p>
            <div className="flex justify-between items-center gap-8 tabular-nums font-[1000]">
               <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-zinc-400 uppercase">IN</span>
                  <span className="text-2xl text-zinc-950">+{resumen.recibidosHoy}</span>
               </div>
               <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-zinc-400 uppercase">OUT</span>
                  <span className="text-2xl text-emerald-600">-{resumen.entregadosHoy}</span>
               </div>
            </div>
         </div>

         {/* ROW 3: CASH (PROTECTED) */}
         <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm flex flex-col justify-center">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Caja de Hoy</p>
            <div className="h-10 flex items-center">
               <LockedValue isLocked={isFinanceLocked}>
                  <span className="text-3xl font-[1000] tracking-tighter text-emerald-600 tabular-nums leading-none">{formatEUR(resumen.ingresoHoy)}</span>
               </LockedValue>
            </div>
         </div>
      </div>

      {/* 3. OPERATIONAL GRID: DENSE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-6">
        <div className="lg:col-span-8 bg-white border border-zinc-100 rounded-3xl p-8 shadow-sm flex flex-col h-[350px]">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Actividad Operativa (14d)</h3>
              <div className="flex gap-4">
                 <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-500 uppercase"><span className="w-1.5 h-1.5 rounded-full bg-brand-500" /> In</div>
                 <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-500 uppercase"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Out</div>
              </div>
           </div>
           <div className="flex-1 -ml-10">
             <ResponsiveContainer>
               <AreaChart data={chartData}>
                 <defs>
                   <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#14b8a6" stopOpacity={0.1}/><stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/></linearGradient>
                 </defs>
                 <XAxis dataKey="date" hide />
                 <YAxis hide />
                 <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', padding: '10px' }} />
                 <Area type="monotone" dataKey="in" stroke="#14b8a6" strokeWidth={4} fill="url(#gIn)" animationDuration={800} />
                 <Area type="monotone" dataKey="out" stroke="#10b981" strokeWidth={3} strokeDasharray="5 5" fill="transparent" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="lg:col-span-4 bg-zinc-950 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col h-[350px]">
           <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 mb-8 text-center">Operaciones</h3>
           <div className="flex-1 space-y-5 overflow-y-auto pr-2 custom-scrollbar relative z-10">
              {actividad.map(pkg => (
                <div key={pkg.id} className="flex gap-4 group">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${pkg.entregado ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-brand-500 shadow-[0_0_10px_rgba(20,184,166,0.4)]'}`} />
                  <div className="min-w-0">
                     <p className="text-[11px] font-[1000] uppercase tracking-tight group-hover:text-brand-400 transition-colors truncate leading-none mb-1">{pkg.nombre_cliente}</p>
                     <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none">{pkg.empresa_transporte} • {new Date(pkg.updated_at).toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* 4. LOYALTY RANKING (NEW INTEGRATED BAND) */}
      <div className="bg-white border border-zinc-100 rounded-3xl p-8 shadow-sm flex flex-col space-y-8 mb-6">
         <div className="flex items-center justify-between border-b border-zinc-50 pb-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Ranking de Fidelidad</h3>
            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Top 5 Clientes VIP</span>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {topClientes.slice(0, 5).map((c, i) => (
              <div key={i} className={`flex items-center justify-between py-4 px-5 rounded-2xl ${i === 0 ? 'bg-amber-50 text-amber-900 border border-amber-100/50 shadow-sm' : i === 1 ? 'bg-indigo-50 text-indigo-900 border border-indigo-100/50' : i === 2 ? 'bg-emerald-50 text-emerald-900 border border-emerald-100/50' : 'bg-zinc-50 text-zinc-500 border border-zinc-100'}`}>
                 <div className="flex items-center gap-3 min-w-0 text-zinc-950">
                    <span className="text-[10px] font-black opacity-30 italic text-zinc-400">#{i+1}</span>
                    <span className="text-xs font-[1000] uppercase truncate">{c.nombre_cliente}</span>
                 </div>
                 <LockedValue isLocked={isFinanceLocked}>
                    <span className="text-xs font-[1000] tabular-nums text-zinc-950">{formatEUR(c.total_ingresos)}</span>
                 </LockedValue>
              </div>
            ))}
         </div>
      </div>

      {/* 5. AUDIT: MINIMAL FOOTER */}
      <div className="bg-white border border-zinc-100 rounded-3xl p-8 shadow-sm text-zinc-950">
         <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Auditoría</h3>
            <select value={diasHuerfano} onChange={e => setDiasHuerfano(Number(e.target.value))} className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-transparent outline-none cursor-pointer">
               <option value={3}>+3 Días</option>
               <option value={7}>+7 Días</option>
            </select>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <tbody className="divide-y divide-zinc-50">
                {huerfanos.slice(0, 3).map(p => (
                  <tr key={p.id} className="group hover:bg-zinc-50 transition-all">
                    <td className="py-3 pr-4">
                      <p className="text-sm font-[1000] uppercase truncate max-w-[200px] text-zinc-950">{p.nombre_cliente}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                         <ImageFallback src={getCarrierLogo(p.empresa_transporte)} fallbackText={getInitials(p.empresa_transporte)} containerClassName="w-6 h-6" imgClassName="max-w-full max-h-full object-contain" fallbackClassName="text-[8px] font-black text-zinc-300" />
                         <span className="text-[10px] font-black text-zinc-400 uppercase">{p.empresa_transporte}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-zinc-900 font-black font-mono text-[10px] px-3 py-1 rounded-lg bg-zinc-100 border border-zinc-200">{p.ubicacion_label}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-[10px] font-black ${calcularDias(p.fecha_llegada) >= 7 ? 'text-rose-500' : 'text-zinc-400'}`}>{calcularDias(p.fecha_llegada)}D</span>
                    </td>
                    <td className="py-3 pl-4 text-right">
                       {p.telefono && <a href={`https://wa.me/34${p.telefono.replace(/\D/g,'')}`} target="_blank" className="p-2 text-emerald-600 hover:scale-110 transition-all inline-block"><IconPhone /></a>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
         </div>
      </div>

      <AnimatePresence>
        {mostrarModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-950/90 backdrop-blur-xl" onClick={() => setMostrarModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-zinc-200 text-zinc-950">
              <div className="p-10 border-b border-zinc-100 flex items-center justify-between text-zinc-950">
                <div><h3 className="text-2xl font-[1000] tracking-tight">Registro Manual</h3><p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-1">Entrada rápida</p></div>
                <button onClick={() => setMostrarModal(false)} className="w-12 h-12 flex items-center justify-center bg-zinc-50 text-zinc-400 hover:text-zinc-950 rounded-2xl transition-all"><IconClose /></button>
              </div>
              <div className="p-10 overflow-y-auto max-h-[75vh] custom-scrollbar text-zinc-950">
                <AnadirPaquete modoRapido paquetes={paquetes} actualizarPaquetes={actualizarPaquetes} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
