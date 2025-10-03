// src/pages/VerEstantes.jsx
import "../styles/VerEstantes.scss";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { getTenantIdOrThrow } from "../utils/tenant";
import {
  obtenerPaquetesBackend,
  eliminarPaqueteBackend,
} from "../services/paquetesService";
import { cargarUbicaciones } from "../services/ubicacionesService";
import {
  FaBoxes, FaSearch, FaChevronDown, FaTimes,
  FaEye, FaEyeSlash, FaTrashAlt
} from "react-icons/fa";

/* ===== Helpers ===== */
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clsOcupacion = (n) => (n === 0 ? "neutra" : n <= 4 ? "verde" : n <= 9 ? "naranja" : "rojo");
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
const highlight = (str = "", q = "") => {
  const t = q.trim().toLowerCase();
  const s = String(str ?? "");
  if (!t) return s;
  const i = s.toLowerCase().indexOf(t);
  if (i === -1) return s;
  return (<>{s.slice(0, i)}<mark>{s.slice(i, i + t.length)}</mark>{s.slice(i + t.length)}</>);
};
const isPending = (p) => p?.entregado === false || p?.entregado == null;

/* ===== Orden visual igual que Config ===== */
const clamp = (v,min,max) => Math.max(min, Math.min(max, v));
const buildPosToIdx = (count, cols, orientation) => {
  const n = Math.max(0, count|0), c = Math.max(1, cols|0);
  if (orientation === 'horizontal') return Array.from({length:n}, (_,p)=>p);
  const rows = Math.ceil(n/c), orderPos = [];
  for (let col=0; col<c; col++) for (let row=0; row<rows; row++) {
    const pos = row*c + col; if (pos<n) orderPos.push(pos);
  }
  const posToIdx = Array(n).fill(0);
  orderPos.forEach((pos,idx)=>{ posToIdx[pos]=idx; });
  return posToIdx;
};
const idxFromLabel = (label) => {
  const m = /^B\s*(\d+)$/i.exec(String(label||'').trim());
  return m ? (parseInt(m[1],10)-1) : null;
};
function makeVisualUbicaciones(rawUbis, meta) {
  const cols = clamp(parseInt(meta?.cols ?? 5,10) || 5, 1, 12);
  const order = (meta?.order || meta?.orden) === 'vertical' ? 'vertical' : 'horizontal';

  const sorted = (rawUbis || []).map((u,i)=>({
    id: u.id || u.ubicacion_id || u.uuid || `temp-${i}`,
    label: String(u.label || u.codigo || `B${i+1}`).toUpperCase(),
    orden: num(u.orden, i),
    activo: u.activo ?? true
  }));
  const count = sorted.length;
  const byIdx = Array(count).fill(null);
  for (const u of sorted) {
    const k = idxFromLabel(u.label);
    if (k != null && k>=0 && k<count) byIdx[k] = u;
  }
  for (let k=0;k<count;k++) if(!byIdx[k]) byIdx[k] = { id:`ghost-${k}`, label:`B${k+1}`, orden:k, activo:true };

  const posToIdx = buildPosToIdx(count, cols, order);
  const visual = Array.from({length:count}, (_,pos)=>byIdx[posToIdx[pos]]);
  return { visual, cols, order };
}

/* ===== UI consts ===== */
const GAP_PX = 12;
const CELL_W = 300;
const MIN_SCALE = 0.40;
const FLUID_BREAK = 1000;
const MAX_EXPAND_PX = 3000;

export default function VerEstantes() {
  // fuente de verdad del backend
  const [rawUbicaciones, setRawUbicaciones] = useState([]); // [{id,label,orden,activo}]
  const [metaUbi, setMetaUbi] = useState({ cols: 5, order: 'horizontal' });

  // derivados visuales
  const { visual: ubicaciones, cols: gridCols } = useMemo(
    () => makeVisualUbicaciones(rawUbicaciones, metaUbi),
    [rawUbicaciones, metaUbi]
  );

  // Paquetes por ubicación
  const [pkgsByUbiId, setPkgsByUbiId] = useState({}); // { ubicacion_id: [paquetes] }

  // Colores compañías
  const [coloresCompania, setColoresCompania] = useState(() => new Map());
  const getCompColor = (name) => normHex(coloresCompania.get(name), "#2563eb");

  // UI
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [soloConPkgs, setSoloConPkgs] = useState(false);
  const [openSet, setOpenSet] = useState(() => new Set());

  // Privacidad
  const [revealAll, setRevealAll] = useState(false);
  const [revealedSet, setRevealedSet] = useState(() => new Set());

  // Token y scale
  const [authToken, setAuthToken] = useState("");
  const wrapRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [fluid, setFluid] = useState(false);

  /* =============== Carga =============== */
  useEffect(() => {
    let cancel = false;
    (async () => {
      setCargando(true);
      setError(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("No hay sesión activa.");
        setAuthToken(token);
        const tenantId = await getTenantIdOrThrow();

        // 1) Ubicaciones + meta
        const { ubicaciones: ubis = [], meta = {} } = await cargarUbicaciones(token, tenantId);
        if (cancel) return;
        setRawUbicaciones(ubis || []);
        setMetaUbi({ cols: meta?.cols ?? 5, order: meta?.order ?? meta?.orden ?? 'horizontal' });

        // 2) Paquetes normalizados
        const paquetes = await obtenerPaquetesBackend(token).catch(() => []);
        if (cancel) return;

        // 3) Colores compañías
        const { data: empresasRows } = await supabase
          .from("empresas_transporte_tenant")
          .select("nombre,color")
          .eq("tenant_id", tenantId);
        const colMap = new Map();
        (empresasRows || []).forEach(e => colMap.set(e?.nombre, normHex(e?.color || "#2563eb")));
        setColoresCompania(colMap);

        // 4) Indexación paquetes a ubicaciones (id o label)
        const ubisVisual = makeVisualUbicaciones(ubis || [], meta || {}).visual;
        const byId = new Map(ubisVisual.map(u => [String(u.id), u]));
        const byLabel = new Map(ubisVisual.map(u => [String(u.label).toUpperCase(), u]));
        const buckets = {};
        for (const p of (paquetes || [])) {
          if (!isPending(p)) continue;
          const idRaw = p?.ubicacion_id ?? p?.balda_id ?? null;
          const labelRaw = (p?.ubicacion_label ?? p?.compartimento ?? p?.baldas?.codigo ?? "").toUpperCase();
          let u = null;
          if (idRaw != null && byId.has(String(idRaw))) u = byId.get(String(idRaw));
          else if (labelRaw && byLabel.has(labelRaw)) u = byLabel.get(labelRaw);
          if (!u) continue;
          (buckets[u.id] ||= []).push({
            id: p.id,
            nombre_cliente: p.nombre_cliente ?? "",
            empresa_transporte: p.empresa_transporte ?? p.compania ?? "",
            fecha_llegada: p.fecha_llegada ?? p.created_at ?? null,
          });
        }
        if (cancel) return;
        setPkgsByUbiId(buckets);
      } catch (e) {
        console.error("[VerEstantes] Error:", e);
        if (!cancel) setError(e?.message || "No se pudo cargar la vista de ubicaciones");
      } finally {
        if (!cancel) setCargando(false);
      }
    })();

    return () => { cancel = true; };
  }, []);

  /* =============== Escalado responsive =============== */
  const recomputeScale = () => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const cols = gridCols || 1;
    const contentW = cols * CELL_W + (cols - 1) * GAP_PX;
    const avail = wrap.clientWidth - 2;
    const s = Math.min(1, Math.max(MIN_SCALE, avail / contentW));
    setScale(s);
  };
  useEffect(() => { recomputeScale(); }, [gridCols, ubicaciones.length]);
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth || document.documentElement.clientWidth || 0;
      setFluid(w <= FLUID_BREAK);
      recomputeScale();
    };
    onResize();
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(() => recomputeScale());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => { window.removeEventListener("resize", onResize); ro.disconnect(); };
  }, []);

  /* =============== Filtros/derivados =============== */
  const qLower = q.trim().toLowerCase();
  const visibleUbicaciones = useMemo(() => {
    return ubicaciones.filter(u => {
      const arr = pkgsByUbiId[u.id] || [];
      if (soloConPkgs && arr.length === 0) return false;
      if (!qLower) return true;
      const hitLabel = (u.label || "").toLowerCase().includes(qLower);
      const hitCli = arr.some(p => (p?.nombre_cliente || "").toLowerCase().includes(qLower));
      const hitComp = arr.some(p => (p?.empresa_transporte || "").toLowerCase().includes(qLower));
      return hitLabel || hitCli || hitComp;
    });
  }, [ubicaciones, pkgsByUbiId, qLower, soloConPkgs]);

  const toggleRevealAll = () => { setRevealAll(prev => !prev); setRevealedSet(new Set()); };
  const toggleRevealOne = (id) => {
    if (revealAll) return;
    setRevealedSet(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const clearQ = () => setQ("");

  const removeFromLocalState = (pkgId) => {
    setPkgsByUbiId(prev => {
      const next = { ...prev };
      for (const k of Object.keys(next)) next[k] = (next[k] || []).filter(p => p.id !== pkgId);
      return next;
    });
  };

  const onDeletePkg = async (pkgId) => {
    const ok = window.confirm("¿Eliminar este paquete? Esta acción no se puede deshacer.");
    if (!ok) return;
    try {
      await eliminarPaqueteBackend(pkgId, authToken);
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
        <h2><FaBoxes className="icono" /> Ubicaciones</h2>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
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
              placeholder="Buscar ubicación/cliente/compañía…"
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
              onClick={() => { const set = new Set(); visibleUbicaciones.forEach(u => set.add(u.id)); setOpenSet(set); }}
            >Expandir visibles</button>

            <button type="button" className="btn-ghost" onClick={() => setOpenSet(new Set())}>Contraer todas</button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      {cargando ? (
        <div className="skeleton"><div className="row" /><div className="row" /><div className="row" /></div>
      ) : error ? (
        <div className="estado-error" role="alert">{error}</div>
      ) : visibleUbicaciones.length === 0 ? (
        <div className="estado-vacio">No hay ubicaciones que coincidan con el filtro.</div>
      ) : (
        <div
          className={`fit-wrapper lanes-fit ${fluid ? "fluid" : ""}`}
          ref={wrapRef}
          style={{ ['--zoom']: fluid ? 1 : scale }}
        >
          <div
            className="lanes-matrix"
            ref={innerRef}
            style={
              fluid
                ? { gridTemplateColumns: `repeat(auto-fit, minmax(var(--lane-cell-w), 1fr))`, width: "auto" }
                : {
                    gridTemplateColumns: `repeat(${gridCols || 1}, var(--lane-cell-w))`,
                    width: `${(gridCols || 1) * CELL_W + ((gridCols || 1) - 1) * GAP_PX}px`
                  }
            }
            role="grid"
          >
            {visibleUbicaciones.map(u => {
              const arr = pkgsByUbiId[u.id] || [];
              const n = arr.length;
              const open = openSet.has(u.id);

              const carrierCounts = new Map();
              for (const p of arr) {
                const name = p?.empresa_transporte || p?.compania || "";
                if (!name) continue;
                carrierCounts.set(name, (carrierCounts.get(name) || 0) + 1);
              }
              const best = [...carrierCounts.entries()].sort((a,b)=>b[1]-a[1])[0];
              const carrierColor = best ? normHex(coloresCompania.get(best[0]), "#6b7280") : "#6b7280";
              const carrierTint  = hexToRgba(carrierColor, 0.14);
              const occClass = clsOcupacion(n);

              return (
                <div key={u.id} className={`lane-cell wrap ${open ? "activa" : ""}`} role="gridcell">
                  <button
                    type="button"
                    className={`lane-head ${occClass}`}
                    data-occ={occClass}
                    onClick={() => setOpenSet(prev => {
                      const nset = new Set(prev);
                      nset.has(u.id) ? nset.delete(u.id) : nset.add(u.id);
                      return nset;
                    })}
                    aria-expanded={open}
                    aria-controls={`vis-ubi-${u.id}`}
                    title={n === 1 ? "1 paquete" : `${n} paquetes`}
                    style={{
                      ['--carrier']: carrierColor,
                      ['--carrier-rgba']: carrierTint
                    }}
                  >
                    <i className="lane-tape" aria-hidden />
                    <div className="lane-title">{highlight(u.label, q)}</div>
                    <div className={`lane-qty ${n === 0 ? "zero" : "some"}`}><b>{n}</b><i>paquetes</i></div>
                    <FaChevronDown className={`chev ${open ? "rot" : ""}`} aria-hidden />
                  </button>

                  <div
                    id={`vis-ubi-${u.id}`}
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
                                <span className="pill">
                                  {p.fecha_llegada ? new Date(p.fecha_llegada).toLocaleDateString() : "—"}
                                </span>
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
                      <div className="sin-paquetes">Sin paquetes en esta ubicación.</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
