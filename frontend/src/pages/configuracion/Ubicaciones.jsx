import { useEffect, useMemo, useState } from "react";
import {
  MdLocationOn, MdAdd, MdRemove,
  MdSwapHoriz, MdSwapVert
} from "react-icons/md";
import "./Ubicaciones.scss";

/* ===== helpers ===== */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* Mapea POS -> IDX etiqueta según orientación seleccionada */
function buildPosToIdx(count, cols, orientation) {
  const n = Math.max(0, count | 0);
  const c = Math.max(1, cols | 0);
  if (orientation === "horizontal") return Array.from({ length: n }, (_, p) => p);

  const rows = Math.ceil(n / c);
  const orderPos = [];
  for (let col = 0; col < c; col++) {
    for (let row = 0; row < rows; row++) {
      const pos = row * c + col;
      if (pos < n) orderPos.push(pos);
    }
  }
  const posToIdx = Array(n).fill(0);
  orderPos.forEach((pos, idx) => { posToIdx[pos] = idx; });
  return posToIdx;
}

/**
 * Props:
 * - initial: [{ label:'B1', codigo:'B1', orden:0 }, ...]
 * - initialMeta: { cols:number, orden|'order': 'horizontal'|'vertical' }
 * - onChange: ({ ubicaciones:[{label,codigo,orden}], meta:{cols, order} }) => void
 * - tenantId (opcional, no se persiste aquí)
 * - locked: boolean  -> true si hay paquetes y no se puede cambiar la cantidad
 * - lockedCount: number -> nº de paquetes para el mensaje
 */
export default function Ubicaciones({
  initial = [],
  initialMeta = null,
  onChange,
  tenantId = null,            // eslint-disable-line no-unused-vars
  locked = false,
  lockedCount = 0,
}) {
  // Estado inicial a partir de props
  const [count, setCount] = useState(initial?.length ? initial.length : 25);
  const [cols, setCols] = useState(() => {
    const v = parseInt(initialMeta?.cols ?? 5, 10);
    return clamp(Number.isFinite(v) ? v : 5, 1, 12);
  });
  const [order, setOrder] = useState(
    (initialMeta?.orden || initialMeta?.order) === "vertical" ? "vertical" : "horizontal"
  );

  // Re-sincroniza si cambian props desde fuera (carga asíncrona)
  useEffect(() => {
    setCount(initial?.length ? initial.length : 25);
  }, [initial]);

  useEffect(() => {
    if (!initialMeta) return;
    const metaCols = clamp(parseInt(initialMeta.cols ?? cols, 10) || cols, 1, 12);
    const metaOrder = (initialMeta.orden || initialMeta.order) === "vertical" ? "vertical" : "horizontal";
    setCols(metaCols);
    setOrder(metaOrder);
  }, [initialMeta]);

  useEffect(() => { setCols(c => clamp(c, 1, 12)); }, []);

  const posToIdx = useMemo(() => buildPosToIdx(count, cols, order), [count, cols, order]);

  // Bloqueos
  const initialCount = initial?.length ?? 0;
  const cantidadCambiada = count !== initialCount;
  const stepperDisabled = locked;                // no permitimos variar cantidad si locked
  const cantidadBloqueada = locked && cantidadCambiada;

  // Emite cambios al padre cuando hay modificaciones (edición local)
  useEffect(() => {
    if (!onChange) return;

    // ⚠️ SIEMPRE enviamos {label, codigo, orden}
    const ubicaciones = Array.from({ length: count }, (_, pos) => {
      const idx = posToIdx[pos];
      const label = `B${idx + 1}`;
      return { label, codigo: label, orden: pos };
    });

    onChange({
      ubicaciones,
      meta: { cols, order }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, cols, order, posToIdx]);

  return (
    <div className="ub-simple">
      {/* Header */}
      <div className="ub-simple__header">
        <div className="ub-icn"><MdLocationOn/></div>
        <div className="ub-txt">
          <h3>Ubicaciones del almacén</h3>
          <p className="ub-sub">
            Define cuántas ubicaciones necesitas. Los nombres son automáticos:
            <strong> B1, B2, B3…</strong>
          </p>
        </div>
        {/* Botón de guardar eliminado (guardado global en la página) */}
      </div>

      {/* Aviso de bloqueo si hay paquetes */}
      {locked && (
        <div className="ub-lock-banner" role="alert" aria-live="polite">
          <strong>Edición limitada:</strong> Tienes <strong>{lockedCount}</strong> paquete{lockedCount===1?'':'s'} en el sistema.
          Mientras existan paquetes, <u>no puedes añadir ni eliminar</u> ubicaciones.
          Puedes ajustar solo la presentación (columnas / orden).
        </div>
      )}

      {/* Bloque central: Total */}
      <section className="ub-controls">
        <div className="control">
          <div className="label">Total de ubicaciones</div>
          <div className="stepper">
            <button
              className="btn-round minus"
              onClick={() => setCount(c => clamp(c - 1, 0, 5000))}
              aria-label="Restar una ubicación"
              disabled={stepperDisabled || count <= 0}
              title={stepperDisabled ? "Bloqueado mientras existan paquetes" : "Restar una ubicación"}
            >
              <MdRemove/>
            </button>

            <div className="counter">
              <input
                type="number"
                min={0}
                max={5000}
                value={count}
                onChange={e => setCount(clamp(parseInt(e.target.value || 0, 10), 0, 5000))}
                disabled={stepperDisabled}
                readOnly={stepperDisabled}
                title={stepperDisabled ? "Bloqueado mientras existan paquetes" : "Editar cantidad"}
              />
            </div>

            <button
              className="btn-round plus"
              onClick={() => setCount(c => clamp(c + 1, 0, 5000))}
              aria-label="Sumar una ubicación"
              disabled={stepperDisabled}
              title={stepperDisabled ? "Bloqueado mientras existan paquetes" : "Sumar una ubicación"}
            >
              <MdAdd/>
            </button>
          </div>
          {cantidadBloqueada && (
            <div className="hint error" role="status">
              No puedes cambiar la <strong>cantidad</strong> mientras existan paquetes.
            </div>
          )}
        </div>
      </section>

      {/* Grid: editor visual */}
      <section className="ub-grid">
        <div className="grid-head">
          <div className="section-title">
            <span>Vista en grid</span>
          </div>

          <div className="toolbar">
            <div className="group">
              <span className="lbl">Orden</span>
              <div className="seg-toggle" role="tablist" aria-label="Orientación">
                <button
                  role="tab"
                  aria-selected={order === "horizontal"}
                  className={`seg ${order === "horizontal" ? "is-active" : ""}`}
                  onClick={() => setOrder("horizontal")}
                  title="Fila por fila (Horizontal)"
                >
                  <MdSwapHoriz className="i"/><span>Horizontal</span>
                </button>
                <button
                  role="tab"
                  aria-selected={order === "vertical"}
                  className={`seg ${order === "vertical" ? "is-active" : ""}`}
                  onClick={() => setOrder("vertical")}
                  title="Columna por columna (Vertical)"
                >
                  <MdSwapVert className="i"/><span>Vertical</span>
                </button>
              </div>
            </div>

            <div className="group">
              <span className="lbl">Columnas</span>
              <div className="col-stepper">
                <button
                  className="mini"
                  onClick={() => setCols(c => clamp(c - 1, 1, 12))}
                  aria-label="Menos columnas"
                >
                  <MdRemove/>
                </button>
                <span className="val">{cols}</span>
                <button
                  className="mini"
                  onClick={() => setCols(c => clamp(c + 1, 1, 12))}
                  aria-label="Más columnas"
                >
                  <MdAdd/>
                </button>
              </div>
              <span className="hint">Sólo visual</span>
            </div>
          </div>
        </div>

        {/* ⚠️ En móvil, esta envoltura permite scroll horizontal suave sin desbordes */}
        <div className="grid-scroller" role="region" aria-label="Vista de ubicaciones scrolleable">
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(130px, 1fr))` }}
          >
            {Array.from({ length: count }, (_, pos) => {
              const idx = posToIdx[pos];
              const code = `B${idx + 1}`;
              return (
                <div key={`cell-${pos}`} className="cell" title={code}>
                  <div className="pill">{code}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="ub-footer">
        <strong>{count}</strong>&nbsp;ubicaciones definidas
      </footer>
    </div>
  );
}
