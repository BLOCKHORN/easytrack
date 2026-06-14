import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";
import AnadirPaquete from "./AnadirPaquete";
import DashboardSkeleton from "./DashboardSkeleton";
import { supabase } from "../../utils/supabaseClient";
import PlanBadge from '../../components/Billing/PlanBadge';

// --- SISTEMA DE CACHÉ EN MEMORIA (SWR) ---
let __DASHBOARD_CACHE = {
  loaded: false,
  negocio: null,
  entitlements: null,
  slug: null,
  configPendiente: false,
  resumen: {
    recibidosHoy: 0,
    entregadosHoy: 0,
    almacenActual: 0,
    huecosOcupados: 0,
    ocupacion: [],
    huerfanosMaestros: [],
    diario: []
  }
};

const IconPlus = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const IconClose = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const IconBoxIn = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/><path d="M12 8v4"/><path d="M8 4l8 4"/></svg>;
const IconBoxOut = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/><polyline points="16 12 12 8 8 12"/></svg>;
const IconStorage = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>;
const IconAlert = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IconPhone = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const IconCalendar = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconGrid = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>;
const IconRocket = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>;

const formatEUR = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n || 0);

const calcularDias = (fecha) => {
  if (!fecha) return 0;
  return Math.floor((new Date() - new Date(fecha)) / 86400000);
};

const ymd = (d) => { if (!d || isNaN(d)) return null; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dateObj = new Date(label);
    const dateStr = !isNaN(dateObj) ? dateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) : label;
    
    return (
      <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl shadow-xl">
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">{dateStr}</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span className="text-xs font-bold text-zinc-300">Entradas: <span className="text-white font-mono">{payload[0].value}</span></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-zinc-300">Salidas: <span className="text-white font-mono">{payload[1]?.value || 0}</span></span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function Dashboard(props) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const contextData = useOutletContext() || {};
  const paquetes = contextData.paquetes || props.paquetes || [];
  const actualizarPaquetes = contextData.actualizarPaquetes || props.actualizarPaquetes;

  const paquetesHash = useMemo(() => {
    return paquetes.map(p => `${p.id}-${p.entregado}`).join('|');
  }, [paquetes]);

  const apiBase = useMemo(() => {
    const isLocal = /^(localhost|127\.0\.0\.1|.*\.ngrok-free\.dev|.*\.devtunnels\.ms)$/.test(window.location.hostname);
    const PROD_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
    const API_URL = isLocal ? "" : PROD_URL;

    const segs = location.pathname.split("/").filter(Boolean);
    if (segs.length >= 2 && (segs[1] === "dashboard" || segs[1] === "area-personal")) {
      return `${API_URL}/${segs[0]}/api/dashboard`;
    }
    return `${API_URL}/api/dashboard`;
  }, [location.pathname]);
  
  const apiRoot = useMemo(() => {
    const isLocal = /^(localhost|127\.0\.0\.1|.*\.ngrok-free\.dev|.*\.devtunnels\.ms)$/.test(window.location.hostname);
    const PROD_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
    return isLocal ? "" : PROD_URL;
  }, []);

  const [mostrarModal, setMostrarModal] = useState(false);
  
  // Usamos el caché para inicializar los estados de forma instantánea
  const [negocio, setNegocio] = useState(__DASHBOARD_CACHE.negocio);
  const [entitlements, setEntitlements] = useState(__DASHBOARD_CACHE.entitlements);
  const [slug, setSlug] = useState(__DASHBOARD_CACHE.slug);
  const [cargandoNegocio, setCargandoNegocio] = useState(!__DASHBOARD_CACHE.loaded);
  const [configPendiente, setConfigPendiente] = useState(__DASHBOARD_CACHE.configPendiente);
  const [diasHuerfano, setDiasHuerfano] = useState(7);
  const [resumen, setResumen] = useState(__DASHBOARD_CACHE.resumen);

  const go = (path) => { 
    if (slug) navigate(`/${slug}${path.startsWith("/") ? path : `/${path}`}`); 
    else navigate(path.startsWith("/") ? path : `/${path}`);
  };

  useEffect(() => {
    if (mostrarModal) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mostrarModal]);

  // Carga de negocio y configuración base (silenciosa si ya hay caché)
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!__DASHBOARD_CACHE.loaded) setCargandoNegocio(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("AUTH_REQUIRED");
        const res = await fetch(`${apiBase}/negocio`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (!res.ok) throw new Error("API_ERROR");
        const data = await res.json();
        if (cancel) return;

        const newNegocio = data?.negocio || data;
        const newEntitlements = data?.entitlements || null;
        const newSlug = data?.negocio?.slug || data?.slug || null;

        setNegocio(newNegocio);
        setEntitlements(newEntitlements);
        setSlug(newSlug);

        // Actualizamos caché
        __DASHBOARD_CACHE.negocio = newNegocio;
        __DASHBOARD_CACHE.entitlements = newEntitlements;
        __DASHBOARD_CACHE.slug = newSlug;
        
        const estLegacy = data?.negocio?.estructura_almacen || data?.estructura_almacen || data?.tipo_almacen;
        let isConfigPending = false;

        if (estLegacy || data?.baldas_total > 0) { 
          isConfigPending = false; 
        } else {
          try {
            const ures = await fetch(`${apiRoot}/api/ubicaciones?debug=1`, { headers: { Authorization: `Bearer ${session.access_token}` } });
            const ujson = await ures.json().catch(() => ({}));
            const ucount = Array.isArray(ujson?.ubicaciones) ? ujson.ubicaciones.length : (Array.isArray(ujson?.rows) ? ujson.rows.length : 0);
            
            if (ucount > 0) { 
              isConfigPending = false; 
              setNegocio(prev => {
                const updated = { ...prev, estructura_almacen: 'ubicaciones' };
                __DASHBOARD_CACHE.negocio = updated;
                return updated;
              }); 
            } else {
              isConfigPending = true;
            }
          } catch { 
            isConfigPending = true; 
          }
        }

        if (!cancel) {
          setConfigPendiente(isConfigPending);
          __DASHBOARD_CACHE.configPendiente = isConfigPending;
          __DASHBOARD_CACHE.loaded = true;
          setCargandoNegocio(false);
        }

      } catch (e) { 
        if (!cancel) setCargandoNegocio(false); 
      }
    })();
    return () => { cancel = true; };
  }, [apiBase, apiRoot]);

  // Carga de Resumen y KPIs (silenciosa si ya hay caché)
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`${apiBase}/resumen`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (res.ok) { 
          const d = await res.json(); 
          if (!cancel) {
            const newResumen = {
              recibidosHoy: d.resumen?.hoy_recibidos ?? 0,
              entregadosHoy: d.resumen?.hoy_entregados ?? 0,
              almacenActual: d.resumen?.pendientes ?? 0,
              huecosOcupados: d.huecosOcupados ?? 0,
              ocupacion: d.ocupacion || [],
              huerfanosMaestros: d.huerfanos || [],
              diario: d.diario || []
            };
            setResumen(newResumen);
            __DASHBOARD_CACHE.resumen = newResumen;
          }
        }
      } catch {} 
    })();
    return () => { cancel = true; };
  }, [apiBase, paquetesHash]);

  const listaHuerfanos = useMemo(() => {
    return resumen.huerfanosMaestros
      .filter(p => calcularDias(p.fecha_llegada) >= diasHuerfano);
  }, [resumen.huerfanosMaestros, diasHuerfano]);

  const chartData = useMemo(() => {
    if (!resumen.diario || !resumen.diario.length) return [];
    const bd = new Date();
    const start = addDays(bd, -14);
    const map = {};
    for (let currentD = new Date(start); currentD <= bd; currentD = addDays(currentD, 1)) {
      map[ymd(currentD)] = { periodo: ymd(currentD), in: 0, out: 0 };
    }
    resumen.diario.forEach(d => {
      const dateKey = d.fecha ? d.fecha.split("T")[0] : null;
      if (dateKey && map[dateKey]) {
        map[dateKey].in += Number(d.recibidos) || 0;
        map[dateKey].out += Number(d.entregados) || 0;
      }
    });
    return Object.values(map).sort((a,b) => new Date(a.periodo) - new Date(b.periodo));
  }, [resumen.diario]);

  if (cargandoNegocio) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-10 font-sans pb-24">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-4 mb-2">
             <h1 className="text-4xl font-black text-zinc-950 tracking-tight">{negocio?.nombre || negocio?.nombre_empresa || "Local"}</h1>
             <PlanBadge />
          </div>
          <p className="text-zinc-500 font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            Mando central operativo y control de stock
          </p>
        </motion.div>
        
        <motion.button 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setMostrarModal(true)} 
          className="group relative flex items-center justify-center gap-3 bg-zinc-950 hover:bg-zinc-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.1em] text-[12px] shadow-2xl transition-all active:scale-95 w-full md:w-auto overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-brand-500/0 via-brand-500/20 to-brand-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          <IconPlus /> 
          <span>Registrar Entrada</span>
        </motion.button>
      </div>

      {entitlements?.plan_id === 'free' && entitlements?.trial && (
        entitlements.trial.is_unlimited_phase ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-brand-600 to-brand-500 text-white p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl border border-brand-400/30 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/30">
                <IconRocket />
              </div>
              <div>
                <strong className="block text-lg font-black uppercase tracking-wider mb-0.5">Paquetes Ilimitados Activos</strong>
                <span className="font-bold text-brand-50/90">Te quedan <span className="text-white underline decoration-2 underline-offset-4">{entitlements.trial.days_remaining} días</span> de prueba premium.</span>
              </div>
            </div>
            <button onClick={() => go('/dashboard/facturacion')} className="bg-white text-brand-600 hover:bg-brand-50 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95 relative z-10">
              Mejorar plan ahora
            </button>
          </motion.div>
        ) : (
          <div className="bg-zinc-950 text-zinc-300 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 text-xs font-mono shadow-xl border border-zinc-800">
            <div className="flex items-center gap-6 w-full md:w-3/4">
              <span className="text-brand-400 font-black uppercase tracking-[0.2em] shrink-0">Free Tier</span>
              <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden border border-zinc-700">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (entitlements.trial.used / entitlements.trial.quota) * 100)}%` }}
                  className={`h-full rounded-full transition-all ${entitlements.trial.remaining < 20 ? 'bg-red-500' : 'bg-brand-500'}`} 
                />
              </div>
              <span className="shrink-0 font-black text-white">{entitlements.trial.used} <span className="text-zinc-600">/</span> {entitlements.trial.quota}</span>
            </div>
            <button onClick={() => go('/dashboard/facturacion')} className="text-brand-400 hover:text-white font-black uppercase tracking-widest transition-colors shrink-0 flex items-center gap-2">
              <IconSparkles className="w-3 h-3" />
              Desbloquear límites
            </button>
          </div>
        )
      )}

      {configPendiente && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="onboarding-banner bg-white border-2 border-dashed border-red-200 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm"
        >
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
              <IconAlert />
            </div>
            <div>
              <strong className="block text-red-950 font-black text-lg">Configuración pendiente</strong>
              <p className="text-red-800/80 font-bold">Debes mapear tu almacén antes de empezar a registrar paquetes.</p>
            </div>
          </div>
          <button onClick={() => go("/dashboard/configuracion")} className="onboarding-config-btn px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95">
            Configurar Almacén
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        {[
          { label: 'Paquetes Físicos', val: resumen.almacenActual, icon: <IconStorage />, color: 'text-zinc-950' },
          { label: 'Huecos en Uso', val: resumen.huecosOcupados, icon: <IconGrid />, color: 'text-zinc-950' },
          { label: 'Entradas (Hoy)', val: `+${resumen.recibidosHoy}`, icon: <IconBoxIn />, color: 'text-brand-500' },
          { label: 'Salidas (Hoy)', val: `-${resumen.entregadosHoy}`, icon: <IconBoxOut />, color: 'text-zinc-900' }
        ].map((kpi, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-zinc-400 font-black text-[10px] tracking-[0.25em] uppercase">{kpi.label}</span>
              <span className="text-zinc-200 group-hover:text-zinc-400 transition-colors">{kpi.icon}</span>
            </div>
            <div className={`text-5xl font-black tracking-tighter font-mono ${kpi.color}`}>{kpi.val}</div>
          </motion.div>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="bg-white border border-zinc-200/60 shadow-sm rounded-[2.5rem] p-8 h-[400px] flex flex-col relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.3em]">Flujo Operativo Mensual</h3>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-brand-500" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Entradas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Salidas</span>
            </div>
          </div>
        </div>
        <div className="flex-1 -ml-8">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs font-black text-zinc-300 uppercase tracking-[0.2em] text-center px-4">
              Recopilando datos históricos...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f1f1f4" />
                <XAxis 
                  dataKey="periodo" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#d4d4d8', fontWeight: 800 }}
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return isNaN(d) ? '' : `${d.getDate()} ${d.toLocaleString('es-ES', { month: 'short' }).toUpperCase()}`;
                  }}
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#d4d4d8', fontWeight: 700 }}
                  allowDecimals={false}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f4f4f5', strokeWidth: 40 }} />
                <Line 
                  name="Entradas" type="monotone" dataKey="in" 
                  stroke="#14b8a6" strokeWidth={5} 
                  dot={{ r: 0 }} activeDot={{ r: 8, strokeWidth: 0, fill: '#14b8a6' }} 
                  animationDuration={1500}
                />
                <Line 
                  name="Salidas" type="monotone" dataKey="out" 
                  stroke="#34d399" strokeWidth={5} 
                  dot={{ r: 0 }} activeDot={{ r: 8, strokeWidth: 0, fill: '#34d399' }} 
                  animationDuration={2000}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="lg:col-span-2 bg-white border border-zinc-200/60 shadow-sm rounded-[2.5rem] overflow-hidden flex flex-col"
        >
          <div className="p-8 border-b border-zinc-100 bg-zinc-50/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <h3 className="text-lg font-black text-zinc-950 uppercase tracking-wider flex items-center gap-3">
                Auditoría de Stock
                {listaHuerfanos.length > 0 && (
                  <span className="flex items-center gap-2 text-[10px] font-black text-red-600 bg-red-50 px-3 py-1.5 rounded-full uppercase tracking-widest border border-red-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {listaHuerfanos.length} Atascados
                  </span>
                )}
              </h3>
            </div>
            
            <div className="relative">
              <select 
                value={diasHuerfano} 
                onChange={e => setDiasHuerfano(Number(e.target.value))} 
                className="appearance-none bg-white border border-zinc-200 text-[11px] font-black text-zinc-600 px-6 py-3 rounded-2xl outline-none cursor-pointer hover:border-zinc-300 transition-all pr-12 shadow-sm"
              >
                <option value={1}>Atascados +1 Día</option>
                <option value={3}>Atascados +3 Días</option>
                <option value={7}>Atascados +7 Días</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-x-auto max-h-[460px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left whitespace-nowrap text-sm">
              <thead className="sticky top-0 z-10 bg-zinc-50/80 backdrop-blur-md">
                <tr className="text-[10px] uppercase tracking-[0.2em] font-black text-zinc-400 border-b border-zinc-100">
                  <th className="py-5 px-8">Cliente</th>
                  <th className="py-5 px-8">Agencia</th>
                  <th className="py-5 px-8 text-center">Hueco</th>
                  <th className="py-5 px-8 text-center">Días</th>
                  <th className="py-5 px-8 text-right">Contacto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {listaHuerfanos.length === 0 ? (
                  <tr><td colSpan="5" className="py-20 text-center text-zinc-300 text-xs font-black uppercase tracking-[0.3em]">Todo bajo control por aquí.</td></tr>
                ) : (
                  listaHuerfanos.map((p) => {
                    const dias = calcularDias(p.fecha_llegada);
                    const telefonoLimpio = p.telefono ? p.telefono.replace(/\D/g, '') : '';
                    const msjWa = encodeURIComponent(`Hola ${p.nombre_cliente}, tienes un paquete de ${p.empresa_transporte || 'una agencia'} esperando en nuestro local desde hace ${dias} días. Por favor, pasa a recogerlo pronto para evitar devoluciones. ¡Gracias!`);

                    return (
                      <tr key={p.id} className="group hover:bg-zinc-50 transition-all">
                        <td className="py-5 px-8">
                          <div className="font-black text-zinc-950 text-base">{p.nombre_cliente || 'Desconocido'}</div>
                          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Pendiente de recogida</div>
                        </td>
                        <td className="py-5 px-8">
                          <span className="inline-flex items-center px-3 py-1 bg-zinc-100 text-zinc-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-zinc-200/50">
                            {p.empresa_transporte || 'Otros'}
                          </span>
                        </td>
                        <td className="py-5 px-8 text-center">
                          <span className="bg-zinc-950 text-white font-black font-mono text-xs px-3 py-1.5 rounded-xl shadow-lg inline-block min-w-[40px]">
                            {p.ubicacion_label || '?'}
                          </span>
                        </td>
                        <td className="py-5 px-8 text-center">
                          <div className={`text-xs font-black flex items-center justify-center gap-2 ${dias >= 7 ? 'text-red-500' : 'text-zinc-500'}`}>
                            <IconCalendar />
                            <span>{dias}D</span>
                          </div>
                        </td>
                        <td className="py-5 px-8 text-right">
                          {telefonoLimpio ? (
                            <a 
                              href={`https://wa.me/34${telefonoLimpio}?text=${msjWa}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-brand-500 text-white hover:bg-brand-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                            >
                              <IconPhone /> Avisar
                            </a>
                          ) : (
                            <span className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Sin Tel.</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        <div className="space-y-8">
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
            className="bg-white border border-zinc-200/60 shadow-sm rounded-[2.5rem] p-8"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-950 border border-zinc-100 shadow-sm">
                <IconGrid />
              </div>
              <div>
                <h3 className="text-lg font-black text-zinc-950 uppercase tracking-tight">Ocupación IA</h3>
                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Densidad de Almacén</p>
              </div>
            </div>
            
            <div className="space-y-8">
              {resumen.ocupacion.length === 0 ? (
                <div className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-300 text-center py-10">Estanterías vacías</div>
              ) : (
                resumen.ocupacion.slice(0, 5).map((ag, i) => {
                  const esParasito = ag.pct > 30 && Number(ag.precio) < 0.35;

                  return (
                    <div key={i} className="group">
                      <div className="flex justify-between items-end mb-3">
                        <div>
                          <span className={`text-sm font-black ${esParasito ? 'text-red-600' : 'text-zinc-950'}`}>
                            {ag.name}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-black ml-2 uppercase tracking-widest">{ag.count} paq.</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-[11px] font-mono font-black ${esParasito ? 'text-red-500' : 'text-zinc-400'}`}>{ag.pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-zinc-100 rounded-full h-3 overflow-hidden border border-zinc-50">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${ag.pct}%` }}
                          transition={{ duration: 1, delay: i * 0.1 }}
                          className={`h-full rounded-full ${esParasito ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gradient-to-r from-zinc-900 to-zinc-700'}`} 
                        />
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                         <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ticket Medio</span>
                         <span className="text-[11px] font-black text-brand-600 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-100">{formatEUR(ag.precio)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}
            className="bg-zinc-950 text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
               <IconRocket />
            </div>
            <h4 className="text-xl font-black mb-4 relative z-10">¿Quieres más control?</h4>
            <p className="text-zinc-400 font-bold text-sm mb-8 leading-relaxed relative z-10">
              Desbloquea el análisis avanzado de rentabilidad por metro cuadrado y optimiza tus ingresos.
            </p>
            <button onClick={() => go('/dashboard/facturacion')} className="w-full py-4 bg-white text-zinc-950 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-zinc-100 transition-all active:scale-95 relative z-10">
              Explorar Funciones Pro
            </button>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {mostrarModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md" onClick={() => setMostrarModal(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-zinc-200">
              <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50 backdrop-blur-sm">
                <div>
                  <h3 className="text-2xl font-black text-zinc-950 tracking-tight">Registro Rápido</h3>
                  <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-1">Entrada manual de paquetería</p>
                </div>
                <button onClick={() => setMostrarModal(false)} className="w-12 h-12 flex items-center justify-center bg-white border border-zinc-200 text-zinc-400 hover:text-zinc-950 hover:border-zinc-400 rounded-2xl transition-all shadow-sm group">
                  <IconClose />
                </button>
              </div>
              <div className="p-8 overflow-y-auto max-h-[85vh] custom-scrollbar">
                <AnadirPaquete modoRapido paquetes={paquetes} actualizarPaquetes={actualizarPaquetes} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}