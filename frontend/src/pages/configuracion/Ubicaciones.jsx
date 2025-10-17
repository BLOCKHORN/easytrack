import { useEffect, useMemo, useRef, useState } from "react";
import {
  MdLocationOn, MdAdd, MdRemove,
  MdSwapHoriz, MdSwapVert, MdWarning, MdClose
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
 * - onChange: ({ ubicaciones:[{label,codigo,orden}], meta:{cols, order}, deletions?:string[], forceDeletePackages?:boolean }) => void
 * - tenantId (opcional)
 * - lockedCount: number -> nº de paquetes (solo info)
 * - usageByCodigo: { [codigo:string]: number }
 * - fetchPackagesByLabels: async (tenantId, labels:string[]) => [{ id, nombre_cliente, ubicacion_label }]
 */
export default function Ubicaciones({
  initial = [],
  initialMeta = null,
  onChange,
  tenantId = null,
  lockedCount = 0,
  usageByCodigo = {},
  fetchPackagesByLabels = null,
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

  // Registro de eliminaciones y fuerza para el backend
  const deletionsRef = useRef([]);
  const forceRef = useRef(false);

  // Modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [modalData, setModalData] = useState(null); // { nextCount, toRemove:[], usados:[], detallePorUbi:[], totalPaquetes }

  // Aviso inline después de marcar eliminación
  const [inlineOk, setInlineOk] = useState(null); // string | null

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

  // Emite cambios al padre cuando hay modificaciones
  useEffect(() => {
    if (!onChange) return;

    const ubicaciones = Array.from({ length: count }, (_, pos) => {
      const idx = posToIdx[pos];
      const label = `B${idx + 1}`;
      return { label, codigo: label, orden: pos };
    });

    const payload = { ubicaciones, meta: { cols, order } };
    if (deletionsRef.current.length) payload.deletions = deletionsRef.current.slice();
    if (forceRef.current) payload.forceDeletePackages = true;

    onChange(payload);

    // Limpiar flags tras emitir
    deletionsRef.current = [];
    forceRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, cols, order, posToIdx]);

  /* ---------- Lógica de añadir/quitar ---------- */

  const rangeCodes = (start, end) => {
    if (end < start) return [];
    return Array.from({ length: end - start + 1 }, (_, i) => `B${start + i}`);
  };

  const openConfirmModal = (data) => {
    setModalData(data);
    setConfirmPhrase("");
    setConfirmOpen(true);
  };

  const closeConfirmModal = () => {
    setConfirmOpen(false);
    setModalData(null);
    setConfirmPhrase("");
  };

  const applyDeletion = () => {
    if (!modalData) return;
    deletionsRef.current = modalData.toRemove;
    forceRef.current = true;
    setCount(modalData.nextCount);
    setInlineOk(`Se marcaron ${modalData.toRemove.length} ubicación${modalData.toRemove.length===1?'':'es'} para eliminar (${modalData.totalPaquetes} paquete${modalData.totalPaquetes===1?'':'s'} afectado${modalData.totalPaquetes===1?'':'s'}). Se aplicará al guardar.`);
    setTimeout(() => setInlineOk(null), 5000);
    closeConfirmModal();
  };

  const attemptSetCount = async (next) => {
    const current = count;
    const clamped = clamp(next, 0, 5000);
    if (clamped === current) return;

    if (clamped > current) {
      // Añadir: siempre permitido
      setCount(clamped);
      return;
    }

    // Eliminar: determinar B a eliminar
    const toRemove = rangeCodes(clamped + 1, current);
    const usados = toRemove.filter(code => (usageByCodigo?.[code] || 0) > 0);

    if (usados.length === 0) {
      // No hay paquetes
      deletionsRef.current = toRemove;
      forceRef.current = false;
      setCount(clamped);
      setInlineOk(`Se marcaron ${toRemove.length} ubicación${toRemove.length===1?'':'es'} para eliminar. Se aplicará al guardar.`);
      setTimeout(() => setInlineOk(null), 4000);
      return;
    }

    // Hay ubicaciones con paquetes → consultar nombres si es posible
    let totalPaquetes = usados.reduce((acc, code) => acc + (usageByCodigo[code] || 0), 0);
    let detallePorUbi = [];

    let paquetes = [];
    if (typeof fetchPackagesByLabels === 'function') {
      try { paquetes = await fetchPackagesByLabels(tenantId, usados); } catch (e) {}
    }

    if (Array.isArray(paquetes) && paquetes.length) {
      const byLabel = paquetes.reduce((acc, p) => {
        const lbl = String(p.ubicacion_label || '').toUpperCase();
        (acc[lbl] = acc[lbl] || []).push(p);
        return acc;
      }, {});
      detallePorUbi = usados.map(lbl => {
        const arr = byLabel[lbl] || [];
        const names = arr.map(p => p.nombre_cliente).filter(Boolean);
        const MAX = 20;
        const listado = names.slice(0, MAX).map(n => `· ${n}`);
        const extra = names.length > MAX ? ` (+${names.length - MAX} más)` : '';
        return { label: lbl, count: names.length, names: listado, extra };
      });
      totalPaquetes = paquetes.length;
    } else {
      detallePorUbi = usados.map(c => ({ label: c, count: usageByCodigo[c] || 0, names: [], extra: '' }));
    }

    openConfirmModal({ nextCount: clamped, toRemove, usados, detallePorUbi, totalPaquetes });
  };

  /* ---------- Render ---------- */
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
      </div>

      {/* Info-hint si hay paquetes */}
      {lockedCount > 0 && (
        <div className="ub-lock-banner" role="status" aria-live="polite">
          Tienes <strong>{lockedCount}</strong> paquete{lockedCount===1?'':'s'} en el sistema.
          Puedes <u>añadir</u> ubicaciones sin problema. Para <u>eliminar</u>, si alguna ubicación contiene paquetes te pediremos confirmación explícita.
        </div>
      )}

      {/* Aviso inline cuando se marca eliminación */}
      {inlineOk && (
        <div className="ub-inline-ok" role="status" aria-live="polite">
          {inlineOk}
        </div>
      )}

      {/* Bloque central: Total */}
      <section className="ub-controls">
        <div className="control">
          <div className="label">Total de ubicaciones</div>
          <div className="stepper">
            <button
              className="btn-round minus"
              onClick={() => attemptSetCount(count - 1)}
              aria-label="Restar una ubicación"
              disabled={count <= 0}
              title="Restar una ubicación"
            >
              <MdRemove/>
            </button>

            <div className="counter">
              <input
                type="number"
                min={0}
                max={5000}
                value={count}
                onChange={e => attemptSetCount(parseInt(e.target.value || 0, 10))}
                title="Editar cantidad"
              />
            </div>

            <button
              className="btn-round plus"
              onClick={() => attemptSetCount(count + 1)}
              aria-label="Sumar una ubicación"
              title="Sumar una ubicación"
            >
              <MdAdd/>
            </button>
          </div>
          <div className="hint">Añadir siempre está permitido. Al eliminar, puede requerir confirmación.</div>
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

        <div className="grid-scroller" role="region" aria-label="Vista de ubicaciones scrolleable">
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(130px, 1fr))` }}
          >
            {Array.from({ length: count }, (_, pos) => {
              const idx = posToIdx[pos];
              const code = `B${idx + 1}`;
              const used = (usageByCodigo?.[code] || 0) > 0;
              return (
                <div key={`cell-${pos}`} className={`cell ${used ? 'is-used' : ''}`} title={code}>
                  <div className="pill">
                    {code}{used ? ' •' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="ub-footer">
        <strong>{count}</strong>&nbsp;ubicaciones definidas
      </footer>

      {/* ---------- Modal de confirmación ---------- */}
      {confirmOpen && modalData && (
        <div className="ub-modal" role="dialog" aria-modal="true" aria-labelledby="ub-modal-title">
          <div className="ub-modal__backdrop" onClick={closeConfirmModal} />
          <div className="ub-modal__dialog">
            <button className="ub-modal__close" onClick={closeConfirmModal} aria-label="Cerrar">
              <MdClose/>
            </button>

            <div className="ub-modal__header">
              <div className="ub-modal__icon"><MdWarning/></div>
              <div>
                <h4 id="ub-modal-title">Eliminar ubicaciones con paquetes</h4>
                <p>Vas a eliminar ubicaciones que contienen paquetes. Esta acción eliminará también los paquetes listados.</p>
              </div>
            </div>

            <div className="ub-modal__body">
              <div className="ub-modal__list">
                {modalData.detallePorUbi.map(item => (
                  <div key={item.label} className="ub-modal__ubi">
                    <div className="ub-modal__ubi-head">
                      <span className="ubi-code">{item.label}</span>
                      <span className="ubi-count">{item.count} paquete{item.count===1?'':'s'}</span>
                    </div>
                    {item.names.length > 0 && (
                      <ul className="ubi-names">
                        {item.names.map((n, idx) => <li key={`${item.label}-${idx}`}>{n}</li>)}
                      </ul>
                    )}
                    {item.extra && <div className="ubi-extra">{item.extra}</div>}
                  </div>
                ))}
              </div>

              <div className="ub-modal__confirm">
                <label htmlFor="ub-modal-confirm-input">Para confirmar, escribe exactamente:</label>
                <div className="ub-modal__confirm-phrase">Eliminar</div>
                <input
                  id="ub-modal-confirm-input"
                  className="ub-modal__input"
                  value={confirmPhrase}
                  onChange={e => setConfirmPhrase(e.target.value)}
                  placeholder="Escribe aquí…"
                  autoFocus
                />
              </div>
            </div>

            <div className="ub-modal__footer">
              <button className="btn ghost" onClick={closeConfirmModal}>Cancelar</button>
              <button
                className="btn danger"
                onClick={applyDeletion}
                disabled={confirmPhrase.trim() !== 'Eliminar'}
                title={confirmPhrase.trim() !== 'Eliminar' ? 'Escribe la palabra de confirmación' : 'Eliminar'}
              >
                Eliminar igualmente ({modalData.totalPaquetes} paquete{modalData.totalPaquetes===1?'':'s'})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
