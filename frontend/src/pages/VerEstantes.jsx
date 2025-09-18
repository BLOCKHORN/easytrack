// src/pages/VerEstantes.jsx
import "../styles/VerEstantes.scss";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { getTenantIdOrThrow } from "../utils/tenant";
import { FaBoxes, FaSearch, FaChevronDown, FaTimes } from "react-icons/fa";

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
const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
const isPending = (p) => p?.entregado === false || p?.entregado == null;

/** Autolayout compacto para lanes… */
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

  const totalCells = rows * cols;
  const freeCells = [];
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const key = `${r}-${c}`;
      if (!taken.has(key)) freeCells.push({ r, c });
    }
  }

  const stillNeed = Math.max(0, needPlace.length - freeCells.length);
  if (stillNeed > 0) {
    const extraCols = colsHint > 0 ? 0 : Math.min(4, cols);
    const target = placed.length + needPlace.length;
    if (extraCols === 0) {
      rows = Math.ceil(target / cols);
    } else {
      cols = Math.ceil(target / rows);
    }
    const newFree = [];
    const newTaken = new Set(placed.map(p => `${p.row}-${p.col}`));
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const k = `${r}-${c}`;
        if (!newTaken.has(k)) newFree.push({ r, c });
      }
    }
    freeCells.splice(0, freeCells.length, ...newFree);
  }

  for (let i = 0; i < needPlace.length; i++) {
    const spot = freeCells[i];
    if (!spot) break;
    placed.push({ ...needPlace[i], row: spot.r, col: spot.c });
  }

  placed.sort((a,b)=> (a.row - b.row) || (a.col - b.col));
  return { lanes: placed, rows, cols };
}

/* ===================== Componente ===================== */
export default function VerEstantes() {
  const [modo, setModo] = useState("lanes"); // "lanes" | "racks"

  // ---- Lanes
  const [lanes, setLanes] = useState([]);
  const [gridDims, setGridDims] = useState({ rows: 1, cols: 1 });
  const [pkgsByLaneId, setPkgsByLaneId] = useState({});

  // ---- Racks
  const [estructuraRacks, setEstructuraRacks] = useState([]);
  const [rackGrid, setRackGrid] = useState({ rows: 1, cols: 1 });
  const [rackOrder, setRackOrder] = useState([]);
  const [pkgsByBaldaId, setPkgsByBaldaId] = useState({});

  // ---- UI
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [openSet, setOpenSet] = useState(() => new Set());
  const [q, setQ] = useState("");
  const [soloConPkgs, setSoloConPkgs] = useState(false);

  /* ===================== Carga ===================== */
  useEffect(() => {
    let cancel = false;
    (async () => {
      setCargando(true); setError(null);
      try {
        const { data: { session} } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("No hay sesión activa.");
        const tenantId = await getTenantIdOrThrow();

        let meta = null;
        try {
          const { data } = await supabase
            .from('layouts_meta')
            .select('mode, rows, cols, payload')
            .eq('org_id', tenantId)
            .maybeSingle();
          meta = data || null;
        } catch { meta = null; }

        if (!meta) {
          try {
            const { data } = await supabase.rpc('get_warehouse_layout', { p_org: tenantId });
            meta = data || null;
          } catch { meta = null; }
        }

        const root = meta?.payload ? meta.payload : meta || {};
        const modeFromMeta = meta?.mode || root?.layout_mode || "lanes";
        const rowsHint = num(meta?.rows ?? root?.grid?.rows, 0);
        const colsHint = num(meta?.cols ?? root?.grid?.cols, 0);

        if (cancel) return;
        setModo(modeFromMeta);

        /* ======================= L A N E S ======================= */
        if ((modeFromMeta || "lanes") === "lanes") {
          let arr = Array.isArray(root?.lanes) ? root.lanes : [];
          arr = arr
            .map(l => ({
              id   : num(l?.id ?? l?.lane_id, NaN),
              label: l?.name || String(l?.id ?? l?.lane_id),
              row  : num(l?.position?.row ?? l?.row ?? l?.r, 0),
              col  : num(l?.position?.col ?? l?.col ?? l?.c, 0),
              color: l?.color || "#6b7280",
            }))
            .filter(l => Number.isFinite(l.id));

          if (arr.length === 0) {
            try {
              const { data: rows } = await supabase
                .from("lanes")
                .select("lane_id,id,name,color,row,col")
                .eq("tenant_id", tenantId);
              const lrows = rows || [];
              if (lrows.length) {
                arr = lrows.map(l => ({
                  id: num(l?.lane_id ?? l?.id, NaN),
                  label: (l?.name || String(l?.lane_id ?? l?.id)),
                  row: num(l?.row, 0),
                  col: num(l?.col, 0),
                  color: l?.color || "#6b7280",
                })).filter(x => Number.isFinite(x.id));
              }
            } catch {}

            if (arr.length === 0) {
              try {
                const { data } = await supabase
                  .from("carriles")
                  .select("id,codigo,color,fila,columna")
                  .eq("tenant_id", tenantId);
                const carr = data || [];
                if (carr.length) {
                  arr = carr.map(r => ({
                    id: num(r.id, NaN),
                    label: (r?.codigo || String(r.id)),
                    row: num(r.fila, 0),
                    col: num(r.columna, 0),
                    color: r.color || "#6b7280",
                  })).filter(x => Number.isFinite(x.id));
                }
              } catch {}
            }

            if (arr.length === 0) {
              const { data: baldas } = await supabase
                .from("baldas")
                .select("estante,codigo")
                .eq("id_negocio", tenantId);
              const byEst = new Map();
              (baldas || []).forEach(b => {
                const est = num(b?.estante, NaN);
                if (!Number.isFinite(est)) return;
                if (!byEst.has(est)) byEst.set(est, []);
                if (b?.codigo) byEst.get(est).push(String(b.codigo));
              });
              arr = [...byEst.entries()]
                .sort((a,b)=>a[0]-b[0])
                .map(([est, codes]) => ({
                  id: est,
                  label: (codes.find(Boolean) || `Carril ${est}`).trim(),
                  row: 0, col: 0, color: "#6b7280"
                }));
            }
          }

          const { lanes: laid, rows, cols } = autolayoutLanes(arr, rowsHint, colsHint);
          if (cancel) return;
          setLanes(laid);
          setGridDims({ rows, cols });

          const { data: paquetes } = await supabase
            .from("paquetes")
            .select("id,nombre_cliente,empresa_transporte,entregado,fecha_llegada,lane_id,compartimento,baldas(estante)")
            .eq("tenant_id", tenantId);

          if (cancel) return;

          const byLane = {};
          const nameToId = new Map(laid.map(l => [String(l.label || "").toUpperCase(), l.id]));
          const laneIds = new Set(laid.map(l => l.id));

          (paquetes || []).forEach(p => {
            if (!isPending(p)) return;
            let keyId = Number.isFinite(num(p?.lane_id, NaN)) && laneIds.has(num(p.lane_id))
              ? num(p.lane_id)
              : (nameToId.get(String(p?.compartimento || "").toUpperCase())
                  ?? (Number.isFinite(num(p?.baldas?.estante, NaN)) && laneIds.has(num(p.baldas.estante))
                        ? num(p.baldas.estante) : null));
            if (keyId == null) return;
            (byLane[keyId] ||= []).push({
              id: p.id,
              nombre_cliente: p.nombre_cliente,
              empresa_transporte: p.empresa_transporte,
              fecha_llegada: p.fecha_llegada,
            });
          });

          setPkgsByLaneId(byLane);
          return;
        }

        /* ======================= R A C K S ======================= */
        const pos = [];
        const rackName = new Map();
        const racksMeta = Array.isArray(root?.racks) ? root.racks
                        : Array.isArray(meta?.racks) ? meta.racks : [];
        for (const r of racksMeta) {
          const rid = num(r?.id, NaN);
          if (!Number.isFinite(rid)) continue;
          rackName.set(rid, r?.name || String(rid));
          const rr = num(r?.position?.row ?? r?.row ?? r?.r, NaN);
          const rc = num(r?.position?.col ?? r?.col ?? r?.c, NaN);
          if (Number.isFinite(rr) && Number.isFinite(rc)) pos.push({ est: rid, r: rr, c: rc });
        }

        const { data: baldasRows } = await supabase
          .from("baldas")
          .select("id, codigo, estante, balda")
          .eq("id_negocio", tenantId)
          .order("estante", { ascending: true })
          .order("balda",   { ascending: true });

        const porEstante = new Map();
        (baldasRows || []).forEach(b => {
          const rid = num(b?.estante, NaN); if (!Number.isFinite(rid)) return;
          const idx = num(b?.balda, 1) || 1;
          const nombreRack = rackName.get(rid) || String(rid);
          const label = b?.codigo || `${nombreRack}${idx}`;
          if (!porEstante.has(rid)) porEstante.set(rid, []);
          porEstante.get(rid).push({ id: b.id, codigo: b.codigo, idx, label });
        });
        porEstante.forEach(list => list.sort((a,b)=>a.idx-b.idx));

        const estantesOrden = (() => {
          if (pos.length) {
            pos.sort((a,b)=> (a.r-b.r) || (a.c-b.c));
            return pos.map(x => x.est);
          }
          return Array.from(porEstante.keys()).sort((a,b)=>a-b);
        })();

        const estructura = estantesOrden.map(est => ({
          estante: est,
          nombre: rackName.get(est) || String(est),
          baldas: (porEstante.get(est) || []).map(({id,codigo,label}) => ({ id, codigo, label }))
        }));

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

        if (cancel) return;
        setEstructuraRacks(estructura);
        setRackOrder(estantesOrden);
        setRackGrid({ rows: rowsR, cols: colsR });

        const { data: paquetes } = await supabase
          .from("paquetes")
          .select("id,nombre_cliente,empresa_transporte,entregado,fecha_llegada,balda_id,baldas(id,codigo),compartimento")
          .eq("tenant_id", tenantId);

        if (cancel) return;

        const byBalda = {};
        const codigoToBalda = new Map();
        estructura.forEach(r => (r.baldas || []).forEach(b => codigoToBalda.set(String(b.codigo || "").toUpperCase(), b.id)));

        (paquetes || []).forEach(p => {
          if (!isPending(p)) return;
          let keyId = Number.isFinite(num(p?.balda_id, NaN)) ? num(p.balda_id) : null;
          if (!keyId && p?.baldas?.id) keyId = num(p.baldas.id);
          if (!keyId && p?.baldas?.codigo) keyId = codigoToBalda.get(String(p.baldas.codigo || "").toUpperCase()) ?? null;
          if (!keyId && p?.compartimento) keyId = codigoToBalda.get(String(p.compartimento || "").toUpperCase()) ?? null;
          if (!keyId) return;
          (byBalda[keyId] ||= []).push({
            id: p.id,
            nombre_cliente: p.nombre_cliente,
            empresa_transporte: p.empresa_transporte,
            fecha_llegada: p.fecha_llegada,
          });
        });

        setPkgsByBaldaId(byBalda);
      } catch (e) {
        console.error("[VerEstantes] Error:", e);
        if (!cancel) setError(e?.message || "No se pudo cargar la vista de almacén");
      } finally {
        if (!cancel) setCargando(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  /* ===================== Derivados / Filtros ===================== */
  const totalPaquetes = useMemo(() => {
    const values = modo === "lanes" ? Object.values(pkgsByLaneId) : Object.values(pkgsByBaldaId);
    return values.reduce((a, arr) => a + (arr?.length || 0), 0);
  }, [modo, pkgsByLaneId, pkgsByBaldaId]);

  const stats = useMemo(() => {
    if (modo === "lanes") {
      const ocupadas = lanes.filter(l => (pkgsByLaneId[l.id] || []).length > 0).length;
      return { titleA:"Carriles", valA:lanes.length, titleB:"Carriles ocupados", valB:ocupadas, titleC:"Paquetes", valC:totalPaquetes };
    } else {
      const totalBaldas = estructuraRacks.reduce((a,c)=>a+(c?.baldas?.length||0),0);
      const baldasOcupadas = estructuraRacks.reduce((a,col)=>a+(col.baldas||[]).filter(b=>(pkgsByBaldaId[b.id]||[]).length>0).length,0);
      return { titleA:"Estantes", valA:estructuraRacks.length, titleB:"Baldas", valB:totalBaldas, titleC:"Paquetes", valC:totalPaquetes, extra:`Baldas ocupadas: ${baldasOcupadas}` };
    }
  }, [modo, lanes, pkgsByLaneId, estructuraRacks, pkgsByBaldaId, totalPaquetes]);

  const toggle = (id) => setOpenSet(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const clearQ = () => setQ("");

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

  /* ===================== UI ===================== */
  return (
    <div className="ver-estantes">
      {/* Cabecera */}
      <div className="titulo-bar">
        <h2><FaBoxes className="icono" /> Visualización del almacén</h2>
        <div className="resumen">
          <span className="chip">{stats.titleA}: {stats.valA}</span>
          <span className="chip">{stats.extra ? stats.extra : `${stats.titleB}: ${stats.valB}`}</span>
          <span className="chip chip--accent">{stats.titleC}: {stats.valC}</span>
        </div>
      </div>

      {/* Leyenda + filtros */}
      <div className="toolbar">
        {/* NUEVA LEYENDA COMPACTA */}
        <div className="leyenda" aria-label="Leyenda de ocupación">
          <span className="leg-item"><i className="dot neutra" /><span>0</span></span>
          <span className="leg-item"><i className="dot verde" /><span>1–4</span></span>
          <span className="leg-item"><i className="dot naranja" /><span>5–9</span></span>
          <span className="leg-item"><i className="dot rojo" /><span>10+</span></span>
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
      ) : modo === "lanes" ? (
        <div
          className="lanes-matrix"
          style={{ gridTemplateColumns: `repeat(${gridDims.cols || 1}, minmax(260px, 1fr))` }}
          role="grid"
        >
          {Array.from({ length: gridDims.rows || 1 }).flatMap((_, rIdx) =>
            Array.from({ length: gridDims.cols || 1 }).map((_, cIdx) => {
              const r = rIdx + 1, c = cIdx + 1;
              const lane = lanes.find(l => l.row === r && l.col === c) || null;
              if (!lane) return <div key={`cell-${r}-${c}`} className="lane-cell empty" role="gridcell" />;

              const arr = pkgsByLaneId[lane.id] || [];
              const n = arr.length;
              const visible = matchLane(lane);
              if (!visible) return <div key={`cell-${r}-${c}`} className="lane-cell empty" role="gridcell" />;

              const open = openSet.has(lane.id);
              const laneColor = lane.color || "#6b7280";
              const laneTint  = hexToRgba(laneColor, 0.08);
              const laneRing  = hexToRgba(laneColor, 0.35);

              return (
                <div key={`cell-${r}-${c}`} className={`lane-cell wrap ${open ? "activa" : ""}`} role="gridcell">
                  <button
                    type="button"
                    className={`lane-head ${clsOcupacion(n)}`}
                    style={{ ["--lane"]: laneColor, ["--lane-rgba"]: laneTint, ["--sel-ring"]: laneRing }}
                    onClick={() => toggle(lane.id)}
                    aria-expanded={open}
                    aria-controls={`vis-lane-${lane.id}`}
                    title={n === 1 ? "1 paquete" : `${n} paquetes`}
                  >
                    <i className="lane-tape" aria-hidden />
                    <div className="lane-title">{highlight(lane.label || `Carril ${lane.id}`, q)}</div>
                    <div className={`lane-qty ${n === 0 ? "zero" : "some"}`}><b>{n}</b><i>paquetes</i></div>
                    <FaChevronDown className="chev" aria-hidden />
                  </button>

                  <div
                    id={`vis-lane-${lane.id}`}
                    className="lane-visor"
                    style={{ maxHeight: open ? "800px" : "0px", opacity: open ? 1 : 0 }}
                  >
                    {n > 0 ? (
                      <ul className="lista-paquetes">
                        {arr.map(p => (
                          <li key={p.id} className="paquete pendiente">
                            <div className="cliente">{highlight(p?.nombre_cliente || "—", q)}</div>
                            <div className="meta">
                              <span className="pill">{p.empresa_transporte || "—"}</span>
                              <span className="pill">{p.fecha_llegada ? new Date(p.fecha_llegada).toLocaleDateString() : "—"}</span>
                              <span className="pill estado warn">Pendiente</span>
                            </div>
                          </li>
                        ))}
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
      ) : estructuraFiltradaRacks.length === 0 ? (
        <div className="estado-vacio">No hay estantes que coincidan con el filtro.</div>
      ) : (
        <div className="grid-estantes" style={{ ["--rack-cols"]: `repeat(${rackGrid.cols || 1}, minmax(340px, 1fr))` }} role="grid">
          {(() => {
            const estantesOrdenados = (rackOrder.length ? rackOrder : estructuraRacks.map(r => r.estante).sort((a,b)=>a-b));
            const totalCells = (rackGrid.rows || 1) * (rackGrid.cols || 1);
            const cells = Array.from({ length: totalCells }, (_, i) => estantesOrdenados[i] ?? null);

            return cells.map((est, idx) => {
              if (est == null) return <div key={`ph-${idx}`} className="columna estante--placeholder" aria-hidden="true" />;
              if (filteredEstantesSet.size && !filteredEstantesSet.has(est)) return <div key={`filtered-${est}`} className="columna estante--placeholder" aria-hidden="true" />;

              const rack = filteredMap.get(est) || racksMap.get(est);
              if (!rack) return <div key={`missing-${est}`} className="columna estante--placeholder" aria-hidden="true" />;

              const { nombre, baldas } = rack;
              const totalEstante = (baldas || []).reduce((acc, b) => acc + (pkgsByBaldaId[b.id]?.length || 0), 0);
              const ocupadas = (baldas || []).filter(b => (pkgsByBaldaId[b.id]?.length || 0) > 0).length;
              const pct = (baldas || []).length ? Math.round((ocupadas / baldas.length) * 100) : 0;

              return (
                <section key={`est-${est}`} className="columna" aria-label={`Estante ${nombre || est}`}>
                  <header className="cabecera-estante">
                    <div className="tit">
                      <span className="titulo">Estante {nombre || est}</span>
                      <span className="contador">{totalEstante} pkg</span>
                    </div>
                    <div className="mini-progress">
                      <div className="bar"><span style={{ width: `${pct}%` }} /></div>
                      <span className="pct">{pct}%</span>
                    </div>
                  </header>

                  <div className="baldas">
                    {(baldas || []).map(({ codigo, id, label }) => {
                      const lista = pkgsByBaldaId[id] || [];
                      const n = lista.length;
                      const open = openSet.has(id);
                      const visible = codigo || label || `Balda ${id}`;

                      return (
                        <div key={id} className={`balda-wrapper ${open ? "activa" : ""}`}>
                          <button
                            type="button"
                            className={`balda ${clsOcupacion(n)}`}
                            onClick={() => toggle(id)}
                            aria-expanded={open}
                            aria-controls={`visor-${id}`}
                            title={n === 1 ? "1 paquete" : `${n} paquetes`}
                          >
                            <span className="codigo">{highlight(visible, q)}</span>
                            <span className={`qty ${n === 0 ? "zero" : "some"}`} aria-hidden><b>{n}</b><i>paquetes</i></span>
                            <FaChevronDown className="chev" aria-hidden />
                          </button>

                          <div
                            id={`visor-${id}`}
                            className="visor-paquetes"
                            style={{ maxHeight: open ? "800px" : "0px", opacity: open ? 1 : 0 }}
                          >
                            {n > 0 ? (
                              <ul className="lista-paquetes">
                                {lista.map(p => (
                                  <li key={p.id} className="paquete pendiente">
                                    <div className="cliente">{highlight(p?.nombre_cliente || "—", q)}</div>
                                    <div className="meta">
                                      <span className="pill">{p.empresa_transporte || "—"}</span>
                                      <span className="pill">{p.fecha_llegada ? new Date(p.fecha_llegada).toLocaleDateString() : "—"}</span>
                                      <span className="pill estado warn">Pendiente</span>
                                    </div>
                                  </li>
                                ))}
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
      )}
    </div>
  );
}
