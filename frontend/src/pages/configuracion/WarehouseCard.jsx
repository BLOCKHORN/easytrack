// src/pages/configuracion/WarehouseCard.jsx
import { useMemo, useState, useRef } from "react";
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

/* Construye rejilla de estantes preservando pos/baldas previos */
function buildRacks(rows, cols, prev = []) {
  const byKey = new Map();
  prev.forEach(e => { if (e.pos) byKey.set(`${e.pos.r}-${e.pos.c}`, e); });
  const out = [];
  let counter = 1;
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const k = `${r}-${c}`;
      const keep = byKey.get(k);
      if (keep) out.push({ ...keep, estante: counter++, pos: { r, c }, baldas: Math.max(1, keep.baldas || DEFAULT_SHELVES) });
      else out.push({ estante: counter++, pos: { r, c }, baldas: DEFAULT_SHELVES });
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

  // Para distinguir cambios locales en los steppers (evita auto-resets)
  const localChangeRef = useRef(false);

  const patchNom = (p) => {
    localChangeRef.current = true;
    setNomenclatura?.((prev) => ({ ...(prev || {}), ...p }));
    // Se vuelve a false al final de cada handler
  };

  const renumerar = (arr) => arr.map((it, idx) => ({ ...it, estante: idx + 1 }));
  const setStruct  = (arr) => setEstructura(renumerar(arr));
  const unitLabel  = isRacks ? "Estante" : "Carril";

  /* ---------- Cambios de rejilla (sólo por interacción del usuario) ---------- */
  const applyRacksGrid = (rows, cols) => {
    setStruct(buildRacks(rows, cols, estructura));
  };
  const applyLanesGrid = (rows, cols) => {
    setStruct(buildLanes(rows, cols, estructura));
  };

  const decRackRows = () => { const r = clamp((N.rack_rows||1)-1,1,20); patchNom({ rack_rows:r }); applyRacksGrid(r, N.rack_cols); localChangeRef.current=false; };
  const incRackRows = () => { const r = clamp((N.rack_rows||1)+1,1,20); patchNom({ rack_rows:r }); applyRacksGrid(r, N.rack_cols); localChangeRef.current=false; };
  const decRackCols = () => { const c = clamp((N.rack_cols||1)-1,1,20); patchNom({ rack_cols:c }); applyRacksGrid(N.rack_rows, c); localChangeRef.current=false; };
  const incRackCols = () => { const c = clamp((N.rack_cols||1)+1,1,20); patchNom({ rack_cols:c }); applyRacksGrid(N.rack_rows, c); localChangeRef.current=false; };

  const decLaneRows = () => { const r = clamp((N.lanes_rows||1)-1,1,20); patchNom({ lanes_rows:r }); applyLanesGrid(r, N.lanes_cols); localChangeRef.current=false; };
  const incLaneRows = () => { const r = clamp((N.lanes_rows||1)+1,1,20); patchNom({ lanes_rows:r }); applyLanesGrid(r, N.lanes_cols); localChangeRef.current=false; };
  const decLaneCols = () => { const c = clamp((N.lanes_cols||1)-1,1,20); patchNom({ lanes_cols:c }); applyLanesGrid(N.lanes_rows, c); localChangeRef.current=false; };
  const incLaneCols = () => { const c = clamp((N.lanes_cols||1)+1,1,20); patchNom({ lanes_cols:c }); applyLanesGrid(N.lanes_rows, c); localChangeRef.current=false; };

  /* ---------- Cambio de modo ---------- */
  const switchMode = (nextMode) => {
    if (N.layout_mode === nextMode) return;
    if (modeLocked) return; // bloqueado por paquetes pendientes
    patchNom({ layout_mode: nextMode });
    if (nextMode === "racks") {
      const rows = clamp(N.rack_rows || 1, 1, 20);
      const cols = clamp(N.rack_cols || 1, 1, 20);
      setStruct(buildRacks(rows, cols, []));
    } else {
      const rows = clamp(N.lanes_rows || 1, 1, 20);
      const cols = clamp(N.lanes_cols || 1, 1, 20);
      setStruct(buildLanes(rows, cols, []));
    }
    localChangeRef.current = false;
  };

  /* ---------- Renombrado manual (solo racks) ---------- */
  const [manualNaming, setManualNaming] = useState(false); // “Renombrar manualmente”
  const [rackAlias, setRackAlias] = useState({});          // { [rackId]: "texto" }
  const [shelfNames, setShelfNames] = useState({});        // { [rackId]: ["", "", ...] }

  // Asegura arrays de baldas sincronizados con estructura (sólo al editar)
  const ensureShelfArrays = () => {
    setShelfNames(prev => {
      const next = { ...prev };
      for (const r of estructura) {
        const len = Math.max(1, r.baldas || 1);
        const cur = next[r.estante] || [];
        if (cur.length !== len) {
          const grown = [...cur]; grown.length = len;
          for (let i=0;i<len;i++) if (grown[i] === undefined) grown[i] = "";
          next[r.estante] = grown;
        }
      }
      const valid = new Set(estructura.map(e=>e.estante));
      Object.keys(next).forEach(k => { if (!valid.has(+k)) delete next[k]; });
      return next;
    });
  };

  /* ---------- Nombres ---------- */
  const rackLabel = (idx1) => {
    const alias = rackAlias[idx1];
    if (manualNaming && alias) return alias;
    if (N.col_scheme === "numeric") return String(idx1);
    return numToAlpha(idx1) || String(idx1);
  };

  const laneLabel = (lane) => {
    const alias = rackAlias[lane.estante]; // reutilizado
    if (manualNaming && alias) return alias;
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
    setStruct(estructura.map(e => e.estante === laneId ? { ...e, color: h } : e));
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
                      <button onClick={()=>{ decRackRows(); ensureShelfArrays(); }}>−</button>
                      <span>{N.rack_rows}</span>
                      <button onClick={()=>{ incRackRows(); ensureShelfArrays(); }}>+</button>
                    </div>
                  </div>
                  <div className="step">
                    <span>Columnas</span>
                    <div className="stepper">
                      <button onClick={()=>{ decRackCols(); ensureShelfArrays(); }}>−</button>
                      <span>{N.rack_cols}</span>
                      <button onClick={()=>{ incRackCols(); ensureShelfArrays(); }}>+</button>
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

          <div className="tool-spacer" />
        </div>

        {/* -------- LAYOUT -------- */}
        {isRacks ? (
          <div
            className="racksBoard"
            style={{
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

                const label = rackLabel(rack.estante);
                const shelves = Math.max(1, rack.baldas || 1);

                return (
                  <div key={`rackcell-${r}-${c}`} className="cell">
                    <section className="rackCard">
                      <header className="rackHead" title={manualNaming ? "Doble clic para renombrar" : "Activa renombrado manual para editar"}>
                        {manualNaming ? (
                          <button
                            className="rackHead__name"
                            onDoubleClick={()=>{
                              const v = prompt("Nombre del estante", rackAlias[rack.estante] ?? label) ?? "";
                              const trimmed = v.trim();
                              if (trimmed !== (rackAlias[rack.estante] ?? "")) {
                                setRackAlias(p=>({ ...p, [rack.estante]: trimmed }));
                              }
                            }}
                          >
                            Estante {rackAlias[rack.estante] ?? label}
                          </button>
                        ) : (
                          <span className="rackHead__name rackHead__name--static">Estante {label}</span>
                        )}

                        <div className="shelfOps">
                          <button className="iconbtn" onClick={()=>{
                            setStruct(estructura.map(e=> e.estante===rack.estante ? { ...e, baldas: Math.max(1, (e.baldas||1)-1) } : e));
                            ensureShelfArrays();
                          }} title="Quitar balda"><MdRemove/></button>

                          <span className="shelf-pill">{shelves}</span>

                          <button className="iconbtn" onClick={()=>{
                            setStruct(estructura.map(e=> e.estante===rack.estante ? { ...e, baldas: (e.baldas||1)+1 } : e));
                            ensureShelfArrays();
                          }} title="Añadir balda"><MdAdd/></button>
                        </div>
                      </header>

                      <div className="rackBody">
                        {Array.from({ length: shelves }).map((_, j) => {
                          const idx1 = j + 1;
                          const auto =
                            N.col_scheme === "alpha"
                              ? `${label}${idx1}`         // B1, B2…
                              : `${label}-${idx1}`;        // 2-1, 2-2…
                          const manualValue = (shelfNames[rack.estante] || [])[j] ?? "";

                          return (
                            <div key={idx1} className="rackSlot">
                              <input
                                className="slotInput"
                                readOnly={!manualNaming}
                                placeholder={manualNaming ? "Escribe un nombre…" : auto}
                                value={manualNaming ? manualValue : ""}
                                onChange={(e)=>{
                                  const val = e.target.value;
                                  setShelfNames(prev => {
                                    const arr = [...(prev[rack.estante] || [])];
                                    arr[j] = val;
                                    return { ...prev, [rack.estante]: arr };
                                  });
                                }}
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
                : "Nombres automáticos. Activa «Renombrar manualmente» para editar."
              )
            }
          </div>
        </div>
      </div>
    </div>
  );
}
