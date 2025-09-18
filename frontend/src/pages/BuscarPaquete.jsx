// src/pages/BuscarPaquete.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaSearch, FaEdit, FaTrashAlt, FaCheckCircle, FaTimes, FaSlidersH,
  FaFilter, FaInfoCircle
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
const LS_KEY = "buscar_paquete_filtros_v5";

/* ===== Utils texto + fuzzy ===== */
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
  const jaro = (matches / a.length + matches / b.length + (matches - transpositions) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) { if (a[i] === b[i]) prefix++; else break; }
  return jaro + prefix * 0.1 * (1 - jaro);
}

function fuzzyScore(queryRaw, candidateRaw) {
  const query = normalize(queryRaw);
  const cand  = normalize(candidateRaw);
  if (!query) return 1;
  if (!cand) return 0;
  const qTokens = tokenize(query);
  const cTokens = tokenize(cand);
  if (qTokens.length === 0 || cTokens.length === 0) return 0;
  let tokenSum = 0;
  for (const qt of qTokens) {
    let best = 0;
    for (const ct of cTokens) {
      if (!ct) continue;
      if (ct === qt) best = Math.max(best, 1);
      else if (ct.startsWith(qt)) best = Math.max(best, 0.9);
      else if (ct.includes(qt)) best = Math.max(best, 0.78);
      else best = Math.max(best, jaroWinkler(qt, ct) * 0.9);
      if (best === 1) break;
    }
    tokenSum += best;
  }
  const tokenScore = tokenSum / qTokens.length;
  const globalJW = jaroWinkler(query, cand);
  let leadBoost = 0;
  if (cTokens[0] && qTokens[0] && (cTokens[0].startsWith(qTokens[0]) || jaroWinkler(qTokens[0], cTokens[0]) > 0.9)) {
    leadBoost = 0.05;
  }
  return Math.min(1, Math.max(globalJW, (tokenScore * 0.7 + globalJW * 0.3)) + leadBoost);
}

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

/* Colores lanes */
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
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [companiaFiltro, setCompaniaFiltro] = useState("todos");
  const [estanteFiltro, setEstanteFiltro] = useState("todos");
  const [baldaFiltro, setBaldaFiltro] = useState("todos");

  // opciones búsqueda
  const [modoBusqueda, setModoBusqueda] = useState("inteligente");
  const [sensibilidad, setSensibilidad] = useState("media");

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

  // sugerencias
  const [openSug, setOpenSug] = useState(false);
  const [sugerencias, setSugerencias] = useState([]);
  const searchDebounceRef = useRef(null);

  // filtros guardados
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      setEstadoFiltro(saved.estadoFiltro ?? "todos");
      setCompaniaFiltro(saved.companiaFiltro ?? "todos");
      setEstanteFiltro(saved.estanteFiltro ?? "todos");
      setBaldaFiltro(saved.baldaFiltro ?? "todos");
      setModoBusqueda(saved.modoBusqueda ?? "inteligente");
      setSensibilidad(saved.sensibilidad ?? "media");
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ estadoFiltro, companiaFiltro, estanteFiltro, baldaFiltro, modoBusqueda, sensibilidad })
    );
  }, [estadoFiltro, companiaFiltro, estanteFiltro, baldaFiltro, modoBusqueda, sensibilidad]);

  /* ===== CARGA PRINCIPAL – lee layouts_meta (verdad) con fallback al RPC ===== */
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

        // Paquetes desde tu API (ya filtra por tenant vía JWT)
        const paquetesAPI = await obtenerPaquetesBackend(token);
        if (cancelado) return;

        // --- Layout from layouts_meta first ---
        let meta = null;
        try {
          const { data } = await supabase
            .from("layouts_meta")
            .select("mode,rows,cols,payload")
            .eq("org_id", tenantId)
            .maybeSingle();
          meta = data || null;
        } catch { meta = null; }

        // Fallback RPC
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

        // Catálogos mínimos (baldas + compañías)
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
          .map(e => e.nombre)
          .filter(Boolean)
          .sort((a,b)=>a.localeCompare(b));
        setCompanias(listaCompanias);

        // ===== Mapas de nombres/colores según modo =====
        const laneName = new Map();
        const laneColor = new Map();
        const rackName = new Map();
        const shelfName = new Map();

        let mode = modeFromMeta;

        if (mode === "lanes") {
          // lanes definidos en payload (verdad absoluta)
          for (const l of lanesArr) {
            const id = Number(l?.id ?? l?.lane_id);
            if (!Number.isFinite(id)) continue;
            if (l?.name) laneName.set(id, String(l.name));
            const col = String(l?.color || "").trim();
            if (/^#?[0-9a-f]{6}$/i.test(col)) laneColor.set(id, col.startsWith('#') ? col : `#${col}`);
          }

          // Fallbacks si no vinieran lanes en payload:
          if (laneName.size === 0) {
            // lanes table
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
            // carriles table
            if (laneName.size === 0) {
              try {
                const { data } = await supabase
                  .from("carriles")
                  .select("id,codigo,color")
                  .eq("tenant_id", tenantId);
                (data || []).forEach(r => {
                  const id = Number(r?.id);
                  if (!Number.isFinite(id)) return;
                  if (r?.codigo) laneName.set(id, String(r.codigo));
                  const col = String(r?.color || "").trim();
                  if (/^#?[0-9a-f]{6}$/i.test(col)) laneColor.set(id, col.startsWith('#') ? col : `#${col}`);
                });
              } catch {}
            }
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
              const idx = Number(s?.index ?? s?.idx ?? s?.shelf_index);
              if (!Number.isFinite(idx)) continue;
              shelfName.set(`${rid}-${idx}`, s?.name || `${rname}${idx}`);
            }
          }
          // Fallbacks con baldas si no viniera payload
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

        // Etiqueta legible por balda_id (para racks y como último recurso en lanes)
        const labelMap = new Map();
        for (const b of baldas) {
          if (mode === "lanes") {
            const lname = laneName.get(Number(b.estante));
            labelMap.set(b.id, `Carril ${ lname ?? (b.codigo ?? String(b.estante)) }`);
          } else {
            const rlabel = rackName.get(Number(b.estante)) ?? String(b.estante);
            const sname  = shelfName.get(`${b.estante}-${b.balda}`) ?? (b.codigo || `Fila ${b.balda}`);
            labelMap.set(b.id, `Estante ${rlabel} · ${sname}`);
          }
        }
        setBaldaLabelById(labelMap);

        const baldaById = new Map(baldas.map(b => [b.id, b]));

        // ===== Formatear resultados con nombres buenos (modo lanes PRIORITARIO por lane_id/compartimento) =====
        const formateados = (paquetesAPI || []).map(p => {
          const b = p.balda_id ? baldaById.get(p.balda_id) : null;

          // Estante/balda “numéricos” que puedan venir del backend
          const estanteNum = (p.estante != null ? Number(p.estante) : (b?.estante ?? null));
          const baldaIdx   = (p.balda   != null ? Number(p.balda)   : (b?.balda   ?? null));

          // LANE id real (si existe), o estante de balda como fallback
          const laneIdRaw = (p.lane_id != null ? Number(p.lane_id) : null);
          const laneId = Number.isFinite(laneIdRaw) ? laneIdRaw
                        : (mode === "lanes" ? (Number.isFinite(estanteNum) ? estanteNum : null) : null);

          // Nombre de ubicación
          let ubicacion = "";
          let lane_color = null;

          if (mode === "lanes") {
            // 1) Si hay lane_id y está en el mapa → usamos su nombre/color.
            const lname = (laneId != null ? laneName.get(laneId) : null);
            if (lname) {
              ubicacion = `Carril ${lname}`;
              lane_color = laneColor.get(laneId) || null;
            } else if (typeof p.compartimento === "string" && p.compartimento.trim()) {
              // 2) Si no, usamos el compartimento que guardamos al crear el paquete en modo carriles
              ubicacion = `Carril ${p.compartimento.trim()}`;
              // intenta color por si el compartimento coincide con el nombre configurado
              const lid = [...laneName.entries()].find(([, n]) => String(n).toUpperCase() === p.compartimento.trim().toUpperCase())?.[0];
              if (lid != null) lane_color = laneColor.get(lid) || null;
            } else if (p.balda_id && labelMap.get(p.balda_id)) {
              // 3) Último recurso: derivado desde una balda vieja (si existe)
              ubicacion = labelMap.get(p.balda_id);
              if (b?.estante != null) lane_color = laneColor.get(Number(b.estante)) || null;
            } else {
              // 4) Fallback ultra mínimo
              const lname2 = laneName.get(Number(estanteNum));
              ubicacion = `Carril ${lname2 ?? (b?.codigo ?? estanteNum ?? "?")}`;
              if (estanteNum != null) lane_color = laneColor.get(Number(estanteNum)) || null;
            }
          } else {
            // === RACKS ===
            if (p.balda_id && labelMap.get(p.balda_id)) {
              ubicacion = labelMap.get(p.balda_id);
            } else {
              const rlabel = rackName.get(Number(estanteNum)) ?? String(estanteNum ?? "?");
              const sname  = shelfName.get(`${estanteNum}-${baldaIdx}`) ?? (b?.codigo || `Fila ${baldaIdx ?? "?"}`);
              ubicacion = `Estante ${rlabel} · ${sname}`;
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
            ubicacion_label: ubicacion,
            lane_color,
            // extra: conservar referencias por si luego editamos
            lane_id: laneId,
            compartimento: p.compartimento ?? null,
          };
        });

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
    searchDebounceRef.current = setTimeout(() => setPaginaActual(1), 250);
    return () => clearTimeout(searchDebounceRef.current);
  }, [busqueda, estadoFiltro, companiaFiltro, estanteFiltro, baldaFiltro, modoBusqueda, sensibilidad]);

  // Sugerencias dinámicas
  useEffect(() => {
    if (!busqueda || normalize(busqueda).length < 2) { setSugerencias([]); return; }
    const nombres = Array.from(new Set(resultados.map(r => r.nombre_cliente).filter(Boolean)));
    const cands = [...nombres, ...companiasFiltradas.filter(c => c !== "todos")];
    const ranked = cands
      .map(txt => ({ txt, s: fuzzyScore(busqueda, txt) }))
      .filter(x => x.s >= 0.55)
      .sort((a,b)=>b.s-a.s)
      .slice(0,6)
      .map(x=>x.txt);
    setSugerencias(ranked);
  }, [busqueda, resultados, companiasFiltradas]);

  const threshold = useMemo(() => {
    if (sensibilidad === "amplia") return 0.55;
    if (sensibilidad === "estricta") return 0.78;
    return 0.66;
  }, [sensibilidad]);

  // Filtrado + ranking
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

    if (!q) return [...base].sort(sortFn);

    if (modoBusqueda === "exacta") {
      const nq = normalize(q);
      base = base.filter(p => normalize(p.nombre_cliente).includes(nq));
      return [...base].sort(sortFn);
    }

    return base
      .map(p => {
        const candidate = `${p.nombre_cliente} ${p.compania || ""}`;
        const score = fuzzyScore(q, candidate);
        return { p, score };
      })
      .filter(x => x.score >= threshold)
      .sort((a, b) => b.score - a.score || sortFn(a.p, b.p))
      .map(x => x.p);
  }, [resultados, busqueda, estadoFiltro, companiaFiltro, estanteFiltro, baldaFiltro, sortBy, modoBusqueda, threshold]);

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
    setConfirmState({
      open: true,
      payload: { id: paquete.id, nombre: paquete.nombre_cliente }
    });
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
        // NOTA: lane_id/compartimento suelen mantenerse como estaban en backend
      };
      const actualizado = await editarPaqueteBackend(payload, token);

      // refrescar etiquetas con los mapas actuales
      const b = baldasDisponibles.find(x => x.id === (actualizado?.balda_id ?? payload.balda_id));
      const rlabel = b ? (rackNameById.get(b.estante) ?? String(b.estante)) : undefined;
      const slabel = b ? (shelfNameByKey.get(`${b.estante}-${b.balda}`) ?? (b.codigo || `Fila ${b.balda}`)) : undefined;
      const nuevaEtiqueta = b ? (layoutMode === "lanes"
        ? `Carril ${laneNameById.get(b.estante) ?? b.codigo ?? b.estante}`
        : `Estante ${rlabel} · ${slabel}`
      ) : undefined;

      const nuevoColor = b && layoutMode === "lanes" ? (laneColorById.get(b.estante) || null) : undefined;

      setResultados(prev => prev.map(p => p.id === payload.id ? {
        ...p,
        nombre_cliente: actualizado?.nombre_cliente ?? payload.nombre_cliente,
        empresa_transporte: actualizado?.empresa_transporte ?? payload.empresa_transporte,
        compania: actualizado?.empresa_transporte ?? payload.empresa_transporte,
        balda_id: actualizado?.balda_id ?? payload.balda_id,
        estante: actualizado?.estante ?? b?.estante ?? p.estante,
        balda: actualizado?.balda ?? b?.balda ?? p.balda,
        ubicacion_label: nuevaEtiqueta ?? p.ubicacion_label,
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

  const limpiarBusqueda = () => setBusqueda("");

  // KPIs
  const total = filtrados.length;
  const pendientesCount = filtrados.filter(p => !p.entregado).length;
  const entregadosCount = total - pendientesCount;
  const progreso = total ? Math.round((entregadosCount / total) * 100) : 0;

  // chips
  const chips = [
    busqueda ? { k: "q", label: `Búsqueda: “${busqueda}”`, onClear: () => setBusqueda("") } : null,
    estadoFiltro !== "todos" ? { k: "estado", label: `Estado: ${estadoFiltro}`, onClear: () => setEstadoFiltro("todos") } : null,
    companiaFiltro !== "todos" ? { k: "comp", label: `Compañía: ${companiaFiltro}`, onClear: () => setCompaniaFiltro("todos") } : null,
    estanteFiltro !== "todos" ? {
      k: "est",
      label: layoutMode === "lanes"
        ? `Carril: ${laneNameById.get(parseInt(estanteFiltro)) ?? estanteFiltro}`
        : `Estante: ${rackNameById.get(parseInt(estanteFiltro)) ?? estanteFiltro}`,
      onClear: () => setEstanteFiltro("todos")
    } : null,
    baldaFiltro !== "todos" ? { k: "bal", label: `Fila: ${baldaFiltro}`, onClear: () => setBaldaFiltro("todos") } : null,
  ].filter(Boolean);

  return (
    <div className="buscar-paquete">
      <div className="titulo-flex">
        <h2><FaSearch className="icono-titulo" /> Buscar paquete</h2>
        <div className="resumen kpis" aria-live="polite">
          <div className="kpi"><span className="kpi-label">Total</span><span className="kpi-value">{total}</span></div>
          <div className="kpi"><span className="kpi-label">Pendientes</span><span className="kpi-value">{pendientesCount}</span></div>
          <div className="kpi"><span className="kpi-label">Entregados</span><span className="kpi-value">{entregadosCount}</span></div>
          <div className="progress"><div className="bar" style={{ width: `${progreso}%` }} /><span className="progress-text">{progreso}% entregado</span></div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filtros-superiores" role="region" aria-label="Filtros de búsqueda">
        <div className="searchbox" onFocus={() => setOpenSug(true)} onBlur={() => setTimeout(() => setOpenSug(false), 120)}>
          <FaSearch className="magnifier" />
          <input
            type="search"
            placeholder="Buscar por cliente (admite errores tipográficos)…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar por cliente"
            inputMode="search"
          />
          {busqueda && (
            <button className="clear" onClick={limpiarBusqueda} title="Borrar búsqueda" aria-label="Borrar búsqueda">
              <FaTimes />
            </button>
          )}
          {openSug && sugerencias.length > 0 && (
            <ul className="suggestions" role="listbox">
              {sugerencias.map(s => (
                <li key={s} role="option" onMouseDown={() => { setBusqueda(s); setOpenSug(false); }}>
                  <FaSearch /> <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="segmented">
          <span className="segmented__label"><FaSlidersH /> Búsqueda</span>
          <div className="segmented__group" role="tablist" aria-label="Modo de búsqueda">
            <button className={modoBusqueda === "inteligente" ? "active" : ""} onClick={() => setModoBusqueda("inteligente")} role="tab">Inteligente</button>
            <button className={modoBusqueda === "exacta" ? "active" : ""} onClick={() => setModoBusqueda("exacta")} role="tab">Exacta</button>
          </div>
          {modoBusqueda === "inteligente" && (
            <div className="segmented__group sensitivity" role="tablist" aria-label="Sensibilidad">
              <button className={sensibilidad === "amplia" ? "active" : ""} onClick={() => setSensibilidad("amplia")} role="tab">Amplia</button>
              <button className={sensibilidad === "media" ? "active" : ""} onClick={() => setSensibilidad("media")} role="tab">Media</button>
              <button className={sensibilidad === "estricta" ? "active" : ""} onClick={() => setSensibilidad("estricta")} role="tab">Estricta</button>
            </div>
          )}
        </div>

        <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} aria-label="Filtrar por estado">
          <option value="todos">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="entregado">Entregado</option>
        </select>

        <select value={companiaFiltro} onChange={(e) => setCompaniaFiltro(e.target.value)} aria-label="Filtrar por compañía">
          {companiasFiltradas.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Estante/Carril */}
        <select value={estanteFiltro} onChange={(e) => setEstanteFiltro(e.target.value)} aria-label={layoutMode === "lanes" ? "Filtrar por carril" : "Filtrar por estante"}>
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

        {/* Fila/Balda */}
        <select value={baldaFiltro} onChange={(e) => setBaldaFiltro(e.target.value)} aria-label="Filtrar por fila/balda">
          {baldasFiltradas.map(val => (
            <option key={val} value={val}>
              {val === "todos" ? "Todas las filas" : `Fila ${val}`}
            </option>
          ))}
        </select>
      </div>

      {/* Chips */}
      {chips.length > 0 && (
        <div className="chips">
          <span className="chips-label"><FaFilter /> Filtros activos</span>
          <div className="chips-list">
            {chips.map(c => (
              <button key={c.k} className="chip" onClick={c.onClear} aria-label={`Quitar ${c.label}`}>
                {c.label} <FaTimes />
              </button>
            ))}
            <button
              className="chip clear-all"
              onClick={() => { setBusqueda(""); setEstadoFiltro("todos"); setCompaniaFiltro("todos"); setEstanteFiltro("todos"); setBaldaFiltro("todos"); }}
            >
              Limpiar todo
            </button>
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
            {busqueda && <button onClick={() => setBusqueda("")}>Limpiar búsqueda</button>}
            {modoBusqueda === "inteligente" && sensibilidad !== "amplia" && (
              <button onClick={() => setSensibilidad("amplia")}>Ampliar sensibilidad</button>
            )}
            {(estadoFiltro !== "todos" || companiaFiltro !== "todos" || estanteFiltro !== "todos" || baldaFiltro !== "todos") && (
              <button onClick={() => { setEstadoFiltro("todos"); setCompaniaFiltro("todos"); setEstanteFiltro("todos"); setBaldaFiltro("todos"); }}>
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
                <col style={{ width: "26%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
              </colgroup>

              <thead>
                <tr>
                  <th onClick={() => toggleSort("nombre_cliente")} className={sortBy.field==="nombre_cliente" ? sortBy.dir : ""}>Cliente</th>
                  <th onClick={() => toggleSort("compania")} className={sortBy.field==="compania" ? sortBy.dir : ""}>Compañía</th>
                  <th>Ubicación</th>
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

                  return (
                    <tr
                      key={p.id}
                      style={rowStyle}
                      className={`${flashRowId === p.id ? "flash" : ""} ${p.lane_color ? "lane-tinted" : ""}`}
                    >
                      <td data-label="Cliente" className="cliente">
                        {busqueda && modoBusqueda === "inteligente"
                          ? highlightApprox(p.nombre_cliente, busqueda)
                          : p.nombre_cliente}
                      </td>
                      <td data-label="Compañía">{p.compania}</td>

                      {/* Ubicación (más descriptiva) */}
                      <td data-label="Ubicación">
                        {layoutMode === "lanes" && p.lane_color ? (
                          <span
                            className="ubi lane"
                            style={{ ['--lane']: p.lane_color, ['--lane-rgba']: hexToRgba(p.lane_color, 0.18) }}
                            title={p.ubicacion_label}
                          >
                            <i className="lane-dot" aria-hidden="true" />
                            <span>{p.ubicacion_label}</span>
                          </span>
                        ) : (
                          <span className="ubi">{p.ubicacion_label}</span>
                        )}
                      </td>

                      <td data-label="Fecha">{formatearFecha(p.fecha_llegada)}</td>
                      <td data-label="Estado">
                        <span className={`badge-estado ${p.entregado ? "entregado" : "pendiente"}`}>
                          {p.entregado ? "Entregado" : "Pendiente"}
                        </span>
                      </td>
                      <td data-label="Acciones" className="acciones">
                        <button className="icono editar" title="Editar" aria-label={`Editar paquete de ${p.nombre_cliente}`} onClick={() => abrirModalEdicion(p)}>
                          <FaEdit size={16} />
                        </button>
                        {!p.entregado && (
                          <button className="icono entregar" title="Marcar entregado" aria-label={`Marcar entregado el paquete de ${p.nombre_cliente}`} onClick={() => marcarEntregado(p.id)}>
                            <FaCheckCircle size={16} />
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
                const style = p.lane_color
                  ? { ['--lane']: p.lane_color, ['--lane-rgba']: hexToRgba(p.lane_color, 0.08) }
                  : undefined;
                return (
                  <article key={p.id} className={`card ${p.lane_color ? "lane-tinted" : ""}`} style={style}>
                    <header className="card__head">
                      <h4 className="card__title">{p.nombre_cliente}</h4>
                      <span className={`badge-estado ${p.entregado ? "entregado" : "pendiente"}`}>
                        {p.entregado ? "Entregado" : "Pendiente"}
                      </span>
                    </header>
                    <div className="card__row">
                      <span className="label">Compañía</span>
                      <span>{p.compania}</span>
                    </div>
                    <div className="card__row">
                      <span className="label">Ubicación</span>
                      {layoutMode === "lanes" && p.lane_color ? (
                        <span className="ubi lane" style={{ ['--lane']: p.lane_color, ['--lane-rgba']: hexToRgba(p.lane_color, 0.18) }}>
                          <i className="lane-dot" aria-hidden="true" />
                          <span>{p.ubicacion_label}</span>
                        </span>
                      ) : (
                        <span className="ubi">{p.ubicacion_label}</span>
                      )}
                    </div>
                    <div className="card__row">
                      <span className="label">Fecha</span>
                      <span>{formatearFecha(p.fecha_llegada)}</span>
                    </div>
                    <footer className="card__actions">
                      <button className="btn btn--ghost" onClick={() => abrirModalEdicion(p)}><FaEdit /> Editar</button>
                      {!p.entregado && (
                        <button className="btn btn--primary" onClick={() => marcarEntregado(p.id)}><FaCheckCircle /> Entregar</button>
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
                            const sname  = shelfNameByKey.get(`${b.estante}-${b.balda}`) ?? (b.codigo || `Fila ${b.balda}`);
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
