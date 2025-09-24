// src/pages/VerEstantes.jsx
import "../styles/VerEstantes.scss";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { getTenantIdOrThrow } from "../utils/tenant";
import {
  obtenerPaquetesBackend,
  obtenerEstructuraEstantesYPaquetes,
  eliminarPaqueteBackend, // <-- acción rápida
} from "../services/paquetesService";
import {
  FaBoxes, FaSearch, FaChevronDown, FaTimes,
  FaEye, FaEyeSlash, FaTrashAlt
} from "react-icons/fa";

/* ===== Helpers ===== */
const clsOcupacion = (n) => (n === 0 ? "neutra" : n <= 4 ? "verde" : n <= 9 ? "naranja" : "rojo");
const highlight = (str = "", q = "") => {
  const t = q.trim().toLowerCase();
  const s = String(str ?? "");
  if (!t) return s;
  const i = s.toLowerCase().indexOf(t);
  if (i === -1) return s;
  return (<>{s.slice(0, i)}<mark>{s.slice(i, i + t.length)}</mark>{s.slice(i + t.length)}</>);
};
const hexToRgba = (hex = "#6b7280", a = 0.1) => {
  const h = String(hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return `rgba(0,0,0,${a})`;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};
const normHex = (hex, fb = "#2563eb") => {
  const v = String(hex || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^[0-9a-fA-F]{6}$/.test(v)) return `#${v}`;
  return fb;
};
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const isPending = (p) => p?.entregado === false || p?.entregado == null;

/** Autolayout compacto para lanes (si falta row/col) */
function autolayoutLanes(input = [], rowsHint = 0, colsHint = 0) {
  const lanes = input.map(l => ({ ...l }));
  const needPlace = [];
  const placed = [];
  let maxR = 0, maxC = 0;
  const taken = new Set();

  for (const l of lanes) {
    const r = num(l.row, 0), c = num(l.col, 0);
    const key = `${r}-${c}`;
    const valid = r > 0 && c > 0 && !taken.has(key);
    if (valid) {
      placed.push({ ...l, row: r, col: c });
      taken.add(key);
      if (r > maxR) maxR = r;
      if (c > maxC) maxC = c;
    } else {
      needPlace.push(l);
    }
  }

  let rows = rowsHint > 0 ? rowsHint : Math.max(maxR, 1);
  let cols = colsHint > 0 ? colsHint : Math.max(maxC, 1);

  if (rows === 1 && cols === 1 && placed.length === 0) {
    const n = lanes.length || 1;
    cols = colsHint > 0 ? colsHint : Math.min(Math.ceil(Math.sqrt(n)), 4);
    rows = rowsHint > 0 ? rowsHint : Math.ceil(n / cols);
  }

  const freeCells = [];
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const key = `${r}-${c}`;
      if (!taken.has(key)) freeCells.push({ r, c });
    }
  }

  for (let i = 0; i < needPlace.length; i++) {
    const spot = freeCells[i];
    if (!spot) break;
    placed.push({ ...needPlace[i], row: spot.r, col: spot.c });
  }

  placed.sort((a, b) => (a.row - b.row) || (a.col - b.col));
  return { lanes: placed, rows, cols };
}

/* ===== Extrae estructura de /api/estantes/estructura ===== */
function extractStructureFromBackend(payload) {
  const root = payload?.estructura;
  if (!Array.isArray(root)) return [];
  return root.map(est => ({
    estante: num(est?.estante, NaN),
    nombre : est?.nombre || String(est?.estante),
    baldas : (Array.isArray(est?.filas) ? est.filas : []).map(f => ({
      id    : f?.id ?? `${est?.estante}:${f?.idx ?? f?.index ?? f?.i ?? f?.balda}`,
      codigo: f?.codigo ?? f?.name ?? null,
      label : f?.name ?? f?.codigo ?? null,
      idx   : num(f?.idx ?? f?.index ?? f?.i ?? f?.balda, NaN),
    })).filter(b => Number.isFinite(b.idx))
  })).filter(r => Number.isFinite(r.estante));
}

/* ===== Carrier dominante (para color interno en desplegado) ===== */
function getDominantCarrierColor(arr = [], colorMap = new Map(), fallback = "#6b7280") {
  if (!arr.length) return fallback;
  const counts = new Map();
  for (const p of arr) {
    const name = p?.empresa_transporte || p?.compania || "";
    if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  if (!counts.size) return fallback;
  const [bestName] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const hex = normHex(colorMap.get(bestName), fallback);
  return hex;
}

/* ===== Constantes visuales ===== */
const GAP_PX = 12;
const RACK_CELL_W = 340;
const LANE_CELL_W = 280;
const MIN_SCALE = 0.40;
const MAX_EXPAND_PX = 3000;
const FLUID_BREAK_RACKS = 1100;
const FLUID_BREAK_LANES = 900;

export default function VerEstantes() {
  const [modo, setModo] = useState("racks"); // "lanes" | "racks"

  // ---- Lanes
  const [lanes, setLanes] = useState([]);
  const [gridDims, setGridDims] = useState({ rows: 1, cols: 1 });
  const [pkgsByLaneId, setPkgsByLaneId] = useState({});

  // ---- Racks
  const [estructuraRacks, setEstructuraRacks] = useState([]);
  const [rackGrid, setRackGrid] = useState({ rows: 1, cols: 1 });
  const [rackOrder, setRackOrder] = useState([]);
  const [pkgsByBaldaId, setPkgsByBaldaId] = useState({});

  // ---- Colores compañías
  const [coloresCompania, setColoresCompania] = useState(() => new Map());
  const getCompColor = (name) => normHex(coloresCompania.get(name), "#2563eb");

  // ---- UI
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [openSet, setOpenSet] = useState(() => new Set());
  const [q, setQ] = useState("");
  const [soloConPkgs, setSoloConPkgs] = useState(false);

  // Privacidad
  const [revealAll, setRevealAll] = useState(false);
  const [revealedSet, setRevealedSet] = useState(() => new Set());

  // Token
  const [authToken, setAuthToken] = useState("");

  // ---- Flags
  const [readyLayout, setReadyLayout] = useState(false);
  const [readyEstructura, setReadyEstructura] = useState(false);

  // ---- Escalado
  const racksWrapRef = useRef(null);
  const racksInnerRef = useRef(null);
  const lanesWrapRef = useRef(null);
  const lanesInnerRef = useRef(null);
  const [racksScale, setRacksScale] = useState(1);
  const [lanesScale, setLanesScale] = useState(1);

  const [fluidRacks, setFluidRacks] = useState(false);
  const [fluidLanes, setFluidLanes] = useState(false);

  /* =============== Carga =============== */
  useEffect(() => {
    let cancel = false;
    (async () => {
      setCargando(true);
      setError(null);
      setReadyLayout(false);
      setReadyEstructura(false);

      try {
        const [{ data: { session } }] = await Promise.all([supabase.auth.getSession()]);
        const token = session?.access_token;
        if (!token) throw new Error("No hay sesión activa.");
        setAuthToken(token);
        const tenantId = await getTenantIdOrThrow();

        // Colores compañías
        const empresasPromise = supabase
          .from("empresas_transporte_tenant")
          .select("nombre,color")
          .eq("tenant_id", tenantId)
          .then(({ data }) => data || [])
          .catch(() => []);

        // Layout/meta
        const layoutPromise = (async () => {
          let meta = null;
          try {
            const { data } = await supabase
              .from("layouts_meta")
              .select("mode, rows, cols, payload")
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
          return meta || {};
        })();

        // Paquetes
        const paquetesPromise = obtenerPaquetesBackend(token).catch(() => []);

        const [empresas, metaRaw, paquetes] = await Promise.all([empresasPromise, layoutPromise, paquetesPromise]);
        if (cancel) return;

        const colorMap = new Map();
        (empresas || []).forEach(e => { colorMap.set(e?.nombre, normHex(e?.color || "#2563eb")); });
        setColoresCompania(colorMap);

        const root = metaRaw?.payload ? metaRaw.payload : metaRaw || {};
        const modeFromMeta = metaRaw?.mode || root?.layout_mode || "racks";
        const rowsHint = num(metaRaw?.rows ?? root?.grid?.rows, 0);
        const colsHint = num(metaRaw?.cols ?? root?.grid?.cols, 0);
        setModo(modeFromMeta);

        /* === Nombres meta === */
        const racksMeta = Array.isArray(root?.racks) ? root.racks
          : Array.isArray(metaRaw?.racks) ? metaRaw.racks : [];
        const rackNames = new Map();
        const shelfNamesByPair = new Map();
        for (const r of (racksMeta || [])) {
          const rid = num(r?.id, NaN);
          if (!Number.isFinite(rid)) continue;
          if (r?.name) rackNames.set(rid, String(r.name));
          const shelves = Array.isArray(r?.shelves) ? r.shelves : [];
          for (const s of shelves) {
            const idx = num(s?.index ?? s?.idx ?? s?.shelf_index ?? s?.i ?? s?.orden, NaN);
            if (!Number.isFinite(idx)) continue;
            if (s?.name) shelfNamesByPair.set(`${rid}-${idx}`, String(s.name));
          }
        }

        const lanesMeta = Array.isArray(root?.lanes) ? root.lanes : [];
        const laneNamesFromMeta = new Map();
        for (const l of lanesMeta) {
          const lid = num(l?.id ?? l?.lane_id, NaN);
          if (Number.isFinite(lid) && l?.name) laneNamesFromMeta.set(lid, String(l.name));
        }

        /* ============ L A N E S ============ */
        if (modeFromMeta === "lanes") {
          let arr = Array.isArray(root?.lanes) ? root.lanes : [];
          if (!arr.length) {
            const q1 = await supabase
              .from("lanes")
              .select("lane_id,id,name,color,row,col")
              .eq("tenant_id", tenantId)
              .catch(() => ({ data: [] }));
            const rows1 = q1?.data || [];

            if (rows1.length) {
              arr = rows1.map(l => ({
                id: num(l?.lane_id ?? l?.id, NaN),
                label: l?.name || String(l?.lane_id ?? l?.id),
                row: num(l?.row, 0),
                col: num(l?.col, 0),
                color: l?.color || "#6b7280",
              }));
            } else {
              const q2 = await supabase
                .from("carriles")
                .select("id,codigo,color,fila,columna")
                .eq("tenant_id", tenantId)
                .catch(() => ({ data: [] }));
              const rows2 = q2?.data || [];
              if (rows2.length) {
                arr = rows2.map(r => ({
                  id: num(r.id, NaN),
                  label: r?.codigo || String(r.id),
                  row: num(r.fila, 0),
                  col: num(r.columna, 0),
                  color: r.color || "#6b7280",
                }));
              }
            }
          }

          const { lanes: laid, rows, cols } = autolayoutLanes(
            (arr || []).map(l => ({
              id   : num(l?.id ?? l?.lane_id, NaN),
              label: l?.label ?? l?.name ?? String(l?.id ?? l?.lane_id),
              row  : num(l?.row ?? l?.position?.row ?? l?.r, 0),
              col  : num(l?.col ?? l?.position?.col ?? l?.c, 0),
              color: l?.color || "#6b7280",
            })).filter(l => Number.isFinite(l.id)),
            rowsHint, colsHint
          );

          const laidWithNames = laid.map(x => ({ ...x, label: laneNamesFromMeta.get(x.id) || x.label }));

          const validLaneIds = new Set(laidWithNames.map(l => l.id));
          const byLane = {};
          for (const p of (paquetes || [])) {
            if (!isPending(p)) continue;
            const lid = num(p?.lane_id, NaN);
            if (!Number.isFinite(lid) || !validLaneIds.has(lid)) continue;
            (byLane[lid] ||= []).push({
              id: p.id,
              nombre_cliente: p.nombre_cliente,
              empresa_transporte: p.empresa_transporte ?? p.compania,
              fecha_llegada: p.fecha_llegada ?? p.created_at,
            });
          }

          if (cancel) return;
          setLanes(laidWithNames);
          setGridDims({ rows, cols });
          setPkgsByLaneId(byLane);
          setReadyLayout(true);
          setCargando(false);
          return;
        }

        /* ============ R A C K S ============ */
        let estructura = [];
        try {
          const body = await obtenerEstructuraEstantesYPaquetes(token);
          if (body) estructura = extractStructureFromBackend(body);
        } catch { /* no-op */ }

        if (!estructura.length) {
          try {
            const { data: baldasRows } = await supabase
              .from("baldas")
              .select("id, codigo, estante, balda")
              .eq("id_negocio", tenantId)
              .order("estante", { ascending: true })
              .order("balda",   { ascending: true });
            const porEst = new Map();
            (baldasRows || []).forEach(b => {
              const est = num(b?.estante, NaN); if (!Number.isFinite(est)) return;
              const idx = num(b?.balda, NaN);   if (!Number.isFinite(idx)) return;
              if (!porEst.has(est)) porEst.set(est, []);
              porEst.get(est).push({ id: b.id, codigo: b.codigo, label: b.codigo || `Fila ${idx}`, idx });
            });
            porEst.forEach(list => list.sort((a, b) => a.idx - b.idx));
            estructura = Array.from(porEst.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([est, baldas]) => ({ estante: est, nombre: String(est), baldas }));
          } catch { /* no-op */ }
        }

        const pos = [];
        for (const r of racksMeta) {
          const rid = num(r?.id, NaN);
          const rr  = num(r?.position?.row ?? r?.row ?? r?.r, NaN);
          const rc  = num(r?.position?.col ?? r?.col ?? r?.c, NaN);
          if (Number.isFinite(rid) && Number.isFinite(rr) && Number.isFinite(rc)) pos.push({ est: rid, r: rr, c: rc });
        }
        const estantesOrden = (() => {
          if (pos.length) {
            pos.sort((a, b) => (a.r - b.r) || (a.c - b.c));
            return pos.map(x => x.est);
          }
          return estructura.map(r => r.estante).sort((a, b) => a - b);
        })();
        let rowsR, colsR;
        if (pos.length) {
          const maxR = Math.max(...pos.map(x => x.r));
          const maxC = Math.max(...pos.map(x => x.c));
          rowsR = rowsHint > 0 ? rowsHint : (maxR || 1);
          colsR = colsHint > 0 ? colsHint : (maxC || 1);
        } else if (rowsHint > 0 && colsHint > 0) {
          rowsR = rowsHint; colsR = colsHint;
        } else {
          const n = estantesOrden.length || 1;
          colsR = Math.min(Math.ceil(Math.sqrt(n)), 4);
          rowsR = Math.ceil(n / colsR);
        }

        const validBaldaIds = new Set(estructura.flatMap(r => (r.baldas || []).map(b => b.id)));
        const byBalda = {};
        for (const p of (paquetes || [])) {
          if (!isPending(p)) continue;
          const bid = num(p?.balda_id, NaN);
          if (!Number.isFinite(bid) || !validBaldaIds.has(bid)) continue;
          (byBalda[bid] ||= []).push({
            id: p.id,
            nombre_cliente: p.nombre_cliente,
            empresa_transporte: p.empresa_transporte ?? p.compania,
            fecha_llegada: p.fecha_llegada ?? p.created_at,
          });
        }

        const estructuraNamed = estructura.map(r => ({
          ...r,
          nombre: (racksMeta.find(x => num(x?.id, NaN) === r.estante)?.name) || r.nombre,
          baldas: (r.baldas || []).map(b => {
            const nm = shelfNamesByPair.get(`${r.estante}-${b.idx}`);
            return nm ? { ...b, label: nm, codigo: b.codigo || nm } : b;
          })
        }));

        if (cancel) return;
        setEstructuraRacks(estructuraNamed);
        setRackOrder(estantesOrden);
        setRackGrid({ rows: rowsR, cols: colsR });
        setPkgsByBaldaId(byBalda);
        setReadyLayout(true);
        setReadyEstructura(true);
        setCargando(false);
      } catch (e) {
        console.error("[VerEstantes] Error:", e);
        if (!cancel) { setError(e?.message || "No se pudo cargar la vista de almacén"); setCargando(false); }
      }
    })();
    return () => { /* cancel */ };
  }, []);

  /* =============== Escalado responsive =============== */
  const recomputeRacksScale = () => {
    const wrap = racksWrapRef.current;
    if (!wrap) return;
    const cols = rackGrid.cols || 1;
    const contentW = cols * RACK_CELL_W + (cols - 1) * GAP_PX;
    const avail = wrap.clientWidth - 2;
    const scale = Math.min(1, Math.max(MIN_SCALE, avail / contentW));
    setRacksScale(scale);
  };
  const recomputeLanesScale = () => {
    const wrap = lanesWrapRef.current;
    if (!wrap) return;
    const cols = gridDims.cols || 1;
    const contentW = cols * LANE_CELL_W + (cols - 1) * GAP_PX;
    const avail = wrap.clientWidth - 2;
    const scale = Math.min(1, Math.max(MIN_SCALE, avail / contentW));
    setLanesScale(scale);
  };

  useEffect(() => { recomputeRacksScale(); }, [rackGrid.cols, rackOrder.length, readyEstructura]);
  useEffect(() => { recomputeLanesScale(); }, [gridDims.cols, lanes.length, readyLayout]);

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth || document.documentElement.clientWidth || 0;
      setFluidRacks(w <= FLUID_BREAK_RACKS);
      setFluidLanes(w <= FLUID_BREAK_LANES);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const ro1 = new ResizeObserver(() => { recomputeRacksScale(); recomputeLanesScale(); });
    if (racksWrapRef.current) ro1.observe(racksWrapRef.current);
    if (lanesWrapRef.current) ro1.observe(lanesWrapRef.current);
    return () => ro1.disconnect();
  }, []);

  /* =============== Filtros/derivados =============== */
  const laneByRC = useMemo(() => {
    const map = new Map();
    for (const l of lanes) map.set(`${l.row}-${l.col}`, l);
    return map;
  }, [lanes]);

  const matchLane = (l) => {
    const t = q.trim().toLowerCase();
    const arr = pkgsByLaneId[l.id] || [];
    if (soloConPkgs && arr.length === 0) return false;
    if (!t) return true;
    const hitCod = String(l.label || "").toLowerCase().includes(t);
    const hitCli = arr.some(p => (p?.nombre_cliente || "").toLowerCase().includes(t));
    return hitCod || hitCli;
  };

  const estructuraFiltradaRacks = useMemo(() => {
    if (modo !== "racks") return [];
    const t = q.trim().toLowerCase(), onlyPkgs = soloConPkgs;
    return estructuraRacks
      .map(col => {
        const baldas = (col.baldas || []).filter(b => {
          const list = pkgsByBaldaId[b.id] || [];
          if (onlyPkgs && list.length === 0) return false;
          if (!t) return true;
          const hitCodigo = (b.codigo || "").toLowerCase().includes(t);
          const hitLabel  = (b.label  || "").toLowerCase().includes(t);
          const hitCli    = list.some(p => (p?.nombre_cliente || "").toLowerCase().includes(t));
          return hitCodigo || hitLabel || hitCli;
        });
        return { ...col, baldas };
      })
      .filter(col => col.baldas.length > 0);
  }, [modo, estructuraRacks, pkgsByBaldaId, q, soloConPkgs]);

  const racksMap = useMemo(() => new Map(estructuraRacks.map(r => [r.estante, r])), [estructuraRacks]);
  const filteredMap = useMemo(() => new Map(estructuraFiltradaRacks.map(r => [r.estante, r])), [estructuraFiltradaRacks]);
  const filteredEstantesSet = useMemo(() => new Set(estructuraFiltradaRacks.map(r => r.estante)), [estructuraFiltradaRacks]);

  /* =============== Acciones UI =============== */
  const toggle = (id) => setOpenSet(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearQ = () => setQ("");

  const toggleRevealAll = () => {
    setRevealAll(prev => !prev);
    setRevealedSet(new Set()); // limpiar revelados individuales
  };
  const toggleRevealOne = (id) => {
    if (revealAll) return; // si ya está todo visible, no hace falta
    setRevealedSet(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const removeFromLocalState = (pkgId) => {
    // Racks
    setPkgsByBaldaId(prev => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        next[k] = (next[k] || []).filter(p => p.id !== pkgId);
      }
      return next;
    });
    // Lanes
    setPkgsByLaneId(prev => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        next[k] = (next[k] || []).filter(p => p.id !== pkgId);
      }
      return next;
    });
  };

  const onDeletePkg = async (pkgId) => {
    const ok = window.confirm("¿Eliminar este paquete? Esta acción no se puede deshacer.");
    if (!ok) return;
    try {
      await eliminarPaqueteBackend(authToken, pkgId);
      removeFromLocalState(pkgId);
    } catch (e) {
      console.error("Eliminar paquete falló:", e);
      alert("No se pudo eliminar el paquete.");
    }
  };

  /* =============== Render =============== */
  return (
    <div className="ver-estantes">
      {/* Cabecera */}
      <div className="titulo-bar">
        <h2><FaBoxes className="icono" /> Estanterías</h2>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        {/* Leyenda de colores (ocupa poco y hace wrap en móvil) */}
<div className="leyenda" role="note" aria-label="Leyenda de colores">
  <span className="leg-item"><i className="dot neutra" />0 vacía</span>
  <span className="leg-item"><i className="dot verde" />1–4 poco</span>
  <span className="leg-item"><i className="dot naranja" />5–9 medio</span>
  <span className="leg-item"><i className="dot rojo" />10+ cargado</span>
</div>

        <div className="filtros">
          <div className="input-icon">
            <FaSearch aria-hidden />
            <input
              type="text"
              placeholder={modo === "lanes" ? "Buscar carril o cliente…" : "Buscar balda o cliente…"}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Buscar"
            />
            {q && (
              <button type="button" className="clear" onClick={clearQ} aria-label="Limpiar búsqueda">
                <FaTimes />
              </button>
            )}
          </div>

          <label className="toggle">
            <input type="checkbox" checked={soloConPkgs} onChange={(e) => setSoloConPkgs(e.target.checked)} />
            <span className="slider" aria-hidden />
            <span className="label">Solo con paquetes</span>
          </label>

          <button
            type="button"
            className="btn-ghost"
            onClick={toggleRevealAll}
            aria-pressed={revealAll}
            title={revealAll ? "Ocultar nombres" : "Mostrar todos los nombres"}
          >
            {revealAll ? <><FaEyeSlash /> Ocultar nombres</> : <><FaEye /> Mostrar nombres</>}
          </button>

          <div className="acciones">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                if (modo === "lanes") {
                  const set = new Set(); lanes.forEach(l => { if (matchLane(l)) set.add(l.id); }); setOpenSet(set);
                } else {
                  const set = new Set(); estructuraFiltradaRacks.forEach(c => c.baldas.forEach(b => set.add(b.id))); setOpenSet(set);
                }
              }}
            >Expandir visibles</button>

            <button type="button" className="btn-ghost" onClick={() => setOpenSet(new Set())}>Contraer todas</button>
          </div>
        </div>
      </div>

      {cargando ? (
        <div className="skeleton"><div className="row" /><div className="row" /><div className="row" /></div>
      ) : error ? (
        <div className="estado-error" role="alert">{error}</div>
      ) : !readyLayout ? (
        <div className="skeleton"><div className="row" /><div className="row" /><div className="row" /></div>
      ) : modo === "lanes" ? (
        lanes.length === 0 ? (
          <div className="estado-vacio">No hay carriles configurados.</div>
        ) : (
          <div
            className={`fit-wrapper lanes-fit ${fluidLanes ? "fluid" : ""}`}
            ref={lanesWrapRef}
            style={{ ['--zoom']: fluidLanes ? 1 : lanesScale }}
          >
            <div
              className="lanes-matrix"
              ref={lanesInnerRef}
              style={
                fluidLanes
                  ? { gridTemplateColumns: `repeat(auto-fit, minmax(var(--lane-cell-w), 1fr))`, width: "auto" }
                  : {
                      gridTemplateColumns: `repeat(${gridDims.cols || 1}, var(--lane-cell-w))`,
                      width: `${(gridDims.cols || 1) * LANE_CELL_W + ((gridDims.cols || 1) - 1) * GAP_PX}px`
                    }
              }
              role="grid"
            >
              {Array.from({ length: gridDims.rows || 1 }).flatMap((_, rIdx) =>
                Array.from({ length: gridDims.cols || 1 }).map((_, cIdx) => {
                  const r = rIdx + 1, c = cIdx + 1;
                  const lane = laneByRC.get(`${r}-${c}`) || null;
                  if (!lane) return <div key={`cell-${r}-${c}`} className="lane-cell empty" role="gridcell" />;

                  const arr = pkgsByLaneId[lane.id] || [];
                  const n = arr.length;
                  const visible = matchLane(lane);
                  if (!visible) return <div key={`cell-${r}-${c}`} className="lane-cell empty" role="gridcell" />;

                  const open = openSet.has(lane.id);
                  const laneColor = normHex(lane.color || "#6b7280", "#6b7280");
                  const laneTint  = hexToRgba(laneColor, 0.08);
                  const laneRing  = hexToRgba(laneColor, 0.35);

                  // color de compañía solo para interior
                  const carrierColor = getDominantCarrierColor(arr, coloresCompania, "#6b7280");
                  const carrierTint  = hexToRgba(carrierColor, 0.14);

                  const occClass = clsOcupacion(n);

                  return (
                    <div key={`cell-${r}-${c}`} className={`lane-cell wrap ${open ? "activa" : ""}`} role="gridcell">
                      <button
                        type="button"
                        className={`lane-head ${occClass}`}
                        data-occ={occClass}
                        style={{
                          '--lane': laneColor,
                          '--lane-rgba': laneTint,
                          '--sel-ring': laneRing,
                          '--carrier': carrierColor,       // usado en interior al abrir
                          '--carrier-rgba': carrierTint    // usado en interior al abrir
                        }}
                        onClick={() => toggle(lane.id)}
                        aria-expanded={open}
                        aria-controls={`vis-lane-${lane.id}`}
                        title={n === 1 ? "1 paquete" : `${n} paquetes`}
                      >
                        <i className="lane-tape" aria-hidden />
                        <div className="lane-title">{highlight(lane.label || `Carril ${lane.id}`, q)}</div>
                        <div className={`lane-qty ${n === 0 ? "zero" : "some"}`}><b>{n}</b><i>paquetes</i></div>
                        <FaChevronDown className={`chev ${open ? "rot" : ""}`} aria-hidden />
                      </button>

                      <div
                        id={`vis-lane-${lane.id}`}
                        className="lane-visor"
                        style={{ maxHeight: open ? `${MAX_EXPAND_PX}px` : "0px", opacity: open ? 1 : 0 }}
                      >
                        {n > 0 ? (
                          <ul className="lista-paquetes">
                            {arr.map(p => {
                              const cc = getCompColor(p.empresa_transporte);
                              const revealed = revealAll || revealedSet.has(p.id);
                              return (
                                <li key={p.id} className="paquete pendiente">
                                  <div className={`cliente ${revealed ? "" : "blurred"}`}>
                                    {highlight(p?.nombre_cliente || "—", q)}
                                  </div>
                                  <div className="meta">
                                    <span
                                      className="pill pill--carrier"
                                      style={{ ['--comp']: cc, ['--comp-rgba']: hexToRgba(cc, 0.16) }}
                                    >
                                      <i className="dot" />{p.empresa_transporte || "—"}
                                    </span>
                                    <span className="pill">{p.fecha_llegada ? new Date(p.fecha_llegada).toLocaleDateString() : "—"}</span>
                                    <span className="pill estado warn">Pendiente</span>
                                  </div>
                                  <div className="row-actions">
                                    <button
                                      type="button"
                                      className="icon-btn"
                                      title={revealed ? "Ocultar nombre" : "Mostrar nombre"}
                                      onClick={() => toggleRevealOne(p.id)}
                                    >
                                      {revealed ? <FaEyeSlash /> : <FaEye />}
                                    </button>
                                    <button
                                      type="button"
                                      className="icon-btn danger"
                                      title="Eliminar paquete"
                                      onClick={() => onDeletePkg(p.id)}
                                    >
                                      <FaTrashAlt />
                                    </button>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <div className="sin-paquetes">Sin paquetes en este carril.</div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )
      ) : !readyEstructura ? (
        <div className="skeleton"><div className="row" /><div className="row" /><div className="row" /></div>
      ) : estructuraRacks.length === 0 ? (
        <div className="estado-vacio">No hay estantes/baldas configurados.</div>
      ) : estructuraFiltradaRacks.length === 0 ? (
        <div className="estado-vacio">No hay estantes que coincidan con el filtro.</div>
      ) : (
        <div
          className={`fit-wrapper racks-fit ${fluidRacks ? "fluid" : ""}`}
          ref={racksWrapRef}
          style={{ ['--zoom']: fluidRacks ? 1 : racksScale }}
        >
          <div
            className="grid-estantes"
            ref={racksInnerRef}
            style={
              fluidRacks
                ? { gridTemplateColumns: `repeat(auto-fit, minmax(var(--rack-cell-w), 1fr))`, width: "auto" }
                : {
                    ['--rack-cols']: `repeat(${rackGrid.cols || 1}, var(--rack-cell-w))`,
                    width: `${(rackGrid.cols || 1) * RACK_CELL_W + ((rackGrid.cols || 1) - 1) * GAP_PX}px`
                  }
            }
            role="grid"
          >
            {(() => {
              const estantesOrdenados = (rackOrder.length ? rackOrder : estructuraRacks.map(r => r.estante).sort((a, b) => a - b));
              const totalCells = (rackGrid.rows || 1) * (rackGrid.cols || 1);
              const cells = Array.from({ length: totalCells }, (_, i) => estantesOrdenados[i] ?? null);

              return cells.map((est, idx) => {
                if (est == null) return <div key={`ph-${idx}`} className="columna estante--placeholder" aria-hidden="true" />;
                if (filteredEstantesSet.size && !filteredEstantesSet.has(est)) return <div key={`filtered-${est}`} className="columna estante--placeholder" aria-hidden="true" />;

                const rack = filteredMap.get(est) || racksMap.get(est);
                if (!rack) return <div key={`missing-${est}`} className="columna estante--placeholder" aria-hidden="true" />;

                const { nombre, baldas } = rack;
                const totalEstante = (baldas || []).reduce((acc, b) => acc + (pkgsByBaldaId[b.id]?.length || 0), 0);

                return (
                  <section key={`est-${est}`} className="columna" aria-label={`Estante ${nombre || est}`}>
                    <header className="cabecera-estante">
                      <div className="tit">
                        <span className="titulo">Estante {nombre || est}</span>
                        <span className="contador">{totalEstante} {totalEstante === 1 ? "paquete" : "paquetes"}</span>
                      </div>
                    </header>

                    <div className="baldas">
                      {(baldas || []).map(({ codigo, id, label, idx }) => {
                        const lista = pkgsByBaldaId[id] || [];
                        const n = lista.length;
                        const open = openSet.has(id);
                        const visible = label || codigo || `Fila ${idx}`;

                        // Color por ocupación en cabecera
                        const occClass = clsOcupacion(n);

                        // Color por carrier SOLO para interior del desplegable
                        const carrierColor = getDominantCarrierColor(lista, coloresCompania, "#6b7280");
                        const cTint = hexToRgba(carrierColor, 0.14);

                        return (
                          <div key={id} className={`balda-wrapper ${open ? "activa" : ""}`}>
                            <button
                              type="button"
                              className={`balda ${occClass}`}
                              data-occ={occClass}
                              onClick={() => toggle(id)}
                              aria-expanded={open}
                              aria-controls={`visor-${id}`}
                              title={n === 1 ? "1 paquete" : `${n} paquetes`}
                              style={{
                                // estas vars de carrier se consumen SOLO en el visor (interior)
                                ['--carrier']: carrierColor,
                                ['--carrier-rgba']: cTint
                              }}
                            >
                              <span className="codigo">{highlight(visible, q)}</span>
                              <span className={`qty ${n === 0 ? "zero" : "some"}`} aria-hidden><b>{n}</b><i>paquetes</i></span>
                              <FaChevronDown className={`chev ${open ? "rot" : ""}`} aria-hidden />
                            </button>

                            <div
                              id={`visor-${id}`}
                              className="visor-paquetes"
                              style={{ maxHeight: open ? `${MAX_EXPAND_PX}px` : "0px", opacity: open ? 1 : 0 }}
                            >
                              {n > 0 ? (
                                <ul className="lista-paquetes">
                                  {lista.map(p => {
                                    const cc = getCompColor(p.empresa_transporte);
                                    const revealed = revealAll || revealedSet.has(p.id);
                                    return (
                                      <li key={p.id} className="paquete pendiente">
                                        <div className={`cliente ${revealed ? "" : "blurred"}`}>
                                          {highlight(p?.nombre_cliente || "—", q)}
                                        </div>
                                        <div className="meta">
                                          <span
                                            className="pill pill--carrier"
                                            style={{ ['--comp']: cc, ['--comp-rgba']: hexToRgba(cc, 0.16) }}
                                          >
                                            <i className="dot" />{p.empresa_transporte || "—"}
                                          </span>
                                          <span className="pill">{p.fecha_llegada ? new Date(p.fecha_llegada).toLocaleDateString() : "—"}</span>
                                          <span className="pill estado warn">Pendiente</span>
                                        </div>
                                        <div className="row-actions">
                                          <button
                                            type="button"
                                            className="icon-btn"
                                            title={revealed ? "Ocultar nombre" : "Mostrar nombre"}
                                            onClick={() => toggleRevealOne(p.id)}
                                          >
                                            {revealed ? <FaEyeSlash /> : <FaEye />}
                                          </button>
                                          <button
                                            type="button"
                                            className="icon-btn danger"
                                            title="Eliminar paquete"
                                            onClick={() => onDeletePkg(p.id)}
                                          >
                                            <FaTrashAlt />
                                          </button>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              ) : (
                                <div className="sin-paquetes">Sin paquetes en esta balda.</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
