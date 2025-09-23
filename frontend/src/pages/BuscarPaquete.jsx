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

const RESULTADOS_POR_PAGINA = 10;
const LS_KEY = "buscar_paquete_filtros_v10";
const LS_SHOW_RACK = "bp_showRackInLocation";

/* ===== Utils ===== */
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

/* Colores lanes (no se usan para compañías) */
const hexToRgba = (hex = "#f59e0b", a = 0.08) => {
  const h = String(hex).replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return `rgba(0,0,0,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

export default function BuscarPaquete() {
  // filtros
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("pendiente"); // por defecto: PENDIENTE
  const [companiaFiltro, setCompaniaFiltro] = useState("todos");
  const [estanteFiltro, setEstanteFiltro] = useState("todos");
  const [baldaFiltro, setBaldaFiltro] = useState("todos");

  // bloqueo de cliente
  const [lockedClient, setLockedClient] = useState(null);

  // privacidad
  const [revealAll, setRevealAll] = useState(false);
  const [revealedSet, setRevealedSet] = useState(() => new Set());

  // datos
  const [resultados, setResultados] = useState([]);
  const [baldasDisponibles, setBaldasDisponibles] = useState([]);
  const [companias, setCompanias] = useState([]);

  // layout maps
  const [layoutMode, setLayoutMode] = useState("racks");
  const [laneNameById, setLaneNameById] = useState(() => new Map());
  const [laneColorById, setLaneColorById] = useState(() => new Map());
  const [rackNameById, setRackNameById] = useState(() => new Map());
  const [shelfNameByKey, setShelfNameByKey] = useState(() => new Map());
  const [baldaLabelById, setBaldaLabelById] = useState(() => new Map());

  // preferencia de ubicación (compacta vs completa)
  const [showRackInLocation, setShowRackInLocation] = useState(() => {
    try {
      const v = localStorage.getItem(LS_SHOW_RACK);
      return v === "1";
    } catch { return false; }
  });

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

  // debounce para paginación
  const searchDebounceRef = useRef(null);

  // filtros guardados
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      setEstadoFiltro(saved.estadoFiltro ?? "pendiente"); // si no existe, default pendiente
      setCompaniaFiltro(saved.companiaFiltro ?? "todos");
      setEstanteFiltro(saved.estanteFiltro ?? "todos");
      setBaldaFiltro(saved.baldaFiltro ?? "todos");
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ estadoFiltro, companiaFiltro, estanteFiltro, baldaFiltro })
    );
  }, [estadoFiltro, companiaFiltro, estanteFiltro, baldaFiltro]);

  useEffect(() => {
    try { localStorage.setItem(LS_SHOW_RACK, showRackInLocation ? "1" : "0"); } catch {}
  }, [showRackInLocation]);

  /* ===== CARGA PRINCIPAL ===== */
  useEffect(() => {
    let cancelado = false;
    (async () => {
      setCargando(true);
      setError(null);
      try {
        const { data: { session} } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("Sesión no encontrada");

        const tenantId = await getTenantIdOrThrow();

        const paquetesAPI = await obtenerPaquetesBackend(token);
        if (cancelado) return;

        // Layout
        let meta = null;
        try {
          const { data } = await supabase
            .from("layouts_meta")
            .select("mode,rows,cols,payload")
            .eq("org_id", tenantId)
            .maybeSingle();
          meta = data || null;
        } catch { meta = null; }
        if (!meta) {
          try {
            const { data } = await supabase.rpc("get_warehouse_layout", { p_org: tenantId });
            meta = data || null;
          } catch { meta = null; }
        }
        const root = meta?.payload ? meta.payload : (meta || {});
        const modeFromMeta = meta?.mode || root?.layout_mode || "racks";
        const lanesArr = Array.isArray(root?.lanes) ? root.lanes : [];
        const racksArr = Array.isArray(root?.racks) ? root.racks : [];

        // Catálogos
        const [baldasRes, empresasRes] = await Promise.all([
          supabase.from("baldas")
            .select("id, estante, balda, codigo")
            .eq("id_negocio", tenantId)
            .order("estante", { ascending: true })
            .order("balda", { ascending: true }),
          supabase.from("empresas_transporte_tenant")
            .select("nombre")
            .eq("tenant_id", tenantId),
        ]);

        const baldas = baldasRes?.data || [];
        setBaldasDisponibles(baldas);

        const listaCompanias = (empresasRes?.data || [])
          .map(e => e?.nombre).filter(Boolean).sort((a,b)=>a.localeCompare(b));
        setCompanias(listaCompanias);

        // Mapas nombres/colores (solo lanes)
        const laneName = new Map(), laneColor = new Map(), rackName = new Map(), shelfName = new Map();
        let mode = modeFromMeta;

        if (mode === "lanes") {
          for (const l of lanesArr) {
            const id = Number(l?.id ?? l?.lane_id);
            if (!Number.isFinite(id)) continue;
            if (l?.name) laneName.set(id, String(l.name));
            const col = String(l?.color || "").trim();
            if (/^#?[0-9a-f]{6}$/i.test(col)) laneColor.set(id, col.startsWith('#') ? col : `#${col}`);
          }
          if (laneName.size === 0) {
            try {
              const { data: rows } = await supabase
                .from("lanes")
                .select("lane_id,id,name,color,row,col")
                .eq("tenant_id", tenantId);
              (rows || []).forEach(l => {
                const id = Number(l?.lane_id ?? l?.id);
                if (!Number.isFinite(id)) return;
                if (l?.name) laneName.set(id, String(l.name));
                const col = String(l?.color || "").trim();
                if (/^#?[0-9a-f]{6}$/i.test(col)) laneColor.set(id, col.startsWith('#') ? col : `#${col}`);
              });
            } catch {}
          }
        } else {
          mode = "racks";
          const racks = racksArr.length ? racksArr : [];
          for (const r of racks) {
            const rid = Number(r?.id);
            if (!Number.isFinite(rid)) continue;
            const rname = r?.name ? String(r.name) : String(rid);
            rackName.set(rid, rname);
            const shelves = Array.isArray(r?.shelves) ? r.shelves : [];
            for (const s of shelves) {
              const idx = Number(s?.index ?? s?.idx ?? s?.shelf_index ?? s?.i ?? s?.orden);
              if (!Number.isFinite(idx)) continue;
              shelfName.set(`${rid}-${idx}`, s?.name || `${rname}${idx}`);
            }
          }
          if (rackName.size === 0 && baldas.length) {
            for (const b of baldas) {
              if (!rackName.has(b.estante)) rackName.set(b.estante, String(b.estante));
              if (!shelfName.has(`${b.estante}-${b.balda}`)) {
                shelfName.set(`${b.estante}-${b.balda}`, b.codigo || `Fila ${b.balda}`);
              }
            }
          }
        }

        setLayoutMode(mode);
        setLaneNameById(laneName);
        setLaneColorById(laneColor);
        setRackNameById(rackName);
        setShelfNameByKey(shelfName);

        // Etiquetas por balda_id (FULL + COMPACT)
        const labelMapFull = new Map();
        const labelMapCompact = new Map();
        for (const b of baldas) {
          if (mode === "lanes") {
            const lname = laneName.get(Number(b.estante));
            const full = `Carril ${ lname ?? (b.codigo ?? String(b.estante)) }`;
            const compact = lname ?? (b.codigo ?? String(b.estante));
            labelMapFull.set(b.id, full);
            labelMapCompact.set(b.id, compact);
          } else {
            const rlabel = rackName.get(Number(b.estante)) ?? String(b.estante);
            const sname  = shelfName.get(`${b.estante}-${b.balda}`) ?? (b.codigo || `B${b.balda}`);
            labelMapFull.set(b.id, `Estante ${rlabel} · ${sname}`);
            // Compacto: SOLO balda (p. ej. B21)
            labelMapCompact.set(b.id, sname);
          }
        }

        const baldaById = new Map(baldas.map(b => [b.id, b]));

        // Formatear resultados (con ubicacion_full / ubicacion_compact)
        const formateados = (paquetesAPI || []).map(p => {
          const b = p.balda_id ? baldaById.get(p.balda_id) : null;
          const estanteNum = (p.estante != null ? Number(p.estante) : (b?.estante ?? null));
          const baldaIdx   = (p.balda   != null ? Number(p.balda)   : (b?.balda   ?? null));
          const laneIdRaw  = (p.lane_id != null ? Number(p.lane_id) : null);
          const laneId     = Number.isFinite(laneIdRaw) ? laneIdRaw
                            : (mode === "lanes" ? (Number.isFinite(estanteNum) ? estanteNum : null) : null);

          let ubicacion_full = "";
          let ubicacion_compact = "";
          let lane_color = null;

          if (mode === "lanes") {
            if (p.balda_id && labelMapFull.get(p.balda_id)) {
              ubicacion_full = labelMapFull.get(p.balda_id);
              ubicacion_compact = labelMapCompact.get(p.balda_id);
              if (b?.estante != null) lane_color = laneColor.get(Number(b.estante)) || null;
            } else {
              const lname = (laneId != null ? laneName.get(laneId) : null)
                         ?? (typeof p.compartimento === "string" && p.compartimento.trim() ? p.compartimento.trim() : null)
                         ?? (laneName.get(Number(estanteNum)) ?? (b?.codigo ?? estanteNum ?? "?"));
              ubicacion_full = `Carril ${lname}`;
              ubicacion_compact = String(lname);
              if (laneId != null) lane_color = laneColor.get(laneId) || null;
              else if (estanteNum != null) lane_color = laneColor.get(Number(estanteNum)) || null;
            }
          } else {
            if (p.balda_id) {
              ubicacion_full = labelMapFull.get(p.balda_id) || "";
              ubicacion_compact = labelMapCompact.get(p.balda_id) || "";
            } else {
              const rlabel = rackName.get(Number(estanteNum)) ?? String(estanteNum ?? "?");
              const sname  = shelfName.get(`${estanteNum}-${baldaIdx}`) ?? (b?.codigo || `B${baldaIdx ?? "?"}`);
              ubicacion_full = `Estante ${rlabel} · ${sname}`;
              ubicacion_compact = sname; // SOLO balda
            }
          }

          return {
            id: p.id,
            nombre_cliente: p.nombre_cliente ?? "",
            empresa_transporte: p.empresa_transporte ?? p.compania ?? "",
            compania: p.empresa_transporte ?? p.compania ?? "",
            balda_id: p.balda_id ?? null,
            entregado: !!p.entregado,
            fecha_llegada: p.fecha_llegada ?? p.created_at ?? new Date().toISOString(),
            estante: estanteNum,
            balda: baldaIdx,
            ubicacion_full,
            ubicacion_compact,
            lane_color,
            lane_id: laneId,
            compartimento: p.compartimento ?? null,
          };
        });

        setBaldaLabelById(labelMapFull); // (se usa en el selector del modal)
        setResultados(formateados);
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
    () => ["todos", ...Array.from(new Set(resultados.map(p => p.compania).filter(Boolean)))],
    [resultados]
  );
  const estantesFiltrados = useMemo(() => {
    const uniq = Array.from(new Set(resultados.map(p => p.estante).filter(v => v !== null)));
    return ["todos", ...uniq];
  }, [resultados]);
  const baldasFiltradas = useMemo(() => {
    const uniq = Array.from(new Set(resultados.map(p => p.balda).filter(v => v !== null)));
    return ["todos", ...uniq];
  }, [resultados]);

  // Debounce + reset page
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setPaginaActual(1), 200);
    return () => clearTimeout(searchDebounceRef.current);
  }, [busqueda, estadoFiltro, companiaFiltro, estanteFiltro, baldaFiltro, lockedClient]);

  // Lista de clientes para bloqueo por coincidencia exacta
  const allClientNames = useMemo(
    () => Array.from(new Set(resultados.map(r => r.nombre_cliente).filter(Boolean))),
    [resultados]
  );

  // Exact match -> bloqueo automático
  const exactClientMatch = useMemo(() => {
    const qn = normalize(busqueda);
    if (!qn) return null;
    return allClientNames.find(n => normalize(n) === qn) || null;
  }, [busqueda, allClientNames]);
  useEffect(() => {
    if (exactClientMatch && normalize(lockedClient || "") !== normalize(exactClientMatch)) {
      setLockedClient(exactClientMatch);
    }
    if (!busqueda && lockedClient) setLockedClient(null);
  }, [busqueda, exactClientMatch]); // eslint-disable-line

  // Filtrado + ranking inteligente
  const filtrados = useMemo(() => {
    let base = resultados
      .filter(p =>
        estadoFiltro === "pendiente" ? !p.entregado :
        estadoFiltro === "entregado" ? p.entregado : true
      )
      .filter(p => companiaFiltro === "todos" || p.compania === companiaFiltro)
      .filter(p => estanteFiltro === "todos" || p.estante === parseInt(estanteFiltro))
      .filter(p => baldaFiltro === "todos" || p.balda === parseInt(baldaFiltro));

    const q = busqueda.trim();

    const sortFn = (A, B) => {
      const dir = sortBy.dir === "asc" ? 1 : -1;
      const a = A[sortBy.field], b = B[sortBy.field];
      if (sortBy.field === "fecha_llegada") return (new Date(a) - new Date(b)) * dir;
      if (typeof a === "string") return (a || "").localeCompare(b || "") * dir;
      return ((a ?? 0) - (b ?? 0)) * dir;
    };

    if (lockedClient) {
      return base.filter(p => normalize(p.nombre_cliente) === normalize(lockedClient)).sort(sortFn);
    }
    if (!q) return [...base].sort(sortFn);

    const ranked = base
      .filter(p => passesStrict(q, `${p.nombre_cliente} ${p.compania || ""}`))
      .map(p => ({ p, s: fuzzyScore(q, `${p.nombre_cliente} ${p.compania || ""}`) }))
      .sort((a,b)=>b.s-a.s || sortFn(a.p, b.p))
      .map(x => x.p);

    return ranked;
  }, [resultados, busqueda, estadoFiltro, companiaFiltro, estanteFiltro, baldaFiltro, sortBy, lockedClient]);

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

  // ===== Acciones =====
  const marcarEntregado = async (id) => {
    const snapshot = resultados;
    setResultados(prev => prev.map(p => p.id === id ? { ...p, entregado: true } : p));
    setFlashRowId(id);
    setTimeout(() => setFlashRowId(null), 800);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Sesión no encontrada");
      await entregarPaqueteBackend(id, token);
      showToast("Paquete marcado como entregado", "success");
    } catch (e) {
      setResultados(snapshot);
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
    const snapshot = resultados;
    setResultados(prev => prev.filter(p => p.id !== id));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Sesión no encontrada");
      await eliminarPaqueteBackend(id, token);
      showToast("Paquete eliminado", "success");
    } catch (e) {
      setResultados(snapshot);
      showToast("No se pudo eliminar el paquete", "error");
    }
  };
  const abrirModalEdicion = (paquete) => { setPaqueteEditando({ ...paquete }); setMostrarModal(true); };
  const guardarCambios = async () => {
    if (!paqueteEditando) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Sesión no encontrada");
      const payload = {
        id: paqueteEditando.id,
        nombre_cliente: paqueteEditando.nombre_cliente,
        empresa_transporte: paqueteEditando.empresa_transporte || paqueteEditando.compania,
        balda_id: paqueteEditando.balda_id ? Number(paqueteEditando.balda_id) : null,
      };
      const actualizado = await editarPaqueteBackend(payload, token);

      const b = baldasDisponibles.find(x => x.id === (actualizado?.balda_id ?? payload.balda_id));
      const rlabel = b ? (rackNameById.get(b.estante) ?? String(b.estante)) : undefined;
      const sname  = b ? (shelfNameByKey.get(`${b.estante}-${b.balda}`) ?? (b.codigo || `B${b.balda}`)) : undefined;

      const nueva_full = b
        ? (layoutMode === "lanes"
            ? `Carril ${laneNameById.get(b.estante) ?? b.codigo ?? b.estante}`
            : `Estante ${rlabel} · ${sname}`
          )
        : undefined;
      const nueva_compact = b
        ? (layoutMode === "lanes"
            ? (laneNameById.get(b.estante) ?? b.codigo ?? String(b.estante))
            : (sname ?? "")
          )
        : undefined;

      const nuevoColor = b && layoutMode === "lanes" ? (laneColorById.get(b.estante) || null) : undefined;

      setResultados(prev => prev.map(p => p.id === payload.id ? {
        ...p,
        nombre_cliente: actualizado?.nombre_cliente ?? payload.nombre_cliente,
        empresa_transporte: actualizado?.empresa_transporte ?? payload.empresa_transporte,
        compania: actualizado?.empresa_transporte ?? payload.empresa_transporte,
        balda_id: actualizado?.balda_id ?? payload.balda_id,
        estante: actualizado?.estante ?? b?.estante ?? p.estante,
        balda: actualizado?.balda ?? b?.balda ?? p.balda,
        ubicacion_full: nueva_full ?? p.ubicacion_full,
        ubicacion_compact: nueva_compact ?? p.ubicacion_compact,
        lane_color: nuevoColor ?? p.lane_color,
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

  const limpiarBusqueda = () => { setBusqueda(""); setLockedClient(null); };

  // KPIs (ignoran estado para totales reales en la vista actual)
  const filtradosAllForKpi = useMemo(() => {
    return resultados
      .filter(p => companiaFiltro === "todos" || p.compania === companiaFiltro)
      .filter(p => estanteFiltro === "todos" || p.estante === parseInt(estanteFiltro))
      .filter(p => baldaFiltro === "todos" || p.balda === parseInt(baldaFiltro))
      .filter(p => {
        const q = busqueda.trim();
        if (!q) return true;
        if (lockedClient) return normalize(p.nombre_cliente) === normalize(lockedClient);
        if (!passesStrict(q, `${p.nombre_cliente} ${p.compania || ""}`)) return false;
        return true;
      });
  }, [resultados, busqueda, companiaFiltro, estanteFiltro, baldaFiltro, lockedClient]);
  const total = filtradosAllForKpi.length;
  const pendientesCount = filtradosAllForKpi.filter(p => !p.entregado).length;
  const entregadosCount = total - pendientesCount;
  const progreso = total ? Math.round((entregadosCount / total) * 100) : 0;

  const chips = [
    lockedClient ? { k: "lock", label: `Cliente: ${lockedClient}`, onClear: () => setLockedClient(null) } : null,
    estadoFiltro !== "pendiente" ? { k: "estado", label: `Estado: ${estadoFiltro}`, onClear: () => setEstadoFiltro("pendiente") } : null,
    companiaFiltro !== "todos" ? {
      k: "comp", label: `Compañía: ${companiaFiltro}`, onClear: () => setCompaniaFiltro("todos")
    } : null,
    estanteFiltro !== "todos" ? {
      k: "est",
      label: layoutMode === "lanes"
        ? `Carril: ${laneNameById.get(parseInt(estanteFiltro)) ?? estanteFiltro}`
        : `Estante: ${rackNameById.get(parseInt(estanteFiltro)) ?? estanteFiltro}`,
      onClear: () => setEstanteFiltro("todos")
    } : null,
    baldaFiltro !== "todos" ? { k: "bal", label: `Fila: ${baldaFiltro}`, onClear: () => setBaldaFiltro("todos") } : null,
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

  // Enter en búsqueda
  const onSearchKeyDown = (e) => {
    if (e.key === "Escape") {
      limpiarBusqueda();
    }
  };

  // Helper: elegir etiqueta según preferencia
  const loc = (p) => showRackInLocation ? (p.ubicacion_full || p.ubicacion_compact) : (p.ubicacion_compact || p.ubicacion_full);

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
            onChange={(e) => { setBusqueda(e.target.value); if (lockedClient) setLockedClient(null); }}
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
          <span className="f-label">{layoutMode === "lanes" ? "Carril" : "Estante"}</span>
          <select value={estanteFiltro} onChange={(e) => setEstanteFiltro(e.target.value)}>
            {estantesFiltrados.map(val => (
              <option key={val} value={val}>
                {val === "todos"
                  ? (layoutMode === "lanes" ? "Todos los carriles" : "Todos los estantes")
                  : (layoutMode === "lanes"
                      ? `Carril ${laneNameById.get(parseInt(val)) ?? val}`
                      : `Estante ${rackNameById.get(parseInt(val)) ?? val}`
                    )
                }
              </option>
            ))}
          </select>
        </label>

        <label className="f-item">
          <span className="f-label">Fila</span>
          <select value={baldaFiltro} onChange={(e) => setBaldaFiltro(e.target.value)}>
            {baldasFiltradas.map(val => (
              <option key={val} value={val}>
                {val === "todos" ? "Todas" : `Fila ${val}`}
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
              setEstanteFiltro("todos");
              setBaldaFiltro("todos");
              setLockedClient(null);
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
            {(estadoFiltro !== "pendiente" || companiaFiltro !== "todos" || estanteFiltro !== "todos" || baldaFiltro !== "todos" || lockedClient) && (
              <button onClick={() => {
                setEstadoFiltro("pendiente");
                setCompaniaFiltro("todos");
                setEstanteFiltro("todos");
                setBaldaFiltro("todos");
                setLockedClient(null);
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
                <col style={{ width: "28%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "10%" }} />
              </colgroup>

              <thead>
                <tr>
                  <th onClick={() => toggleSort("nombre_cliente")} className={sortBy.field==="nombre_cliente" ? sortBy.dir : ""}>Cliente</th>
                  <th onClick={() => toggleSort("compania")} className={sortBy.field==="compania" ? sortBy.dir : ""}>Compañía</th>
                  <th>
                    <div className="th-ubi">
                      <button
                        type="button"
                        className={`mini-toggle ${showRackInLocation ? "on" : ""}`}
                        onClick={() => setShowRackInLocation(v => !v)}
                        title={showRackInLocation ? "Mostrar solo balda" : "Mostrar también estante"}
                        aria-label={showRackInLocation ? "Mostrar solo balda" : "Mostrar también estante"}
                      >
                        {showRackInLocation ? "Estante+Balda" : "Solo balda"}
                      </button>
                      <span
                        onClick={() => toggleSort("ubicacion_compact")}
                        className={sortBy.field==="ubicacion_compact" ? sortBy.dir : ""}
                        role="button"
                        tabIndex={0}
                      >
                        Ubicación
                      </span>
                    </div>
                  </th>
                  <th onClick={() => toggleSort("fecha_llegada")} className={sortBy.field==="fecha_llegada" ? sortBy.dir : ""}>Fecha</th>
                  <th onClick={() => toggleSort("entregado")} className={sortBy.field==="entregado" ? sortBy.dir : ""}>Estado</th>
                  <th aria-hidden>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginados.map(p => {
                  const rowStyle = p.lane_color
                    ? { ['--lane']: p.lane_color, ['--lane-rgba']: hexToRgba(p.lane_color, 0.06) }
                    : undefined;

                  const revealed = revealAll || revealedSet.has(p.id);

                  return (
                    <tr
                      key={p.id}
                      style={rowStyle}
                      className={`${flashRowId === p.id ? "flash" : ""} ${p.lane_color ? "lane-tinted" : ""}`}
                    >
                      <td data-label="Cliente" className="cliente-col">
                        <div className={`cliente ${revealed ? "" : "blurred"}`}>
                          {busqueda ? highlightApprox(p.nombre_cliente, busqueda) : p.nombre_cliente}
                        </div>
                      </td>

                      <td data-label="Compañía" className="compania">
                        {p.compania ? (
                          <span className="comp-text">{p.compania}</span>
                        ) : <span className="muted">—</span>}
                      </td>

                      <td data-label="Ubicación">
                        {layoutMode === "lanes" && p.lane_color ? (
                          <span
                            className="ubi lane"
                            style={{ ['--lane']: p.lane_color, ['--lane-rgba']: hexToRgba(p.lane_color, 0.18) }}
                            title={showRackInLocation ? p.ubicacion_full : p.ubicacion_compact}
                          >
                            <i className="lane-dot" aria-hidden="true" />
                            <span>{loc(p)}</span>
                          </span>
                        ) : (
                          <span className="ubi" title={showRackInLocation ? p.ubicacion_full : p.ubicacion_compact}>
                            {loc(p)}
                          </span>
                        )}
                      </td>

                      <td data-label="Fecha">{formatearFecha(p.fecha_llegada)}</td>
                      <td data-label="Estado">
                        <span className={`badge-estado ${p.entregado ? "entregado" : "pendiente"}`}>
                          {p.entregado ? "Entregado" : "Pendiente"}
                        </span>
                      </td>

                      <td data-label="Acciones" className="acciones">
                        {/* PRIVACIDAD: SIEMPRE visible en todas las filas */}
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
                            style={{
                              backgroundColor: "#16a34a",
                              color: "#fff",
                              border: "none",
                              padding: "6px 10px",
                              borderRadius: "8px",
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
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
                const styleLane = p.lane_color
                  ? { ['--lane']: p.lane_color, ['--lane-rgba']: hexToRgba(p.lane_color, 0.08) }
                  : undefined;
                const revealed = revealAll || revealedSet.has(p.id);
                return (
                  <article key={p.id} className={`card ${p.lane_color ? "lane-tinted" : ""}`} style={styleLane}>
                    <header className="card__head">
                      <h4 className={`card__title ${revealed ? "" : "blurred"}`}>{p.nombre_cliente}</h4>
                      <div className="card__head-actions">
                        {/* PRIVACIDAD en móvil: SIEMPRE */}
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
                      {p.compania ? (
                        <span className="comp-text">{p.compania}</span>
                      ) : <span className="muted">—</span>}
                    </div>
                    <div className="card__row">
                      <span className="label">
                        Ubicación
                        <button
                          type="button"
                          className={`mini-toggle ml-6 ${showRackInLocation ? "on" : ""}`}
                          onClick={() => setShowRackInLocation(v => !v)}
                          title={showRackInLocation ? "Mostrar solo balda" : "Mostrar también estante"}
                          aria-label={showRackInLocation ? "Mostrar solo balda" : "Mostrar también estante"}
                        >
                          {showRackInLocation ? "E+B" : "B"}
                        </button>
                      </span>
                      {layoutMode === "lanes" && p.lane_color ? (
                        <span className="ubi lane" style={{ ['--lane']: p.lane_color, ['--lane-rgba']: hexToRgba(p.lane_color, 0.18) }}>
                          <i className="lane-dot" aria-hidden="true" />
                          <span>{loc(p)}</span>
                        </span>
                      ) : (
                        <span className="ubi">{loc(p)}</span>
                      )}
                    </div>
                    <div className="card__row">
                      <span className="label">Fecha</span>
                      <span>{formatearFecha(p.fecha_llegada)}</span>
                    </div>
                    <footer className="card__actions">
                      <button className="btn btn--ghost" onClick={() => abrirModalEdicion(p)}><FaEdit /> Editar</button>
                      {!p.entregado && (
                        <button
                          className="btn"
                          onClick={() => marcarEntregado(p.id)}
                          style={{
                            backgroundColor: "#16a34a",
                            color: "#fff",
                            border: "none",
                            padding: "8px 10px",
                            borderRadius: "10px",
                            fontWeight: 600
                          }}
                        >
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
                value={paqueteEditando.balda_id ?? ""}
                onChange={(e) => setPaqueteEditando(p => ({ ...p, balda_id: e.target.value }))}
              >
                {baldasDisponibles.map(b => (
                  <option key={b.id} value={b.id}>
                    {baldaLabelById.get(b.id) ||
                      (layoutMode === "lanes"
                        ? `Carril ${laneNameById.get(b.estante) ?? b.codigo ?? b.estante}`
                        : (() => {
                            const rlabel = rackNameById.get(b.estante) ?? b.estante;
                            const sname  = shelfNameByKey.get(`${b.estante}-${b.balda}`) ?? (b.codigo || `B${b.balda}`);
                            return `Estante ${rlabel} · ${sname}`;
                          })()
                      )
                    }
                  </option>
                ))}
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
      <div>
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
                <button className="btn btn--danger" onClick={() => {
                  const p = confirmState.payload;
                  setConfirmState({ open: false, payload: null });
                  if (p) confirmarEliminar();
                }}>Eliminar</button>
              </div>
            </div>
          </div>
        )}
      </div>

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
