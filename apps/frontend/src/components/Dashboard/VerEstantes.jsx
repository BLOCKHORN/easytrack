import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getTenantIdOrThrow } from "../../utils/tenant";
import { eliminarPaqueteBackend, editarPaqueteBackend, obtenerPaquetesBackend } from "../../services/paquetesService";
import { cargarUbicaciones } from "../../services/ubicacionesService";
import VerEstantesSkeleton from "./VerEstantesSkeleton";
import { getCarrierLogo, getInitials, ImageFallback } from '../UI/CarrierLogo';

// --- SISTEMA DE CACHÉ EN MEMORIA (SWR) ---
let __SHELF_CACHE = {
  loaded: false,
  ubicaciones: [],
  paquetes: [],
  metaUbi: { cols: 5, num_rows: 5, order: 'horizontal' }
};

// --- ICONOS ---
const IconGrid = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>;
const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const IconEye = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconEyeSlash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>;
const IconTrash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconTimes = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconGrip = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>;
const IconCheck = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export default function VerEstantes() {
  const [loading, setLoading] = useState(!__SHELF_CACHE.loaded);
  const [ubicaciones, setUbicaciones] = useState(__SHELF_CACHE.ubicaciones);
  const [paquetes, setPaquetes] = useState(__SHELF_CACHE.paquetes);
  const [metaUbi, setMetaUbi] = useState(__SHELF_CACHE.metaUbi);

  const [search, setSearch] = useState("");
  const [ocultarVacias, setOcultarVacias] = useState(false);
  const [mostrarNombres, setMostrarNombres] = useState(false);
  
  // Estado UI
  const [revealedPkgs, setRevealedPkgs] = useState({});
  const [slotSeleccionado, setSlotSeleccionado] = useState(null);
  const [hoveredUbi, setHoveredUbi] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    let cancel = false;
    const loadData = async () => {
      if (!__SHELF_CACHE.loaded) setLoading(true);
      try {
        const tId = await getTenantIdOrThrow();
        const [ubiRes, pkgsArr] = await Promise.all([
          cargarUbicaciones(null, tId),
          obtenerPaquetesBackend(null, { estado: 'pendiente', all: 1 })
        ]);

        if (cancel) return;

        const newUbis = ubiRes.ubicaciones || [];
        const newPkgs = Array.isArray(pkgsArr) ? pkgsArr : [];
        const newMeta = { 
          cols: ubiRes.meta?.cols ?? 5, 
          num_rows: ubiRes.meta?.num_rows ?? 5, // Fallback pro
          order: ubiRes.meta?.order ?? ubiRes.meta?.orden ?? 'horizontal' 
        };

        __SHELF_CACHE = { loaded: true, ubicaciones: newUbis, paquetes: newPkgs, metaUbi: newMeta };
        console.log('[Almacen] Loaded packages:', newPkgs.length);
        console.log('[Almacen] First package ubi:', newPkgs[0]?.ubicacion_label);
        console.log('[Almacen] Ubicaciones labels:', newUbis.map(x => x.label));
        setUbicaciones(newUbis);
        setPaquetes(newPkgs);
        setMetaUbi(newMeta);
      } catch (e) { 
        console.error(e); 
      } finally { 
        if (!cancel) setLoading(false); 
      }
    };

    loadData();
    return () => { cancel = true; };
  }, []);

  const showToast = (msg, isError = false) => {
    setToastMsg({ msg, isError });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const occupancy = useMemo(() => {
    const map = new Map();
    for (const p of paquetes) {
      if (p.entregado) continue;
      const lbl = String(p.ubicacion_label || '').toUpperCase();
      if (lbl) map.set(lbl, (map.get(lbl) || 0) + 1);
    }
    return map;
  }, [paquetes]);

  const processedUbicaciones = useMemo(() => {
    return [...ubicaciones].sort((a,b) => (a.orden ?? 0) - (b.orden ?? 0)).map((u, i) => ({
      ...u,
      label: String(u.label || u.codigo || `B${i+1}`).toUpperCase()
    }));
  }, [ubicaciones]);

  const cols = clamp(parseInt(metaUbi?.cols ?? 5, 10) || 5, 1, 12);
  const minRowsNeeded = Math.ceil((processedUbicaciones.reduce((max, u) => Math.max(max, u.orden ?? 0), -1) + 1) / cols);
  const num_rows = clamp(parseInt(metaUbi?.num_rows ?? minRowsNeeded, 10) || 5, 2, 50);
  const totalSlots = cols * Math.max(num_rows, minRowsNeeded);

  const getShelfStyle = (count, isSelected, isHovered) => {
    if (isHovered) return { bgColor: 'bg-[#14B07E] border-[#14B07E] ring-4 ring-[#14B07E]/30 scale-[1.08] shadow-2xl z-30 transition-all duration-200', titleColor: 'text-white', countColor: 'text-emerald-100' };
    if (isSelected) return { bgColor: 'bg-zinc-900 border-zinc-900 scale-[1.02] shadow-xl z-20', titleColor: 'text-white', countColor: 'text-zinc-400' };
    if (count === 0) return { bgColor: 'bg-white border-zinc-200', titleColor: 'text-zinc-400', countColor: 'text-zinc-400' };
    if (count <= 4)  return { bgColor: 'bg-[#E8F7F2] border-[#A7E2CE] hover:border-[#14B07E]', titleColor: 'text-zinc-900', countColor: 'text-[#14B07E]' };
    if (count <= 9)  return { bgColor: 'bg-[#FFFBEB] border-[#FDE047] hover:border-amber-500', titleColor: 'text-zinc-900', countColor: 'text-amber-700' };
    return { bgColor: 'bg-[#FEF2F2] border-[#FECACA] hover:border-red-400', titleColor: 'text-zinc-900', countColor: 'text-red-800' };
  };

  const toggleRevealOne = (id) => setRevealedPkgs(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleRevealAll = () => {
    if (mostrarNombres) { 
      setMostrarNombres(false); setRevealedPkgs({}); 
    } else { 
      setMostrarNombres(true); const all = {}; paquetes.forEach(p => all[p.id] = true); setRevealedPkgs(all); 
    }
  };

  if (loading) return <VerEstantesSkeleton />;

  return (
    <div className="space-y-4 sm:space-y-6 font-sans pb-20 relative min-h-screen">
      <AnimatePresence>
        {toastMsg && (
          <motion.div initial={{ opacity: 0, y: -50, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} className={`fixed top-20 left-1/2 z-[9999] px-4 py-2.5 rounded-xl shadow-md font-bold text-white text-xs sm:text-sm flex items-center gap-2.5 border ${toastMsg.isError ? 'bg-red-600 border-red-500' : 'bg-zinc-900 border-zinc-800'} whitespace-nowrap`}>
            {toastMsg.isError ? <IconTimes /> : <IconCheck />}
            {toastMsg.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-6 pb-3 sm:pb-6 border-b border-zinc-200/80">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight flex items-center gap-2 sm:gap-3 mb-0.5">
            <IconGrid /> Almacén
          </h1>
          <p className="text-xs sm:text-sm font-medium text-zinc-500">Vista completa de la ocupación del local.</p>
        </div>
      </div>

      <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-zinc-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-4">
        <div className="relative w-full md:max-w-sm">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"><IconSearch /></div>
          <input type="text" placeholder="Buscar estante o cliente..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 sm:py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-brand-500 outline-none font-bold text-xs sm:text-sm text-zinc-900 transition-colors placeholder:text-zinc-400"/>
        </div>

        <div className="flex flex-row items-center gap-2 w-full md:w-auto">
          <label className="flex items-center gap-1.5 cursor-pointer bg-white px-3 py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors shrink-0 flex-1 sm:flex-none justify-center">
            <input type="checkbox" checked={ocultarVacias} onChange={e => setOcultarVacias(e.target.checked)} className="w-3.5 h-3.5 rounded text-brand-600 border-zinc-300 focus:ring-brand-500"/>
            <span className="text-[11px] sm:text-xs font-bold text-zinc-700 uppercase tracking-wider">Atenuar vacías</span>
          </label>
          <button onClick={toggleRevealAll} className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-colors shrink-0 flex-1 sm:flex-none ${mostrarNombres ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}>
            {mostrarNombres ? <IconEyeSlash /> : <IconEye />} {mostrarNombres ? 'Ocultar' : 'Nombres'}
          </button>
        </div>
      </div>

      <div className="flex w-full justify-center pb-4 overflow-hidden">
        <div className="w-full max-w-full">
          <div className="grid gap-2 sm:gap-3 relative w-full" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: totalSlots }).map((_, i) => {
              const u = processedUbicaciones.find(x => x.orden === i);
              if (!u) {
                return (
                  <div key={`empty-${i}`} className="relative aspect-square">
                    <div className="absolute inset-0 border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50/50 flex items-center justify-center pointer-events-none">
                      <span className="text-zinc-300 font-black text-xl opacity-30">+</span>
                    </div>
                  </div>
                );
              }

              const lbl = u.label;
              const pkgsInUbi = paquetes.filter(p => String(p.ubicacion_label || '').toUpperCase() === lbl);
              const count = pkgsInUbi.length;
              const isSelected = slotSeleccionado?.label === lbl;
              const isHovered = hoveredUbi === lbl;

              let isMatch = true;
              const s = search.toLowerCase();
              if (s) {
                const matchUbi = lbl.toLowerCase().includes(s);
                const matchPkgs = pkgsInUbi.some(p => (p.nombre_cliente || '').toLowerCase().includes(s) || (p.empresa_transporte || '').toLowerCase().includes(s));
                isMatch = matchUbi || matchPkgs;
              }
              if (ocultarVacias && count === 0) isMatch = false;

              const style = getShelfStyle(count, isSelected, isHovered);
              const fadeClass = isMatch ? '' : 'opacity-25 grayscale pointer-events-none';

              return (
                <div key={u.id || `lbl-${u.label}`} className="relative aspect-square">
                  <button type="button" onClick={() => isSelected ? setSlotSeleccionado(null) : count > 0 && setSlotSeleccionado({ ...u, label: lbl, pkgs: pkgsInUbi, count })} className={`absolute inset-0 flex flex-col items-center justify-center rounded-xl transition-all border outline-none ${style.bgColor} ${fadeClass} ${count > 0 ? 'hover:scale-[1.05] hover:shadow-md cursor-pointer' : 'cursor-default'}`}>
                    <span className={`text-sm sm:text-xl font-black tracking-tight ${style.titleColor}`}>{lbl}</span>
                    <span className={`text-[8px] sm:text-[9px] font-bold mt-0.5 uppercase tracking-wider ${style.countColor}`}>{count} paq.</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {slotSeleccionado && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSlotSeleccionado(null)} className="absolute inset-0 bg-zinc-950/75" />
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-zinc-200">
              <div className="p-3.5 sm:p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-white text-base font-black">{slotSeleccionado.label}</div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-zinc-950">Contenido del estante</h3>
                    <p className="text-xs font-medium text-zinc-500">{slotSeleccionado.count} paquete{slotSeleccionado.count === 1 ? '' : 's'} actualmente</p>
                  </div>
                </div>
                <button onClick={() => setSlotSeleccionado(null)} className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-zinc-950 transition-colors shadow-sm"><IconTimes /></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-2 sm:p-3 bg-white custom-scrollbar">
                <div className="space-y-2">
                  {slotSeleccionado.pkgs.map((p) => (
                    <div key={p.id} className="p-3 bg-zinc-50 border border-zinc-100 rounded-xl flex items-center justify-between gap-3 group hover:bg-white transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-white border border-zinc-200 rounded-lg flex items-center justify-center text-brand-600 shadow-sm font-black text-xs shrink-0"><IconGrip /></div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-zinc-950 truncate uppercase tracking-tight">{revealedPkgs[p.id] || mostrarNombres ? p.nombre_cliente : (p.nombre_cliente?.substring(0, 1) + '***' + p.nombre_cliente?.slice(-1))}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                             <ImageFallback 
                                src={getCarrierLogo(p.empresa_transporte)}
                                fallbackText={getInitials(p.empresa_transporte)}
                                containerClassName="w-3.5 h-3.5 shrink-0"
                                imgClassName="max-w-full max-h-full object-contain"
                                fallbackClassName="bg-zinc-200 rounded text-[7px] font-bold text-zinc-500"
                             />
                             <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{p.empresa_transporte || 'Particular'}</span>
                             <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                             <span className="text-[10px] font-medium text-zinc-400">{new Date(p.fecha_llegada).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => toggleRevealOne(p.id)} className="p-1.5 text-zinc-400 hover:text-zinc-950 transition-colors">{revealedPkgs[p.id] || mostrarNombres ? <IconEyeSlash /> : <IconEye />}</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-3 bg-zinc-50 border-t border-zinc-100">
                <button onClick={() => setSlotSeleccionado(null)} className="w-full py-2.5 bg-zinc-950 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors uppercase tracking-wider text-xs active:scale-[0.97]">Cerrar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
