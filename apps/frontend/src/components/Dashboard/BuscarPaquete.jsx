import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../utils/supabaseClient";
import {
  eliminarPaqueteBackend,
  entregarPaqueteBackend,
  editarPaqueteBackend,
} from "../../services/paquetesService";
import { getTenantIdOrThrow } from "../../utils/tenant";

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');

let __SEARCH_CACHE = {
  loaded: false,
  kpiGlobal: { total: 0, entregados: 0, pendientes: 0 },
  companias: [],
  ubicaciones: [],
  paquetes: [],
  totalResultados: 0
};

// --- ICONOS ---
const IconSearch = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const IconCheck = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>;
const IconTrash = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconEdit = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>;
const IconEye = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconEyeSlash = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20"/></svg>;
const IconTimes = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconInfo = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const IconLoader = () => <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>;

const RESULTADOS_POR_PAGINA = 10;
const LS_KEY = "buscar_paquete_filtros_v12";
const QUEUE_KEY = "easytrack_sync_queue";
const REVEAL_KEY = "easytrack_reveal_names"; // Persistencia del Ojo

// --- MEMORIA RADAR DE OLVIDOS ---
const RADAR_KEY = "easytrack_radar_olvidos";
const RADAR_DELAY_MS = 3 * 60 * 1000; // 3 minutos

const getRadar = () => {
  try { return JSON.parse(localStorage.getItem(RADAR_KEY) || "{}"); } catch { return {}; }
};
const setRadar = (val) => localStorage.setItem(RADAR_KEY, JSON.stringify(val));

// --- SONIDO DE ÉXITO ---
let __AUDIO_CTX = null;
const playSuccessChime = () => {
  try {
    const ctx = __AUDIO_CTX || new (window.AudioContext || window.webkitAudioContext)();
    __AUDIO_CTX = ctx;
    
    const playFreq = (f, t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, ctx.currentTime + t);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.5);
    };

    playFreq(523.25, 0); // Do
    playFreq(659.25, 0.08); // Mi
    playFreq(783.99, 0.16); // Sol
  } catch {}
};

const formatearFechaLocal = (isoString) => {
  if (!isoString) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(isoString)).replace(',', ' -');
};

function highlightExact(text, query) {
  if (!query || !text) return text;
  const words = query.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return text;
  const regex = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = String(text).split(regex);
  return (
    <>
      {parts.map((p, i) =>
        regex.test(p) ? <mark key={i} className="bg-[#14B07E]/20 text-zinc-900 px-0.5 rounded-sm">{p}</mark> : <span key={i}>{p}</span>
      )}
    </>
  );
}

export default function BuscarPaquete() {
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("pendiente");
  const [companiaFiltro, setCompaniaFiltro] = useState("todos");
  const [ubicacionFiltro, setUbicacionFiltro] = useState("todas");
  
  // Ojo con persistencia
  const [revealAll, setRevealAll] = useState(() => localStorage.getItem(REVEAL_KEY) === "true");
  const [revealedSet, setRevealedSet] = useState(() => new Set());
  
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [toastMsg, setToastMsg] = useState(null);

  const retryQueue = useRef(new Set());
  const isSyncing = useRef(false);
  const isFirstMount = useRef(true);
  const searchDebounceRef = useRef(null);
  const radarDebounceRef = useRef(null);
  
  const [tenantId, setTenantId] = useState(null);
  const [paquetes, _setPaquetes] = useState(__SEARCH_CACHE.paquetes);
  const [totalResultados, _setTotalResultados] = useState(__SEARCH_CACHE.totalResultados);
  const [kpiGlobal, _setKpiGlobal] = useState(__SEARCH_CACHE.kpiGlobal);
  const [companias, _setCompanias] = useState(__SEARCH_CACHE.companias);
  const [ubicaciones, _setUbicaciones] = useState(__SEARCH_CACHE.ubicaciones);

  const [olvidos, setOlvidos] = useState([]);
  const [entregandoId, setEntregandoId] = useState(null);

  const setPaquetes = (updater) => {
    _setPaquetes(prev => { const next = typeof updater === 'function' ? updater(prev) : updater; __SEARCH_CACHE.paquetes = next; return next; });
  };
  const setTotalResultados = (updater) => {
    _setTotalResultados(prev => { const next = typeof updater === 'function' ? updater(prev) : updater; __SEARCH_CACHE.totalResultados = next; return next; });
  };
  const setKpiGlobal = (updater) => {
    _setKpiGlobal(prev => { const next = typeof updater === 'function' ? updater(prev) : updater; __SEARCH_CACHE.kpiGlobal = next; return next; });
  };
  const setCompanias = (updater) => {
    _setCompanias(prev => { const next = typeof updater === 'function' ? updater(prev) : updater; __SEARCH_CACHE.companias = next; return next; });
  };
  const setUbicaciones = (updater) => {
    _setUbicaciones(prev => { const next = typeof updater === 'function' ? updater(prev) : updater; __SEARCH_CACHE.ubicaciones = next; return next; });
  };

  const [paginaActual, setPaginaActual] = useState(1);
  const [cargando, setCargando] = useState(!__SEARCH_CACHE.loaded);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [paqueteEditando, setPaqueteEditando] = useState(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false, payload: null });
  const [confirmBulk, setConfirmBulk] = useState(false);

  const showToast = (msg, isError = false) => {
    setToastMsg({ msg, isError });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const isSelected = (id) => selectedIds.has(id);
  const clearSelection = () => setSelectedIds(new Set());
  
  const toggleSelectOne = (id) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // Botón Maestro del Ojo
  const toggleRevealGlobal = () => {
    const nextState = !revealAll;
    setRevealAll(nextState);
    setRevealedSet(new Set());
    localStorage.setItem(REVEAL_KEY, nextState.toString());
  };

  // --- LÓGICA RADAR DE OLVIDOS (4 Segundos de Delay) ---
  const removeFromRadar = useCallback((id) => {
    const r = getRadar();
    if (r[id]) {
      delete r[id];
      setRadar(r);
    }
  }, []);

  const checkRadar = useCallback(() => {
    const r = getRadar();
    const now = Date.now();
    const alertList = [];
    let changed = false;

    for (const id in r) {
      const isDelivered = !paquetes.some(p => String(p.id) === String(id) && !p.entregado);
      if (isDelivered) {
        delete r[id];
        changed = true;
        continue;
      }
      if (now - r[id].ts > RADAR_DELAY_MS) {
        alertList.push({ id, ...r[id] });
      }
    }

    if (changed) setRadar(r);
    setOlvidos(alertList);
  }, [paquetes]);

  useEffect(() => {
    checkRadar();
    const int = setInterval(checkRadar, 15000); 
    return () => clearInterval(int);
  }, [checkRadar]);

  // Detector Inteligente: Si para de teclear durante 4s y hay resultados exactos, se guardan en el radar.
  useEffect(() => {
    if (radarDebounceRef.current) clearTimeout(radarDebounceRef.current);

    if (busqueda.length >= 3 && !cargando && paquetes.length > 0 && estadoFiltro === "pendiente") {
      radarDebounceRef.current = setTimeout(() => {
        const r = getRadar();
        let changed = false;
        paquetes.forEach(p => {
          if (!p.entregado && !r[p.id]) {
            r[p.id] = { ts: Date.now(), nombre: p.nombre_cliente, ubi: p.ubicacion_label };
            changed = true;
          }
        });
        if (changed) setRadar(r);
      }, 4000);
    }

    return () => {
      if (radarDebounceRef.current) clearTimeout(radarDebounceRef.current);
    };
  }, [busqueda, cargando, paquetes, estadoFiltro]);

  // --- LÓGICA CORE ---
  const processSyncQueue = useCallback(async () => {
    if (isSyncing.current || retryQueue.current.size === 0) return;
    isSyncing.current = true;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        isSyncing.current = false;
        return;
      }
      while (retryQueue.current.size > 0) {
        const id = Array.from(retryQueue.current)[0];
        try {
          await entregarPaqueteBackend(id, session.access_token);
          retryQueue.current.delete(id);
          localStorage.setItem(QUEUE_KEY, JSON.stringify(Array.from(retryQueue.current)));
        } catch (e) {
          console.error("Error sincronizando entrega:", id, e);
          break; 
        }
      }
    } catch (e) {}
    isSyncing.current = false;
    if (retryQueue.current.size > 0) setTimeout(processSyncQueue, 5000); 
  }, []);

  const loadGlobalData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const tId = await getTenantIdOrThrow();
      setTenantId(tId);

      const headers = { Authorization: `Bearer ${token}` };

      const resKPI = await fetch(`${API_BASE}/api/paquetes/count`, { headers });
      if (resKPI.ok) {
        const dataKPI = await resKPI.json();
        setKpiGlobal({ total: dataKPI.total || 0, entregados: dataKPI.entregados || 0, pendientes: dataKPI.pendientes || 0 });
      }

      const { data: empresas } = await supabase.from("empresas_transporte_tenant").select("nombre").eq("tenant_id", tId);
      setCompanias((empresas || []).map(e => e?.nombre).filter(Boolean).sort((a,b)=>a.localeCompare(b)));

      const { data: uRows } = await supabase.from("ubicaciones").select("id,label").eq("tenant_id", tId);
      setUbicaciones((uRows || []).map(r => ({ id: r.id, label: String(r.label || "").toUpperCase() })));
    } catch (e) {}
  };

  const fetchPage = async () => {
    const isBackgroundSync = isFirstMount.current && __SEARCH_CACHE.loaded;
    if (!isBackgroundSync) setCargando(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers = { Authorization: `Bearer ${token}` };
      const searchFuzzy = busqueda.trim().replace(/\s+/g, '%');

      const params = new URLSearchParams({
        limit: RESULTADOS_POR_PAGINA,
        offset: (paginaActual - 1) * RESULTADOS_POR_PAGINA,
        estado: estadoFiltro,
        compania: companiaFiltro,
        ubicacion: ubicacionFiltro,
        search: searchFuzzy,
        order: 'fecha_llegada',
        dir: 'desc'
      });

      const [resPkgs, resCount] = await Promise.all([
        fetch(`${API_BASE}/api/paquetes?${params}`, { headers }),
        fetch(`${API_BASE}/api/paquetes/count?${params}`, { headers })
      ]);

      if (resPkgs.ok && resCount.ok) {
        const dataPkgs = await resPkgs.json();
        const dataCount = await resCount.json();

        const list = (dataPkgs.paquetes || [])
          .filter(p => estadoFiltro !== "pendiente" || !retryQueue.current.has(p.id))
          .map(p => ({
            id: p.id,
            nombre_cliente: p.nombre_cliente ?? "",
            compania: p.empresa_transporte ?? p.compania ?? "",
            entregado: !!p.entregado || retryQueue.current.has(p.id),
            fecha_llegada: p.fecha_llegada ?? p.created_at ?? new Date().toISOString(),
            ubicacion_id: p.ubicacion_id ?? null,
            ubicacion_label: p.ubicacion_label || "",
          }));

        setPaquetes(list);
        setTotalResultados(dataCount.total || 0);
        __SEARCH_CACHE.loaded = true;
      }
    } catch(e) {
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    try {
      const rawFiltros = localStorage.getItem(LS_KEY);
      if (rawFiltros) {
        const saved = JSON.parse(rawFiltros);
        setEstadoFiltro(saved.estadoFiltro ?? "pendiente");
        setCompaniaFiltro(saved.companiaFiltro ?? "todos");
        setUbicacionFiltro(saved.ubicacionFiltro ?? "todas");
      }
      const rawQueue = localStorage.getItem(QUEUE_KEY);
      if (rawQueue) {
        const savedQueue = JSON.parse(rawQueue);
        if (Array.isArray(savedQueue) && savedQueue.length > 0) {
          savedQueue.forEach(id => retryQueue.current.add(id));
          processSyncQueue();
        }
      }
    } catch {}
    loadGlobalData();
  }, [processSyncQueue]);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ estadoFiltro, companiaFiltro, ubicacionFiltro }));
  }, [estadoFiltro, companiaFiltro, ubicacionFiltro]);

  useEffect(() => {
    setSelectedIds(new Set());
    setPaginaActual(1);
  }, [busqueda, estadoFiltro, companiaFiltro, ubicacionFiltro]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchPage();
      isFirstMount.current = false; 
    }, 300);
    return () => clearTimeout(searchDebounceRef.current);
  }, [paginaActual, busqueda, estadoFiltro, companiaFiltro, ubicacionFiltro]);

  const companiasFiltradas = ["todos", ...companias];
  const ubicacionesFiltradas = ["todas", ...ubicaciones.map(u => u.label).sort((a,b)=> {
    const ma = /^B(\d+)$/i.exec(String(a)); const mb = /^B(\d+)$/i.exec(String(b));
    if (ma && mb) return parseInt(ma[1],10) - parseInt(mb[1],10);
    return String(a).localeCompare(String(b));
  })];

  const totalPaginas = Math.max(1, Math.ceil(totalResultados / RESULTADOS_POR_PAGINA));
  const paginadosIds = paquetes.map(p => p.id);
  const allPageSelected = paquetes.length > 0 && paquetes.every(p => selectedIds.has(p.id));
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

  // --- ENTREGAR PAQUETE (CON FEEDBACK) ---
  const marcarEntregado = (id) => {
    setEntregandoId(id); 
    
    // Delay de dopamina: Mostramos el loader, hacemos la transición y luego eliminamos.
    setTimeout(() => {
      playSuccessChime();
      
      setPaquetes(prev => {
        if (estadoFiltro === "pendiente") return prev.filter(p => p.id !== id);
        return prev.map(p => p.id === id ? { ...p, entregado: true } : p);
      });
      
      if (estadoFiltro === "pendiente") setTotalResultados(prev => Math.max(0, prev - 1));
      
      retryQueue.current.add(id);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(Array.from(retryQueue.current)));
      processSyncQueue();
      removeFromRadar(id);
      checkRadar();
      
      setKpiGlobal(prev => ({...prev, pendientes: Math.max(0, prev.pendientes - 1), entregados: prev.entregados + 1}));
      if (window.__AP_PAGE_CACHE) {
        window.__AP_PAGE_CACHE.loaded = false;
      }
      setEntregandoId(null);
    }, 600); 
  };

  const entregarSeleccionados = () => {
    const ids = selectedPendingIds;
    if (ids.length === 0) return;
    
    setPaquetes(prev => {
      if (estadoFiltro === "pendiente") return prev.filter(p => !ids.includes(p.id));
      return prev.map(p => ids.includes(p.id) ? { ...p, entregado: true } : p);
    });
    
    if (estadoFiltro === "pendiente") setTotalResultados(prev => Math.max(0, prev - ids.length));
    
    ids.forEach(id => {
      retryQueue.current.add(id);
      removeFromRadar(id);
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(Array.from(retryQueue.current)));
    clearSelection();
    processSyncQueue();
    checkRadar();
    
    setKpiGlobal(prev => ({...prev, pendientes: Math.max(0, prev.pendientes - ids.length), entregados: prev.entregados + ids.length}));
    playSuccessChime();
    showToast(`${ids.length} paquetes entregados.`);
  };

  const confirmarEliminar = async () => {
    const payload = confirmState.payload;
    setConfirmState({ open: false, payload: null });
    if (!payload) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await eliminarPaqueteBackend(payload.id, session.access_token);
      setSelectedIds(prev => { const n = new Set(prev); n.delete(payload.id); return n; });
      removeFromRadar(payload.id);
      checkRadar();
      showToast("Paquete eliminado.");
      fetchPage();
      loadGlobalData();
    } catch (e) {
      showToast("Error al eliminar.", true);
    }
  };

  const eliminarSeleccionados = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setConfirmBulk(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await Promise.all(ids.map(id => eliminarPaqueteBackend(id, session.access_token)));
      clearSelection();
      ids.forEach(removeFromRadar);
      checkRadar();
      showToast(`${ids.length} paquetes eliminados.`);
      fetchPage();
      loadGlobalData();
    } catch (e) {
      showToast("Error al eliminar lote.", true);
    }
  };

  const guardarCambios = async () => {
    if (!paqueteEditando) return;
    setLoadingEdit(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const newLabel = String(paqueteEditando.ubicacion_label || "").toUpperCase().trim();
      const ubiRow = ubicaciones.find(u => u.label === newLabel) || null;
      
      const payload = {
        id: paqueteEditando.id,
        nombre_cliente: paqueteEditando.nombre_cliente,
        empresa_transporte: paqueteEditando.compania,
        ubicacion_id: ubiRow?.id || null,
        ubicacion_label: newLabel || null,
      };

      const actualizado = await editarPaqueteBackend(payload, session.access_token);
      setPaquetes(prev => prev.map(p => p.id === payload.id ? {
        ...p,
        nombre_cliente: actualizado?.nombre_cliente ?? payload.nombre_cliente,
        compania: actualizado?.empresa_transporte ?? payload.empresa_transporte,
        ubicacion_id: actualizado?.ubicacion_id ?? payload.ubicacion_id,
        ubicacion_label: actualizado?.ubicacion_label ?? newLabel,
      } : p));
      setMostrarModal(false);
      showToast("Cambios guardados.");
    } catch (e) {
      showToast("Error al editar.", true);
    } finally {
      setLoadingEdit(false);
    }
  };

  const progresoKPI = kpiGlobal.total ? Math.round((kpiGlobal.entregados / kpiGlobal.total) * 100) : 0;
  const selectedPendingCount = selectedPendingIds.length;

  return (
    <div className="space-y-6 pb-24 relative overflow-hidden">
      <AnimatePresence>
        {toastMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -50, x: '-50%' }} 
            animate={{ opacity: 1, y: 0, x: '-50%' }} 
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-24 left-1/2 z-[9999] px-5 sm:px-6 py-3 rounded-xl shadow-lg font-black text-white text-sm sm:text-base flex items-center gap-3 border ${toastMsg.isError ? 'bg-red-600 border-red-500' : 'bg-[#14B07E] border-[#14B07E]'} whitespace-nowrap`}
          >
            {toastMsg.isError ? <IconTimes /> : <IconCheck />}
            {toastMsg.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-6 border-b border-zinc-200">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-zinc-950 tracking-tight flex items-center gap-3">
             <IconSearch /> Localizador
          </h1>
          <p className="text-sm sm:text-base font-bold text-zinc-600 mt-1">Encuentra y gestiona el histórico de paquetes.</p>
        </div>
        
        <div className="grid grid-cols-2 md:flex md:flex-nowrap gap-3">
          <div className="bg-white px-4 py-3 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center flex-1">
            <span className="text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-widest">Total</span>
            <span className="text-2xl sm:text-3xl font-black text-zinc-950 mt-1">{kpiGlobal.total}</span>
          </div>
          <div className="bg-white px-4 py-3 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center flex-1">
            <span className="text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-widest">Pendientes</span>
            <span className="text-2xl sm:text-3xl font-black text-zinc-950 mt-1">{kpiGlobal.pendientes}</span>
          </div>
          <div className="bg-white px-4 py-3 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center flex-1">
            <span className="text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-widest">Entregados</span>
            <span className="text-2xl sm:text-3xl font-black text-zinc-950 mt-1">{kpiGlobal.entregados}</span>
          </div>
          <div className="bg-white px-4 py-3 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center flex-1 w-full md:w-48">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-widest">Progreso</span>
              <span className="text-xs sm:text-sm font-black text-[#14B07E]">{progresoKPI}%</span>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-2">
              <div className="bg-[#14B07E] h-2 rounded-full" style={{ width: `${progresoKPI}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {olvidos.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center shrink-0 border border-zinc-200 shadow-sm">
                  <IconInfo />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-zinc-950 tracking-tight">Cierre Pendiente</h3>
                  <p className="text-sm font-bold text-zinc-500">Buscaste estos paquetes recientemente. ¿Completaste la entrega?</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {olvidos.map(o => (
                  <div key={o.id} className="flex flex-col gap-3 bg-zinc-50 p-4 rounded-xl border border-zinc-200 hover:border-zinc-300 transition-colors shadow-sm">
                     <div className="min-w-0">
                       <p className="font-black text-zinc-900 text-base truncate">{o.nombre}</p>
                       <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
                         Ubicación <span className="text-zinc-950 px-1.5 py-0.5 bg-white border border-zinc-200 rounded-md ml-1">{o.ubi}</span>
                       </p>
                     </div>
                     <div className="flex items-center gap-2 pt-1 border-t border-zinc-200/60 mt-1">
                       <button onClick={() => { removeFromRadar(o.id); checkRadar(); }} className="flex-1 py-2 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-200/50 text-xs font-black rounded-lg transition-colors">
                         Descartar
                       </button>
                       <button onClick={() => { marcarEntregado(o.id); }} className="flex-1 py-2 bg-[#14B07E] hover:bg-[#129A6E] text-white text-xs font-black rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95">
                         <IconCheck /> Confirmar
                       </button>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-center">
        <div className="relative w-full xl:w-96 flex-shrink-0">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-400"><IconSearch /></div>
          <input type="text" placeholder="Buscar por nombre..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full pl-12 pr-10 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#14B07E] outline-none font-black text-base sm:text-lg text-zinc-950 transition-colors placeholder:font-bold" />
          {busqueda && (
            <button onClick={() => setBusqueda("")} className="absolute inset-y-0 right-3 flex items-center justify-center text-zinc-400 hover:text-zinc-900">
              <IconTimes />
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-2 lg:flex lg:flex-row gap-3 w-full xl:w-auto">
          <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)} className="px-3 sm:px-4 py-2.5 sm:py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm sm:text-base font-black text-zinc-800 outline-none focus:border-[#14B07E] truncate cursor-pointer">
            <option value="pendiente">Pendientes</option>
            <option value="entregado">Entregados</option>
            <option value="todos">Todos</option>
          </select>
          <select value={companiaFiltro} onChange={e => setCompaniaFiltro(e.target.value)} className="px-3 sm:px-4 py-2.5 sm:py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm sm:text-base font-black text-zinc-800 outline-none focus:border-[#14B07E] truncate cursor-pointer">
            {companiasFiltradas.map(c => <option key={c} value={c}>{c === 'todos' ? 'Cualquier Compañia' : c}</option>)}
          </select>
          <select value={ubicacionFiltro} onChange={e => setUbicacionFiltro(e.target.value)} className="px-3 sm:px-4 py-2.5 sm:py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm sm:text-base font-black text-zinc-800 outline-none focus:border-[#14B07E] truncate cursor-pointer">
            {ubicacionesFiltradas.map(u => <option key={u} value={u}>{u === 'todas' ? 'Todas las Ubicaciones' : u}</option>)}
          </select>
          <button onClick={toggleRevealGlobal} className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm sm:text-base font-black transition-colors flex items-center justify-center gap-2 ${revealAll ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-50'}`}>
            {revealAll ? <IconEyeSlash /> : <IconEye />} <span className="hidden sm:inline">{revealAll ? 'Ocultar' : 'Mostrar'}</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
        <div className="block lg:hidden divide-y divide-zinc-100">
          {cargando ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="p-5"><div className="h-20 bg-zinc-100 rounded-xl animate-pulse"></div></div>
            ))
          ) : paquetes.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 font-bold text-sm sm:text-base">No hay paquetes que coincidan.</div>
          ) : (
            <AnimatePresence>
              {paquetes.map(p => {
                const revealed = revealAll || revealedSet.has(p.id);
                const checked = isSelected(p.id);
                const isDelivering = entregandoId === p.id;
                
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    key={p.id} 
                    className={`p-4 sm:p-5 flex flex-col gap-3 transition-colors ${checked ? 'bg-[#14B07E]/5' : 'bg-white hover:bg-zinc-50'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 overflow-hidden pt-1 w-full">
                        <button onClick={() => toggleSelectOne(p.id)} className={`shrink-0 w-6 h-6 rounded flex items-center justify-center border-2 transition-colors ${checked ? 'bg-[#14B07E] border-[#14B07E] text-white' : 'bg-white border-zinc-300'}`}>
                          {checked && <IconCheck />}
                        </button>
                        <div className={`font-black text-base text-zinc-950 break-words transition-all w-full ${revealed ? '' : 'blur-[5px] select-none'}`}>
                          {busqueda ? highlightExact(p.nombre_cliente, busqueda) : p.nombre_cliente}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center justify-center min-w-[3.5rem] px-3 py-1.5 bg-zinc-100 border border-zinc-200 text-zinc-900 text-lg font-black rounded-lg">
                        {p.ubicacion_label || "—"}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-zinc-600 pl-9">
                      <span>{p.compania || "—"}</span>
                      <span className="text-zinc-300">•</span>
                      <span>{formatearFechaLocal(p.fecha_llegada)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-2 border-t border-zinc-100 pt-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => {setRevealAll(false); setRevealedSet(prev => {const n=new Set(prev); n.has(p.id)?n.delete(p.id):n.add(p.id); return n;})}} className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                          {revealed ? <IconEyeSlash /> : <IconEye />}
                        </button>
                        <button onClick={() => {setPaqueteEditando(p); setMostrarModal(true);}} className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                          <IconEdit />
                        </button>
                        <button onClick={() => setConfirmState({ open: true, payload: p })} className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <IconTrash />
                        </button>
                      </div>
                      <div className="flex justify-end w-full">
                        {p.entregado ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-black text-[#14B07E] bg-[#14B07E]/10 border border-[#14B07E]/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#14B07E]"></span>
                            Entregado
                          </span>
                        ) : (
                          <button onClick={() => marcarEntregado(p.id)} disabled={isDelivering} className="px-4 py-2 bg-[#14B07E] hover:bg-[#129A6E] text-white text-sm font-black rounded-lg flex items-center justify-center gap-2 transition-transform active:scale-95 w-full min-w-[120px]">
                            {isDelivering ? (
                              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
                                <IconLoader /> <span className="opacity-90">Cerrando</span>
                              </motion.div>
                            ) : (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                                <IconCheck /> Entregar
                              </motion.div>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>

        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-sm font-black text-zinc-500 uppercase tracking-wider">
                <th className="py-5 px-6 w-16 text-center">
                  <button onClick={toggleSelectAllPage} className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-colors ${allPageSelected ? 'bg-[#14B07E] border-[#14B07E] text-white' : 'bg-white border-zinc-300'}`}>
                    {allPageSelected && <IconCheck />}
                  </button>
                </th>
                <th className="py-5 px-6">Cliente</th>
                <th className="py-5 px-6">Compañia</th>
                <th className="py-5 px-6 text-center">Ubicacion</th>
                <th className="py-5 px-6">Fecha / Hora</th>
                <th className="py-5 px-6">Estado</th>
                <th className="py-5 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {cargando ? (
                [...Array(RESULTADOS_POR_PAGINA)].map((_, i) => (
                  <tr key={i}><td colSpan="7" className="py-8 px-6"><div className="h-6 bg-zinc-100 rounded w-full animate-pulse"></div></td></tr>
                ))
              ) : paquetes.length === 0 ? (
                <tr><td colSpan="7" className="py-16 text-center text-zinc-500 font-bold text-lg">No hay paquetes que coincidan.</td></tr>
              ) : (
                <AnimatePresence>
                  {paquetes.map(p => {
                    const revealed = revealAll || revealedSet.has(p.id);
                    const checked = isSelected(p.id);
                    const isDelivering = entregandoId === p.id;
                    
                    return (
                      <motion.tr 
                        layout
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, backgroundColor: "#D1FAE5", transition: { duration: 0.3 } }}
                        key={p.id} 
                        className={`hover:bg-zinc-50 transition-colors ${checked ? 'bg-[#14B07E]/5' : ''}`}
                      >
                        <td className="py-5 px-6 text-center">
                          <button onClick={() => toggleSelectOne(p.id)} className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-colors ${checked ? 'bg-[#14B07E] border-[#14B07E] text-white' : 'bg-white border-zinc-300'}`}>
                            {checked && <IconCheck />}
                          </button>
                        </td>
                        <td className="py-5 px-6">
                          <div className={`font-black text-base text-zinc-950 transition-all ${revealed ? '' : 'blur-[5px] select-none'}`}>
                            {busqueda ? highlightExact(p.nombre_cliente, busqueda) : p.nombre_cliente}
                          </div>
                        </td>
                        <td className="py-5 px-6 font-bold text-zinc-600 text-sm">
                          {p.compania || "—"}
                        </td>
                        <td className="py-5 px-6 text-center">
                          <span className="inline-flex items-center justify-center min-w-[3.5rem] px-3 py-1.5 bg-zinc-100 border border-zinc-200 text-zinc-900 text-lg font-black rounded-lg">
                            {p.ubicacion_label || "—"}
                          </span>
                        </td>
                        <td className="py-5 px-6 text-sm font-bold text-zinc-500">
                          {formatearFechaLocal(p.fecha_llegada)}
                        </td>
                        <td className="py-5 px-6">
                          {p.entregado ? (
                             <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black text-[#14B07E] bg-[#14B07E]/10 border border-[#14B07E]/20">
                               <span className="w-1.5 h-1.5 rounded-full bg-[#14B07E]"></span>
                               Entregado
                             </span>
                          ) : (
                             <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black text-zinc-600 bg-zinc-100 border border-zinc-200">
                               <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                               Pendiente
                             </span>
                          )}
                        </td>
                        <td className="py-5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => {setRevealAll(false); setRevealedSet(prev => {const n=new Set(prev); n.has(p.id)?n.delete(p.id):n.add(p.id); return n;})}} className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors" title="Ver nombre">
                              {revealed ? <IconEyeSlash /> : <IconEye />}
                            </button>
                            <button onClick={() => {setPaqueteEditando(p); setMostrarModal(true);}} className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors" title="Editar">
                              <IconEdit />
                            </button>
                            <button onClick={() => setConfirmState({ open: true, payload: p })} className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Eliminar">
                              <IconTrash />
                            </button>
                            {!p.entregado && (
                              <button onClick={() => marcarEntregado(p.id)} disabled={isDelivering} className="ml-3 px-5 py-2.5 bg-[#14B07E] hover:bg-[#129A6E] text-white text-sm font-black rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 min-w-[120px]">
                                {isDelivering ? (
                                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
                                    <IconLoader /> <span className="opacity-90">Cerrando</span>
                                  </motion.div>
                                ) : (
                                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                                    <IconCheck /> Entregar
                                  </motion.div>
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-zinc-200 bg-zinc-50 gap-4">
            <span className="text-sm font-bold text-zinc-500">Página <strong className="text-zinc-900 font-black">{paginaActual}</strong> de {totalPaginas}</span>
            <div className="flex gap-3 w-full sm:w-auto">
              <button 
                onClick={() => setPaginaActual(p => Math.max(1, p - 1))} 
                disabled={paginaActual === 1 || cargando} 
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm font-black text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <button 
                onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} 
                disabled={paginaActual === totalPaginas || cargando} 
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm font-black text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {anySelected && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] md:w-auto bg-zinc-900 text-white px-5 md:px-6 py-4 rounded-xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 z-50 border border-zinc-800">
            <div className="text-sm font-black whitespace-nowrap">
              <span className="text-[#14B07E] text-lg mr-2">{selectedIds.size}</span> sel.
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button onClick={clearSelection} className="flex-1 sm:flex-none px-3 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">Cancelar</button>
              <button onClick={() => setConfirmBulk(true)} className="flex-1 sm:flex-none px-3 py-2.5 rounded-xl text-sm font-black text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"><IconTrash /> Elim.</button>
              <button onClick={entregarSeleccionados} disabled={selectedPendingCount === 0} className="flex-1 sm:flex-none px-4 py-2.5 bg-[#14B07E] hover:bg-[#129A6E] disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl text-sm font-black transition-colors flex items-center justify-center gap-2 border border-transparent disabled:border-zinc-700">
                <IconCheck /> Entr. {selectedPendingCount > 0 ? `(${selectedPendingCount})` : ''}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mostrarModal && paqueteEditando && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setMostrarModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden border border-zinc-200">
              <div className="p-6 md:p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h3 className="text-xl md:text-2xl font-black text-zinc-950">Editar Paquete</h3>
                <button onClick={() => setMostrarModal(false)} className="w-10 h-10 flex items-center justify-center bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 rounded-xl transition-colors"><IconTimes /></button>
              </div>
              <div className="p-6 md:p-8 space-y-5 bg-white">
                <div>
                  <label className="text-xs md:text-sm font-black text-zinc-500 uppercase tracking-widest mb-2 block">Cliente</label>
                  <input type="text" value={paqueteEditando.nombre_cliente} onChange={e => setPaqueteEditando(p => ({ ...p, nombre_cliente: e.target.value }))} className="w-full px-4 md:px-5 py-3.5 md:py-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-[#14B07E] outline-none font-black text-lg md:text-xl text-zinc-950 transition-colors" />
                </div>
                <div>
                  <label className="text-xs md:text-sm font-black text-zinc-500 uppercase tracking-widest mb-2 block">Compañía</label>
                  <select value={paqueteEditando.compania} onChange={e => setPaqueteEditando(p => ({ ...p, compania: e.target.value }))} className="w-full px-4 md:px-5 py-3.5 md:py-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-[#14B07E] outline-none font-black text-lg md:text-xl text-zinc-950 transition-colors cursor-pointer">
                    {companias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs md:text-sm font-black text-zinc-500 uppercase tracking-widest mb-2 block">Ubicación</label>
                  <select value={paqueteEditando.ubicacion_label} onChange={e => setPaqueteEditando(p => ({ ...p, ubicacion_label: e.target.value }))} className="w-full px-4 md:px-5 py-3.5 md:py-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-[#14B07E] outline-none font-black text-lg md:text-xl text-zinc-950 transition-colors cursor-pointer">
                    {ubicaciones.map(u => <option key={u.id} value={u.label}>{u.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="p-6 md:p-8 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50/50">
                <button onClick={() => setMostrarModal(false)} className="w-full sm:w-auto px-6 py-3.5 md:py-4 rounded-xl font-bold text-base md:text-lg text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors">Cancelar</button>
                <button onClick={guardarCambios} disabled={loadingEdit} className="w-full sm:w-auto px-6 py-3.5 md:py-4 rounded-xl font-black text-base md:text-lg bg-[#14B07E] hover:bg-[#129A6E] disabled:bg-zinc-200 disabled:text-zinc-400 text-white transition-colors active:scale-95">
                  {loadingEdit ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}