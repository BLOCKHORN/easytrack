import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ==========================================
// ICONOS CUSTOM
// ==========================================
const IconLocation = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconWarning = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconClose = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconMinus = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconPlus = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconSwapH = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="14" x2="21" y2="3"/><polyline points="8 21 3 21 3 16"/><line x1="20" y1="10" x2="3" y2="21"/></svg>;
const IconSwapV = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 16 3 21 8 21"/><line x1="14" y1="4" x2="3" y2="21"/><polyline points="21 8 21 3 16 3"/><line x1="10" y1="20" x2="21" y2="3"/></svg>;

/* ===== HELPERS LOGICOS ORIGINALES ===== */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

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

export default function Ubicaciones({
  initial = [],
  initialMeta = null,
  onChange,
  tenantId = null,
  lockedCount = 0,
  usageByCodigo = {},
  fetchPackagesByLabels = null,
}) {
  const [count, setCount] = useState(initial?.length ? initial.length : 25);
  const [cols, setCols] = useState(() => {
    const v = parseInt(initialMeta?.cols ?? 5, 10);
    return clamp(Number.isFinite(v) ? v : 5, 1, 12);
  });
  const [order, setOrder] = useState((initialMeta?.orden || initialMeta?.order) === "vertical" ? "vertical" : "horizontal");

  const deletionsRef = useRef([]);
  const forceRef = useRef(false);

  // Modal Security State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [modalData, setModalData] = useState(null);

  // Feedback State
  const [inlineOk, setInlineOk] = useState(null);

  useEffect(() => { setCount(initial?.length ? initial.length : 25); }, [initial]);

  useEffect(() => {
    if (!initialMeta) return;
    setCols(clamp(parseInt(initialMeta.cols ?? cols, 10) || cols, 1, 12));
    setOrder((initialMeta.orden || initialMeta.order) === "vertical" ? "vertical" : "horizontal");
  }, [initialMeta]);

  const posToIdx = useMemo(() => buildPosToIdx(count, cols, order), [count, cols, order]);

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
    deletionsRef.current = [];
    forceRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, cols, order, posToIdx]);

  const rangeCodes = (start, end) => end < start ? [] : Array.from({ length: end - start + 1 }, (_, i) => `B${start + i}`);

  const applyDeletion = () => {
    if (!modalData) return;
    deletionsRef.current = modalData.toRemove;
    forceRef.current = true;
    setCount(modalData.nextCount);
    setInlineOk(`Se eliminarán ${modalData.toRemove.length} ubicaciones y ${modalData.totalPaquetes} paquetes afectados al guardar los cambios.`);
    setTimeout(() => setInlineOk(null), 5000);
    setConfirmOpen(false); setModalData(null); setConfirmPhrase("");
  };

  const attemptSetCount = async (next) => {
    const current = count;
    const clamped = clamp(next, 0, 5000);
    if (clamped === current) return;

    if (clamped > current) { setCount(clamped); return; } // Añadir siempre permitido

    const toRemove = rangeCodes(clamped + 1, current);
    const usados = toRemove.filter(code => (usageByCodigo?.[code] || 0) > 0);

    if (usados.length === 0) {
      deletionsRef.current = toRemove;
      forceRef.current = false;
      setCount(clamped);
      setInlineOk(`Se borrarán ${toRemove.length} ubicaciones vacías al guardar los cambios.`);
      setTimeout(() => setInlineOk(null), 4000);
      return;
    }

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
        const MAX = 10;
        return { label: lbl, count: names.length, names: names.slice(0, MAX), extra: names.length > MAX ? `...y ${names.length - MAX} más` : '' };
      });
      totalPaquetes = paquetes.length;
    } else {
      detallePorUbi = usados.map(c => ({ label: c, count: usageByCodigo[c] || 0, names: [], extra: '' }));
    }

    setModalData({ nextCount: clamped, toRemove, usados, detallePorUbi, totalPaquetes });
    setConfirmPhrase("");
    setConfirmOpen(true);
  };

  return (
    <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
      {/* CABECERA */}
      <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white border border-zinc-200 rounded-xl flex items-center justify-center text-zinc-900 shadow-sm shrink-0">
            <IconLocation />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-950">Dimensionamiento del Almacén</h3>
            <p className="text-zinc-500 text-sm">Ajusta la capacidad física. Los huecos se etiquetan automáticamente (B1, B2...).</p>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        
        {/* ALERTAS */}
        {lockedCount > 0 && (
          <div className="bg-brand-50 border border-brand-200 text-brand-800 px-5 py-4 rounded-2xl flex gap-3 shadow-sm">
            <IconLocation />
            <div className="text-sm font-medium">
              Tienes <strong className="font-black text-brand-950">{lockedCount} paquetes</strong> activos. Puedes ampliar el almacén, pero si reduces ubicaciones ocupadas, el sistema pedirá confirmación de seguridad.
            </div>
          </div>
        )}
        
        <AnimatePresence>
          {inlineOk && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-amber-50 border border-amber-200 text-amber-700 px-5 py-4 rounded-2xl text-sm font-bold shadow-sm">
              {inlineOk}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CONTROLES */}
        <div className="flex flex-col md:flex-row gap-6 bg-zinc-50/50 p-6 rounded-2xl border border-zinc-200/60">
          
          {/* STEPPER TOTAL */}
          <div className="flex-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Total de Huecos en Local</label>
            <div className="flex items-center gap-2">
              <button onClick={() => attemptSetCount(count - 1)} disabled={count <= 0} className="w-12 h-12 flex items-center justify-center bg-white border border-zinc-200 rounded-xl text-zinc-500 hover:text-zinc-900 hover:border-zinc-400 disabled:opacity-50 transition-all shadow-sm">
                <IconMinus />
              </button>
              <input 
                type="number" 
                value={count} 
                onChange={e => attemptSetCount(parseInt(e.target.value || 0, 10))} 
                className="w-24 h-12 text-center text-xl font-black text-zinc-950 bg-white border border-zinc-200 rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 shadow-sm"
              />
              <button onClick={() => attemptSetCount(count + 1)} className="w-12 h-12 flex items-center justify-center bg-white border border-zinc-200 rounded-xl text-zinc-500 hover:text-zinc-900 hover:border-zinc-400 transition-all shadow-sm">
                <IconPlus />
              </button>
            </div>
          </div>

          <div className="hidden md:block w-px bg-zinc-200" />

          {/* AJUSTES VISUALES (Grid) */}
          <div className="flex-1 flex flex-col sm:flex-row gap-6">
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Orden Numérico</label>
              <div className="flex bg-zinc-200/50 p-1 rounded-xl w-fit">
                <button onClick={() => setOrder("horizontal")} className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${order === "horizontal" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`}>
                  <IconSwapH /> Filas
                </button>
                <button onClick={() => setOrder("vertical")} className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${order === "vertical" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`}>
                  <IconSwapV /> Columnas
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Columnas (Visual)</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setCols(c => clamp(c - 1, 1, 12))} className="w-10 h-10 flex items-center justify-center bg-white border border-zinc-200 rounded-lg text-zinc-500 hover:text-zinc-900 transition-colors">
                  <IconMinus />
                </button>
                <span className="w-8 text-center font-black text-zinc-900">{cols}</span>
                <button onClick={() => setCols(c => clamp(c + 1, 1, 12))} className="w-10 h-10 flex items-center justify-center bg-white border border-zinc-200 rounded-lg text-zinc-500 hover:text-zinc-900 transition-colors">
                  <IconPlus />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* VISTA DEL GRID */}
        <div>
          <div className="flex justify-between items-end mb-3">
            <h4 className="text-sm font-bold text-zinc-900">Previsualización del Mapa</h4>
            <span className="text-xs font-bold text-zinc-400">{count} ubicaciones</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 overflow-x-auto shadow-inner">
            <div className="grid gap-2 min-w-[600px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {Array.from({ length: count }, (_, pos) => {
                const idx = posToIdx[pos];
                const code = `B${idx + 1}`;
                const used = (usageByCodigo?.[code] || 0) > 0;
                return (
                  <div key={`cell-${pos}`} className={`h-12 rounded-lg flex items-center justify-center text-sm font-black border transition-colors ${used ? 'bg-brand-50 border-brand-200 text-brand-700 shadow-sm' : 'bg-white border-zinc-200 text-zinc-400'}`}>
                    {code} {used && <div className="w-1.5 h-1.5 bg-brand-500 rounded-full ml-1.5" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL CONFIRMACION DESTRUCTIVA (Tailwind) */}
      <AnimatePresence>
        {confirmOpen && modalData && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-zinc-200">
              
              <div className="p-6 border-b border-red-100 bg-red-50/50 flex items-start gap-4">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-red-200">
                  <IconWarning />
                </div>
                <div>
                  <h3 className="text-xl font-black text-red-950">¡Peligro de Pérdida de Datos!</h3>
                  <p className="text-red-700 text-sm font-medium mt-1">Estás reduciendo el tamaño del almacén eliminando huecos que <strong>actualmente contienen paquetes</strong>.</p>
                </div>
              </div>

              <div className="p-6 bg-zinc-50 overflow-y-auto max-h-[40vh] border-b border-zinc-200">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Paquetes afectados ({modalData.totalPaquetes})</p>
                <div className="space-y-3">
                  {modalData.detallePorUbi.map(item => (
                    <div key={item.label} className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-black text-zinc-900">{item.label}</span>
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-100">{item.count} paquete(s)</span>
                      </div>
                      {item.names.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {item.names.map((n, idx) => <span key={idx} className="text-xs font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded">{n}</span>)}
                        </div>
                      )}
                      {item.extra && <div className="text-xs font-bold text-zinc-400 mt-2">{item.extra}</div>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-white">
                <label className="text-sm font-bold text-zinc-900 block mb-2">Para confirmar la destrucción, escribe <strong className="text-red-600 select-all">Eliminar</strong></label>
                <input 
                  type="text" 
                  value={confirmPhrase} 
                  onChange={e => setConfirmPhrase(e.target.value)} 
                  placeholder="Escribe Eliminar..." 
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none font-bold text-zinc-900"
                  autoFocus
                />
                
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setConfirmOpen(false)} className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl transition-colors">
                    Cancelar
                  </button>
                  <button onClick={applyDeletion} disabled={confirmPhrase !== 'Eliminar'} className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-black rounded-xl transition-colors shadow-lg shadow-red-500/20 active:scale-95">
                    Destruir Datos
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}