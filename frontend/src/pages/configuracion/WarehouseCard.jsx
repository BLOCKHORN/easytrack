import { useMemo, useState, useRef, useLayoutEffect } from "react";
import { MdAdd, MdRemove, MdInfo, MdWarehouse } from "react-icons/md";
import "./WarehouseCard.scss";

/* ---------- Helpers ---------- */
const numToAlpha = (num) => {
  let s = "", n = num;
  if (!Number.isFinite(n) || n < 1) return "";
  while (n > 0) {
    const c = (n - 1) % 26;
    s = String.fromCharCode(65 + c) + s; // SIEMPRE MAYÚS
    n = Math.floor((n - 1) / 26);
  }
  return s;
};
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/* Paleta ampliada + nombres ES (carriles) */
const LANE_COLORS = [
  "#3b82f6","#6366f1","#8b5cf6","#a855f7",
  "#d946ef","#ec4899","#f43f5e","#ef4444",
  "#f97316","#f59e0b","#eab308","#84cc16",
  "#22c55e","#10b981","#14b8a6","#06b6d4",
  "#0ea5e9","#64748b","#71717a","#78716c"
];
const COLOR_NAME = {
  "#3b82f6":"Azul","#6366f1":"Índigo","#8b5cf6":"Violeta","#a855f7":"Morado",
  "#d946ef":"Fucsia","#ec4899":"Rosa","#f43f5e":"Rosa fuerte","#ef4444":"Rojo",
  "#f97316":"Naranja","#f59e0b":"Ámbar","#eab308":"Amarillo","#84cc16":"Lima",
  "#22c55e":"Verde","#10b981":"Esmeralda","#14b8a6":"Turquesa","#06b6d4":"Cian",
  "#0ea5e9":"Celeste","#64748b":"Gris azulado","#71717a":"Gris","#78716c":"Piedra"
};
const DEFAULT_LANE_COLOR = "#f59e0b";
const DEFAULT_SHELVES = 3;

/* Construye rejilla de carriles preservando pos/color previos */
function buildLanes(rows, cols, prev = []) {
  const byKey = new Map();
  prev.forEach(e => { if (e.pos) byKey.set(`${e.pos.r}-${e.pos.c}`, e); });
  const out = [];
  let counter = 1;
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const k = `${r}-${c}`;
      const keep = byKey.get(k);
      if (keep) out.push({ ...keep, estante: counter++, pos: { r, c } });
      else out.push({ estante: counter++, color: DEFAULT_LANE_COLOR, pos: { r, c } });
    }
  }
  return out;
}

/* Construye rejilla de estantes preservando pos/baldas/alias/nombres previos */
function buildRacks(rows, cols, prev = []) {
  const byKey = new Map();
  prev.forEach(e => { if (e.pos) byKey.set(`${e.pos.r}-${e.pos.c}`, e); });
  const out = [];
  let counter = 1;
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const k = `${r}-${c}`;
      const keep = byKey.get(k);
      if (keep) {
        const baldas = Math.max(1, keep.baldas || DEFAULT_SHELVES);
        const arr = Array.isArray(keep.shelf_names) ? keep.shelf_names.slice(0, baldas) : [];
        while (arr.length < baldas) arr.push("");
        out.push({
          ...keep,
          estante: counter++,
          pos: { r, c },
          baldas,
          alias: keep.alias || "",
          shelf_names: arr
        });
      } else {
        out.push({
          estante: counter++,
          pos: { r, c },
          baldas: DEFAULT_SHELVES,
          alias: "",
          shelf_names: Array(DEFAULT_SHELVES).fill("")
        });
      }
    }
  }
  return out;
}

export default function WarehouseCard({
  estructura,
  setEstructura,
  nomenclatura,
  setNomenclatura,
  modeLocked = false,     // bloqueo de alternar modo si hay paquetes pendientes
  lockInfo = null,        // { pending: number } opcional, copy en UI
}) {
  /* ---------- Config ---------- */
  const N = {
    layout_mode: nomenclatura?.layout_mode ?? "lanes",   // 'racks' | 'lanes'
    // Estantes
    rack_rows : nomenclatura?.rack_rows ?? 2,
    rack_cols : nomenclatura?.rack_cols ?? 3,
    col_scheme : nomenclatura?.col_scheme ?? "alpha",   // 'alpha' | 'numeric'
    // Carriles
    lanes_rows: nomenclatura?.lanes_rows ?? 3,
    lanes_cols: nomenclatura?.lanes_cols ?? 3,
    lane_name_scheme: nomenclatura?.lane_name_scheme ?? "numeric", // 'alpha' | 'numeric' | 'color'
    lane_name_case  : nomenclatura?.lane_name_case ?? "upper",
  };
  const isRacks = N.layout_mode === "racks";
  const isLanes = !isRacks;

  const patchNom = (p) => setNomenclatura?.((prev) => ({ ...(prev || {}), ...p }));
  const renumerar = (arr) => arr.map((it, idx) => ({ ...it, estante: idx + 1 }));

  /* ===== setters funcionales para evitar estado obsoleto ===== */
  const updateRackAndNormalize = (rackId, mutator) => {
    setEstructura(prev => {
      const next = prev.map(e => {
        if (e.estante !== rackId) return e;
        const changed = mutator({ ...e });
        const baldas = Math.max(1, parseInt(changed.baldas) || 1);
        let shelf_names = Array.isArray(changed.shelf_names) ? changed.shelf_names.slice(0, baldas) : [];
        while (shelf_names.length < baldas) shelf_names.push("");
        return { ...changed, baldas, shelf_names };
      });
      return renumerar(next);
    });
  };

  const updateLane = (laneId, changes) => {
    setEstructura(prev => renumerar(prev.map(e => e.estante === laneId ? { ...e, ...changes } : e)));
  };

  const setStructReplace = (arr) => setEstructura(renumerar(arr));

  const unitLabel  = isRacks ? "Estante" : "Carril";

  /* ---------- Cambios de rejilla (solo interacción usuario) ---------- */
  const applyRacksGrid = (rows, cols) => {
    setStructReplace(buildRacks(rows, cols, estructura));
  };
  const applyLanesGrid = (rows, cols) => {
    setStructReplace(buildLanes(rows, cols, estructura));
  };

  const decRackRows = () => { const r = clamp((N.rack_rows||1)-1,1,20); patchNom({ rack_rows:r }); applyRacksGrid(r, N.rack_cols); };
  const incRackRows = () => { const r = clamp((N.rack_rows||1)+1,1,20); patchNom({ rack_rows:r }); applyRacksGrid(r, N.rack_cols); };
  const decRackCols = () => { const c = clamp((N.rack_cols||1)-1,1,20); patchNom({ rack_cols:c }); applyRacksGrid(N.rack_rows, c); };
  const incRackCols = () => { const c = clamp((N.rack_cols||1)+1,1,20); patchNom({ rack_cols:c }); applyRacksGrid(N.rack_rows, c); };

  const decLaneRows = () => { const r = clamp((N.lanes_rows||1)-1,1,20); patchNom({ lanes_rows:r }); applyLanesGrid(r, N.lanes_cols); };
  const incLaneRows = () => { const r = clamp((N.lanes_rows||1)+1,1,20); patchNom({ lanes_rows:r }); applyLanesGrid(r, N.lanes_cols); };
  const decLaneCols = () => { const c = clamp((N.lanes_cols||1)-1,1,20); patchNom({ lanes_cols:c }); applyLanesGrid(N.lanes_rows, c); };
  const incLaneCols = () => { const c = clamp((N.lanes_cols||1)+1,1,20); patchNom({ lanes_cols:c }); applyLanesGrid(N.lanes_rows, c); };

  /* ---------- Cambio de modo ---------- */
  const switchMode = (nextMode) => {
    if (N.layout_mode === nextMode) return;
    if (modeLocked) return; // bloqueado por paquetes pendientes
    patchNom({ layout_mode: nextMode });
    if (nextMode === "racks") {
      const rows = clamp(N.rack_rows || 1, 1, 20);
      const cols = clamp(N.rack_cols || 1, 1, 20);
      setStructReplace(buildRacks(rows, cols, []));
    } else {
      const rows = clamp(N.lanes_rows || 1, 1, 20);
      const cols = clamp(N.lanes_cols || 1, 1, 20);
      setStructReplace(buildLanes(rows, cols, []));
    }
  };

  /* ---------- Renombrado manual (solo racks) ---------- */
  const [manualNaming, setManualNaming] = useState(false); // “Renombrar manualmente”

  const setRackAlias = (rackId, val) => updateRackAndNormalize(rackId, (e) => ({ ...e, alias: val || "" }));
  const setShelfName = (rackId, index0, val) =>
    updateRackAndNormalize(rackId, (e) => {
      const len = Math.max(1, e.baldas || 1);
      const arr = Array.isArray(e.shelf_names) ? e.shelf_names.slice(0, len) : [];
      while (arr.length < len) arr.push("");
      arr[index0] = val;
      return { ...e, shelf_names: arr };
    });

  /* ---------- Nombres ---------- */
  const rackLabel = (idx1, alias) => {
    if (manualNaming && alias) return alias;
    if (N.col_scheme === "numeric") return String(idx1);
    return numToAlpha(idx1) || String(idx1);
  };

  /* ===== Numeración global de baldas: B1, B2, B3… por todo el almacén ===== */
  const globalStartByRack = useMemo(() => {
    const sorted = [...estructura].sort((a,b) => a.estante - b.estante);
    let running = 1;
    const map = new Map();
    for (const r of sorted) {
      map.set(r.estante, running);
      running += Math.max(1, r.baldas || 1);
    }
    return map;
  }, [estructura]);

  const defaultShelfName = (rackId, shelfIdx1) => {
    const start = globalStartByRack.get(rackId) || 1;
    const num = start + (shelfIdx1 - 1);
    return `B${num}`;
  };

  const laneLabel = (lane) => {
    if (N.lane_name_scheme === "numeric") return String(lane.estante);
    if (N.lane_name_scheme === "alpha") {
      const a = numToAlpha(lane.estante);
      return (N.lane_name_case || "upper") === "lower" ? a.toLowerCase() : a;
    }
    const hex = (lane.color || DEFAULT_LANE_COLOR).toLowerCase();
    return COLOR_NAME[hex] || "Personalizado";
  };

  /* ---------- Colores (carriles) ---------- */
  const [paletteFor, setPaletteFor] = useState(null);
  const [recentColors, setRecentColors] = useState([]);
  const colorInputRef = useRef(null);
  const chooseColor = (laneId, hex) => {
    const h = String(hex || DEFAULT_LANE_COLOR).toLowerCase();
    updateLane(laneId, { color: h });
    setRecentColors(prev => [h, ...prev.filter(c => c !== h)].slice(0, 10));
    setPaletteFor(null);
  };

  /* ---------- Mapeo celda -> elemento ---------- */
  const byCell = useMemo(() => {
    const map = new Map();
    for (const e of estructura) {
      if (e.pos) map.set(`${e.pos.r}-${e.pos.c}`, e.estante);
    }
    return map;
  }, [estructura]);

  /* ---------- Auto-fit / Zoom ---------- */
  const vpRef = useRef(null);
  const [autoFit, setAutoFit] = useState(true);
  const [autoScale, setAutoScale] = useState(1);
  const [manualScale, setManualScale] = useState(1);

  const CELL_W_RACKS = 220; // px
  const CELL_W_LANES = 140; // px
  const GRID_GAP = 12;      // px
  const BOARD_PADDING_X = 24; // px

  const naturalWidth = useMemo(() => {
    const cols = isRacks ? N.rack_cols : N.lanes_cols;
    const cellW = isRacks ? CELL_W_RACKS : CELL_W_LANES;
    return (cols * cellW) + ((cols - 1) * GRID_GAP) + BOARD_PADDING_X;
  }, [isRacks, N.rack_cols, N.lanes_cols]);

  useLayoutEffect(() => {
    if (!autoFit) return;
    const el = vpRef.current;
    if (!el) return;

    const measure = () => {
      const available = Math.max(0, el.clientWidth - 2);
      const s = available > 0 ? Math.min(1, available / naturalWidth) : 1;
      setAutoScale(Math.max(0.5, Math.round(s * 100) / 100));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [autoFit, naturalWidth]);

  const currentScale = autoFit ? autoScale : manualScale;

  /* ---------- Render ---------- */
  return (
    <div className="card warehouse-card" aria-labelledby="warehouse-title">
      {/* Header */}
      <div className="card__header warehouse-card__header">
        <div className="wh-badge" aria-hidden="true"><MdWarehouse/></div>
        <div className="wh-headtext">
          <h3 id="warehouse-title" className="wh-title">Diseño del almacén</h3>
          <p className="wh-subtitle">Vista superior. Doble clic para renombrar cuando el modo manual esté activo.</p>
        </div>
      </div>

      {/* ---- MODO ---- */}
      <div className="mode-banner" role="tablist" aria-label="Seleccionar modo">
        <div className="mode-pills">
          <button
            role="tab"
            aria-selected={isRacks}
            aria-disabled={modeLocked}
            className={`mode-pill ${isRacks?"is-active":""}`}
            onClick={()=>switchMode("racks")}
            disabled={modeLocked}
            title={modeLocked ? "Bloqueado: hay paquetes pendientes." : "Cambiar a Estantes"}
          >Estantes</button>

          <button
            role="tab"
            aria-selected={isLanes}
            aria-disabled={modeLocked}
            className={`mode-pill ${isLanes?"is-active":""}`}
            onClick={()=>switchMode("lanes")}
            disabled={modeLocked}
            title={modeLocked ? "Bloqueado: hay paquetes pendientes." : "Cambiar a Carriles"}
          >Carriles</button>
        </div>

        <div className="mode-actions">
          <span className="mode-status">
            Modo activo: <strong>{isLanes ? "Carriles" : "Estantes"}</strong>
            {modeLocked && !!lockInfo?.pending && (
              <em style={{marginLeft:8, opacity:.8}}> · bloqueo por {lockInfo.pending} paquete(s) pendientes</em>
            )}
          </span>
        </div>
      </div>

      <div className="card-body warehouse-card__body">
        {/* -------- Toolbar -------- */}
        <div className="wh-toolbar">
          {isRacks ? (
            <>
              <div className="tool-col">
                <div className="tool-title">Rejilla de estantes (filas × columnas)</div>
                <div className="grid-stepper">
                  <div className="step">
                    <span>Filas</span>
                    <div className="stepper">
                      <button onClick={()=>{ decRackRows(); }}>−</button>
                      <span>{N.rack_rows}</span>
                      <button onClick={()=>{ incRackRows(); }}>+</button>
                    </div>
                  </div>
                  <div className="step">
                    <span>Columnas</span>
                    <div className="stepper">
                      <button onClick={()=>{ decRackCols(); }}>−</button>
                      <span>{N.rack_cols}</span>
                      <button onClick={()=>{ incRackCols(); }}>+</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="tool-col">
                <div className="tool-title">Nombre de estante</div>
                <div className="seg-row">
                  <button className={`seg ${N.col_scheme==="alpha"?"is-active":""}`}  onClick={() => patchNom({ col_scheme:"alpha" })}>Letras</button>
                  <button className={`seg ${N.col_scheme==="numeric"?"is-active":""}`} onClick={() => patchNom({ col_scheme:"numeric" })}>Números</button>
                </div>
              </div>

              <div className="tool-col">
                <div className="tool-title">Renombrado</div>
                <div className="seg-row">
                  <button className={`seg ${manualNaming ? "is-active":""}`} onClick={()=>setManualNaming(v=>!v)}>
                    Renombrar manualmente
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="tool-col">
                <div className="tool-title">Rejilla (filas × columnas)</div>
                <div className="grid-stepper">
                  <div className="step">
                    <span>Filas</span>
                    <div className="stepper">
                      <button onClick={decLaneRows}>−</button>
                      <span>{N.lanes_rows}</span>
                      <button onClick={incLaneRows}>+</button>
                    </div>
                  </div>
                  <div className="step">
                    <span>Columnas</span>
                    <div className="stepper">
                      <button onClick={decLaneCols}>−</button>
                      <span>{N.lanes_cols}</span>
                      <button onClick={incLaneCols}>+</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="tool-col">
                <div className="tool-title">Nombre de carril</div>
                <div className="seg-row">
                  <button className={`seg ${N.lane_name_scheme==="alpha"?"is-active":""}`}  onClick={() => patchNom({ lane_name_scheme:"alpha" })}>Letras</button>
                  <button className={`seg ${N.lane_name_scheme==="numeric"?"is-active":""}`} onClick={() => patchNom({ lane_name_scheme:"numeric" })}>Números</button>
                  <button className={`seg ${N.lane_name_scheme==="color"?"is-active":""}`}   onClick={() => patchNom({ lane_name_scheme:"color" })}>Color</button>
                </div>
              </div>
            </>
          )}

          {/* ---- Zoom / Auto-fit ---- */}
          <div className="tool-col tool-zoom">
            <div className="tool-title">Vista</div>
            <label className="chk-inline">
              <input
                type="checkbox"
                checked={autoFit}
                onChange={(e)=>setAutoFit(e.target.checked)}
              />
              Ajuste automático
            </label>

            <div className="zoom-row">
              <button
                className="iconbtn"
                onClick={()=> setManualScale(s => clamp(Math.round((s - 0.05)*20)/20, 0.5, 1.2))}
                disabled={autoFit}
                title="Zoom -"
              >
                <MdRemove/>
              </button>
              <input
                type="range"
                min={50}
                max={120}
                step={5}
                value={Math.round((autoFit ? currentScale : manualScale) * 100)}
                onChange={(e)=> setManualScale(clamp(+e.target.value / 100, 0.5, 1.2))}
                disabled={autoFit}
                aria-label="Zoom"
              />
              <button
                className="iconbtn"
                onClick={()=> setManualScale(s => clamp(Math.round((s + 0.05)*20)/20, 0.5, 1.2))}
                disabled={autoFit}
                title="Zoom +"
              >
                <MdAdd/>
              </button>
              <span className="zoom-val">{Math.round(currentScale * 100)}%</span>
            </div>
          </div>

          <div className="tool-spacer" />
        </div>

        {/* -------- VIEWPORT + LAYOUT -------- */}
        <div className="boardViewport" ref={vpRef}>
          <div
            className="boardScale"
            style={{ transform: `scale(${currentScale})` }}
          >
            {isRacks ? (
              <div
                className="racksBoard"
                style={{
                  width: `${naturalWidth}px`,
                  gridTemplateColumns: `repeat(${N.rack_cols}, minmax(220px, 1fr))`,
                  gridTemplateRows: `repeat(${N.rack_rows}, auto)`
                }}
              >
                {Array.from({ length: N.rack_rows }).flatMap((_, rIdx) =>
                  Array.from({ length: N.rack_cols }).map((_, cIdx) => {
                    const r = rIdx + 1;
                    const c = cIdx + 1;
                    const id = byCell.get(`${r}-${c}`);
                    const rack = id ? estructura.find(e => e.estante === id) : null;
                    if (!rack) return <div key={`rackcell-${r}-${c}`} className="cell" />;

                    const header = rackLabel(rack.estante, rack.alias);
                    const shelves = Math.max(1, rack.baldas || 1);

                    return (
                      <div key={`rackcell-${r}-${c}`} className="cell">
                        <section className="rackCard">
                          <header
                            className="rackHead"
                            title={manualNaming ? "Doble clic para renombrar" : "Activa renombrado manual para editar"}
                          >
                            {manualNaming ? (
                              <button
                                className="rackHead__name"
                                onDoubleClick={()=>{
                                  const v = prompt("Nombre del estante", rack.alias || header) ?? "";
                                  const trimmed = v.trim();
                                  if (trimmed !== (rack.alias || "")) {
                                    setRackAlias(rack.estante, trimmed);
                                  }
                                }}
                              >
                                Estante {rack.alias || header}
                              </button>
                            ) : (
                              <span className="rackHead__name rackHead__name--static">Estante {header}</span>
                            )}

                            <div className="shelfOps">
                              <button
                                className="iconbtn"
                                onClick={()=>{
                                  updateRackAndNormalize(rack.estante, (e)=>({ ...e, baldas: Math.max(1, (e.baldas||1)-1) }));
                                }}
                                title="Quitar balda"
                              ><MdRemove/></button>

                              <span className="shelf-pill">{shelves}</span>

                              <button
                                className="iconbtn"
                                onClick={()=>{
                                  updateRackAndNormalize(rack.estante, (e)=>({ ...e, baldas: (e.baldas||1)+1 }));
                                }}
                                title="Añadir balda"
                              ><MdAdd/></button>
                            </div>
                          </header>

                          <div className="rackBody">
                            {Array.from({ length: shelves }).map((_, j) => {
                              const idx1 = j + 1;
                              const auto = defaultShelfName(rack.estante, idx1);
                              const manualValue = Array.isArray(rack.shelf_names) ? (rack.shelf_names[j] || "") : "";

                              return (
                                <div key={idx1} className="rackSlot">
                                  <input
                                    className="slotInput"
                                    readOnly={!manualNaming}
                                    placeholder={auto}
                                    value={manualNaming ? manualValue : ""}
                                    onChange={(e)=> setShelfName(rack.estante, j, e.target.value)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <>
                <div
                  className="lanesBoard"
                  style={{
                    width: `${naturalWidth}px`,
                    gridTemplateColumns: `repeat(${N.lanes_cols}, minmax(140px, 1fr))`,
                    gridTemplateRows: `repeat(${N.lanes_rows}, 96px)`
                  }}
                >
                  {Array.from({ length: N.lanes_rows }).flatMap((_, rIdx) =>
                    Array.from({ length: N.lanes_cols }).map((_, cIdx) => {
                      const r = rIdx + 1;
                      const c = cIdx + 1;
                      const id = byCell.get(`${r}-${c}`);
                      const lane = id ? estructura.find(e => e.estante === id) : null;

                      return (
                        <div key={`cell-${r}-${c}`} className="cell">
                          {lane && (
                            <div className="laneCard" style={{ ["--tape"]: lane.color || DEFAULT_LANE_COLOR }}>
                              <div className="laneRow">
                                <span className="laneName">Carril {laneLabel(lane)}</span>

                                {/* Color swatch + popover */}
                                <button
                                  className="laneSwatch"
                                  style={{ background: lane.color || DEFAULT_LANE_COLOR }}
                                  onClick={(e)=>{ e.stopPropagation(); setPaletteFor(paletteFor===lane.estante?null:lane.estante); }}
                                  aria-label="Cambiar color" title="Cambiar color"
                                />
                                {paletteFor === lane.estante && (
                                  <div className="lanePalette" onMouseLeave={()=>setPaletteFor(null)}>
                                    {recentColors.length > 0 && (
                                      <>
                                        <div className="palette-title">Recientes</div>
                                        <div className="palette-row">
                                          {recentColors.map(c => (
                                            <button key={`r-${c}`} className="chip-color" style={{ background:c }}
                                                    onClick={()=>chooseColor(lane.estante, c)} title={c}/>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                    <div className="palette-title">Paleta</div>
                                    <div className="palette-grid">
                                      {LANE_COLORS.map(c => (
                                        <button key={c}
                                          className={`chip-color ${ (lane.color||DEFAULT_LANE_COLOR)===c ? "is-active":""}`}
                                          style={{ background:c }}
                                          onClick={()=>chooseColor(lane.estante, c)}
                                          title={COLOR_NAME[c] || c}
                                        />
                                      ))}
                                    </div>
                                    <div className="palette-actions">
                                      <button className="btn btn--ghost btn--xs" onClick={()=>colorInputRef.current?.click()}>
                                        Personalizar…
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Color picker nativo (oculto) */}
                <input
                  ref={colorInputRef}
                  type="color"
                  defaultValue={DEFAULT_LANE_COLOR}
                  style={{ display:"none" }}
                  onChange={(e)=>{ if (paletteFor) chooseColor(paletteFor, e.target.value); }}
                />
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="wh-footerbar">
          <div className="wh-stats">
            <strong>{estructura.length}</strong> {unitLabel.toLowerCase()}s
            {isRacks && <> · <strong>{estructura.reduce((s, e) => s + (parseInt(e.baldas, 10) || 0), 0)}</strong> baldas</>}
          </div>
          <div className="wh-hint">
            <MdInfo/>&nbsp;
            {isLanes
              ? "Cada celda es un carril. Clic en el punto para cambiar su color."
              : (manualNaming
                ? "Renombra estantes y baldas libremente. Se guarda al escribir."
                : "Nombres automáticos: B1, B2… Activa «Renombrar manualmente» para editar."
              )
            }
          </div>
        </div>
      </div>
    </div>
  );
}
