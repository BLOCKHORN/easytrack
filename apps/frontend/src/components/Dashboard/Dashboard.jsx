import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";
import AnadirPaquete from "./AnadirPaquete";
import { supabase } from "../../utils/supabaseClient";
import PlanBadge from '../../components/Billing/PlanBadge';

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
    const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:3001";
    const segs = location.pathname.split("/").filter(Boolean);
    if (segs.length >= 2 && (segs[1] === "dashboard" || segs[1] === "area-personal")) {
      return `${API_URL}/${segs[0]}/api/dashboard`;
    }
    return `${API_URL}/api/dashboard`;
  }, [location.pathname]);
  
  const apiRoot = useMemo(() => (import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:3001"), []);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [negocio, setNegocio] = useState(null);
  const [entitlements, setEntitlements] = useState(null);
  const [slug, setSlug] = useState(null);
  const [cargandoNegocio, setCargandoNegocio] = useState(true);
  const [configPendiente, setConfigPendiente] = useState(false);

  const [diasHuerfano, setDiasHuerfano] = useState(7);

  const [resumen, setResumen] = useState({ 
    recibidosHoy: 0, 
    entregadosHoy: 0, 
    almacenActual: 0,
    huecosOcupados: 0,
    ocupacion: [],
    huerfanosMaestros: [],
    diario: []
  });

  const go = (path) => { 
    if (slug) navigate(`/${slug}${path.startsWith("/") ? path : `/${path}`}`); 
    else navigate(path.startsWith("/") ? path : `/${path}`);
  };

  useEffect(() => {
    if (mostrarModal) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mostrarModal]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setCargandoNegocio(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("AUTH_REQUIRED");
        const res = await fetch(`${apiBase}/negocio`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (!res.ok) throw new Error("API_ERROR");
        const data = await res.json();
        if (cancel) return;

        setNegocio(data?.negocio || data); 
        setEntitlements(data?.entitlements || null);
        setSlug(data?.negocio?.slug || data?.slug || null);
        
        const estLegacy = data?.negocio?.estructura_almacen || data?.estructura_almacen || data?.tipo_almacen;
        if (estLegacy || data?.baldas_total > 0) { setConfigPendiente(false); return; }

        try {
          const ures = await fetch(`${apiRoot}/api/ubicaciones?debug=1`, { headers: { Authorization: `Bearer ${session.access_token}` } });
          const ujson = await ures.json().catch(() => ({}));
          const ucount = Array.isArray(ujson?.ubicaciones) ? ujson.ubicaciones.length : (Array.isArray(ujson?.rows) ? ujson.rows.length : 0);
          if (!cancel) {
            if (ucount > 0) { setConfigPendiente(false); setNegocio(prev => ({ ...prev, estructura_almacen: 'ubicaciones' })); }
            else setConfigPendiente(true);
          }
        } catch { if (!cancel) setConfigPendiente(true); }
      } catch (e) { }
      finally { if (!cancel) setCargandoNegocio(false); }
    })();
    return () => { cancel = true; };
  }, [apiBase, apiRoot]);

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
            setResumen({
              recibidosHoy: d.resumen?.hoy_recibidos ?? 0,
              entregadosHoy: d.resumen?.hoy_entregados ?? 0,
              almacenActual: d.resumen?.pendientes ?? 0,
              huecosOcupados: d.huecosOcupados ?? 0,
              ocupacion: d.ocupacion || [],
              huerfanosMaestros: d.huerfanos || [],
              diario: d.diario || []
            });
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
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-zinc-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans pb-20">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <h1 className="text-3xl font-extrabold text-zinc-950 tracking-tight">{negocio?.nombre || negocio?.nombre_empresa || "Local"}</h1>
             <PlanBadge />
          </div>
          <p className="text-sm font-medium text-zinc-500">Mando central operativo y control de stock.</p>
        </div>
        <button onClick={() => setMostrarModal(true)} className="flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-800 text-white px-8 py-3.5 rounded-xl font-black uppercase tracking-widest text-[11px] shadow-lg transition-all active:scale-95 w-full md:w-auto">
          <IconPlus /> Registrar Entrada
        </button>
      </div>

      {/* LÓGICA DE PLG: Banner Ilimitado vs Barra Progreso */}
      {entitlements?.plan_id === 'free' && entitlements?.trial && (
        entitlements.trial.is_unlimited_phase ? (
          <div className="bg-gradient-to-r from-brand-600 to-brand-500 text-white px-5 py-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-[0_8px_30px_rgb(20,184,166,0.2)] border border-brand-400">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <IconRocket />
              </div>
              <div>
                <strong className="block text-sm font-black uppercase tracking-widest mb-0.5 text-white">Paquetes Ilimitados</strong>
                <span className="font-medium text-brand-50">Disfruta sin restricciones en tus primeros 14 días. (Te quedan {entitlements.trial.days_remaining} días).</span>
              </div>
            </div>
            <button onClick={() => go('/dashboard/facturacion')} className="bg-white text-brand-600 hover:bg-zinc-50 px-5 py-2.5 rounded-xl font-black uppercase tracking-widest transition-colors shrink-0 shadow-sm">
              Ver planes premium
            </button>
          </div>
        ) : (
          <div className="bg-zinc-950 text-zinc-300 px-5 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono shadow-md border border-zinc-800">
            <div className="flex items-center gap-4 w-full sm:w-1/2">
              <span className="text-brand-400 font-black uppercase tracking-widest shrink-0">Free Tier</span>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${entitlements.trial.remaining < 20 ? 'bg-red-500' : 'bg-brand-500'}`} 
                  style={{ width: `${Math.min(100, (entitlements.trial.used / entitlements.trial.quota) * 100)}%` }} 
                />
              </div>
              <span className="shrink-0"><strong>{entitlements.trial.used}</strong> / {entitlements.trial.quota}</span>
            </div>
            <button onClick={() => go('/dashboard/facturacion')} className="text-brand-400 hover:text-white font-black uppercase tracking-widest transition-colors shrink-0">
              Desbloquear sin límites
            </button>
          </div>
        )
      )}

      {configPendiente && (
        <div className="bg-red-50 border border-red-200 p-5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="text-red-500"><IconAlert /></div>
            <div className="text-sm text-red-800 font-medium">
              <strong className="block text-red-950 font-bold">Configuración de local pendiente</strong>
              Define los huecos de tu almacén antes de gestionar paquetes.
            </div>
          </div>
          <button onClick={() => go("/dashboard/configuracion")} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm">
            Configurar Almacén
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-zinc-500 font-black text-[10px] tracking-[0.2em] uppercase">Paquetes Físicos</span>
            <span className="text-zinc-400"><IconStorage /></span>
          </div>
          <div className="text-4xl font-black text-zinc-950 tracking-tight font-mono">{resumen.almacenActual}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-zinc-500 font-black text-[10px] tracking-[0.2em] uppercase">Huecos en Uso</span>
            <span className="text-zinc-400"><IconGrid /></span>
          </div>
          <div className="text-4xl font-black text-zinc-950 tracking-tight font-mono">{resumen.huecosOcupados}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-zinc-500 font-black text-[10px] tracking-[0.2em] uppercase">Entradas (Hoy)</span>
            <span className="text-brand-400"><IconBoxIn /></span>
          </div>
          <div className="text-4xl font-black text-brand-500 tracking-tight font-mono">+{resumen.recibidosHoy}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-zinc-500 font-black text-[10px] tracking-[0.2em] uppercase">Salidas (Hoy)</span>
            <span className="text-zinc-400"><IconBoxOut /></span>
          </div>
          <div className="text-4xl font-black text-zinc-900 tracking-tight font-mono">-{resumen.entregadosHoy}</div>
        </div>
      </div>

      <div className="bg-white border border-zinc-200/80 shadow-sm rounded-3xl p-6 h-80 flex flex-col">
        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6">Volumen Operativo (Últimos 14 Días)</h3>
        <div className="flex-1 -ml-6">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs font-bold text-zinc-400 uppercase tracking-widest text-center px-4">
              Recopilando datos históricos...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis 
                  dataKey="periodo" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#a1a1aa', fontWeight: 700 }}
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return isNaN(d) ? '' : `${d.getDate()} ${d.toLocaleString('es-ES', { month: 'short' }).toUpperCase()}`;
                  }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 600 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e4e4e7', strokeWidth: 2, strokeDasharray: '5 5' }} />
                <Line isAnimationActive={false} name="Entradas" type="monotone" dataKey="in" stroke="#14b8a6" strokeWidth={3} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                <Line isAnimationActive={false} name="Salidas" type="monotone" dataKey="out" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 bg-white border border-zinc-200/80 shadow-sm rounded-3xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-zinc-100 bg-zinc-50/30 flex justify-between items-center">
            <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
              Auditoría de Stock
              {listaHuerfanos.length > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded uppercase tracking-widest border border-red-100 ml-2">
                  <IconAlert /> {listaHuerfanos.length} Atascados
                </span>
              )}
            </h3>
            
            <select 
              value={diasHuerfano} 
              onChange={e => setDiasHuerfano(Number(e.target.value))} 
              className="bg-white border border-zinc-200 text-xs font-bold text-zinc-600 px-3 py-1.5 rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-brand-500"
            >
              <option value={1}>Atascados +1 Día</option>
              <option value={3}>Atascados +3 Días</option>
              <option value={7}>Atascados +7 Días</option>
            </select>
          </div>
          
          <div className="flex-1 overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-left whitespace-nowrap text-sm">
              <thead className="sticky top-0 z-10 bg-zinc-50">
                <tr className="text-[9px] uppercase tracking-widest font-black text-zinc-400 border-b border-zinc-100">
                  <th className="py-3 px-6">Cliente</th>
                  <th className="py-3 px-6">Agencia</th>
                  <th className="py-3 px-6 text-center">Hueco</th>
                  <th className="py-3 px-6 text-center">Días</th>
                  <th className="py-3 px-6 text-right">Contacto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {listaHuerfanos.length === 0 ? (
                  <tr><td colSpan="5" className="py-12 text-center text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em]">No hay paquetes atascados en este periodo.</td></tr>
                ) : (
                  listaHuerfanos.map((p) => {
                    const dias = calcularDias(p.fecha_llegada);
                    const telefonoLimpio = p.telefono ? p.telefono.replace(/\D/g, '') : '';
                    const msjWa = encodeURIComponent(`Hola ${p.nombre_cliente}, tienes un paquete de ${p.empresa_transporte || 'una agencia'} esperando en nuestro local desde hace ${dias} días. Por favor, pasa a recogerlo pronto para evitar devoluciones. ¡Gracias!`);

                    return (
                      <tr key={p.id} className="hover:bg-red-50/10 transition-colors">
                        <td className="py-3 px-6 font-bold text-zinc-900">{p.nombre_cliente || 'Desconocido'}</td>
                        <td className="py-3 px-6 text-zinc-600 font-medium">{p.empresa_transporte || 'Otros'}</td>
                        <td className="py-3 px-6 text-center">
                          <span className="bg-zinc-100 text-zinc-800 font-black font-mono text-[10px] px-2 py-1 rounded border border-zinc-200">
                            {p.ubicacion_label || '?'}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-center text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center justify-center gap-1.5 mt-1.5">
                          <IconCalendar /> {dias} días
                        </td>
                        <td className="py-3 px-6 text-right">
                          {telefonoLimpio ? (
                            <a 
                              href={`https://wa.me/34${telefonoLimpio}?text=${msjWa}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border border-[#25D366]/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                            >
                              <IconPhone /> Avisar
                            </a>
                          ) : (
                            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Sin Tel.</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-zinc-200/80 shadow-sm rounded-3xl p-6">
            <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-2">Apalancamiento de Espacio</h3>
            <p className="text-[10px] text-zinc-500 font-medium mb-6 leading-relaxed">
              Analiza qué porcentaje de tu almacén ocupa cada empresa vs el ticket que te pagan.
            </p>
            
            <div className="space-y-5">
              {resumen.ocupacion.length === 0 ? (
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-center py-4">Estanterías vacías</div>
              ) : (
                resumen.ocupacion.slice(0, 5).map((ag, i) => {
                  const esParasito = ag.pct > 30 && Number(ag.precio) < 0.35;

                  return (
                    <div key={i}>
                      <div className="flex justify-between items-end mb-1.5">
                        <span className={`text-xs font-bold ${esParasito ? 'text-red-600' : 'text-zinc-700'}`}>
                          {ag.name} <span className="text-zinc-400 font-normal">({ag.count} paq)</span>
                        </span>
                        <div className="text-right">
                          <span className={`text-[10px] font-mono font-bold ${esParasito ? 'text-red-500' : 'text-zinc-500'}`}>{ag.pct.toFixed(0)}% Ocupado</span>
                          <span className="text-[10px] font-mono font-black text-amber-500 ml-2 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">Ticket: {formatEUR(ag.precio)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full ${esParasito ? 'bg-red-500' : 'bg-zinc-800'}`} style={{ width: `${ag.pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mostrarModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setMostrarModal(false)} />
            <motion.div initial={{ scale: 0.96, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 10 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h3 className="text-xl font-black text-zinc-950">Registro Rápido</h3>
                <button onClick={() => setMostrarModal(false)} className="w-8 h-8 flex items-center justify-center bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-950 hover:border-zinc-400 rounded-full transition-all shadow-sm">
                  <IconClose />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[80vh]">
                <AnadirPaquete modoRapido paquetes={paquetes} actualizarPaquetes={actualizarPaquetes} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}