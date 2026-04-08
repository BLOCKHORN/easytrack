import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../utils/supabaseClient";
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, AreaChart, Area,
} from "recharts";
import {
  buildAreaApiBase, getSnapshots, createSnapshot, getFinanceSettings, updateFinanceSettings
} from "../../services/areaPersonalService";

import PinGate from "../../components/Auth/PinGate";

const IconEuro = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/></svg>;
const IconChart = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>;
const IconTrendingUp = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
const IconTrendingDown = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>;
const IconTruck = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
const IconBuilding = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>;
const IconEdit = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>;
const IconSave = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const IconHistory = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>;

const toLocalDate = (d) => new Date(d);
const inLastNDays = (dateLike, n) => {
  const d = new Date(dateLike);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (n - 1));
  return d >= start && d <= end;
};

const COLORS = ["#14b8a6", "#6366f1", "#f59e0b", "#ec4899", "#8b5cf6", "#0ea5e9", "#10b981", "#f43f5e"];

export default function AreaPersonal() {
  const { tenantSlug } = useParams();
  const location = useLocation();
  const apiBase = useMemo(() => buildAreaApiBase(location.pathname), [location.pathname]);

  const [tab, setTab] = useState("actual");
  const [resumen, setResumen] = useState(null);
  const [mensualSrv, setMensualSrv] = useState([]);
  const [porEmpresa, setPorEmpresa] = useState([]);
  const [topClientes, setTopClientes] = useState([]);
  const [diario, setDiario] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [goalServer, setGoalServer] = useState(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");

  const [snapshots, setSnapshots] = useState([]);
  const [loadingSnap, setLoadingSnap] = useState(false);
  const [range, setRange] = useState({ from: "", to: "" });
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

      const [d1, d2, d3, d4, d5, g] = await Promise.all([
        fetchJson(`${apiBase}/resumen`, headers).catch(e => ({ __error: e })),
        fetchJson(`${apiBase}/mensual`, headers).catch(e => ({ __error: e })),
        fetchJson(`${apiBase}/por-empresa`, headers).catch(e => ({ __error: e })),
        fetchJson(`${apiBase}/top-clientes`, headers).catch(e => ({ __error: e })),
        fetchJson(`${apiBase}/diario`, headers).catch(e => ({ __error: e })),
        getFinanceSettings(apiBase, session.access_token).catch(() => ({ settings: null }))
      ]);
      
      const firstErr = [d1, d2, d3, d4].find(x => x?.__error)?.__error;
      if (firstErr) throw firstErr;

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

  const lastActiveMonthData = mensualSrv.length > 0 ? mensualSrv[mensualSrv.length - 1] : null;
  const prevActiveMonthData = mensualSrv.length > 1 ? mensualSrv[mensualSrv.length - 2] : null;
  const activeYear = lastActiveMonthData ? String(lastActiveMonthData.mes).slice(0, 4) : String(new Date().getFullYear());
  const activeMonthLabel = lastActiveMonthData ? lastActiveMonthData.mes : "Mes Actual";

  const ingresosMesActual = Number(lastActiveMonthData?.total_ingresos || 0);
  const ingresosMesPrevio = Number(prevActiveMonthData?.total_ingresos || 0);
  const deltaMoM = ingresosMesPrevio ? ((ingresosMesActual - ingresosMesPrevio) / ingresosMesPrevio) * 100 : 0;

  const facturacionYTD = mensualSrv
    .filter(m => String(m.mes).startsWith(activeYear))
    .reduce((a, c) => a + Number(c.total_ingresos || 0), 0);
  
  const objetivoAnual = useMemo(() => {
    if (goalServer && goalServer > 0) return goalServer;
    return Math.max(100, facturacionYTD * 1.1);
  }, [goalServer, facturacionYTD]);
  
  const progresoObjetivo = objetivoAnual > 0 ? Math.min(100, Math.round((facturacionYTD / objetivoAnual) * 100)) : 0;

  const diarioSorted = useMemo(() => [...diario].sort((a, b) => toLocalDate(a.fecha) - toLocalDate(b.fecha)), [diario]);
  const last30 = diarioSorted.filter(d => inLastNDays(d.fecha, 30));
  const ingresos30d = last30.reduce((a, c) => a + c.ingresos, 0);
  const entregas30d = last30.reduce((a, c) => a + c.entregas, 0);

  const ticketMedioTotal = Number(resumen?.total_entregas) ? Number(resumen.total_ingresos) / Number(resumen.total_entregas) : 0;
  const ticketMedio30d = entregas30d ? ingresos30d / entregas30d : 0;

  const totalEmpresas = porEmpresa.reduce((a, c) => a + Number(c.total || 0), 0);
  const empresas = useMemo(() => porEmpresa.map((e, i) => ({
    ...e,
    total: Number(e.total || 0),
    entregas: Number(e.entregas || 0),
    pct: totalEmpresas ? (Number(e.total) / totalEmpresas) * 100 : 0,
    color: COLORS[i % COLORS.length],
  })).sort((a, b) => b.total - a.total), [porEmpresa, totalEmpresas]);

  const weekdayAgg = useMemo(() => {
    const labels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const sums = Array(7).fill(0);
    for (const d of diarioSorted) {
      const idx = (toLocalDate(d.fecha).getDay() + 6) % 7;
      sums[idx] += d.ingresos;
    }
    return labels.map((lbl, i) => ({ dia: lbl, ingresos: sums[i] }));
  }, [diarioSorted]);

  const formatEUR = (n = 0) => new Intl.NumberFormat('es-ES', { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
  
  const Delta = ({ value }) => {
    const up = value >= 0;
    const Icon = up ? IconTrendingUp : IconTrendingDown;
    return <span className={`flex items-center gap-1 text-xs font-bold ${up ? "text-emerald-500" : "text-red-500"}`}><Icon /> {Math.abs(value).toFixed(1)}%</span>;
  };

  const saveGoal = async () => {
    try {
      const v = Number(goalDraft);
      if (!Number.isFinite(v) || v <= 0) { setEditingGoal(false); return; }
      const { data: { session } } = await supabase.auth.getSession();
      const { settings } = await updateFinanceSettings(apiBase, session.access_token, v);
      setGoalServer(Number(settings?.goal_annual_eur || 0) || null);
      setEditingGoal(false);
    } catch (e) { alert(e.message); }
  };

  const reloadSnapshots = async () => {
    setLoadingSnap(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const params = {};
      if (range.from) params.from = range.from;
      if (range.to) params.to = range.to;
      const { snapshots: list = [] } = await getSnapshots(apiBase, session.access_token, params);
      setSnapshots(list);
    } catch (e) {
    } finally { setLoadingSnap(false); }
  };

  const snapshotsSorted = useMemo(() => [...snapshots].sort((a, b) => new Date(a.taken_at) - new Date(b.taken_at)), [snapshots]);
  const yearsAvailable = useMemo(() => ["all", ...Array.from(new Set(snapshotsSorted.map(s => new Date(s.taken_at).getFullYear()))).sort((a, b) => a - b)], [snapshotsSorted]);
  const snapshotsFiltered = useMemo(() => {
    let base = snapshotsSorted;
    if (yearFilter !== "all") base = base.filter(s => new Date(s.taken_at).getFullYear() === Number(yearFilter));
    if (range.from) base = base.filter(s => new Date(s.taken_at) >= new Date(range.from));
    if (range.to) { const to = new Date(range.to); to.setHours(23, 59, 59, 999); base = base.filter(s => new Date(s.taken_at) <= to); }
    return base;
  }, [snapshotsSorted, yearFilter, range]);

  const createSnapshotNow = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await createSnapshot(apiBase, session.access_token);
      loadAllData();
    } catch (e) { alert(e.message); }
  };

  return (
    <PinGate tenantSlug={tenantSlug}>
      <div className="space-y-8 pb-24">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-200/80">
          <div>
            <h1 className="text-3xl font-extrabold text-zinc-950 tracking-tight flex items-center gap-3">
              <div className="text-zinc-950"><IconChart /></div> Área Financiera
            </h1>
            <p className="text-sm font-medium text-zinc-500 mt-1">Control económico y métricas de rendimiento.</p>
          </div>
          
          <div className="flex bg-zinc-100/80 p-1 rounded-xl border border-zinc-200/60 w-full max-w-xs">
            <button onClick={() => setTab("actual")} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${tab === 'actual' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>Visión Actual</button>
            <button onClick={() => setTab("historico")} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${tab === 'historico' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}><IconHistory /> Histórico</button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-zinc-200 border-t-brand-500 rounded-full animate-spin" /></div>
        ) : error ? (
          <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-2xl font-bold">{error}</div>
        ) : (
          <AnimatePresence mode="wait">
            {tab === "actual" ? (
              <motion.div key="actual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-zinc-500 font-bold text-[10px] tracking-widest uppercase truncate max-w-[80%]">Último Mes ({activeMonthLabel})</span>
                      <span className="text-brand-500"><IconEuro /></span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-3xl font-black text-zinc-950 tracking-tight">{formatEUR(ingresosMesActual)}</span>
                      <Delta value={deltaMoM} />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-zinc-500 font-bold text-[10px] tracking-widest uppercase">Últimos 30 Días</span>
                      <span className="text-zinc-400"><IconChart /></span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-3xl font-black text-zinc-950 tracking-tight">{formatEUR(ingresos30d)}</span>
                      <span className="text-[10px] font-bold text-zinc-400 mt-1">{entregas30d.toLocaleString()} entregas</span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-zinc-500 font-bold text-[10px] tracking-widest uppercase">Ticket Medio Histórico</span>
                      <span className="text-amber-500"><IconTruck /></span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-2xl font-black text-zinc-950 tracking-tight">{formatEUR(ticketMedioTotal)}</span>
                      <span className="text-[10px] font-bold text-zinc-400 mt-1">30d: {formatEUR(ticketMedio30d)}</span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-zinc-500 font-bold text-[10px] tracking-widest uppercase">Líder Histórico</span>
                      <span className="text-emerald-500"><IconBuilding /></span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xl font-black text-zinc-950 tracking-tight truncate">{empresas[0]?.empresa_transporte || "—"}</span>
                      <span className="text-[10px] font-bold text-zinc-400 mt-1">{(empresas[0]?.pct || 0).toFixed(1)}% cuota</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-sm lg:col-span-2 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-sm font-bold text-zinc-900">Evolución de Ingresos</h3>
                      <span className="text-[10px] font-bold bg-zinc-100 text-zinc-500 px-2 py-1 rounded-md uppercase tracking-widest">Histórico Mensual</span>
                    </div>
                    <div className="h-[280px] w-full flex-1">
                      <ResponsiveContainer>
                        <AreaChart data={mensualSrv}>
                          <defs>
                            <linearGradient id="colorIng" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f4f4f5" />
                          <XAxis dataKey="mes" tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                          <YAxis tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} labelStyle={{ fontWeight: 'bold', color: '#09090b' }} />
                          <Area type="monotone" dataKey="total_ingresos" name="Ingresos (€)" stroke="#14b8a6" fill="url(#colorIng)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-zinc-950 rounded-3xl p-8 shadow-2xl relative overflow-hidden border border-zinc-800 flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/20 blur-[80px] rounded-full pointer-events-none" />
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-8">
                        <h3 className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Objetivo Acumulado<br/><span className="text-white text-sm">{activeYear}</span></h3>
                        {!editingGoal && (
                          <button onClick={() => { setGoalDraft(String(objetivoAnual || "")); setEditingGoal(true); }} className="shrink-0 w-10 h-10 rounded-full bg-zinc-800/50 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                            <IconEdit />
                          </button>
                        )}
                      </div>
                      
                      {!editingGoal ? (
                        <div>
                          <div className="flex flex-col gap-1 mb-8">
                            <span className="text-5xl font-black text-white tracking-tight">{formatEUR(facturacionYTD)}</span>
                            <span className="text-sm font-bold text-zinc-500">de {formatEUR(objetivoAnual)}</span>
                          </div>
                          <div className="w-full bg-zinc-800/50 rounded-full h-4 backdrop-blur-md overflow-hidden relative">
                            <div className="bg-gradient-to-r from-brand-600 to-brand-400 h-full rounded-full relative transition-all duration-1000 ease-out" style={{ width: `${progresoObjetivo}%` }}>
                              <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" />
                            </div>
                          </div>
                          <div className="mt-4 flex justify-between items-center">
                            <span className="text-sm font-bold text-brand-400">{progresoObjetivo}% completado</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <input type="number" value={goalDraft} onChange={(e) => setGoalDraft(e.target.value)} className="bg-zinc-900 border border-zinc-700 text-white px-4 py-3 rounded-xl font-bold text-lg outline-none focus:border-brand-500 w-full" placeholder="Ej: 50000" />
                          <div className="flex gap-2">
                            <button onClick={saveGoal} className="flex-1 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-400 transition-colors">Guardar</button>
                            <button onClick={() => setEditingGoal(false)} className="flex-1 py-3 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700 transition-colors">Cancelar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-sm flex flex-col">
                    <h3 className="text-sm font-bold text-zinc-900 mb-2">Ingresos por Día</h3>
                    <p className="text-xs font-medium text-zinc-500 mb-6">Útil para gestionar los turnos de personal.</p>
                    <div className="h-[250px] w-full flex-1">
                      <ResponsiveContainer>
                        <BarChart data={weekdayAgg}>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f4f4f5" />
                          <XAxis dataKey="dia" tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                          <Tooltip cursor={{ fill: '#f4f4f5' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} labelStyle={{ fontWeight: 'bold', color: '#09090b' }} />
                          <Bar dataKey="ingresos" name="Ingresos (€)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm lg:col-span-2 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                      <h3 className="text-sm font-bold text-zinc-900">Rendimiento por Transportista</h3>
                      <span className="text-[10px] font-bold bg-white border border-zinc-200 text-zinc-500 px-2 py-1 rounded-md uppercase tracking-widest">Histórico</span>
                    </div>
                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-left border-collapse whitespace-nowrap h-full">
                        <thead>
                          <tr className="bg-white text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-100">
                            <th className="py-4 px-6 w-1/3">Empresa</th>
                            <th className="py-4 px-6 w-1/2">Cuota de Mercado</th>
                            <th className="py-4 px-6 text-right w-1/6">Facturado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50 bg-white">
                          {empresas.map(e => (
                            <tr key={e.empresa_transporte} className="hover:bg-zinc-50/50 transition-colors group">
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: e.color }} />
                                  <span className="font-bold text-zinc-900">{e.empresa_transporte}</span>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3 w-full">
                                  <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${e.pct}%`, backgroundColor: e.color }} />
                                  </div>
                                  <span className="text-xs font-bold text-zinc-500 w-12 text-right">{e.pct.toFixed(1)}%</span>
                                </div>
                              </td>
                              <td className="py-4 px-6 text-right font-black text-zinc-900">{formatEUR(e.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-zinc-200/80 rounded-3xl shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-zinc-100"><h3 className="text-sm font-bold text-zinc-900">Mejores Clientes Históricos</h3></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="bg-zinc-50/50 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-100">
                          <th className="py-4 px-6">Cliente</th>
                          <th className="py-4 px-6 text-right">Paquetes Procesados</th>
                          <th className="py-4 px-6 text-right">Ingreso Generado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        {topClientes.slice(0, 10).map((c, i) => (
                          <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="py-4 px-6 font-bold text-zinc-900 flex items-center gap-3">
                              <span className="text-zinc-300 font-black text-sm w-4">{i + 1}.</span> {c.nombre_cliente}
                            </td>
                            <td className="py-4 px-6 text-right font-semibold text-zinc-500">{Number(c.total_entregas || 0)}</td>
                            <td className="py-4 px-6 text-right font-black text-emerald-600">{formatEUR(c.total_ingresos)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="historico" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-center">
                  <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                    <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 outline-none focus:ring-2 focus:ring-brand-500">
                      {yearsAvailable.map(y => <option key={y} value={y}>{y === "all" ? "Todos los años" : y}</option>)}
                    </select>
                    <button onClick={reloadSnapshots} className="px-4 py-3 bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-sm font-bold transition-colors">
                      Filtrar Rango
                    </button>
                  </div>
                  <button onClick={createSnapshotNow} className="w-full xl:w-auto px-6 py-3 bg-zinc-950 hover:bg-zinc-800 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2">
                    <IconSave /> Generar Snapshot Ahora
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-sm">
                    <h3 className="text-sm font-bold text-zinc-900 mb-6">Total Facturado (Evolución)</h3>
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer>
                        <LineChart data={snapshotsFiltered}>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f4f4f5" />
                          <XAxis dataKey="taken_at" tickFormatter={(v) => new Date(v).toLocaleDateString()} tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                          <YAxis tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
                          <Tooltip labelFormatter={(v) => new Date(v).toLocaleString()} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                          <Line type="monotone" dataKey="total_ingresos" name="Total (€)" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-sm">
                    <h3 className="text-sm font-bold text-zinc-900 mb-6">Ingresos 30D (Histórico)</h3>
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer>
                        <BarChart data={snapshotsFiltered}>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f4f4f5" />
                          <XAxis dataKey="taken_at" tickFormatter={(v) => new Date(v).toLocaleDateString()} tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                          <YAxis tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
                          <Tooltip labelFormatter={(v) => new Date(v).toLocaleString()} cursor={{ fill: '#f4f4f5' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="ingresos_30d" name="30d (€)" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-zinc-200/80 rounded-3xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="bg-zinc-50/50 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-100">
                          <th className="py-4 px-6">Fecha del Snapshot</th>
                          <th className="py-4 px-6 text-right">Total Acumulado</th>
                          <th className="py-4 px-6 text-right">Últimos 30D</th>
                          <th className="py-4 px-6 text-right">Ticket Medio</th>
                          <th className="py-4 px-6">Empresa Líder</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        {loadingSnap ? (
                          <tr><td colSpan={5} className="py-10 text-center"><div className="w-6 h-6 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mx-auto" /></td></tr>
                        ) : snapshotsFiltered.length === 0 ? (
                          <tr><td colSpan={5} className="py-12 text-center text-zinc-400 font-bold">Sin snapshots en este rango.</td></tr>
                        ) : snapshotsFiltered.map(s => (
                          <tr key={s.id} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="py-4 px-6 font-bold text-zinc-900">{new Date(s.taken_at).toLocaleString()}</td>
                            <td className="py-4 px-6 text-right font-black text-brand-600">{formatEUR(s.total_ingresos)}</td>
                            <td className="py-4 px-6 text-right font-bold text-zinc-700">{formatEUR(s.ingresos_30d)}</td>
                            <td className="py-4 px-6 text-right font-medium text-zinc-500">{formatEUR(s.ticket_medio)}</td>
                            <td className="py-4 px-6">
                              <span className="font-bold text-zinc-900">{s.empresa_top || "—"}</span>
                              {s.empresa_top_share && <span className="ml-2 text-xs font-bold text-zinc-400">{(s.empresa_top_share * 100).toFixed(1)}%</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </PinGate>
  );
}