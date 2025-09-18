// src/pages/AreaPersonal.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import {
  FaEuroSign, FaChartBar, FaChartLine, FaTruck, FaClock, FaUserTie, FaBuilding,
  FaArrowUp, FaArrowDown, FaCalendarAlt, FaPercentage, FaPen, FaCheck, FaTimes,
  FaHistory, FaSave
} from "react-icons/fa";
import {
  ResponsiveContainer,
  LineChart, Line,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend,
  BarChart, Bar,
  AreaChart, Area,
  PieChart, Pie, Cell,
} from "recharts";
import {
  buildAreaApiBase,
  getSnapshots, createSnapshot,
  getFinanceSettings, updateFinanceSettings
} from "../services/areaPersonalService";
import "../styles/AreaPersonal.scss";

/* ===== helpers fechas (LOCAL) ===== */
const isYYYYMMDD = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}/.test(s);
const toLocalDate = (d) => {
  if (!d) return new Date("Invalid Date");
  if (isYYYYMMDD(d)) {
    const [y, m, dd] = d.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, dd);
  }
  return new Date(d);
};
const localYMD = (x) => {
  const d = toLocalDate(x);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const inLastNDays = (dateLike, n) => {
  const d = toLocalDate(dateLike);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (n - 1));
  return d >= start && d <= end;
};

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7", "#84cc16", "#f97316"];

export default function AreaPersonal() {
  const location = useLocation();
  const apiBase = useMemo(() => buildAreaApiBase(location.pathname), [location.pathname]);

  // Tabs
  const [tab, setTab] = useState("actual"); // "actual" | "historico"

  // Estado "actual"
  const [resumen, setResumen] = useState(null);
  const [mensual, setMensual] = useState([]);
  const [porEmpresa, setPorEmpresa] = useState([]);
  const [topClientes, setTopClientes] = useState([]);
  const [ultimasEntregas, setUltimasEntregas] = useState([]);
  const [diario, setDiario] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Objetivo anual (sincronizado servidor)
  const [goalServer, setGoalServer] = useState(null); // número o null
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");

  // Histórico
  const [snapshots, setSnapshots] = useState([]);
  const [loadingSnap, setLoadingSnap] = useState(false);
  const [range, setRange] = useState({ from: "", to: "" });
  const [yearFilter, setYearFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "info") => { setToast({ id: Date.now(), msg, type }); setTimeout(() => setToast(null), 2600); };

  const fetchJson = async (url, headers) => {
    const res = await fetch(url, { headers });
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await res.json() : await res.text();
    if (!res.ok) throw new Error((data && data.error) || `Error ${res.status} en ${url}`);
    return data;
  };

  /* ---------- Carga "actual" ---------- */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true); setError(null);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setError("No hay sesión activa."); setLoading(false); return; }
        const headers = { Authorization: `Bearer ${session.access_token}`, Accept: "application/json" };

        const [d1, d2, d3, d4, d5, d6] = await Promise.all([
          fetchJson(`${apiBase}/resumen`, headers).catch(e => ({ __error: e })),
          fetchJson(`${apiBase}/mensual`, headers).catch(e => ({ __error: e })),
          fetchJson(`${apiBase}/por-empresa`, headers).catch(e => ({ __error: e })),
          fetchJson(`${apiBase}/top-clientes`, headers).catch(e => ({ __error: e })),
          fetchJson(`${apiBase}/diario`, headers).catch(e => ({ __error: e })),
          fetchJson(`${apiBase}/ultimas`, headers).catch(() => ([])),
        ]);
        if (cancel) return;
        const firstErr = [d1, d2, d3, d4].find(x => x?.__error)?.__error;
        if (firstErr) throw firstErr;

        setResumen(d1?.resumen || null);
        setMensual(Array.isArray(d2?.mensual) ? d2.mensual : []);
        setPorEmpresa(Array.isArray(d3?.porEmpresa) ? d3.porEmpresa : []);
        setTopClientes(Array.isArray(d4?.topClientes) ? d4.topClientes : []);

        const diarioArr = Array.isArray(d5?.diario) ? d5.diario : (Array.isArray(d5) ? d5 : []);
        setDiario(diarioArr.map(x => ({
          fecha: x.fecha || x.dia || x.date,
          ingresos: Number(x.ingresos ?? x.total_ingresos ?? x.total ?? 0),
          entregas: Number(x.entregas ?? x.total_entregas ?? 0),
        })));

        const ult = Array.isArray(d5?.ultimas) ? d5.ultimas : (Array.isArray(d6) ? d6 : []);
        setUltimasEntregas(ult);
      } catch (e) {
        setError(e.message || "Error cargando datos");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [apiBase]);

  /* ---------- Carga objetivo anual desde servidor ---------- */
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { settings } = await getFinanceSettings(apiBase, session.access_token);
        const value = Number(settings?.goal_annual_eur || 0);
        setGoalServer(value > 0 ? value : null);
      } catch {
        /* silencio: usamos heurística si no hay ajuste */
      }
    })();
  }, [apiBase]);

  /* ---------- Carga snapshots ---------- */
  const reloadSnapshots = async () => {
    setLoadingSnap(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sin sesión");
      const params = {};
      if (range.from) params.from = range.from;
      if (range.to) params.to = range.to;
      const { snapshots: list = [] } = await getSnapshots(apiBase, session.access_token, params);
      setSnapshots(list);
    } catch (e) {
      showToast(e.message || "No se pudo cargar el histórico", "error");
    } finally {
      setLoadingSnap(false);
    }
  };
  useEffect(() => { reloadSnapshots(); }, []); // eslint-disable-line

  /* ---------- Derivados "actual" ---------- */
  const mensualSorted = useMemo(() => {
    const parseM = (m) => { const t = Date.parse(String(m).replace(/[/.]/g, "-") + "-01"); return Number.isFinite(t) ? t : 0; };
    return [...mensual].sort((a, b) => parseM(a.mes) - parseM(b.mes));
  }, [mensual]);

  const ingresosMesActual = Number(mensualSorted.at(-1)?.total_ingresos || 0);
  const ingresosMesPrevio = Number(mensualSorted.at(-2)?.total_ingresos || 0);
  const deltaMoM = ingresosMesPrevio ? ((ingresosMesActual - ingresosMesPrevio) / ingresosMesPrevio) * 100 : 0;

  const diarioSorted = useMemo(
    () => [...diario].sort((a, b) => toLocalDate(a.fecha) - toLocalDate(b.fecha)),
    [diario]
  );
  const lastNDays = (n) => diarioSorted.filter(d => inLastNDays(d.fecha, n));
  const sumIngresos = (arr) => arr.reduce((a, c) => a + Number(c.ingresos || 0), 0);
  const sumEntregas = (arr) => arr.reduce((a, c) => a + Number(c.entregas || 0), 0);

  const ingresos30d = useMemo(() => sumIngresos(lastNDays(30)), [diarioSorted]);
  const entregas30d = useMemo(() => sumEntregas(lastNDays(30)), [diarioSorted]);

  const todayYMD = localYMD(new Date());
  const ingresosHoy = useMemo(() => {
    const d = diarioSorted.find(x => localYMD(x.fecha) === todayYMD);
    if (d) return Number(d.ingresos || 0);
    return ultimasEntregas
      .filter(p => localYMD(p.fecha_llegada || p.created_at) === todayYMD)
      .reduce((a, p) => a + Number(p.ingreso_generado || 0), 0);
  }, [diarioSorted, ultimasEntregas, todayYMD]);
  const ingresos7d = useMemo(() => sumIngresos(lastNDays(7)), [diarioSorted]);

  const ticketMedioTotal = useMemo(() => {
    const totI = Number(resumen?.total_ingresos || 0);
    const totE = Number(resumen?.total_entregas || 0);
    return totE ? (totI / totE) : 0;
  }, [resumen]);
  const ticketMedio30d = useMemo(() => {
    const e = entregas30d || 0;
    return e ? (ingresos30d / e) : 0;
  }, [ingresos30d, entregas30d]);

  // objetivo anual (prioriza servidor; si no hay, heurística 110% últimos 12 meses)
  const objetivoAnual = useMemo(() => {
    if (goalServer && goalServer > 0) return goalServer;
    if (Number(resumen?.objetivo_anual) > 0) return Number(resumen.objetivo_anual);
    const sum12 = mensualSorted.slice(-12).reduce((a, c) => a + Number(c.total_ingresos || 0), 0);
    return Math.max(0, sum12 * 1.1);
  }, [goalServer, resumen, mensualSorted]);

  const facturacionYTD = useMemo(() => {
    const y = new Date().getFullYear();
    return mensualSorted
      .filter(m => String(m.mes).slice(0, 4) === String(y))
      .reduce((a, c) => a + Number(c.total_ingresos || 0), 0);
  }, [mensualSorted]);
  const progresoObjetivo = objetivoAnual > 0 ? Math.min(100, Math.round((facturacionYTD / objetivoAnual) * 100)) : 0;

  const totalEmpresas = porEmpresa.reduce((a, c) => a + Number(c.total || 0), 0);
  const empresas = useMemo(() =>
    porEmpresa.map((e, i) => ({
      ...e,
      total: Number(e.total || 0),
      entregas: Number(e.entregas || 0),
      ticket: (Number(e.total || 0) && Number(e.entregas || 0)) ? Number(e.total) / Number(e.entregas) : 0,
      pct: totalEmpresas ? (Number(e.total) / totalEmpresas) * 100 : 0,
      color: COLORS[i % COLORS.length],
    })).sort((a, b) => b.total - a.total)
    , [porEmpresa, totalEmpresas]);

  const weekdayAgg = useMemo(() => {
    const labels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const sums = Array(7).fill(0);
    const counts = Array(7).fill(0);
    for (const d of diarioSorted) {
      const day = toLocalDate(d.fecha).getDay(); // 0..6
      const idx = (day + 6) % 7;                 // 0=lun
      sums[idx] += Number(d.ingresos || 0);
      counts[idx] += 1;
    }
    return labels.map((lbl, i) => ({ dia: lbl, ingresos: sums[i], promedio: counts[i] ? sums[i] / counts[i] : 0 }));
  }, [diarioSorted]);

  const totalIngresosTop = useMemo(
    () => topClientes.reduce((acc, c) => acc + Number(c?.total_ingresos || 0), 0),
    [topClientes]
  );

  const formatEUR = (n = 0) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(Number(n) || 0);
  const renderImporte = (valor) => {
    const n = Number(valor || 0);
    const cls = n > 0 ? "positivo" : n < 0 ? "negativo" : "neutro";
    return <span className={`importe ${cls}`}>{formatEUR(n)}</span>;
  };
  const Delta = ({ value }) => {
    const up = value >= 0;
    const Icon = up ? FaArrowUp : FaArrowDown;
    return <span className={`delta ${up ? "up" : "down"}`}><Icon /> {Math.abs(value).toFixed(1)}%</span>;
  };

  /* ---------- Derivados "histórico" ---------- */
  const snapshotsSorted = useMemo(
    () => [...snapshots].sort((a, b) => new Date(a.taken_at) - new Date(b.taken_at)),
    [snapshots]
  );
  const yearsAvailable = useMemo(() => {
    const set = new Set(snapshotsSorted.map(s => new Date(s.taken_at).getFullYear()));
    return ["all", ...Array.from(set).sort((a, b) => a - b)];
  }, [snapshotsSorted]);
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
      if (!session) throw new Error("Sin sesión");
      await createSnapshot(apiBase, session.access_token);
      showToast("Snapshot guardado", "success");
      reloadSnapshots();
    } catch (e) {
      showToast(e.message || "No se pudo guardar", "error");
    }
  };

  const startGoalEdit = () => { setGoalDraft(String(objetivoAnual || "")); setEditingGoal(true); };
  const saveGoal = async () => {
    try {
      const v = Number(goalDraft);
      if (!Number.isFinite(v) || v <= 0) { setEditingGoal(false); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sin sesión");
      const { settings } = await updateFinanceSettings(apiBase, session.access_token, v);
      setGoalServer(Number(settings?.goal_annual_eur || 0) || null);
      setEditingGoal(false);
      showToast("Objetivo actualizado", "success");
    } catch (e) {
      showToast(e.message || "No se pudo actualizar el objetivo", "error");
    }
  };

  if (loading) return <div className="loading-skeleton">Cargando datos…</div>;
  if (error) {
    return (
      <div id="ap-personal" className="ap">
        <div className="error-block">
          <h3>No se pudieron cargar las estadísticas</h3>
        </div>
      </div>
    );
  }

  return (
    <div id="ap-personal" className="ap">
      <h2 className="titulo-area"><FaChartBar /> Área personal · Finanzas</h2>

      <div className="ap-tabs">
        <button className={tab === "actual" ? "active" : ""} onClick={() => setTab("actual")}><FaChartLine /> Visión actual</button>
        <button className={tab === "historico" ? "active" : ""} onClick={() => setTab("historico")}><FaHistory /> Histórico</button>
      </div>

      {tab === "actual" ? (
        <>
          {/* KPIs */}
          <section className="kpi-grid">
            <article className="kpi">
              <div className="kpi__icon"><FaEuroSign /></div>
              <div className="kpi__meta">
                <h4>Total facturado</h4>
                <div className="kpi__value">{formatEUR(resumen?.total_ingresos || 0)}</div>
                <div className="kpi__sub"><FaClock /> {resumen?.primera_entrega?.slice(0, 10) || "—"} → {resumen?.ultima_entrega?.slice(0, 10) || "—"}</div>
              </div>
            </article>

            <article className="kpi">
              <div className="kpi__icon"><FaCalendarAlt /></div>
              <div className="kpi__meta">
                <h4>Últimos 30 días</h4>
                <div className="kpi__value">{formatEUR(ingresos30d)}</div>
                <div className="kpi__sub">Entregas: {entregas30d.toLocaleString()}</div>
              </div>
            </article>

            <article className="kpi">
              <div className="kpi__icon"><FaChartLine /></div>
              <div className="kpi__meta">
                <h4>Variación mensual</h4>
                <div className="kpi__value">{formatEUR(ingresosMesActual)}</div>
                <div className="kpi__sub"><Delta value={deltaMoM} /> vs. mes anterior</div>
              </div>
            </article>

            <article className="kpi">
              <div className="kpi__icon"><FaTruck /></div>
              <div className="kpi__meta">
                <h4>Ticket medio (total)</h4>
                <div className="kpi__value">{formatEUR(ticketMedioTotal)}</div>
                <div className="kpi__sub">En 30d: {formatEUR(ticketMedio30d)}</div>
              </div>
            </article>

            <article className="kpi">
              <div className="kpi__icon"><FaBuilding /></div>
              <div className="kpi__meta">
                <h4>Empresa líder</h4>
                <div className="kpi__value">{empresas[0]?.empresa_transporte || "—"}</div>
                <div className="kpi__sub"><FaPercentage /> {(empresas[0]?.pct || 0).toFixed(1)}% del total</div>
              </div>
            </article>

            <article className="kpi">
              <div className="kpi__icon"><FaEuroSign /></div>
              <div className="kpi__meta">
                <h4>Hoy</h4>
                <div className="kpi__value">{formatEUR(ingresosHoy)}</div>
                <div className="kpi__sub">En 7d: {formatEUR(ingresos7d)}</div>
              </div>
            </article>
          </section>

          {/* Objetivo anual */}
          <section className="objetivo">
            <div className="objetivo__left">
              <h3><FaChartLine /> Objetivo anual</h3>
              {!editingGoal ? (
                <>
                  <p className="objetivo__meta">
                    {formatEUR(facturacionYTD)} / {formatEUR(objetivoAnual)} · <b>{progresoObjetivo}%</b>
                  </p>
                  <div className="objetivo__bar"><span style={{ width: `${progresoObjetivo}%` }} /></div>
                </>
              ) : (
                <div className="objetivo__edit">
                  <label>
                    Nuevo objetivo (€)
                    <input type="number" step="0.01" value={goalDraft} onChange={(e) => setGoalDraft(e.target.value)} />
                  </label>
                </div>
              )}
            </div>
            <div className="objetivo__actions">
              {!editingGoal ? (
                <button className="btn-ghost" onClick={startGoalEdit}><FaPen /> Establecer objetivo</button>
              ) : (
                <div className="edit-buttons">
                  <button className="btn-primary" onClick={saveGoal}><FaCheck /> Guardar</button>
                  <button className="btn-ghost" onClick={() => setEditingGoal(false)}><FaTimes /> Cancelar</button>
                </div>
              )}
            </div>
          </section>

          {/* Gráficos, tablas, etc. */}
          <section className="charts-grid">
            <div className="chart-card">
              <header>Ingresos y entregas (mensual)</header>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={mensualSorted}>
                  <defs>
                    <linearGradient id="igr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="total_ingresos" name="Ingresos (€)" stroke="#6366f1" fill="url(#igr)" strokeWidth={2} />
                  <Line type="monotone" dataKey="total_entregas" name="Entregas" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <header>Ingresos diarios (últimos 30 días)</header>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={diarioSorted.filter(d => inLastNDays(d.fecha, 30))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="ingresos" name="Ingresos (€)" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <header>Distribución por empresa</header>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Tooltip />
                  <Legend />
                  <Pie data={empresas} dataKey="total" nameKey="empresa_transporte" innerRadius={60} outerRadius={100} paddingAngle={2}>
                    {empresas.map((e) => <Cell key={e.empresa_transporte} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <header>Rendimiento por día de semana</header>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={weekdayAgg}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dia" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ingresos" name="Ingresos (€)" fill="#06b6d4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="tabla-seccion">
            <h3>Empresas de transporte</h3>
            <div className="tabla-wrapper">
              <table className="tabla">
                <thead><tr><th>Empresa</th><th>Ingresos</th><th>Entregas</th><th>Ticket medio</th><th>%</th></tr></thead>
                <tbody>
                  {empresas.map(e => (
                    <tr key={e.empresa_transporte}>
                      <td className="empresa"><span className="dot" style={{ background: e.color }} />{e.empresa_transporte}</td>
                      <td>{formatEUR(e.total)}</td>
                      <td>{e.entregas.toLocaleString()}</td>
                      <td>{formatEUR(e.ticket)}</td>
                      <td>{e.pct.toFixed(1)}%</td>
                    </tr>
                  ))}
                  {empresas.length === 0 && <tr><td colSpan={5} className="empty">Sin datos</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="tabla-seccion">
            <h3>Top clientes por ingresos</h3>
            <div className="tabla-wrapper">
              <table className="tabla top-clientes">
                <thead><tr><th>Cliente</th><th>Entregas</th><th>Ingresos</th></tr></thead>
                <tbody>
                  {topClientes.map((c, i) => {
                    const ingreso = Number(c.total_ingresos || 0);
                    const total = totalIngresosTop || 0;
                    const pct = total ? (ingreso / total) * 100 : 0;
                    return (
                      <tr key={i} style={{ ["--pct"]: `${pct}%` }}>
                        <td>{c.nombre_cliente}</td>
                        <td>{Number(c.total_entregas || 0).toLocaleString()}</td>
                        <td>{renderImporte(ingreso)}</td>
                      </tr>
                    );
                  })}
                  {topClientes.length === 0 && <tr><td colSpan={3} className="empty">Sin datos suficientes</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="tabla-seccion">
            <h3>Últimas entregas</h3>
            <div className="tabla-wrapper">
              <table className="tabla ultimas">
                <thead><tr><th>Cliente</th><th>Fecha</th><th>Empresa</th><th>Ingreso</th></tr></thead>
                <tbody>
                  {ultimasEntregas.map((p, i) => (
                    <tr key={i}>
                      <td>{p.nombre_cliente}</td>
                      <td>{p.fecha_llegada ? toLocalDate(p.fecha_llegada).toLocaleDateString() : "—"}</td>
                      <td>{p.empresa_transporte}</td>
                      <td>{renderImporte(p.ingreso_generado)}</td>
                    </tr>
                  ))}
                  {ultimasEntregas.length === 0 && <tr><td colSpan={4} className="empty">Sin entregas recientes</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="historico">
          <div className="historico__toolbar">
            <div className="filters">
              <label>Año
                <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                  {yearsAvailable.map(y => <option key={y} value={y}>{y === "all" ? "Todos" : y}</option>)}
                </select>
              </label>
              <label>Desde
                <input type="date" value={range.from} onChange={(e) => setRange(r => ({ ...r, from: e.target.value }))} />
              </label>
              <label>Hasta
                <input type="date" value={range.to} onChange={(e) => setRange(r => ({ ...r, to: e.target.value }))} />
              </label>
              <button className="btn-ghost" onClick={reloadSnapshots}>Aplicar</button>
            </div>
            <div className="actions">
              <button className="btn-primary" onClick={createSnapshotNow}><FaSave /> Guardar snapshot ahora</button>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <header>Evolución del total facturado (snapshot)</header>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={snapshotsFiltered}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="taken_at" tickFormatter={(v) => new Date(v).toLocaleDateString()} />
                  <YAxis />
                  <Tooltip labelFormatter={(v) => new Date(v).toLocaleString()} />
                  <Legend />
                  <Line type="monotone" dataKey="total_ingresos" name="Total facturado (€)" stroke="#6366f1" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <header>Ingresos últimos 30 días (snapshot)</header>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={snapshotsFiltered}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="taken_at" tickFormatter={(v) => new Date(v).toLocaleDateString()} />
                  <YAxis />
                  <Tooltip labelFormatter={(v) => new Date(v).toLocaleString()} />
                  <Bar dataKey="ingresos_30d" name="Ingresos 30d (€)" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="tabla-seccion">
            <h3>Detalle de snapshots</h3>
            <div className="tabla-wrapper">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Total (€)</th>
                    <th>Entregas</th>
                    <th>30d (€)</th>
                    <th>30d entregas</th>
                    <th>Ticket</th>
                    <th>Empresa top</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingSnap ? (
                    <tr><td colSpan={8} className="empty">Cargando…</td></tr>
                  ) : snapshotsFiltered.length === 0 ? (
                    <tr><td colSpan={8} className="empty">Sin snapshots en el rango</td></tr>
                  ) : snapshotsFiltered.map(s => (
                    <tr key={s.id}>
                      <td>{new Date(s.taken_at).toLocaleString()}</td>
                      <td>{formatEUR(s.total_ingresos)}</td>
                      <td>{Number(s.total_entregas || 0).toLocaleString()}</td>
                      <td>{formatEUR(s.ingresos_30d)}</td>
                      <td>{Number(s.entregas_30d || 0).toLocaleString()}</td>
                      <td>{formatEUR(s.ticket_medio)}</td>
                      <td>{s.empresa_top || "—"}</td>
                      <td>{s.empresa_top_share != null ? (s.empresa_top_share * 100).toFixed(1) + "%" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
        </section>
      )}
    </div>
  );
}
