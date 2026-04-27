import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const IconLocation = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconWarning = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconMinus = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconPlus = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconGrid = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>;
const IconTrash = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default function Ubicaciones({
  initial = [],
  initialMeta = null,
  onChange,
  lockedCount = 0,
  usageByCodigo = {},
  onToast
}) {
  const [cols, setCols] = useState(5);
  const [rows, setRows] = useState(5);
  const [slots, setSlots] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);

  const initialized = useRef(false);
  const deletionsRef = useRef([]);
  const forceRef = useRef(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [modalData, setModalData] = useState(null);

  // INICIALIZACIÓN BLINDADA (Se ejecuta 1 sola vez)
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const c = clamp(parseInt(initialMeta?.cols, 10) || 5, 1, 20);
    
    let maxIdx = -1;
    initial.forEach(u => { if (typeof u.orden === 'number' && u.orden > maxIdx) maxIdx = u.orden; });

    const calculatedRows = Math.max(1, Math.ceil((maxIdx + 1) / c));
    const finalRows = (initial.length === 0) ? 5 : calculatedRows;
    const finalCols = (initial.length === 0) ? 5 : c;

    const arr = Array(finalCols * finalRows).fill(null);
    initial.forEach(u => {
      if (typeof u.orden === 'number' && u.orden >= 0 && u.orden < arr.length) arr[u.orden] = u;
    });

    setCols(finalCols);
    setRows(finalRows);
    setSlots(arr);
  }, [initial, initialMeta]);

  // FUNCIÓN SÍNCRONA PARA AVISAR AL PADRE (Adiós useEffect Dependency Error)
  const commitChange = (nextSlots, nextCols, nextRows) => {
    setSlots(nextSlots);
    if (nextCols !== undefined) setCols(nextCols);
    if (nextRows !== undefined) setRows(nextRows);
    
    if (onChange) {
      const c = nextCols !== undefined ? nextCols : cols;
      const r = nextRows !== undefined ? nextRows : rows;
      const ubicaciones = nextSlots.map((s, i) => s ? { ...s, orden: i } : null).filter(Boolean);
      const payload = {
        ubicaciones,
        meta: { cols: c, rows: r },
        deletions: deletionsRef.current.slice(),
        forceDeletePackages: forceRef.current
      };
      onChange(payload);
      deletionsRef.current = [];
      forceRef.current = false;
    }
  };

  const handleAddCol = () => {
    if (cols >= 20) return;
    const nextCols = cols + 1;
    const newSlots = Array(rows * nextCols).fill(null);
    slots.forEach((s, idx) => {
      if (s) {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        newSlots[r * nextCols + c] = s;
      }
    });
    setSelectedIdx(null);
    commitChange(newSlots, nextCols, rows);
  };

  const handleSubCol = () => {
    if (cols <= 1) return;
    const itemsInLastCol = slots.filter((s, idx) => s && (idx % cols === cols - 1));
    const occupiedItems = itemsInLastCol.filter(s => (usageByCodigo[s.label] || 0) > 0);
    
    if (occupiedItems.length > 0) {
      if (onToast) onToast(`Hay paquetes en la última columna. Mueve esas cajas antes de recortar.`, "error");
      return;
    }
    
    const nextCols = cols - 1;
    const newSlots = Array(rows * nextCols).fill(null);
    
    slots.forEach((s, idx) => {
      if (s) {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        if (c < nextCols) {
          newSlots[r * nextCols + c] = s;
        } else {
          deletionsRef.current.push(s.label);
        }
      }
    });
    
    setSelectedIdx(null);
    commitChange(newSlots, nextCols, rows);
  };

  const handleAddRow = () => {
    if (rows >= 50) return;
    const nextRows = rows + 1;
    const newSlots = [...slots, ...Array(cols).fill(null)];
    setSelectedIdx(null);
    commitChange(newSlots, cols, nextRows);
  };

  const handleSubRow = () => {
    if (rows <= 1) return;
    const itemsInLastRow = slots.filter((s, idx) => s && (Math.floor(idx / cols) === rows - 1));
    const occupiedItems = itemsInLastRow.filter(s => (usageByCodigo[s.label] || 0) > 0);
    
    if (occupiedItems.length > 0) {
      if (onToast) onToast(`Hay paquetes en la última fila. Mueve esas cajas antes de recortar.`, "error");
      return;
    }
    
    const nextRows = rows - 1;
    const newSlots = slots.slice(0, nextRows * cols);
    
    itemsInLastRow.forEach(s => {
      deletionsRef.current.push(s.label);
    });
    
    setSelectedIdx(null);
    commitChange(newSlots, cols, nextRows);
  };

  const handleDeleteSelected = () => {
    if (selectedIdx === null) return;
    const target = slots[selectedIdx];
    if (!target) return;

    if ((usageByCodigo[target.label] || 0) > 0) {
      setModalData({ idx: selectedIdx, label: target.label, count: usageByCodigo[target.label] });
      setConfirmPhrase("");
      setConfirmOpen(true);
    } else {
      const copy = [...slots];
      copy[selectedIdx] = null;
      deletionsRef.current.push(target.label);
      setSelectedIdx(null);
      commitChange(copy);
    }
  };

  const executeDeletion = () => {
    if (!modalData) return;
    const copy = [...slots];
    copy[modalData.idx] = null;
    deletionsRef.current.push(modalData.label);
    forceRef.current = true;
    setConfirmOpen(false);
    setModalData(null);
    setSelectedIdx(null);
    commitChange(copy);
  };

  const handleSlotClick = (idx) => {
    if (selectedIdx === null) {
      if (slots[idx]) {
        setSelectedIdx(idx); 
      } else {
        let maxNum = 0;
        slots.forEach(s => {
          if (s) {
            const n = parseInt(s.label.replace(/\D/g, ''), 10);
            if (n > maxNum) maxNum = n;
          }
        });
        const label = `B${maxNum + 1}`;
        const copy = [...slots];
        copy[idx] = { label, codigo: label };
        commitChange(copy);
      }
    } else {
      if (selectedIdx === idx) {
        setSelectedIdx(null); 
        return;
      }
      const copy = [...slots];
      const temp = copy[idx];
      copy[idx] = copy[selectedIdx];
      copy[selectedIdx] = temp;
      setSelectedIdx(null);
      commitChange(copy);
    }
  };

  const totalActivas = slots.filter(Boolean).length;

  return (
    <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white border border-zinc-200 rounded-xl flex items-center justify-center text-zinc-900 shadow-sm shrink-0">
            <IconLocation />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-950">Lienzo Arquitectónico</h3>
            <p className="text-zinc-500 text-sm">Organiza los huecos asimétricamente para que el mapa sea idéntico a tu local.</p>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        
        {lockedCount > 0 && (
          <div className="bg-zinc-50 border border-zinc-200 text-zinc-800 px-5 py-4 rounded-2xl flex gap-3 shadow-sm">
            <IconLocation />
            <div className="text-sm font-medium">
              Tienes <strong className="font-bold text-zinc-950">{lockedCount} paquetes</strong>. Puedes mover las ubicaciones libremente; si eliminas huecos ocupados se pedirá confirmación.
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6 bg-zinc-50/50 p-6 rounded-2xl border border-zinc-200/60">
          <div className="flex-1 flex flex-col sm:flex-row gap-6">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Pared (Ancho)</label>
              <div className="flex items-center gap-2">
                <button onClick={handleSubCol} className="w-12 h-12 flex items-center justify-center bg-white border border-zinc-200 rounded-xl text-zinc-500 hover:text-zinc-900 transition-colors shadow-sm">
                  <IconMinus />
                </button>
                <span className="flex-1 h-12 flex items-center justify-center text-lg font-bold text-zinc-950 bg-white border border-zinc-200 rounded-xl shadow-sm">{cols}</span>
                <button onClick={handleAddCol} className="w-12 h-12 flex items-center justify-center bg-white border border-zinc-200 rounded-xl text-zinc-500 hover:text-zinc-900 transition-colors shadow-sm">
                  <IconPlus />
                </button>
              </div>
            </div>

            <div className="flex-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Pared (Alto)</label>
              <div className="flex items-center gap-2">
                <button onClick={handleSubRow} className="w-12 h-12 flex items-center justify-center bg-white border border-zinc-200 rounded-xl text-zinc-500 hover:text-zinc-900 transition-colors shadow-sm">
                  <IconMinus />
                </button>
                <span className="flex-1 h-12 flex items-center justify-center text-lg font-bold text-zinc-950 bg-white border border-zinc-200 rounded-xl shadow-sm">{rows}</span>
                <button onClick={handleAddRow} className="w-12 h-12 flex items-center justify-center bg-white border border-zinc-200 rounded-xl text-zinc-500 hover:text-zinc-900 transition-colors shadow-sm">
                  <IconPlus />
                </button>
              </div>
            </div>
          </div>

          <div className="hidden md:block w-px bg-zinc-200" />

          <div className="flex-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Acciones</label>
            <div className="flex items-center gap-2">
              {selectedIdx !== null ? (
                <>
                  <button onClick={() => setSelectedIdx(null)} className="h-12 px-4 flex items-center justify-center bg-white border border-zinc-200 text-zinc-600 font-bold rounded-xl transition-colors shadow-sm hover:bg-zinc-50">
                    Cancelar
                  </button>
                  <button onClick={handleDeleteSelected} className="flex-1 h-12 flex items-center justify-center bg-white hover:bg-zinc-50 text-red-600 border border-zinc-200 font-bold rounded-xl transition-colors shadow-sm gap-2">
                    <IconTrash /> Borrar
                  </button>
                </>
              ) : (
                <div className="h-12 flex items-center justify-center text-sm font-bold text-zinc-600 bg-white border border-zinc-200 rounded-xl px-4 w-full shadow-sm">
                  {totalActivas} Huecos Activos
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-end mb-4">
            <div>
              <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2"><IconGrid /> Diseñador de Estructura</h4>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">1. Toca un espacio para CREAR • 2. Toca caja para MOVER</p>
            </div>
            {selectedIdx !== null && <span className="text-xs font-bold text-zinc-600 bg-white px-2 py-1 rounded-lg border border-zinc-200">Destino...</span>}
          </div>
          
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-6 overflow-x-auto shadow-inner">
            <div 
              className="grid gap-2 sm:gap-3 min-w-[400px] mx-auto" 
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(40px, 1fr))` }}
            >
              {slots.map((s, i) => {
                const isSelected = selectedIdx === i;
                const isEmpty = !s;
                const used = !isEmpty && (usageByCodigo?.[s.label] || 0) > 0;

                let classes = "aspect-square rounded-xl flex items-center justify-center font-bold transition-all outline-none border-2 select-none ";
                
                if (isEmpty) {
                  classes += selectedIdx !== null 
                    ? "bg-zinc-100 border-zinc-300 border-dashed text-transparent hover:bg-zinc-200 cursor-pointer" 
                    : "bg-transparent border-zinc-200 border-dashed text-zinc-300 hover:border-zinc-300 cursor-pointer hover:text-zinc-400";
                } else if (isSelected) {
                  classes += "bg-zinc-900 border-zinc-950 text-white transform scale-105 shadow-md z-10 cursor-pointer";
                } else if (used) {
                  classes += "bg-zinc-100 border-zinc-300 text-zinc-900 shadow-sm cursor-pointer hover:border-zinc-400";
                } else {
                  classes += "bg-white border-zinc-200 text-zinc-600 shadow-sm cursor-pointer hover:border-zinc-300 hover:text-zinc-900";
                }

                return (
                  <button key={i} onClick={() => handleSlotClick(i)} className={classes}>
                    <span className="text-xs sm:text-base">{s ? s.label : "+"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {confirmOpen && modalData && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} className="relative bg-white rounded-3xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden border border-zinc-200">
              
              <div className="p-6 border-b border-red-100 bg-red-50/50 flex items-start gap-4">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shrink-0 border border-red-200">
                  <IconWarning />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-950">Estantería Ocupada</h3>
                  <p className="text-red-700 text-xs font-medium mt-1">El hueco <strong>{modalData.label}</strong> contiene {modalData.count} paquete(s).</p>
                </div>
              </div>

              <div className="p-6 bg-white">
                <label className="text-sm font-bold text-zinc-900 block mb-2">Escribe <strong className="text-red-600 select-all">Eliminar</strong></label>
                <input 
                  type="text" 
                  value={confirmPhrase} 
                  onChange={e => setConfirmPhrase(e.target.value)} 
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-bold text-zinc-900"
                  autoFocus
                />
                
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setConfirmOpen(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-700 font-bold rounded-xl hover:bg-zinc-200 transition-colors">Cancelar</button>
                  <button onClick={executeDeletion} disabled={confirmPhrase !== 'Eliminar'} className="flex-1 py-3 bg-red-600 disabled:bg-red-300 text-white font-bold rounded-xl hover:bg-red-700 transition-colors">Destruir</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}