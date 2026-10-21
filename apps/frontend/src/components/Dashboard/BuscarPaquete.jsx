import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../../utils/fetcher";
import {
  eliminarPaqueteBackend,
  entregarPaqueteBackend,
  editarPaqueteBackend,
} from "../../services/paquetesService";
import { getTenantIdOrThrow } from "../../utils/tenant";
import BuscarPaqueteSkeleton from "./BuscarPaqueteSkeleton";
import { getCarrierLogo, getInitials, ImageFallback } from '../UI/CarrierLogo';

const isLocal = /^(localhost|127\.0\.0\.1|100\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|.*\.ngrok-free\.dev|.*\.devtunnels\.ms|.*easytrack\.pro|.*easytrack\.es)$/.test(window.location.hostname);
const PROD_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const API_BASE = isLocal ? '' : PROD_URL;

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
const IconClock = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconLoader = () => <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>;

const RESULTADOS_POR_PAGINA = 25;
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
const formatRelativeTime = (isoString) => {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora mismo";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return ""; // No mostramos más allá de 24h como relativo
};

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

const playUndoChime = () => {
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
    playFreq(783.99, 0); // Sol
    playFreq(659.25, 0.08); // Mi
    playFreq(523.25, 0.16); // Do (Sentido inverso)
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
  const [estadoFiltro, setEstadoFiltro] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
      return saved.estadoFiltro ?? "pendiente";
    } catch { return "pendiente"; }
  });
  const [recientesFiltro, setRecientesFiltro] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
      return !!saved.recientesFiltro;
    } catch { return false; }
  });
  const [companiaFiltro, setCompaniaFiltro] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
      return saved.companiaFiltro ?? "todos";
    } catch { return "todos"; }
  });
  const [ubicacionFiltro, setUbicacionFiltro] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
      return saved.ubicacionFiltro ?? "todas";
    } catch { return "todas"; }
  });
  
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
  const [searchCounts, setSearchCounts] = useState({ total: 0, entregados: 0, pendientes: 0 });

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

  const showToast = (msg, isError = false, action = null) => {
    setToastMsg({ msg, isError, action });
    setTimeout(() => {
      setToastMsg(prev => (prev?.msg === msg ? null : prev));
    }, action ? 8000 : 3500);
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
      while (retryQueue.current.size > 0) {
        const id = Array.from(retryQueue.current)[0];
        try {
          await entregarPaqueteBackend(id);
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
      const tId = await getTenantIdOrThrow();
      setTenantId(tId);

      await Promise.allSettled([
        // KPI Global
        (async () => {
          try {
            const resKPI = await apiFetch('/api/paquetes/count');
            if (resKPI.ok) {
              const dataKPI = await resKPI.json();
              setKpiGlobal({ total: dataKPI.total || 0, entregados: dataKPI.entregados || 0, pendientes: dataKPI.pendientes || 0 });
            }
          } catch (e) {
            console.error('Error fetching KPIs:', e);
          }
        })(),

        // Compañías de Transporte
        (async () => {
          try {
            const resCarriers = await apiFetch('/api/ubicaciones/carriers');
            if (resCarriers.ok) {
              const dataCarriers = await resCarriers.json();
              const rawList = Array.isArray(dataCarriers)
                ? dataCarriers
                : (Array.isArray(dataCarriers?.empresas) && dataCarriers.empresas.length > 0)
                  ? dataCarriers.empresas
                  : (Array.isArray(dataCarriers?.carriers) && dataCarriers.carriers.length > 0)
                    ? dataCarriers.carriers
                    : (Array.isArray(dataCarriers?.disponibles) ? dataCarriers.disponibles : []);
              const names = rawList.map(e => e?.nombre || e).filter(Boolean);
              setCompanias([...new Set(names)].sort((a,b) => String(a).localeCompare(String(b))));
            }
          } catch (e) {
            console.error('Error fetching carriers:', e);
          }
        })(),

        // Ubicaciones / Estanterías
        (async () => {
          try {
            const resUbis = await apiFetch('/api/ubicaciones/estructura');
            if (resUbis.ok) {
              const dataUbis = await resUbis.json();
              const ubiList = Array.isArray(dataUbis?.ubicaciones)
                ? dataUbis.ubicaciones
                : (Array.isArray(dataUbis) ? dataUbis : []);
              setUbicaciones(ubiList.map(r => ({ id: r.id, label: String(r.label || r.codigo || "").toUpperCase() })).filter(u => u.label));
            }
          } catch (e) {
            console.error('Error fetching ubicaciones:', e);
          }
        })()
      ]);
    } catch (e) {
      console.error('Error in loadGlobalData:', e);
    }
  };

  const fetchPage = async () => {
    const isBackgroundSync = isFirstMount.current && __SEARCH_CACHE.loaded;
    if (!isBackgroundSync) setCargando(true);
    
    try {
      const searchFuzzy = busqueda.trim().replace(/\s+/g, '%');

      const params = new URLSearchParams({
        limit: RESULTADOS_POR_PAGINA,
        offset: (paginaActual - 1) * RESULTADOS_POR_PAGINA,
        estado: estadoFiltro,
        compania: companiaFiltro,
        ubicacion: ubicacionFiltro,
        search: searchFuzzy,
        order: recientesFiltro ? 'created_at' : 'fecha_llegada',
        dir: 'desc'
      });

      const [resPkgs, resCount] = await Promise.all([
        apiFetch(`/api/paquetes?${params}`),
        apiFetch(`/api/paquetes/count?${params}`)
      ]);

      if (resPkgs.ok && resCount.ok) {
        const dataPkgs = await resPkgs.json();
        const dataCount = await resCount.json();

        setSearchCounts({
          total: dataCount.total || 0,
          entregados: dataCount.entregados || 0,
          pendientes: dataCount.pendientes || 0
        });

        const list = (dataPkgs.paquetes || [])
          .filter(p => estadoFiltro !== "pendiente" || !retryQueue.current.has(p.id))
          .map(p => ({
            id: p.id,
            nombre_cliente: p.nombre_cliente ?? "",
            compania: p.empresa_transporte ?? p.compania ?? "",
            entregado: !!p.entregado || retryQueue.current.has(p.id),
            fecha_llegada: p.fecha_llegada ?? p.created_at ?? new Date().toISOString(),
            fecha_entregado: p.fecha_entregado ?? null,
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
    localStorage.setItem(LS_KEY, JSON.stringify({ estadoFiltro, companiaFiltro, ubicacionFiltro, recientesFiltro }));
  }, [estadoFiltro, companiaFiltro, ubicacionFiltro, recientesFiltro]);

  useEffect(() => {
    setSelectedIds(new Set());
    setPaginaActual(1);
  }, [busqueda, estadoFiltro, companiaFiltro, ubicacionFiltro, recientesFiltro]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchPage();
      isFirstMount.current = false; 
    }, 300);
    return () => clearTimeout(searchDebounceRef.current);
  }, [paginaActual, busqueda, estadoFiltro, companiaFiltro, ubicacionFiltro, recientesFiltro]);

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
    const pkg = paquetes.find(p => p.id === id);
    if (!pkg) return;

    setEntregandoId(id); 
    
    setTimeout(() => {
      playSuccessChime();
      
      setPaquetes(prev => {
        if (estadoFiltro === "pendiente") return prev.filter(p => p.id !== id);
        return prev.map(p => p.id === id ? { ...p, entregado: true, fecha_entregado: new Date().toISOString() } : p);
      });
      
      if (estadoFiltro === "pendiente") setTotalResultados(prev => Math.max(0, prev - 1));
      
      retryQueue.current.add(id);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(Array.from(retryQueue.current)));
      processSyncQueue();
      removeFromRadar(id);
      checkRadar();
      
      setKpiGlobal(prev => ({...prev, pendientes: Math.max(0, prev.pendientes - 1), entregados: prev.entregados + 1}));
      
      showToast(
        <span>Paquete de <strong className="text-emerald-400">{pkg.nombre_cliente}</strong> ({pkg.ubicacion_label}) entregado</span>, 
        false, 
        {
          label: "Deshacer",
          onClick: () => handleUndoEntregar(pkg)
        }
      );

      if (window.__AP_PAGE_CACHE) {
        window.__AP_PAGE_CACHE.loaded = false;
      }
      setEntregandoId(null);
    }, 600); 
  };

  const handleUndoEntregar = async (pkg) => {
    try {
      await editarPaqueteBackend({ ...pkg, entregado: false, fecha_entregado: null });
      
      setPaquetes(prev => {
        if (estadoFiltro === "entregado") return prev.filter(p => p.id !== pkg.id);
        return prev.map(p => p.id === pkg.id ? { ...p, entregado: false, fecha_entregado: null } : p);
      });
      
      fetchPage(); 
      loadGlobalData();
      playUndoChime();
      showToast(<span>Entrega de <strong className="text-emerald-400">{pkg.nombre_cliente}</strong> deshecha</span>);
    } catch (e) {
      showToast("Error al deshacer", true);
    }
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
      await eliminarPaqueteBackend(payload.id);
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
      await Promise.all(ids.map(id => eliminarPaqueteBackend(id)));
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
      const newLabel = String(paqueteEditando.ubicacion_label || "").toUpperCase().trim();
      const ubiRow = ubicaciones.find(u => u.label === newLabel) || null;
      
      const payload = {
        id: paqueteEditando.id,
        nombre_cliente: paqueteEditando.nombre_cliente,
        empresa_transporte: paqueteEditando.compania,
        ubicacion_id: ubiRow?.id || null,
        ubicacion_label: newLabel || null,
      };

      const actualizado = await editarPaqueteBackend(payload);
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
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={`fixed bottom-24 left-1/2 z-[9999] px-5 py-3 rounded-2xl shadow-2xl font-bold text-white text-sm flex items-center gap-4 border ${toastMsg.isError ? 'bg-red-600 border-red-500' : 'bg-zinc-900 border-zinc-800'} whitespace-nowrap`}
          >
            <div className="flex items-center gap-2">
              {toastMsg.isError ? <IconTimes /> : <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />}
              {toastMsg.msg}
            </div>
            {toastMsg.action && (
              <button 
                onClick={() => { toastMsg.action.onClick(); setToastMsg(null); }}
                className="ml-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] uppercase tracking-widest font-black transition-colors border border-white/10"
              >
                {toastMsg.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3 sm:gap-6 pb-3 sm:pb-6 border-b border-zinc-200/80">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight flex items-center gap-2 sm:gap-3">
             <IconSearch /> Localizador
          </h1>
          <p className="text-xs sm:text-sm font-medium text-zinc-500 mt-0.5">Encuentra y gestiona el histórico de paquetes.</p>
        </div>
        
        <div className="grid grid-cols-4 gap-1.5 sm:gap-3 w-full xl:w-auto">
          <div className="bg-white px-2.5 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border border-zinc-200/80 shadow-sm flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total</span>
            <span className="text-base sm:text-3xl font-extrabold tabular-nums text-zinc-950 mt-0.5">{kpiGlobal.total}</span>
          </div>
          <div className="bg-white px-2.5 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border border-zinc-200/80 shadow-sm flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Pend.</span>
            <span className="text-base sm:text-3xl font-extrabold tabular-nums text-zinc-950 mt-0.5">{kpiGlobal.pendientes}</span>
          </div>
          <div className="bg-white px-2.5 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border border-zinc-200/80 shadow-sm flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Entreg.</span>
            <span className="text-base sm:text-3xl font-extrabold tabular-nums text-emerald-600 mt-0.5">{kpiGlobal.entregados}</span>
          </div>
          <div className="bg-white px-2.5 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border border-zinc-200/80 shadow-sm flex flex-col justify-center">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Éxito</span>
              <span className="text-xs font-bold text-emerald-600 tabular-nums">{progresoKPI}%</span>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-1.5">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${progresoKPI}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {olvidos.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
            <div className="bg-white border border-zinc-200/80 rounded-xl p-3.5 sm:p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center shrink-0 border border-zinc-200">
                  <IconInfo />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950 tracking-tight">Cierre Pendiente</h3>
                  <p className="text-xs font-normal text-zinc-500">¿Completaste la entrega de estos paquetes?</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {olvidos.map(o => (
                  <div key={o.id} className="flex flex-col gap-2 bg-zinc-50 p-2.5 sm:p-3 rounded-lg border border-zinc-200/80">
                     <div className="min-w-0">
                       <p className="font-bold text-zinc-900 text-sm truncate">{o.nombre}</p>
                       <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mt-0.5">
                         Ubicación <span className="text-zinc-950 px-1 py-0.5 bg-white border border-zinc-200 rounded font-mono ml-1">{o.ubi}</span>
                       </p>
                     </div>
                     <div className="flex items-center gap-2 pt-1 border-t border-zinc-200/60">
                       <button onClick={() => { removeFromRadar(o.id); checkRadar(); }} className="flex-1 py-1.5 text-zinc-500 hover:text-zinc-950 text-xs font-semibold rounded-lg transition-colors min-h-[36px]">
                         Descartar
                       </button>
                       <button onClick={() => { marcarEntregado(o.id); }} className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 min-h-[36px] active:scale-[0.97]">
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

      <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-zinc-200/80 shadow-sm flex flex-col xl:flex-row gap-2.5 sm:gap-4 justify-between items-center">
        <div className="relative w-full xl:w-80 flex-shrink-0">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400"><IconSearch /></div>
          <input type="text" placeholder="Buscar por nombre..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full pl-9 pr-8 py-2 sm:py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-brand-500 outline-none font-bold text-sm sm:text-base text-zinc-950 transition-colors" />
          {busqueda && (
            <button onClick={() => setBusqueda("")} className="absolute inset-y-0 right-2.5 flex items-center justify-center text-zinc-400 hover:text-zinc-900">
              <IconTimes />
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-1.5 sm:gap-2 w-full xl:w-auto">
          <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)} className="px-2.5 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs sm:text-sm font-bold text-zinc-800 outline-none focus:border-brand-500 truncate cursor-pointer">
            <option value="pendiente">Pendientes</option>
            <option value="entregado">Entregados</option>
            <option value="todos">Todos</option>
          </select>
          <select value={companiaFiltro} onChange={e => setCompaniaFiltro(e.target.value)} className="px-2.5 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs sm:text-sm font-bold text-zinc-800 outline-none focus:border-brand-500 truncate cursor-pointer">
            {companiasFiltradas.map(c => <option key={c} value={c}>{c === 'todos' ? 'Compañía' : c}</option>)}
          </select>
          <select value={ubicacionFiltro} onChange={e => setUbicacionFiltro(e.target.value)} className="px-2.5 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs sm:text-sm font-bold text-zinc-800 outline-none focus:border-brand-500 truncate cursor-pointer">
            {ubicacionesFiltradas.map(u => <option key={u} value={u}>{u === 'todas' ? 'Ubicación' : u}</option>)}
          </select>
          
          <button 
            onClick={() => setRecientesFiltro(!recientesFiltro)} 
            className={`px-2.5 py-2 rounded-lg border text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${recientesFiltro ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm' : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'}`}
            title="Actividad reciente"
          >
            <IconClock /> <span className="inline">Recientes</span>
          </button>
          <button onClick={toggleRevealGlobal} className={`px-2.5 py-2 rounded-lg border text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${revealAll ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'}`}>
            {revealAll ? <IconEyeSlash /> : <IconEye />} <span>{revealAll ? 'Ocultar' : 'Ver'}</span>
          </button>
        </div>
      </div>

      {cargando ? (
        <BuscarPaqueteSkeleton />
      ) : (
        <div className="bg-white border border-zinc-200/80 rounded-xl shadow-sm overflow-hidden">
          <div className="block lg:hidden divide-y divide-zinc-100">
            {paquetes.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <p className="text-sm font-semibold text-zinc-600">No hay paquetes que coincidan con estos filtros.</p>
                {estadoFiltro === "pendiente" && searchCounts.entregados > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-zinc-500 mb-2">Se han encontrado {searchCounts.entregados} paquete(s) ya entregados.</p>
                    <button 
                      onClick={() => setEstadoFiltro("entregado")} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors active:scale-[0.97]"
                    >
                      Ver en Entregados
                    </button>
                  </div>
                )}
                {estadoFiltro === "entregado" && searchCounts.pendientes > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-zinc-500 mb-2">Se han encontrado {searchCounts.pendientes} paquete(s) pendientes de entrega.</p>
                    <button 
                      onClick={() => setEstadoFiltro("pendiente")} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors active:scale-[0.97]"
                    >
                      Ver en Pendientes
                    </button>
                  </div>
                )}
              </div>
            ) : (
            <AnimatePresence>
              {paquetes.map(p => {
                const revealed = revealAll || revealedSet.has(p.id);
                const checked = isSelected(p.id);
                const isDelivering = entregandoId === p.id;
                
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
                    key={p.id} 
                    className={`p-3 sm:p-4 flex flex-col gap-2.5 transition-colors ${checked ? 'bg-brand-500/5' : 'bg-white hover:bg-zinc-50/60'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
                        <button onClick={() => toggleSelectOne(p.id)} className={`shrink-0 w-5 h-5 rounded flex items-center justify-center border transition-colors ${checked ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-300'}`}>
                          {checked && <IconCheck />}
                        </button>
                        <div className={`font-bold text-sm sm:text-base text-zinc-950 truncate transition-all ${revealed ? '' : 'blur-[5px] select-none'}`}>
                          {busqueda ? highlightExact(p.nombre_cliente, busqueda) : p.nombre_cliente}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center justify-center px-2 py-0.5 bg-zinc-900 text-white text-xs sm:text-sm font-mono font-bold rounded">
                        {p.ubicacion_label || "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-500 pl-7">
                      <ImageFallback 
                        src={getCarrierLogo(p.compania)}
                        fallbackText={getInitials(p.compania)}
                        containerClassName="w-3.5 h-3.5 shrink-0"
                        imgClassName="max-w-full max-h-full object-contain"
                        fallbackClassName="bg-zinc-100 rounded text-[7px] font-bold text-zinc-400"
                      />
                      <span>{p.compania || "—"}</span>
                      <span className="text-zinc-300">·</span>
                      <span>{formatearFechaLocal(p.fecha_llegada)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-2 pl-7">
                      <div className="flex items-center gap-1">
                        <button onClick={() => {setRevealAll(false); setRevealedSet(prev => {const n=new Set(prev); n.has(p.id)?n.delete(p.id):n.add(p.id); return n;})}} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors" title="Ver/Ocultar">
                          {revealed ? <IconEyeSlash /> : <IconEye />}
                        </button>
                        <button onClick={() => {setPaqueteEditando(p); setMostrarModal(true);}} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors" title="Editar">
                          <IconEdit />
                        </button>
                        <button onClick={() => setConfirmState({ open: true, payload: p })} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" title="Eliminar">
                          <IconTrash />
                        </button>
                      </div>
                      <div>
                        {p.entregado ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Entregado
                            </span>
                            {p.fecha_entregado && (
                              <span className="text-[10px] font-medium text-zinc-400">
                                {formatRelativeTime(p.fecha_entregado)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <button onClick={() => marcarEntregado(p.id)} disabled={isDelivering} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-transform active:scale-[0.97] min-h-[36px] min-w-[100px]">
                            {isDelivering ? (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5">
                                <IconLoader /> <span className="opacity-90">Cerrando</span>
                              </motion.div>
                            ) : (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1">
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
              {paquetes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 px-6 text-center">
                    <p className="text-base font-semibold text-zinc-700">No hay paquetes que coincidan con los filtros actuales.</p>
                    {estadoFiltro === "pendiente" && searchCounts.entregados > 0 && (
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <span className="text-sm text-zinc-500">Existen <strong className="text-zinc-800 font-bold">{searchCounts.entregados}</strong> paquete(s) que coinciden ya entregados.</span>
                        <button 
                          onClick={() => setEstadoFiltro("entregado")} 
                          className="px-3 py-1.5 rounded-md bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors active:scale-[0.97]"
                        >
                          Ver en Entregados
                        </button>
                      </div>
                    )}
                    {estadoFiltro === "entregado" && searchCounts.pendientes > 0 && (
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <span className="text-sm text-zinc-500">Existen <strong className="text-zinc-800 font-bold">{searchCounts.pendientes}</strong> paquete(s) aún pendientes.</span>
                        <button 
                          onClick={() => setEstadoFiltro("pendiente")} 
                          className="px-3 py-1.5 rounded-md bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors active:scale-[0.97]"
                        >
                          Ver en Pendientes
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
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
                          <div className="flex items-center gap-2">
                            <ImageFallback 
                              src={getCarrierLogo(p.compania)}
                              fallbackText={getInitials(p.compania)}
                              containerClassName="w-5 h-5 shrink-0"
                              imgClassName="max-w-full max-h-full object-contain"
                              fallbackClassName="bg-zinc-100 rounded text-[8px] font-black text-zinc-400"
                            />
                            <span>{p.compania || "—"}</span>
                          </div>
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
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-black text-brand-600 bg-brand-50 border border-brand-100 w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
                                Entregado
                              </span>
                              {p.fecha_entregado && (
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">
                                  {formatRelativeTime(p.fecha_entregado)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <button onClick={() => marcarEntregado(p.id)} disabled={isDelivering} className="px-4 py-2 bg-[#14B07E] hover:bg-[#129A6E] text-white text-xs font-black rounded-lg flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-sm shadow-emerald-100">
                               {isDelivering ? (
                                 <>
                                   <IconLoader /> <span>Cerrando</span>
                                 </>
                               ) : (
                                 <>
                                   <IconCheck /> <span>Entregar</span>
                                 </>
                               )}
                            </button>
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
      )}

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

      <AnimatePresence>
        {confirmState.open && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setConfirmState({ open: false, payload: null })} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden border border-zinc-200">
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100 shadow-inner">
                  <IconTrash />
                </div>
                <h3 className="text-2xl font-black text-zinc-950 mb-3 tracking-tight">¿Eliminar paquete?</h3>
                <p className="text-zinc-500 font-bold text-base leading-relaxed">
                  Esta acción no se puede deshacer. El paquete de <br />
                  <span className="text-zinc-950 font-black">{confirmState.payload?.nombre_cliente}</span> desaparecerá del sistema para siempre.
                </p>
              </div>
              <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex gap-3">
                <button onClick={() => setConfirmState({ open: false, payload: null })} className="flex-1 px-6 py-4 rounded-xl font-bold text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors">Cancelar</button>
                <button onClick={confirmarEliminar} className="flex-1 px-6 py-4 rounded-xl font-black text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 active:scale-95">Eliminar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmBulk && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setConfirmBulk(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-zinc-100">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <IconTrash />
                </div>
                <h3 className="text-2xl font-black text-zinc-950 mb-3 tracking-tight">¿Eliminar {selectedIds.size} paquetes?</h3>
                <p className="text-zinc-500 font-bold text-base leading-relaxed">
                  Estás a punto de borrar un lote de paquetes. Esta acción es irreversible y afectará a todos los elementos seleccionados.
                </p>
              </div>
              <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex gap-3">
                <button onClick={() => setConfirmBulk(false)} className="flex-1 px-6 py-4 rounded-xl font-bold text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors">Cancelar</button>
                <button onClick={eliminarSeleccionados} className="flex-1 px-6 py-4 rounded-xl font-black text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 active:scale-95">Eliminar lote</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
