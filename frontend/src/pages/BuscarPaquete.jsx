import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaSearch, FaEdit, FaTrashAlt, FaTimes, FaInfoCircle,
  FaEye, FaEyeSlash
} from "react-icons/fa";
import { supabase } from "../utils/supabaseClient";
import {
  obtenerPaquetesBackend,
  eliminarPaqueteBackend,
  entregarPaqueteBackend,
  editarPaqueteBackend,
} from "../services/paquetesService";
import { getTenantIdOrThrow } from "../utils/tenant";
import "../styles/BuscarPaquete.scss";

/* ----------------- Constantes ----------------- */
const RESULTADOS_POR_PAGINA = 10;
const LS_KEY = "buscar_paquete_filtros_v11";

/* ----------------- Utils búsqueda ----------------- */
const normalize = (s = "") =>
  String(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim()
    .replace(/[^\p{L}\p{N}\s'-]+/gu, " ")
    .replace(/\s+/g, " ");

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
        p.type === "mark" ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>
      )}
    </>
  );
}

/* ----------------- Componente ----------------- */
export default function BuscarPaquete() {
  // filtros
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("pendiente");
  const [companiaFiltro, setCompaniaFiltro] = useState("todos");
  const [ubicacionFiltro, setUbicacionFiltro] = useState("todas");

  // privacidad
  const [revealAll, setRevealAll] = useState(false);
  const [revealedSet, setRevealedSet] = useState(() => new Set());

  // datos
  const [paquetes, setPaquetes] = useState([]);
  const [companias, setCompanias] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]); // [{id,label}]
  const [ubiIdToLabel, setUbiIdToLabel] = useState(() => new Map());
  const [baldaIdToCode, setBaldaIdToCode] = useState(() => new Map()); // legacy
  const [codeToBaldaId, setCodeToBaldaId] = useState(() => new Map()); // legacy

  // ui
  const [paginaActual, setPaginaActual] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [paqueteEditando, setPaqueteEditando] = useState(null);
  const [sortBy, setSortBy] = useState({ field: "fecha_llegada", dir: "desc" });
  const [flashRowId, setFlashRowId] = useState(null);

  // confirmaciones
  const [confirmState, setConfirmState] = useState({ open: false, payload: null });

  // toasts
  const [toasts, setToasts] = useState([]);
  const showToast = (msg, type = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  };

  const searchDebounceRef = useRef(null);

  // filtros guardados
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
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ estadoFiltro, companiaFiltro, ubicacionFiltro })
    );
  }, [estadoFiltro, companiaFiltro, ubicacionFiltro]);

  /* ===== CARGA PRINCIPAL ===== */
  useEffect(() => {
    let cancelado = false;
    (async () => {
      setCargando(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("Sesión no encontrada");

        const tenantId = await getTenantIdOrThrow();

        // Paquetes
        const paquetesAPI = await obtenerPaquetesBackend(token);
        if (cancelado) return;

        // Empresas
        const { data: empresas } = await supabase
          .from("empresas_transporte_tenant")
          .select("nombre")
          .eq("tenant_id", tenantId);
        setCompanias((empresas || []).map(e => e?.nombre).filter(Boolean).sort((a,b)=>a.localeCompare(b)));

        // Ubicaciones (nuevas)
        const { data: uRows } = await supabase
          .from("ubicaciones")
          .select("id,label")
          .eq("tenant_id", tenantId);
        const ubis = (uRows || []).map(r => ({ id: r.id, label: String(r.label || "").toUpperCase() }));
        setUbicaciones(ubis);
        setUbiIdToLabel(new Map(ubis.map(u => [u.id, u.label])));

        // Legacy baldas (para mapear B# -> balda_id cuando editemos)
        const { data: bRows } = await supabase
          .from("baldas")
          .select("id, codigo")
          .eq("id_negocio", tenantId);
        const b2c = new Map((bRows || []).map(b => [b.id, String(b.codigo || "").toUpperCase()]));
        const c2b = new Map((bRows || []).map(b => [String(b.codigo || "").toUpperCase(), b.id]));
        setBaldaIdToCode(b2c);
        setCodeToBaldaId(c2b);

        // Normalizar ubicación visible de cada paquete
        const list = (paquetesAPI || []).map(p => {
          const label =
            (p.ubicacion_label && String(p.ubicacion_label).toUpperCase()) ||
            (p.compartimento && String(p.compartimento).toUpperCase()) ||
            (p.ubicacion_id && (ubiIdToLabel.get(p.ubicacion_id) || "")) ||
            (p.balda_id && b2c.get(p.balda_id)) ||
            "";
          return {
            id: p.id,
            nombre_cliente: p.nombre_cliente ?? "",
            empresa_transporte: p.empresa_transporte ?? p.compania ?? "",
            compania: p.empresa_transporte ?? p.compania ?? "",
            entregado: !!p.entregado,
            fecha_llegada: p.fecha_llegada ?? p.created_at ?? new Date().toISOString(),

            // para edición/filtros
            ubicacion_id: p.ubicacion_id ?? null,
            ubicacion_label: label || null,
            balda_id: Number.isFinite(Number(p.balda_id)) ? Number(p.balda_id) : null,
          };
        });

        setPaquetes(list);
      } catch (e) {
        console.error("Error al cargar:", e);
        setError(e?.message || "Error al cargar datos");
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => { cancelado = true; };
  }, []);

  /* ===== Opciones derivadas ===== */
  const companiasFiltradas = useMemo(
    () => ["todos", ...Array.from(new Set(paquetes.map(p => p.compania).filter(Boolean)))],
    [paquetes]
  );

  const ubicacionesFiltradas = useMemo(() => {
    const fromUbis = ubicaciones.map(u => u.label);
    const fromPaquetes = paquetes.map(p => p.ubicacion_label).filter(Boolean);
    const uniq = Array.from(new Set([...fromUbis, ...fromPaquetes])).sort((a,b)=> {
      // ordenar por número si es B#
      const ma = /^B(\d+)$/i.exec(String(a)); const mb = /^B(\d+)$/i.exec(String(b));
      if (ma && mb) return parseInt(ma[1],10) - parseInt(mb[1],10);
      return String(a).localeCompare(String(b));
    });
    return ["todas", ...uniq];
  }, [ubicaciones, paquetes]);

  // Debounce + reset page
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setPaginaActual(1), 200);
    return () => clearTimeout(searchDebounceRef.current);
  }, [busqueda, estadoFiltro, companiaFiltro, ubicacionFiltro]);

  // Filtrado + ranking
  const filtrados = useMemo(() => {
    let base = paquetes
      .filter(p =>
        estadoFiltro === "pendiente" ? !p.entregado :
        estadoFiltro === "entregado" ? p.entregado : true
      )
      .filter(p => companiaFiltro === "todos" || p.compania === companiaFiltro)
      .filter(p => ubicacionFiltro === "todas" || (p.ubicacion_label || "") === ubicacionFiltro);

    const q = busqueda.trim();

    const sortFn = (A, B) => {
      const dir = sortBy.dir === "asc" ? 1 : -1;
      const a = A[sortBy.field], b = B[sortBy.field];
      if (sortBy.field === "fecha_llegada") return (new Date(a) - new Date(b)) * dir;
      if (typeof a === "string") return (a || "").localeCompare(b || "") * dir;
      return ((a ?? 0) - (b ?? 0)) * dir;
    };

    if (!q) return [...base].sort(sortFn);

    const ranked = base
      .filter(p => passesStrict(q, `${p.nombre_cliente} ${p.compania || ""}`))
      .map(p => ({ p, s: fuzzyScore(q, `${p.nombre_cliente} ${p.compania || ""}`) }))
      .sort((a,b)=>b.s-a.s || sortFn(a.p, b.p))
      .map(x => x.p);

    return ranked;
  }, [paquetes, busqueda, estadoFiltro, companiaFiltro, ubicacionFiltro, sortBy]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / RESULTADOS_POR_PAGINA));
  const paginados = useMemo(
    () => filtrados.slice((paginaActual - 1) * RESULTADOS_POR_PAGINA, paginaActual * RESULTADOS_POR_PAGINA),
    [filtrados, paginaActual]
  );

  const cambiarPagina = (nueva) => { if (nueva >= 1 && nueva <= totalPaginas) setPaginaActual(nueva); };
  const toggleSort = (field) => {
    setSortBy(prev => prev.field === field
      ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
      : { field, dir: field === "fecha_llegada" ? "desc" : "asc" });
  };

  /* ===== Acciones ===== */
  const marcarEntregado = async (id) => {
    const snapshot = paquetes;
    setPaquetes(prev => prev.map(p => p.id === id ? { ...p, entregado: true } : p));
    setFlashRowId(id);
    setTimeout(() => setFlashRowId(null), 800);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Sesión no encontrada");
      await entregarPaqueteBackend(id, token);
      showToast("Paquete marcado como entregado", "success");
    } catch (e) {
      setPaquetes(snapshot);
      showToast("No se pudo marcar como entregado", "error");
    }
  };

  const solicitarEliminar = (paquete) => {
    setConfirmState({ open: true, payload: { id: paquete.id, nombre: paquete.nombre_cliente } });
  };

  const confirmarEliminar = async () => {
    const payload = confirmState.payload;
    setConfirmState({ open: false, payload: null });
    if (!payload) return;
    const { id } = payload;
    const snapshot = paquetes;
    setPaquetes(prev => prev.filter(p => p.id !== id));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Sesión no encontrada");
      await eliminarPaqueteBackend(id, token);
      showToast("Paquete eliminado", "success");
    } catch (e) {
      setPaquetes(snapshot);
      showToast("No se pudo eliminar el paquete", "error");
    }
  };

  const abrirModalEdicion = (paquete) => {
    // clonar con campos seguros
    setPaqueteEditando({
      id: paquete.id,
      nombre_cliente: paquete.nombre_cliente || "",
      empresa_transporte: paquete.empresa_transporte || paquete.compania || "",
      // usaremos la etiqueta como fuente de verdad
      ubicacion_label: paquete.ubicacion_label || "",
    });
    setMostrarModal(true);
  };

  const guardarCambios = async () => {
    if (!paqueteEditando) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Sesión no encontrada");

      const label = String(paqueteEditando.ubicacion_label || "").toUpperCase().trim();
      const ubiRow = ubicaciones.find(u => u.label === label) || null;
      const ubiId = ubiRow?.id || null;

      // legacy: por si el backend espera balda_id
      const baldaId = codeToBaldaId.get(label) ?? null;

      const payload = {
        id: paqueteEditando.id,
        nombre_cliente: paqueteEditando.nombre_cliente,
        empresa_transporte: paqueteEditando.empresa_transporte,
        // nuevos
        ubicacion_id: ubiId,
        ubicacion_label: label || null,
        // legacy
        balda_id: baldaId,
      };

      const actualizado = await editarPaqueteBackend(payload, token);

      setPaquetes(prev => prev.map(p => p.id === payload.id ? {
        ...p,
        nombre_cliente: actualizado?.nombre_cliente ?? payload.nombre_cliente,
        empresa_transporte: actualizado?.empresa_transporte ?? payload.empresa_transporte,
        compania: actualizado?.empresa_transporte ?? payload.empresa_transporte,
        ubicacion_id: actualizado?.ubicacion_id ?? ubiId ?? p.ubicacion_id,
        ubicacion_label: actualizado?.ubicacion_label ?? label ?? p.ubicacion_label,
        balda_id: Number.isFinite(Number(actualizado?.balda_id)) ? Number(actualizado.balda_id)
                  : (Number.isFinite(Number(baldaId)) ? Number(baldaId) : p.balda_id),
      } : p));

      setMostrarModal(false);
      showToast("Cambios guardados", "success");
    } catch (e) {
      console.error(e);
      showToast("No se pudo guardar", "error");
    }
  };

  const formatearFecha = (iso) =>
    new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });

  const limpiarBusqueda = () => { setBusqueda(""); };

  // KPIs (sobre filtros actuales excepto estado)
  const filtradosAllForKpi = useMemo(() => {
    return paquetes
      .filter(p => companiaFiltro === "todos" || p.compania === companiaFiltro)
      .filter(p => ubicacionFiltro === "todas" || (p.ubicacion_label || "") === ubicacionFiltro)
      .filter(p => {
        const q = busqueda.trim();
        if (!q) return true;
        if (!passesStrict(q, `${p.nombre_cliente} ${p.compania || ""}`)) return false;
        return true;
      });
  }, [paquetes, busqueda, companiaFiltro, ubicacionFiltro]);

  const total = filtradosAllForKpi.length;
  const pendientesCount = filtradosAllForKpi.filter(p => !p.entregado).length;
  const entregadosCount = total - pendientesCount;
  const progreso = total ? Math.round((entregadosCount / total) * 100) : 0;

  const chips = [
    estadoFiltro !== "pendiente" ? { k: "estado", label: `Estado: ${estadoFiltro}`, onClear: () => setEstadoFiltro("pendiente") } : null,
    companiaFiltro !== "todos" ? { k: "comp", label: `Compañía: ${companiaFiltro}`, onClear: () => setCompaniaFiltro("todos") } : null,
    ubicacionFiltro !== "todas" ? { k: "ubi", label: `Ubicación: ${ubicacionFiltro}`, onClear: () => setUbicacionFiltro("todas") } : null,
  ].filter(Boolean);

  /* ===== Privacidad ===== */
  const toggleRevealAll = () => { setRevealAll(prev => !prev); setRevealedSet(new Set()); };
  const toggleRevealOne = (id) => {
    if (revealAll) return;
    setRevealedSet(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // Enter/Escape en búsqueda
  const onSearchKeyDown = (e) => { if (e.key === "Escape") limpiarBusqueda(); };

  const loc = (p) => p.ubicacion_label || "—";

  /* =================== UI =================== */
  return (
    <div className="buscar-paquete">
      <div className="bp-head">
        <h2><FaSearch className="icono-titulo" /> Buscar paquete</h2>

        <div className="search-hero">
          <FaSearch className="magnifier" />
          <input
            type="search"
            placeholder="Escribe el nombre del cliente…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={onSearchKeyDown}
            aria-label="Buscar por cliente"
            inputMode="search"
            autoFocus
          />
          {busqueda && (
            <button className="clear" onClick={limpiarBusqueda} title="Borrar búsqueda" aria-label="Borrar búsqueda">
              <FaTimes />
            </button>
          )}
        </div>

        <div className="kpis" aria-live="polite">
          <div className="kpi"><span className="kpi-label">Total</span><span className="kpi-value">{total}</span></div>
          <div className="kpi"><span className="kpi-label">Pendientes</span><span className="kpi-value">{pendientesCount}</span></div>
          <div className="kpi"><span className="kpi-label">Entregados</span><span className="kpi-value">{entregadosCount}</span></div>
          <div className="progress"><div className="bar" style={{ width: `${progreso}%` }} /><span className="progress-text">{progreso}% entregado</span></div>
        </div>
      </div>

      {/* Filtros + Privacidad */}
      <div className="bp-filtros" role="region" aria-label="Filtros">
        <label className="f-item">
          <span className="f-label">Estado</span>
          <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
            <option value="pendiente">Pendiente</option>
            <option value="todos">Todos</option>
            <option value="entregado">Entregado</option>
          </select>
        </label>

        <label className="f-item">
          <span className="f-label">Compañía</span>
          <select value={companiaFiltro} onChange={(e) => setCompaniaFiltro(e.target.value)}>
            {companiasFiltradas.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label className="f-item">
          <span className="f-label">Ubicación</span>
          <select value={ubicacionFiltro} onChange={(e) => setUbicacionFiltro(e.target.value)}>
            {ubicacionesFiltradas.map(val => (
              <option key={val} value={val}>
                {val === "todas" ? "Todas" : val}
              </option>
            ))}
          </select>
        </label>

        <div className="f-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setEstadoFiltro("pendiente");
              setCompaniaFiltro("todos");
              setUbicacionFiltro("todas");
              setBusqueda("");
            }}
          >
            Limpiar filtros
          </button>

          <button
            type="button"
            className={`btn-ghost ${revealAll ? "active" : ""}`}
            onClick={toggleRevealAll}
            title={revealAll ? "Ocultar nombres" : "Mostrar nombres"}
          >
            {revealAll ? <><FaEyeSlash /> Ocultar nombres</> : <><FaEye /> Mostrar nombres</>}
          </button>
        </div>
      </div>

      {/* Chips */}
      {chips.length > 0 && (
        <div className="chips">
          <div className="chips-list">
            {chips.map(c => (
              <button
                key={c.k}
                className="chip"
                onClick={c.onClear}
                aria-label={`Quitar ${c.label}`}
              >
                {c.label} <FaTimes />
              </button>
            ))}
          </div>
        </div>
      )}

      {cargando && (
        <div className="estado-cargando" aria-busy="true" aria-live="polite">
          <div className="skeleton-row" />
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      )}

      {error && !cargando && (
        <div className="estado-error" role="alert">Error: {error}</div>
      )}

      {!cargando && !error && paginados.length === 0 && (
        <div className="estado-vacio">
          <FaInfoCircle /> No hay paquetes que coincidan.
          <div className="empty-actions">
            {busqueda && <button onClick={limpiarBusqueda}>Limpiar búsqueda</button>}
            {(estadoFiltro !== "pendiente" || companiaFiltro !== "todos" || ubicacionFiltro !== "todas") && (
              <button onClick={() => {
                setEstadoFiltro("pendiente");
                setCompaniaFiltro("todos");
                setUbicacionFiltro("todas");
                setBusqueda("");
              }}>
                Quitar filtros
              </button>
            )}
          </div>
        </div>
      )}

      {!cargando && !error && paginados.length > 0 && (
        <>
          <div className="tabla-wrapper" role="region" aria-label="Resultados">
            <table className="tabla-paquetes">
              <colgroup>
                <col style={{ width: "34%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "14%" }} />
              </colgroup>

              <thead>
                <tr>
                  <th onClick={() => toggleSort("nombre_cliente")} className={sortBy.field==="nombre_cliente" ? sortBy.dir : ""}>Cliente</th>
                  <th onClick={() => toggleSort("compania")} className={sortBy.field==="compania" ? sortBy.dir : ""}>Compañía</th>
                  <th onClick={() => toggleSort("ubicacion_label")} className={sortBy.field==="ubicacion_label" ? sortBy.dir : ""}>Ubicación</th>
                  <th onClick={() => toggleSort("fecha_llegada")} className={sortBy.field==="fecha_llegada" ? sortBy.dir : ""}>Fecha</th>
                  <th onClick={() => toggleSort("entregado")} className={sortBy.field==="entregado" ? sortBy.dir : ""}>Estado</th>
                  <th aria-hidden>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginados.map(p => {
                  const revealed = revealAll || revealedSet.has(p.id);
                  return (
                    <tr key={p.id} className={`${flashRowId === p.id ? "flash" : ""}`}>
                      <td data-label="Cliente" className="cliente-col">
                        <div className={`cliente ${revealed ? "" : "blurred"}`}>
                          {busqueda ? highlightApprox(p.nombre_cliente, busqueda) : p.nombre_cliente}
                        </div>
                      </td>

                      <td data-label="Compañía" className="compania">
                        {p.compania ? <span className="comp-text">{p.compania}</span> : <span className="muted">—</span>}
                      </td>

                      <td data-label="Ubicación">
                        <span className="ubi">{loc(p)}</span>
                      </td>

                      <td data-label="Fecha">{formatearFecha(p.fecha_llegada)}</td>
                      <td data-label="Estado">
                        <span className={`badge-estado ${p.entregado ? "entregado" : "pendiente"}`}>
                          {p.entregado ? "Entregado" : "Pendiente"}
                        </span>
                      </td>

                      <td data-label="Acciones" className="acciones">
                        {/* Privacidad: visible siempre */}
                        <button
                          className="icono privacidad"
                          title={revealed ? "Ocultar nombre" : "Mostrar nombre"}
                          aria-label={revealed ? `Ocultar nombre de ${p.nombre_cliente}` : `Mostrar nombre de ${p.nombre_cliente}`}
                          onClick={() => toggleRevealOne(p.id)}
                        >
                          {revealed ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                        </button>

                        <button className="icono editar" title="Editar" aria-label={`Editar paquete de ${p.nombre_cliente}`} onClick={() => abrirModalEdicion(p)}>
                          <FaEdit size={16} />
                        </button>

                        {!p.entregado && (
                          <button
                            className="btn-entregar"
                            title="Marcar entregado"
                            aria-label={`Marcar entregado el paquete de ${p.nombre_cliente}`}
                            onClick={() => marcarEntregado(p.id)}
                            style={{ backgroundColor: "#16a34a", color: "#fff", border: "none", padding: "6px 10px", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}
                          >
                            Entregar
                          </button>
                        )}

                        <button className="icono eliminar" title="Eliminar" aria-label={`Eliminar paquete de ${p.nombre_cliente}`} onClick={() => solicitarEliminar(p)}>
                          <FaTrashAlt size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Tarjetas móvil */}
            <div className="cards-m" aria-label="Resultados (móvil)">
              {paginados.map(p => {
                const revealed = revealAll || revealedSet.has(p.id);
                return (
                  <article key={p.id} className="card">
                    <header className="card__head">
                      <h4 className={`card__title ${revealed ? "" : "blurred"}`}>{p.nombre_cliente}</h4>
                      <div className="card__head-actions">
                        <button className="btn-icon" onClick={() => toggleRevealOne(p.id)} title={revealed ? "Ocultar nombre" : "Mostrar nombre"}>
                          {revealed ? <FaEyeSlash /> : <FaEye />}
                        </button>
                        <span className={`badge-estado ${p.entregado ? "entregado" : "pendiente"}`}>
                          {p.entregado ? "Entregado" : "Pendiente"}
                        </span>
                      </div>
                    </header>
                    <div className="card__row">
                      <span className="label">Compañía</span>
                      {p.compania ? <span className="comp-text">{p.compania}</span> : <span className="muted">—</span>}
                    </div>
                    <div className="card__row">
                      <span className="label">Ubicación</span>
                      <span className="ubi">{loc(p)}</span>
                    </div>
                    <div className="card__row">
                      <span className="label">Fecha</span>
                      <span>{formatearFecha(p.fecha_llegada)}</span>
                    </div>
                    <footer className="card__actions">
                      <button className="btn btn--ghost" onClick={() => abrirModalEdicion(p)}><FaEdit /> Editar</button>
                      {!p.entregado && (
                        <button className="btn" onClick={() => marcarEntregado(p.id)} style={{ backgroundColor: "#16a34a", color: "#fff", border: "none", padding: "8px 10px", borderRadius: "10px", fontWeight: 600 }}>
                          Entregar
                        </button>
                      )}
                      <button className="btn btn--danger-ghost" onClick={() => solicitarEliminar(p)}><FaTrashAlt /> Eliminar</button>
                    </footer>
                  </article>
                );
              })}
            </div>
          </div>

          <nav className="paginacion" role="navigation" aria-label="Paginación">
            <button onClick={() => cambiarPagina(paginaActual - 1)} disabled={paginaActual === 1} aria-label="Página anterior">◀</button>
            <span aria-live="polite">Página {paginaActual} de {totalPaginas}</span>
            <button onClick={() => cambiarPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas} aria-label="Página siguiente">▶</button>
          </nav>
        </>
      )}

      {/* Modal edición */}
      {mostrarModal && paqueteEditando && (
        <div className="modal-edicion" role="dialog" aria-modal="true" aria-label="Editar paquete">
          <div className="modal-contenido">
            <h3>Editar paquete</h3>

            <label>
              <span>Nombre del cliente</span>
              <input
                type="text"
                value={paqueteEditando.nombre_cliente || ""}
                onChange={(e) => setPaqueteEditando(p => ({ ...p, nombre_cliente: e.target.value }))}
              />
            </label>

            <label>
              <span>Empresa de transporte</span>
              <select
                value={paqueteEditando.empresa_transporte || paqueteEditando.compania || ""}
                onChange={(e) => setPaqueteEditando(p => ({ ...p, empresa_transporte: e.target.value, compania: e.target.value }))}
              >
                {companias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <label>
              <span>Ubicación</span>
              <select
                value={paqueteEditando.ubicacion_label || ""}
                onChange={(e) => setPaqueteEditando(p => ({ ...p, ubicacion_label: e.target.value }))}
              >
                {ubicaciones
                  .slice()
                  .sort((a,b) => {
                    const ma = /^B(\d+)$/i.exec(a.label); const mb = /^B(\d+)$/i.exec(b.label);
                    if (ma && mb) return parseInt(ma[1],10) - parseInt(mb[1],10);
                    return a.label.localeCompare(b.label);
                  })
                  .map(u => (
                    <option key={u.id} value={u.label}>{u.label}</option>
                  ))
                }
              </select>
            </label>

            <div className="modal-acciones">
              <button className="guardar" onClick={guardarCambios}>Guardar</button>
              <button className="cancelar" onClick={() => setMostrarModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminar */}
      {confirmState.open && (
        <div className="bp-confirm" role="dialog" aria-modal="true" aria-label="Confirmar">
          <div className="bp-confirm__panel">
            <h4>Eliminar paquete</h4>
            <p>
              {confirmState.payload?.nombre
                ? `¿Seguro que deseas eliminar el paquete de "${confirmState.payload.nombre}"?`
                : "¿Seguro que deseas eliminar este paquete?"}
            </p>
            <div className="bp-confirm__actions">
              <button className="btn btn--muted" onClick={() => setConfirmState({ open: false, payload: null })}>Cancelar</button>
              <button className="btn btn--danger" onClick={confirmarEliminar}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="toasts" aria-live="polite" aria-atomic="true">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
