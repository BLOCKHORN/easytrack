import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const IconLocation = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconWarning = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconMinus = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconPlus = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconTrash = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 11"/></svg>;

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
  const [editingLabel, setEditingLabel] = useState("");

  const gridRef = useRef(null);
  const initialized = useRef(false);
  const deletionsRef = useRef([]);
  const forceRef = useRef(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [modalData, setModalData] = useState(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const c = clamp(parseInt(initialMeta?.cols, 10) || 5, 1, 12);
    let maxIdx = -1;
    initial.forEach(u => { if (typeof u.orden === 'number' && u.orden > maxIdx) maxIdx = u.orden; });

    const calculatedRows = Math.max(5, Math.ceil((maxIdx + 1) / c));
    const finalCols = c;
    const finalRows = (initial.length === 0) ? 5 : calculatedRows;

    const arr = Array(finalCols * finalRows).fill(null);
    initial.forEach(u => {
      if (u.orden >= 0 && u.orden < arr.length) arr[u.orden] = u;
    });

    setCols(finalCols);
    setRows(finalRows);
    setSlots(arr);
  }, [initial, initialMeta]);

  const commitChange = (nextSlots, nextCols, nextRows) => {
    setSlots(nextSlots);
    const c = nextCols !== undefined ? nextCols : cols;
    const r = nextRows !== undefined ? nextRows : rows;
    if (nextCols !== undefined) setCols(c);
    if (nextRows !== undefined) setRows(r);
    
    if (onChange) {
      const ubicaciones = nextSlots.map((s, i) => s ? { ...s, orden: i } : null).filter(Boolean);
      onChange({
        ubicaciones,
        meta: { cols: c, rows: r },
        deletions: deletionsRef.current.slice(),
        forceDeletePackages: forceRef.current
      });
      deletionsRef.current = [];
      forceRef.current = false;
    }
  };

  const handleSlotClick = (idx) => {
    if (slots[idx]) {
      setSelectedIdx(idx);
      setEditingLabel(slots[idx].label);
    } else {
      const usedNumbers = new Set();
      slots.forEach(s => {
        if (s) {
          const match = String(s.label).match(/^B(\d+)$/i);
          if (match) usedNumbers.add(parseInt(match[1], 10));
        }
      });
      let nextNum = 1;
      while (usedNumbers.has(nextNum)) nextNum++;

      const label = `B${nextNum}`;
      const copy = [...slots];
      copy[idx] = { label, codigo: label };
      commitChange(copy);
      setSelectedIdx(idx);
      setEditingLabel(label);
    }
  };

  const handleDragEnd = (event, info, fromIdx) => {
    if (!gridRef.current) return;

    const gridRect = gridRef.current.getBoundingClientRect();
    const x = info.point.x - (gridRect.left + window.scrollX);
    const y = info.point.y - (gridRect.top + window.scrollY);

    if (x < 0 || x >= gridRect.width || y < 0 || y >= gridRect.height) return;

    const cellWidth = gridRect.width / cols;
    const cellHeight = gridRect.height / rows;
    
    const col = Math.floor(x / cellWidth);
    const row = Math.floor(y / cellHeight);
    const toIdx = (row * cols) + col;

    if (toIdx >= 0 && toIdx < slots.length && toIdx !== fromIdx) {
      const copy = [...slots];
      const temp = copy[toIdx];
      copy[toIdx] = copy[fromIdx];
      copy[fromIdx] = temp;
      
      if (selectedIdx === fromIdx) setSelectedIdx(toIdx);
      else if (selectedIdx === toIdx) setSelectedIdx(fromIdx);

      commitChange(copy);
    }
  };

  const handleRename = () => {
    if (!editingLabel.trim() || selectedIdx === null) return;
    const newLabel = editingLabel.trim().toUpperCase();
    
    // Si no ha cambiado nada, simplemente cerramos la selección
    if (slots[selectedIdx]?.label === newLabel) {
      setSelectedIdx(null);
      return;
    }

    // Bloqueo de seguridad: No renombrar si tiene paquetes
    if ((usageByCodigo[slots[selectedIdx]?.label] || 0) > 0) {
      onToast?.("No puedes renombrar una caja que contiene paquetes.", "error");
      return;
    }

    const alreadyExists = slots.some((s, i) => s && i !== selectedIdx && s.label === newLabel);
    
    if (alreadyExists) {
      onToast?.("Ese nombre ya existe", "error");
      return;
    }

    const copy = [...slots];
    copy[selectedIdx] = { ...copy[selectedIdx], label: newLabel, codigo: newLabel };
    commitChange(copy);
    setSelectedIdx(null); // Quita la selección al guardar
    onToast?.("Renombrado");
  };

  const handleDelete = () => {
    if (selectedIdx === null || !slots[selectedIdx]) return;
    const target = slots[selectedIdx];
    
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

  const selectedSlotHasPkgs = selectedIdx !== null && slots[selectedIdx] && (usageByCodigo[slots[selectedIdx].label] || 0) > 0;

  return (
    <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
      <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-zinc-900 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <IconLocation />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-950 tracking-tight">Diseño de Almacén</h3>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Crea con un clic · Mueve arrastrando</p>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-zinc-50 border border-zinc-200 p-6 rounded-2xl">
          <div className="lg:col-span-4 flex gap-4">
            <div className="flex-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Columnas</label>
              <div className="flex items-center bg-white border border-zinc-200 rounded-xl overflow-hidden h-11">
                <button onClick={() => commitChange(slots, clamp(cols - 1, 1, 12))} className="w-10 flex items-center justify-center hover:bg-zinc-50 transition-colors"><IconMinus /></button>
                <span className="flex-1 text-center font-bold text-zinc-900 border-x border-zinc-100">{cols}</span>
                <button onClick={() => commitChange(slots, clamp(cols + 1, 1, 12))} className="w-10 flex items-center justify-center hover:bg-zinc-50 transition-colors"><IconPlus /></button>
              </div>
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Filas</label>
              <div className="flex items-center bg-white border border-zinc-200 rounded-xl overflow-hidden h-11">
                <button onClick={() => commitChange(slots, undefined, clamp(rows - 1, 1, 50))} className="w-10 flex items-center justify-center hover:bg-zinc-50 transition-colors"><IconMinus /></button>
                <span className="flex-1 text-center font-bold text-zinc-900 border-x border-zinc-100">{rows}</span>
                <button onClick={() => commitChange(slots, undefined, clamp(rows + 1, 1, 50))} className="w-10 flex items-center justify-center hover:bg-zinc-50 transition-colors"><IconPlus /></button>
              </div>
            </div>
          </div>

          <div className="hidden lg:block w-px bg-zinc-200" />

          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {selectedIdx !== null ? (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col sm:flex-row items-end gap-3 w-full">
                  <div className="flex-1 w-full">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <span>Caja Seleccionada</span>
                      {selectedSlotHasPkgs && (
                        <span className="text-red-500 bg-red-50 px-1.5 py-0.5 rounded-md normal-case font-bold tracking-normal">Bloqueada (No se puede renombrar con paquetes dentro)</span>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={editingLabel} 
                        onChange={e => setEditingLabel(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && !selectedSlotHasPkgs && handleRename()}
                        disabled={selectedSlotHasPkgs}
                        className={`flex-1 px-4 h-11 border rounded-xl font-bold outline-none transition-all ${
                          selectedSlotHasPkgs 
                            ? 'bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed' 
                            : 'bg-white border-zinc-300 text-zinc-950 focus:border-zinc-900'
                        }`}
                      />
                      <button 
                        onClick={handleRename} 
                        disabled={selectedSlotHasPkgs}
                        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform ${
                          selectedSlotHasPkgs
                            ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                            : 'bg-zinc-900 text-white hover:bg-zinc-800 active:scale-95 shadow-md'
                        }`}
                      >
                        <IconCheck />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={handleDelete} className="flex-1 sm:flex-none h-11 px-4 bg-zinc-100 text-red-600 border border-zinc-200 rounded-xl font-bold text-xs hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                      <IconTrash />
                    </button>
                    <button onClick={() => setSelectedIdx(null)} className="h-11 px-4 bg-white border border-zinc-200 text-zinc-500 rounded-xl font-bold text-xs hover:bg-zinc-50">Cerrar</button>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full flex items-center justify-center border-2 border-dashed border-zinc-200 rounded-2xl px-6">
                  <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest text-center">Toca un hueco vacío para añadir o arrastra para mover</span>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="bg-zinc-100 rounded-3xl p-4 sm:p-6">
          <div 
            ref={gridRef}
            className="grid gap-2 sm:gap-3 mx-auto relative" 
            style={{ 
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              maxWidth: `${cols * 90}px`
            }}
          >
            {slots.map((s, i) => {
              const isSelected = selectedIdx === i;
              const hasPkgs = s && (usageByCodigo[s.label] || 0) > 0;

              return (
                <div key={i} className="relative aspect-square">
                  {s ? (
                    <motion.button
                      key={`box-${s.codigo}`}
                      layoutId={`box-${s.codigo}`}
                      layout
                      drag
                      dragSnapToOrigin
                      dragElastic={0.1}
                      whileDrag={{ scale: 1.1, zIndex: 50 }}
                      onDragEnd={(e, info) => handleDragEnd(e, info, i)}
                      onClick={() => handleSlotClick(i)}
                      className={`absolute inset-0 rounded-xl flex flex-col items-center justify-center font-bold transition-colors border-2 select-none cursor-grab active:cursor-grabbing shadow-sm ${
                        isSelected ? 'bg-zinc-900 border-zinc-900 text-white z-40 shadow-lg' : 'bg-white border-zinc-200 text-zinc-900 hover:border-zinc-400'
                      }`}
                      style={{ zIndex: isSelected ? 40 : 10 }}
                    >
                      <span className="text-xs sm:text-lg font-black">{s.label}</span>
                      {hasPkgs && !isSelected && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#14B07E] rounded-full border border-white" />
                      )}
                    </motion.button>
                  ) : (
                    <button
                      onClick={() => handleSlotClick(i)}
                      className="absolute inset-0 rounded-xl flex flex-col items-center justify-center font-bold transition-all border-2 select-none bg-transparent border-dashed border-zinc-300 text-zinc-300 hover:border-zinc-400 hover:bg-zinc-50"
                      style={{ zIndex: 5 }}
                    >
                      <span className="text-xs sm:text-lg font-black">+</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between items-center px-2 pt-4 border-t border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
          <span>{slots.filter(Boolean).length} Cajas activas</span>
          {lockedCount > 0 && <span className="text-[#14B07E]">{lockedCount} paquetes almacenados</span>}
        </div>
      </div>

      <AnimatePresence>
        {confirmOpen && modalData && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden border border-zinc-200">
              <div className="p-6 border-b border-red-50 bg-red-50/30 flex items-start gap-4">
                <div className="w-12 h-12 bg-white text-red-600 rounded-2xl flex items-center justify-center shrink-0 border border-red-100 shadow-sm"><IconWarning /></div>
                <div>
                  <h3 className="text-lg font-bold text-red-950 tracking-tight">Caja Ocupada</h3>
                  <p className="text-red-700/70 text-xs font-bold mt-1">El hueco {modalData.label} tiene {modalData.count} paquete(s).</p>
                </div>
              </div>
              <div className="p-6">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest block mb-2">Escribe "Eliminar" para confirmar</label>
                <input type="text" value={confirmPhrase} onChange={e => setConfirmPhrase(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-red-500 outline-none font-bold" autoFocus />
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setConfirmOpen(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-700 font-bold rounded-xl hover:bg-zinc-200 transition-colors">Cancelar</button>
                  <button 
                    onClick={() => {
                      if (confirmPhrase === 'Eliminar') {
                        const copy = [...slots];
                        copy[modalData.idx] = null;
                        deletionsRef.current.push(modalData.label);
                        forceRef.current = true;
                        setConfirmOpen(false);
                        setModalData(null);
                        setSelectedIdx(null);
                        commitChange(copy);
                      }
                    }} 
                    disabled={confirmPhrase !== 'Eliminar'} 
                    className="flex-1 py-3 bg-red-600 disabled:bg-zinc-200 text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
                  >
                    Confirmar
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