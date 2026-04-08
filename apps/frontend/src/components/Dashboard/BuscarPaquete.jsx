import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../utils/supabaseClient";
import {
  obtenerPaquetesBackend,
  eliminarPaqueteBackend,
  entregarPaqueteBackend,
  editarPaqueteBackend,
} from "../../services/paquetesService";
import { getTenantIdOrThrow } from "../../utils/tenant";

// ==========================================
// ICONOS CUSTOM
// ==========================================
const IconSearch = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const IconCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>;
const IconTrash = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconEdit = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>;
const IconEye = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconEyeSlash = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20"/></svg>;
const IconTimes = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

// ==========================================
// LÓGICA DE BÚSQUEDA Y CONSTANTES
// ==========================================
const RESULTADOS_POR_PAGINA = 10;
const LS_KEY = "buscar_paquete_filtros_v12";

const normalize = (s = "") => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^\p{L}\p{N}\s'-]+/gu, " ").replace(/\s+/g, " ");
const tokenize = (s = "") => normalize(s).split(" ").filter(Boolean);

function jaroWinkler(a = "", b = "") {
  a = normalize(a); b = normalize(b);
  if (!a || !b) return 0;
  const m = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  let matches = 0, transpositions = 0;
  const aMatches = new Array(a.length).fill(false);
  const bMatches = new Array(b.length).fill(false);
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - m);
    const end = Math.min(i + m + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatches[j]) continue;
      if (a[i] === b[j]) { aMatches[i] = true; bMatches[j] = true; matches++; break; }
    }
  }
  if (matches === 0) return 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  transpositions /= 2;
  const j = (matches / a.length + matches / b.length + (matches - transpositions) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) { if (a[i] === b[i]) prefix++; else break; }
  return j + prefix * 0.1 * (1 - j);
}

const fuzzyScore = (q, c) => {
  const qn = normalize(q), cn = normalize(c);
  if (!qn) return 1; if (!cn) return 0;
  const qT = tokenize(qn), cT = tokenize(cn);
  let sum = 0;
  for (const qt of qT) {
    let best = 0;
    for (const ct of cT) {
      if (ct === qt) { best = 1; break; }
      if (ct.startsWith(qt)) best = Math.max(best, 0.95);
      else if (ct.includes(qt)) best = Math.max(best, 0.8);
      else best = Math.max(best, jaroWinkler(qt, ct) * 0.9);
    }
    sum += best;
  }
  const tokenScore = sum / qT.length;
  const global = jaroWinkler(qn, cn);
  return Math.max(global, tokenScore * 0.7 + global * 0.3);
};

const passesStrict = (q, c) => {
  const qT = tokenize(q), cT = tokenize(c);
  if (qT.length === 0) return true;
  if (cT.length === 0) return false;
  return qT.every(qt => {
    const minJW = Math.min(0.93, 0.80 + Math.min(qt.length, 10) * 0.02);
    return cT.some(ct => ct === qt || ct.startsWith(qt) || jaroWinkler(qt, ct) >= minJW);
  });
};

function highlightApprox(name, query) {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return name;
  const original = String(name);
  const norm = normalize(original);
  const ranges = [];
  for (const t of qTokens) {
    const idx = norm.indexOf(t);
    if (idx !== -1) ranges.push([idx, idx + t.length]);
  }
  if (ranges.length === 0) return original;
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  let [s, e] = ranges[0];
  for (let i = 1; i < ranges.length; i++) {
    const [ns, ne] = ranges[i];
    if (ns <= e) e = Math.max(e, ne);
    else { merged.push([s, e]); [s, e] = [ns, ne]; }
  }
  merged.push([s, e]);
  const parts = [];
  let lastEnd = 0;
  for (const [ms, me] of merged) {
    parts.push({ type: "text", text: original.slice(lastEnd, ms) });
    parts.push({ type: "mark", text: original.slice(ms, me) });
    lastEnd = me;
  }
  parts.push({ type: "text", text: original.slice(lastEnd) });
  return (
    <>
      {parts.map((p, i) =>
        p.type === "mark" ? <mark key={i} className="bg-brand-200 text-brand-900 px-0.5 rounded-sm">{p.text}</mark> : <span key={i}>{p.text}</span>
      )}
    </>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function BuscarPaquete() {
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("pendiente");
  const [companiaFiltro, setCompaniaFiltro] = useState("todos");
  const [ubicacionFiltro, setUbicacionFiltro] = useState("todas");

  const [revealAll, setRevealAll] = useState(false);
  const [revealedSet, setRevealedSet] = useState(() => new Set());
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const isSelected = (id) => selectedIds.has(id);
  const clearSelection = () => setSelectedIds(new Set());
  const toggleSelectOne = (id) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const [paquetes, setPaquetes] = useState([]);
  const [companias, setCompanias] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]); 
  const [ubiIdToLabel, setUbiIdToLabel] = useState(() => new Map());

  const [paginaActual, setPaginaActual] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [paqueteEditando, setPaqueteEditando] = useState(null);
  
  const [confirmState, setConfirmState] = useState({ open: false, payload: null });
  const [confirmBulk, setConfirmBulk] = useState(false);

  const searchDebounceRef = useRef(null);

  // LS persist
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      setEstadoFiltro(saved.estadoFiltro ?? "pendiente");
      setCompaniaFiltro(saved.companiaFiltro ?? "todos");
      setUbicacionFiltro(saved.ubicacionFiltro ?? "todas");
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ estadoFiltro, companiaFiltro, ubicacionFiltro }));
  }, [estadoFiltro, companiaFiltro, ubicacionFiltro]);

  // Carga inicial
  useEffect(() => {
    let cancelado = false;
    (async () => {
      setCargando(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const tenantId = await getTenantIdOrThrow();

        const paquetesAPI = await obtenerPaquetesBackend(token);
        if (cancelado) return;

        const { data: empresas } = await supabase.from("empresas_transporte_tenant").select("nombre").eq("tenant_id", tenantId);
        setCompanias((empresas || []).map(e => e?.nombre).filter(Boolean).sort((a,b)=>a.localeCompare(b)));

        const { data: uRows } = await supabase.from("ubicaciones").select("id,label").eq("tenant_id", tenantId);
        const ubis = (uRows || []).map(r => ({ id: r.id, label: String(r.label || "").toUpperCase() }));
        setUbicaciones(ubis);
        
        const mapU = new Map(ubis.map(u => [u.id, u.label]));
        setUbiIdToLabel(mapU);

        const list = (paquetesAPI || []).map(p => {
          const label = (p.ubicacion_label && String(p.ubicacion_label).toUpperCase()) || (p.compartimento && String(p.compartimento).toUpperCase()) || (p.ubicacion_id && (mapU.get(p.ubicacion_id) || "")) || "";
          return {
            id: p.id,
            nombre_cliente: p.nombre_cliente ?? "",
            compania: p.empresa_transporte ?? p.compania ?? "",
            entregado: !!p.entregado,
            fecha_llegada: p.fecha_llegada ?? p.created_at ?? new Date().toISOString(),
            ubicacion_id: p.ubicacion_id ?? null,
            ubicacion_label: label || null,
          };
        });
        setPaquetes(list);
      } catch (e) {} finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => { cancelado = true; };
  }, []);

  const companiasFiltradas = useMemo(() => ["todos", ...Array.from(new Set(paquetes.map(p => p.compania).filter(Boolean)))], [paquetes]);
  const ubicacionesFiltradas = useMemo(() => {
    const fromUbis = ubicaciones.map(u => u.label);
    const fromPaquetes = paquetes.map(p => p.ubicacion_label).filter(Boolean);
    const uniq = Array.from(new Set([...fromUbis, ...fromPaquetes])).sort((a,b)=> {
      const ma = /^B(\d+)$/i.exec(String(a)); const mb = /^B(\d+)$/i.exec(String(b));
      if (ma && mb) return parseInt(ma[1],10) - parseInt(mb[1],10);
      return String(a).localeCompare(String(b));
    });
    return ["todas", ...uniq];
  }, [ubicaciones, paquetes]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setPaginaActual(1), 200);
    return () => clearTimeout(searchDebounceRef.current);
  }, [busqueda, estadoFiltro, companiaFiltro, ubicacionFiltro]);

  const filtrados = useMemo(() => {
    let base = paquetes
      .filter(p => estadoFiltro === "pendiente" ? !p.entregado : estadoFiltro === "entregado" ? p.entregado : true)
      .filter(p => companiaFiltro === "todos" || p.compania === companiaFiltro)
      .filter(p => ubicacionFiltro === "todas" || (p.ubicacion_label || "") === ubicacionFiltro);

    const q = busqueda.trim();
    const sortFn = (a, b) => new Date(b.fecha_llegada) - new Date(a.fecha_llegada);

    if (!q) return [...base].sort(sortFn);

    return base
      .filter(p => passesStrict(q, `${p.nombre_cliente} ${p.compania || ""}`))
      .map(p => ({ p, s: fuzzyScore(q, `${p.nombre_cliente} ${p.compania || ""}`) }))
      .sort((a,b)=>b.s-a.s || sortFn(a.p, b.p))
      .map(x => x.p);
  }, [paquetes, busqueda, estadoFiltro, companiaFiltro, ubicacionFiltro]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / RESULTADOS_POR_PAGINA));
  const paginados = useMemo(() => filtrados.slice((paginaActual - 1) * RESULTADOS_POR_PAGINA, paginaActual * RESULTADOS_POR_PAGINA), [filtrados, paginaActual]);
  
  // FUNCION DE CAMBIO DE PAGINA (RESTURADA)
  const cambiarPagina = (nueva) => {
    if (nueva >= 1 && nueva <= totalPaginas) setPaginaActual(nueva);
  };

  const paginadosIds = paginados.map(p => p.id);
  const allPageSelected = paginados.length > 0 && paginados.every(p => selectedIds.has(p.id));
  const anySelected = selectedIds.size > 0;
  
  const toggleSelectAllPage = () => {
    if (allPageSelected) {
      setSelectedIds(prev => { const n = new Set(prev); paginadosIds.forEach(id => n.delete(id)); return n; });
    } else {
      setSelectedIds(prev => new Set([...prev, ...paginadosIds]));
    }
  };

  const selectedPendingIds = useMemo(() => {
    const set = new Set(selectedIds);
    return paquetes.filter(p => set.has(p.id) && !p.entregado).map(p => p.id);
  }, [selectedIds, paquetes]);

  // Acciones DB
  const marcarEntregado = async (id) => {
    const snapshot = paquetes;
    setPaquetes(prev => prev.map(p => p.id === id ? { ...p, entregado: true } : p));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await entregarPaqueteBackend(id, session.access_token);
    } catch (e) {
      setPaquetes(snapshot);
    }
  };

  const confirmarEliminar = async () => {
    const payload = confirmState.payload;
    setConfirmState({ open: false, payload: null });
    if (!payload) return;
    const snapshot = paquetes;
    setPaquetes(prev => prev.filter(p => p.id !== payload.id));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await eliminarPaqueteBackend(payload.id, session.access_token);
      setSelectedIds(prev => { const n = new Set(prev); n.delete(payload.id); return n; });
    } catch (e) {
      setPaquetes(snapshot);
    }
  };

  const entregarSeleccionados = async () => {
    const ids = selectedPendingIds;
    if (ids.length === 0) return;
    const snapshot = paquetes;
    setPaquetes(prev => prev.map(p => ids.includes(p.id) ? { ...p, entregado: true } : p));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      for (const id of ids) await entregarPaqueteBackend(id, session.access_token);
      clearSelection();
    } catch (e) {
      setPaquetes(snapshot);
    }
  };

  const eliminarSeleccionados = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const snapshot = paquetes;
    setPaquetes(prev => prev.filter(p => !ids.includes(p.id)));
    setConfirmBulk(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      for (const id of ids) await eliminarPaqueteBackend(id, session.access_token);
      clearSelection();
    } catch (e) {
      setPaquetes(snapshot);
    }
  };

  const guardarCambios = async () => {
    if (!paqueteEditando) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const label = String(paqueteEditando.ubicacion_label || "").toUpperCase().trim();
      const ubiRow = ubicaciones.find(u => u.label === label) || null;
      
      const payload = {
        id: paqueteEditando.id,
        nombre_cliente: paqueteEditando.nombre_cliente,
        empresa_transporte: paqueteEditando.compania,
        ubicacion_id: ubiRow?.id || null,
        ubicacion_label: label || null,
      };

      const actualizado = await editarPaqueteBackend(payload, session.access_token);
      setPaquetes(prev => prev.map(p => p.id === payload.id ? {
        ...p,
        nombre_cliente: actualizado?.nombre_cliente ?? payload.nombre_cliente,
        compania: actualizado?.empresa_transporte ?? payload.empresa_transporte,
        ubicacion_id: actualizado?.ubicacion_id ?? payload.ubicacion_id,
        ubicacion_label: actualizado?.ubicacion_label ?? label,
      } : p));
      setMostrarModal(false);
    } catch (e) {}
  };

  // KPIs
  const totalKPI = paquetes.length;
  const pendientesKPI = paquetes.filter(p => !p.entregado).length;
  const entregadosKPI = totalKPI - pendientesKPI;
  const progresoKPI = totalKPI ? Math.round((entregadosKPI / totalKPI) * 100) : 0;

  return (
    <div className="space-y-6 pb-24">
      {/* HEADER & KPIS */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-6 border-b border-zinc-200/80">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-950 tracking-tight flex items-center gap-3">
             <IconSearch /> Localizador
          </h1>
          <p className="text-sm font-medium text-zinc-500 mt-1">Encuentra y gestiona el histórico de paquetes.</p>
        </div>
        
        <div className="flex flex-wrap md:flex-nowrap gap-3">
          <div className="bg-white px-5 py-3 rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col justify-center flex-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total</span>
            <span className="text-2xl font-black text-zinc-900">{totalKPI}</span>
          </div>
          <div className="bg-white px-5 py-3 rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col justify-center flex-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Pendientes</span>
            <span className="text-2xl font-black text-amber-600">{pendientesKPI}</span>
          </div>
          <div className="bg-white px-5 py-3 rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col justify-center flex-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Entregados</span>
            <span className="text-2xl font-black text-emerald-600">{entregadosKPI}</span>
          </div>
          <div className="bg-white px-5 py-3 rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col justify-center flex-1 w-full md:w-48">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Progreso</span>
              <span className="text-xs font-black text-brand-600">{progresoKPI}%</span>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-2">
              <div className="bg-brand-500 h-2 rounded-full" style={{ width: `${progresoKPI}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* FILTROS Y BUSQUEDA */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-center">
        <div className="relative w-full xl:w-96 flex-shrink-0">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-400"><IconSearch /></div>
          <input type="text" placeholder="Buscar nombre o compañía..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full pl-12 pr-10 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-bold text-zinc-900 transition-all" />
          {busqueda && (
            <button onClick={() => setBusqueda("")} className="absolute inset-y-0 right-3 flex items-center justify-center text-zinc-400 hover:text-zinc-600">
              <IconTimes />
            </button>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)} className="px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 outline-none focus:ring-2 focus:ring-brand-500">
            <option value="pendiente">Solo Pendientes</option>
            <option value="entregado">Solo Entregados</option>
            <option value="todos">Todos los Estados</option>
          </select>
          <select value={companiaFiltro} onChange={e => setCompaniaFiltro(e.target.value)} className="px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 outline-none focus:ring-2 focus:ring-brand-500">
            {companiasFiltradas.map(c => <option key={c} value={c}>{c === 'todos' ? 'Cualquier Compañía' : c}</option>)}
          </select>
          <select value={ubicacionFiltro} onChange={e => setUbicacionFiltro(e.target.value)} className="px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 outline-none focus:ring-2 focus:ring-brand-500">
            {ubicacionesFiltradas.map(u => <option key={u} value={u}>{u === 'todas' ? 'Todas las Ubicaciones' : u}</option>)}
          </select>
          <button onClick={() => {setRevealAll(!revealAll); setRevealedSet(new Set());}} className={`px-4 py-3 rounded-xl border text-sm font-bold transition-colors flex items-center justify-center gap-2 ${revealAll ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'}`}>
            {revealAll ? <IconEyeSlash /> : <IconEye />} {revealAll ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </div>

      {/* TABLA DE DATOS */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-zinc-50/80 border-b border-zinc-200 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                <th className="py-4 px-4 w-12 text-center">
                  <button onClick={toggleSelectAllPage} className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${allPageSelected ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white border-zinc-300'}`}>
                    {allPageSelected && <IconCheck />}
                  </button>
                </th>
                <th className="py-4 px-6">Cliente</th>
                <th className="py-4 px-6">Compañía</th>
                <th className="py-4 px-6">Ubicación</th>
                <th className="py-4 px-6">Fecha</th>
                <th className="py-4 px-6">Estado</th>
                <th className="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {cargando ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan="7" className="py-6 px-6"><div className="h-4 bg-zinc-100 rounded w-full animate-pulse"></div></td></tr>
                ))
              ) : paginados.length === 0 ? (
                <tr><td colSpan="7" className="py-16 text-center text-zinc-500 font-medium">No hay paquetes que coincidan con la búsqueda.</td></tr>
              ) : (
                paginados.map(p => {
                  const revealed = revealAll || revealedSet.has(p.id);
                  const checked = isSelected(p.id);
                  
                  return (
                    <tr key={p.id} className={`hover:bg-zinc-50 transition-colors ${checked ? 'bg-brand-50/50' : ''}`}>
                      <td className="py-4 px-4 text-center">
                        <button onClick={() => toggleSelectOne(p.id)} className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${checked ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white border-zinc-300'}`}>
                          {checked && <IconCheck />}
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        <div className={`font-bold text-zinc-900 transition-all ${revealed ? '' : 'blur-[4px] select-none'}`}>
                          {busqueda ? highlightApprox(p.nombre_cliente, busqueda) : p.nombre_cliente}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-semibold text-zinc-600 text-sm">
                        {p.compania || "—"}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs font-black rounded-lg">
                          {p.ubicacion_label || "—"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm font-medium text-zinc-500">
                        {new Date(p.fecha_llegada).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${p.entregado ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {p.entregado ? "Entregado" : "Pendiente"}
                        </span>
                      </td>
                      
                      {/* ACCIONES (Siempre Visibles, Máximo Protagonismo para ENTREGAR) */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => {setRevealAll(false); setRevealedSet(prev => {const n=new Set(prev); n.has(p.id)?n.delete(p.id):n.add(p.id); return n;})}} className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors" title="Mostrar/Ocultar nombre">
                            {revealed ? <IconEyeSlash /> : <IconEye />}
                          </button>
                          <button onClick={() => {setPaqueteEditando(p); setMostrarModal(true);}} className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Editar paquete">
                            <IconEdit />
                          </button>
                          <button onClick={() => setConfirmState({ open: true, payload: p })} className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Eliminar paquete">
                            <IconTrash />
                          </button>
                          
                          {/* BOTON ESTRELLA */}
                          {!p.entregado && (
                            <button onClick={() => marcarEntregado(p.id)} className="ml-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-400 text-white text-sm font-black rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-brand-500/20 active:scale-95">
                              <IconCheck /> Entregar
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN FUNCIONAL */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 bg-zinc-50">
            <span className="text-sm font-medium text-zinc-500">Página <strong className="text-zinc-900">{paginaActual}</strong> de {totalPaginas}</span>
            <div className="flex gap-2">
              <button 
                onClick={() => cambiarPagina(paginaActual - 1)} 
                disabled={paginaActual === 1} 
                className="px-5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <button 
                onClick={() => cambiarPagina(paginaActual + 1)} 
                disabled={paginaActual === totalPaginas} 
                className="px-5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BARRA FLOTANTE ACCIONES MASIVAS */}
      <AnimatePresence>
        {anySelected && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-950 text-white px-6 py-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center gap-4 sm:gap-6 z-50 border border-zinc-800">
            <div className="text-sm font-bold whitespace-nowrap">
              <span className="text-brand-400 text-lg mr-1">{selectedIds.size}</span> seleccionados
            </div>
            <div className="flex items-center gap-3">
              <button onClick={clearSelection} className="px-3 py-2 rounded-lg text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">Cancelar</button>
              <button onClick={() => setConfirmBulk(true)} className="px-3 py-2 rounded-lg text-sm font-bold text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-2"><IconTrash /> Eliminar</button>
              <button onClick={entregarSeleccionados} disabled={selectedPendingCount === 0} className="px-5 py-2 bg-brand-500 hover:bg-brand-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-lg shadow-brand-500/20">
                <IconCheck /> Entregar {selectedPendingCount > 0 ? `(${selectedPendingCount})` : ''}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL EDICION */}
      <AnimatePresence>
        {mostrarModal && paqueteEditando && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={() => setMostrarModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-xl font-black text-zinc-950">Editar Paquete</h3>
                <button onClick={() => setMostrarModal(false)} className="w-8 h-8 flex items-center justify-center bg-zinc-100 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-200 rounded-full transition-colors"><IconTimes /></button>
              </div>
              <div className="p-6 space-y-5 bg-zinc-50/50">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Cliente</label>
                  <input type="text" value={paqueteEditando.nombre_cliente} onChange={e => setPaqueteEditando(p => ({ ...p, nombre_cliente: e.target.value }))} className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-bold text-zinc-900" />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Compañía</label>
                  <select value={paqueteEditando.compania} onChange={e => setPaqueteEditando(p => ({ ...p, compania: e.target.value }))} className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-bold text-zinc-900">
                    {companias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Ubicación</label>
                  <select value={paqueteEditando.ubicacion_label} onChange={e => setPaqueteEditando(p => ({ ...p, ubicacion_label: e.target.value }))} className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-bold text-zinc-900">
                    {ubicaciones.map(u => <option key={u.id} value={u.label}>{u.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="p-6 flex items-center justify-end gap-3 border-t border-zinc-100 bg-white">
                <button onClick={() => setMostrarModal(false)} className="px-5 py-3 rounded-xl font-bold text-sm text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors">Cancelar</button>
                <button onClick={guardarCambios} className="px-5 py-3 rounded-xl font-black text-sm bg-brand-500 hover:bg-brand-400 text-white shadow-lg shadow-brand-500/30 transition-all active:scale-95">Guardar Cambios</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODALES CONFIRMACION */}
      <AnimatePresence>
        {(confirmState.open || confirmBulk) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={() => {setConfirmState({open:false, payload:null}); setConfirmBulk(false);}} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden p-8 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-100">
                <IconTrash />
              </div>
              <h3 className="text-2xl font-black text-zinc-950 mb-2">Eliminar paquete{confirmBulk ? 's' : ''}</h3>
              <p className="text-sm font-medium text-zinc-500 mb-8">
                {confirmBulk 
                  ? `Estás a punto de eliminar ${selectedIds.size} paquetes de forma irreversible.` 
                  : `¿Seguro que deseas eliminar el paquete de ${confirmState.payload?.nombre_cliente}? Esta acción no se puede deshacer.`}
              </p>
              <div className="flex gap-3">
                <button onClick={() => {setConfirmState({open:false, payload:null}); setConfirmBulk(false);}} className="flex-1 py-3.5 rounded-xl font-bold text-sm text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors">Cancelar</button>
                <button onClick={confirmBulk ? eliminarSeleccionados : confirmarEliminar} className="flex-1 py-3.5 rounded-xl font-black text-sm text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all active:scale-95">Sí, Eliminar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}