import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Brush
} from "recharts";
import AnadirPaquete from "./AnadirPaquete";
import { supabase } from "../../utils/supabaseClient";
import { obtenerPaquetesBackend } from "../../services/paquetesService";
import PlanBadge from '../../components/Billing/PlanBadge';

const IconPkgIn = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
const IconPkgOut = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>;
const IconStorage = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>;
const IconAlert = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IconPlus = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const IconClose = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const IconChart = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>;

const toLocalDate = (iso) => (iso ? new Date(iso) : null);
const ymd = (d) => { if (!d || isNaN(d)) return null; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const startOfWeekMon = (d) => { const nd = new Date(d); nd.setDate(nd.getDate() - ((nd.getDay() + 6) % 7)); nd.setHours(0,0,0,0); return nd; };
const endOfWeekSun = (d) => { const e = new Date(startOfWeekMon(d)); e.setDate(e.getDate() + 6); e.setHours(23,59,59,999); return e; };
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1, 0,0,0,0);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23,59,59,999);
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0);
const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23,59,59,999);
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const inRange = (date, a, b) => date && !isNaN(date) && date >= a && date <= b;

const mesesCorto = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const diasCorto = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

export default function Dashboard({ paquetes, actualizarPaquetes }) {
  const location = useLocation();
  const navigate = useNavigate();

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
  const [slug, setSlug] = useState(null);
  const [cargandoNegocio, setCargandoNegocio] = useState(true);
  const [cargandoResumen, setCargandoResumen] = useState(true);
  const [configPendiente, setConfigPendiente] = useState(false);

  const [resumen, setResumen] = useState({
    recibidosHoy: 0, 
    entregadosHoy: 0, 
    almacenActual: 0, 
    estantesLlenos: 0,
    mediaDiaria: 0,
    mediaEntregados: 0,
    recordRecibidos: 0, 
    recordEntregados: 0
  });

  const vistas = ["anual", "mensual", "semanal", "diaria", "historial"];
  const [vista, setVista] = useState("anual");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [datosChart, setDatosChart] = useState([]);
  const [cargandoChart, setCargandoChart] = useState(true);

  const go = (path) => { if (slug) navigate(`/${slug}${path.startsWith("/") ? path : `/${path}`}`); };

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
        if (!session) throw new Error("Sin sesion.");
        const res = await fetch(`${apiBase}/negocio`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (!res.ok) throw new Error("Error negocio");
        const data = await res.json();
        if (cancel) return;

        setNegocio(data); setSlug(data?.slug || null);
        const estLegacy = data?.estructura_almacen || data?.tipo_almacen || data?.tipoEstructura || data?.estructura;
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
      setCargandoResumen(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`${apiBase}/resumen`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (res.ok) { 
          const d = await res.json(); 
          if (!cancel) setResumen(d || {}); 
        }
      } catch {} finally { if (!cancel) setCargandoResumen(false); }
    })();
    return () => { cancel = true; };
  }, [apiBase]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setCargandoChart(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sin sesion");
        const paquetesFetch = await obtenerPaquetesBackend(session.access_token, { all: 1 });
        if (cancel) return;

        const bd = new Date(fecha + "T00:00:00");
        let cat = [], rIni = null, rFin = null;

        if (vista === "anual") {
          cat = mesesCorto.map((mes, i) => ({ key: `${bd.getFullYear()}-${String(i+1).padStart(2,"0")}`, periodo: mes }));
          rIni = new Date(bd.getFullYear(), 0, 1); rFin = new Date(bd.getFullYear(), 11, 31, 23,59,59,999);
        } else if (vista === "mensual") {
          cat = Array.from({ length: endOfMonth(bd).getDate() }, (_, i) => ({ key: `${bd.getFullYear()}-${String(bd.getMonth()+1).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`, periodo: String(i+1) }));
          rIni = startOfMonth(bd); rFin = endOfMonth(bd);
        } else if (vista === "semanal") {
          cat = Array.from({ length: 7 }, (_, i) => { const d = addDays(startOfWeekMon(bd), i); return { key: ymd(d), periodo: diasCorto[i], date: d }; });
          rIni = startOfWeekMon(bd); rFin = endOfWeekSun(bd);
        } else if (vista === "diaria") {
          cat = Array.from({ length: 24 }, (_, h) => ({ key: `${bd.getFullYear()}-${String(bd.getMonth()+1).padStart(2,"0")}-${String(bd.getDate()).padStart(2,"0")}T${String(h).padStart(2,"0")}:00`, periodo: String(h) }));
          rIni = startOfDay(bd); rFin = endOfDay(bd);
        } else if (vista === "historial") {
          for (let d = new Date(addDays(startOfDay(bd), -29)); d <= endOfDay(bd); d = addDays(d, 1)) {
            cat.push({ key: ymd(d), periodo: d.toISOString().split("T")[0], date: new Date(d) });
          }
          rIni = startOfDay(cat[0].date); rFin = endOfDay(bd);
        }

        const acc = new Map(cat.map(c => [c.key, { periodo: c.periodo, recibidos: 0, entregados: 0 }]));

        for (const p of paquetesFetch) {
          const fRec = toLocalDate(p.fecha_llegada);
          const fEnt = p.entregado ? toLocalDate(p.fecha_entregado || p.fecha_llegada) : null;
          
          if (fRec && inRange(fRec, rIni, rFin)) {
            let k = "";
            if (vista === "anual") k = `${fRec.getFullYear()}-${String(fRec.getMonth()+1).padStart(2,"0")}`;
            else if (vista === "mensual") k = `${fRec.getFullYear()}-${String(fRec.getMonth()+1).padStart(2,"0")}-${String(fRec.getDate()).padStart(2,"0")}`;
            else if (vista === "semanal" || vista === "historial") k = ymd(fRec);
            else if (vista === "diaria") k = `${fRec.getFullYear()}-${String(fRec.getMonth()+1).padStart(2,"0")}-${String(fRec.getDate()).padStart(2,"0")}T${String(fRec.getHours()).padStart(2,"0")}:00`;
            if (acc.has(k)) acc.get(k).recibidos += 1;
          }
          if (fEnt && inRange(fEnt, rIni, rFin)) {
            let k = "";
            if (vista === "anual") k = `${fEnt.getFullYear()}-${String(fEnt.getMonth()+1).padStart(2,"0")}`;
            else if (vista === "mensual") k = `${fEnt.getFullYear()}-${String(fEnt.getMonth()+1).padStart(2,"0")}-${String(fEnt.getDate()).padStart(2,"0")}`;
            else if (vista === "semanal" || vista === "historial") k = ymd(fEnt);
            else if (vista === "diaria") k = `${fEnt.getFullYear()}-${String(fEnt.getMonth()+1).padStart(2,"0")}-${String(fEnt.getDate()).padStart(2,"0")}T${String(fEnt.getHours()).padStart(2,"0")}:00`;
            if (acc.has(k)) acc.get(k).entregados += 1;
          }
        }
        
        let output = Array.from(acc.values());
        if (["mensual", "diaria"].includes(vista)) output.sort((a, b) => parseInt(a.periodo) - parseInt(b.periodo));
        if (vista === "semanal") output.sort((a, b) => diasCorto.indexOf(a.periodo) - diasCorto.indexOf(b.periodo));
        if (vista === "historial") output.sort((a, b) => new Date(a.periodo) - new Date(b.periodo));

        if (!cancel) setDatosChart(output);
      } catch (e) {} finally { if (!cancel) setCargandoChart(false); }
    })();
    return () => { cancel = true; };
  }, [vista, fecha]);

  const chartKPIs = useMemo(() => {
    const totalRec = datosChart.reduce((a, b) => a + (Number(b.recibidos) || 0), 0);
    const totalEnt = datosChart.reduce((a, b) => a + (Number(b.entregados) || 0), 0);
    const points = Math.max(datosChart.length, 1);
    return {
      totalRec,
      totalEnt,
      avgRec: Math.round(totalRec / points),
      avgEnt: Math.round(totalEnt / points),
    };
  }, [datosChart]);

  const formatoEjeX = (tick) => {
    if (vista === "diaria") return `${tick}h`;
    if (vista === "historial") {
      const d = new Date(tick);
      return isNaN(d) ? tick : `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
    }
    return tick;
  };

  if (cargandoNegocio || cargandoResumen) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-zinc-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-200/80">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <h1 className="text-3xl font-extrabold text-zinc-950 tracking-tight">{negocio?.nombre_empresa || "Infraestructura"}</h1>
             <PlanBadge />
          </div>
          <p className="text-sm font-medium text-zinc-500">Metricas en tiempo real y registro de entradas.</p>
        </div>
        <button onClick={() => setMostrarModal(true)} className="flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-800 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 w-full md:w-auto">
          <IconPlus /> Registrar Entrada
        </button>
      </div>

      {configPendiente && (
        <div className="bg-red-50/80 border border-red-200/80 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600"><IconAlert /></div>
            <div className="text-sm text-red-800 font-medium">
              <strong className="block mb-0.5 text-red-950 font-bold">Configuracion de local pendiente</strong>
              Debes definir los estantes o baldas de tu almacen antes de gestionar paquetes.
            </div>
          </div>
          <button onClick={() => go("/dashboard/configuracion")} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors w-full sm:w-auto shadow-sm shadow-red-600/20">
            Configurar ahora
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <span className="text-zinc-500 font-bold text-xs tracking-widest uppercase">Recibidos Hoy</span>
            <span className="text-brand-500"><IconPkgIn /></span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-zinc-950 tracking-tight">{resumen.recibidosHoy}</span>
            {resumen.recordRecibidos > 0 && <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">Record: {resumen.recordRecibidos}</span>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <span className="text-zinc-500 font-bold text-xs tracking-widest uppercase">Entregados Hoy</span>
            <span className="text-indigo-500"><IconPkgOut /></span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-zinc-950 tracking-tight">{resumen.entregadosHoy}</span>
            {resumen.recordEntregados > 0 && <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">Record: {resumen.recordEntregados}</span>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <span className="text-zinc-500 font-bold text-xs tracking-widest uppercase">En Almacen</span>
            <span className="text-zinc-400"><IconStorage /></span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-zinc-950 tracking-tight">{resumen.almacenActual}</span>
          </div>
        </div>

        <div className={`bg-white p-6 rounded-2xl border ${resumen.estantesLlenos > 0 ? 'border-red-200 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'border-zinc-200/80 shadow-sm'} flex flex-col justify-between transition-all`}>
          <div className="flex justify-between items-start mb-6">
            <span className={`font-bold text-xs tracking-widest uppercase ${resumen.estantesLlenos > 0 ? 'text-red-500' : 'text-zinc-500'}`}>Estantes Saturados</span>
            <span className={resumen.estantesLlenos > 0 ? 'text-red-500' : 'text-zinc-400'}><IconAlert /></span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-black tracking-tight ${resumen.estantesLlenos > 0 ? 'text-red-600' : 'text-zinc-950'}`}>{resumen.estantesLlenos}</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl border border-zinc-200/80 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
          <div>
            <h3 className="text-xl font-extrabold text-zinc-950 flex items-center gap-2 mb-1">
              <IconChart /> Analitica de Volumen
            </h3>
            <p className="text-zinc-500 text-sm font-medium">Evolucion historica de operativas en el local.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="flex bg-zinc-100/80 p-1 rounded-xl border border-zinc-200 w-full sm:w-auto">
              {vistas.map(v => (
                <button
                  key={v}
                  onClick={() => setVista(v)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all flex-1 sm:flex-none text-center ${vista === v ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-900'}`}
                >
                  {v}
                </button>
              ))}
            </div>
            {vista !== "anual" && (
              <input 
                type="date" 
                value={fecha} 
                onChange={(e) => setFecha(e.target.value)}
                className="px-4 py-1.5 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-sm font-bold focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none w-full sm:w-auto transition-all shadow-sm"
              />
            )}
          </div>
        </div>

        {!cargandoChart && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100">
            <div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Recibidos</div>
              <div className="text-2xl font-black text-brand-600">{chartKPIs.totalRec.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Entregados</div>
              <div className="text-2xl font-black text-indigo-600">{chartKPIs.totalEnt.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Media Recibidos</div>
              <div className="text-xl font-bold text-zinc-700">{chartKPIs.avgRec.toLocaleString()} / periodo</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Media Entregados</div>
              <div className="text-xl font-bold text-zinc-700">{chartKPIs.avgEnt.toLocaleString()} / periodo</div>
            </div>
          </div>
        )}

        {cargandoChart ? (
          <div className="h-[360px] w-full bg-zinc-50 rounded-2xl animate-pulse flex items-center justify-center border border-zinc-100">
            <div className="w-8 h-8 border-2 border-zinc-200 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datosChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRec" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="100%" stopColor="#2dd4bf" />
                  </linearGradient>
                  <linearGradient id="colorEnt" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="periodo" tickFormatter={formatoEjeX} tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#09090b', marginBottom: '8px' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontWeight: '700', fontSize: '12px', color: '#52525b' }} />
                <Line type="monotone" name="Recibidos" dataKey="recibidos" stroke="url(#colorRec)" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                <Line type="monotone" name="Entregados" dataKey="entregados" stroke="url(#colorEnt)" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                {vista === "historial" && <Brush dataKey="periodo" height={30} stroke="#e4e4e7" travellerWidth={10} fill="#fafafa" tickFormatter={formatoEjeX} />}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <AnimatePresence>
        {mostrarModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={() => setMostrarModal(false)} />
            <motion.div initial={{ scale: 0.96, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 10 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-zinc-950">Registro Rapido</h3>
                <button onClick={() => setMostrarModal(false)} className="w-8 h-8 flex items-center justify-center bg-zinc-100 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-200 rounded-full transition-colors">
                  <IconClose />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[80vh] bg-zinc-50/50">
                <AnadirPaquete modoRapido paquetes={paquetes} actualizarPaquetes={actualizarPaquetes} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}