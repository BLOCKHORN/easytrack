import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../utils/supabaseClient";
import { getTenantIdOrThrow } from "../../utils/tenant";
import { eliminarPaqueteBackend, editarPaqueteBackend } from "../../services/paquetesService";
import { cargarUbicaciones } from "../../services/ubicacionesService";

// --- SISTEMA DE CACHÉ EN MEMORIA (SWR) ---
let __SHELF_CACHE = {
  loaded: false,
  ubicaciones: [],
  paquetes: [],
  metaUbi: { cols: 5, order: 'horizontal' }
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
  const [slotSeleccionado, setSlotSeleccionado] = useState(null);
  const [revealedPkgs, setRevealedPkgs] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPkgId, setDraggedPkgId] = useState(null);
  const [hoveredUbi, setHoveredUbi] = useState(null); // <--- NUEVO ESTADO PARA EL BRILLO
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg, isError = false) => {
    setToastMsg({ msg, isError });
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    let cancel = false;
    const loadData = async () => {
      if (!__SHELF_CACHE.loaded) setLoading(true);
      try {
        const tId = await getTenantIdOrThrow();
        const { data: { session } } = await supabase.auth.getSession();
        
        const [ubiRes, pkgsRes] = await Promise.all([
          cargarUbicaciones(session.access_token, tId),
          supabase.from('packages').select('*').eq('tenant_id', tId).eq('entregado', false)
        ]);

        if (cancel) return;

        const newUbis = ubiRes.ubicaciones || [];
        const newPkgs = (!pkgsRes.error && pkgsRes.data) ? pkgsRes.data : [];
        const newMeta = { cols: ubiRes.meta?.cols ?? 5, order: ubiRes.meta?.order ?? ubiRes.meta?.orden ?? 'horizontal' };

        __SHELF_CACHE = { loaded: true, ubicaciones: newUbis, paquetes: newPkgs, metaUbi: newMeta };
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

  const onDeletePkg = async (id) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este paquete?")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await eliminarPaqueteBackend(id, session.access_token);
      
      const updatedPkgs = paquetes.filter(p => p.id !== id);
      setPaquetes(updatedPkgs);
      __SHELF_CACHE.paquetes = updatedPkgs;

      setSlotSeleccionado(prev => {
        if (!prev) return null;
        const remaining = prev.pkgs.filter(p => p.id !== id);
        if (remaining.length === 0) return null; 
        return { ...prev, pkgs: remaining, count: remaining.length };
      });
      showToast("Paquete eliminado");
    } catch (e) { 
      showToast("Error eliminando el paquete", true); 
    }
  };

  // --- NUEVA LÓGICA: DETECCIÓN POR EL CENTRO DE LA TARJETA ---
  const handleDrag = (e, info, pkg) => {
    const draggedEl = document.getElementById(`pkg-drag-${pkg.id}`);
    const panelEl = document.getElementById('inspector-panel');

    if (!draggedEl) return;

    // Calculamos el centro visual exacto de la tarjeta arrastrada
    const rect = draggedEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Ocultar temporalmente para que el raycast traspase
    draggedEl.style.visibility = 'hidden';
    if (panelEl) panelEl.style.pointerEvents = 'none';

    // Lanzar raycast desde el centro visual
    const el = document.elementFromPoint(centerX, centerY);

    // Restaurar inmediatamente
    draggedEl.style.visibility = 'visible';
    if (panelEl) panelEl.style.pointerEvents = '';

    const dropZone = el?.closest('[data-drop-ubi]');
    if (dropZone) {
      const targetLabel = dropZone.getAttribute('data-drop-ubi');
      if (hoveredUbi !== targetLabel) setHoveredUbi(targetLabel); // Activa el brillo
    } else {
      if (hoveredUbi !== null) setHoveredUbi(null); // Quita el brillo
    }
  };

  const handleDragEnd = async (e, info, pkg) => {
    setIsDragging(false);
    setDraggedPkgId(null);
    setHoveredUbi(null); // Limpiamos el estado visual
    
    const draggedEl = document.getElementById(`pkg-drag-${pkg.id}`);
    const panelEl = document.getElementById('inspector-panel');

    let targetLabel = null;
    let targetId = null;

    if (draggedEl) {
      const rect = draggedEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      draggedEl.style.visibility = 'hidden';
      if (panelEl) panelEl.style.pointerEvents = 'none';

      const el = document.elementFromPoint(centerX, centerY);

      draggedEl.style.visibility = 'visible';
      if (panelEl) panelEl.style.pointerEvents = '';

      const dropZone = el?.closest('[data-drop-ubi]');
      if (dropZone) {
        targetLabel = dropZone.getAttribute('data-drop-ubi');
        targetId = dropZone.getAttribute('data-drop-id') || null;
      }
    }

    if (targetLabel && targetLabel !== pkg.ubicacion_label) {
      moverPaquete(pkg, targetId, targetLabel);
    }
  };

  const moverPaquete = async (pkg, newId, newLabel) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const updatedPkgs = paquetes.map(p => 
        p.id === pkg.id ? { ...p, ubicacion_id: newId, ubicacion_label: newLabel } : p
      );
      setPaquetes(updatedPkgs);
      __SHELF_CACHE.paquetes = updatedPkgs;

      setSlotSeleccionado(prev => {
        if (!prev) return null;
        const remaining = prev.pkgs.filter(p => p.id !== pkg.id);
        if (remaining.length === 0) return null; 
        return { ...prev, pkgs: remaining, count: remaining.length };
      });

      showToast(`Movido a ${newLabel}`);

      await editarPaqueteBackend({
        id: pkg.id,
        nombre_cliente: pkg.nombre_cliente,
        empresa_transporte: pkg.empresa_transporte,
        ubicacion_id: newId,
        ubicacion_label: newLabel
      }, session.access_token);

    } catch (err) {
      showToast("Error al mover el paquete", true);
    }
  };

  const toggleRevealOne = (id) => setRevealedPkgs(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleRevealAll = () => {
    if (mostrarNombres) { 
      setMostrarNombres(false); setRevealedPkgs({}); 
    } else { 
      setMostrarNombres(true); const all = {}; paquetes.forEach(p => all[p.id] = true); setRevealedPkgs(all); 
    }
  };

  const cols = clamp(parseInt(metaUbi?.cols ?? 5, 10) || 5, 1, 12);
  const maxOrden = ubicaciones.reduce((max, u) => Math.max(max, u.orden ?? 0), -1);
  const totalSlots = cols * Math.max(1, Math.ceil((maxOrden + 1) / cols));

  const getShelfStyle = (count, isSelected, isHovered) => {
    // Si estás arrastrando y pasas por encima, forzamos este estilo visual
    if (isHovered) return { bgColor: 'bg-[#14B07E] border-[#14B07E] ring-4 ring-[#14B07E]/30 scale-[1.08] shadow-2xl z-30 transition-all duration-200', titleColor: 'text-white', countColor: 'text-emerald-100' };
    
    // Estilos normales
    if (isSelected) return { bgColor: 'bg-zinc-900 border-zinc-900 scale-[1.02] shadow-xl z-20', titleColor: 'text-white', countColor: 'text-zinc-400' };
    if (count === 0) return { bgColor: 'bg-white border-zinc-200', titleColor: 'text-zinc-400', countColor: 'text-zinc-400' };
    if (count <= 4)  return { bgColor: 'bg-[#E8F7F2] border-[#A7E2CE] hover:border-[#14B07E]', titleColor: 'text-zinc-900', countColor: 'text-[#0d7a56]' };
    if (count <= 9)  return { bgColor: 'bg-[#FFFBEB] border-[#FDE047] hover:border-amber-400', titleColor: 'text-zinc-900', countColor: 'text-amber-800' };
    return { bgColor: 'bg-[#FEF2F2] border-[#FECACA] hover:border-red-400', titleColor: 'text-zinc-900', countColor: 'text-red-800' };
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-zinc-200 border-t-[#14B07E] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 font-sans pb-20 relative min-h-screen">
      
      <AnimatePresence>
        {toastMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -50, x: '-50%' }} 
            animate={{ opacity: 1, y: 0, x: '-50%' }} 
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-24 left-1/2 z-[9999] px-5 sm:px-6 py-3 rounded-xl shadow-lg font-black text-white text-sm sm:text-base flex items-center gap-3 border ${toastMsg.isError ? 'bg-red-600 border-red-500' : 'bg-[#14B07E] border-[#14B07E]'} whitespace-nowrap`}
          >
            {toastMsg.isError ? <IconTimes /> : <IconCheck />}
            {toastMsg.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-200">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-zinc-950 tracking-tight flex items-center gap-3 mb-1">
            <IconGrid /> Infraestructura
          </h1>
          <p className="text-sm sm:text-base font-bold text-zinc-600">Estado de carga real. Selecciona para inspeccionar o arrastra paquetes.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:max-w-sm">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"><IconSearch /></div>
          <input type="text" placeholder="Buscar estante o cliente..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#14B07E] outline-none font-bold text-sm sm:text-base text-zinc-900 transition-colors placeholder:text-zinc-400"/>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors shrink-0">
            <input type="checkbox" checked={ocultarVacias} onChange={e => setOcultarVacias(e.target.checked)} className="w-4 h-4 rounded text-[#14B07E] border-zinc-300 focus:ring-[#14B07E]"/>
            <span className="text-xs font-black text-zinc-700 uppercase tracking-wider">Atenuar vacías</span>
          </label>
          <button onClick={toggleRevealAll} className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-colors shrink-0 ${mostrarNombres ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}>
            {mostrarNombres ? <IconEyeSlash /> : <IconEye />} {mostrarNombres ? 'Ocultar nombres' : 'Mostrar nombres'}
          </button>
        </div>
      </div>

      <div 
        className="grid gap-1.5 sm:gap-3 pb-4" 
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: totalSlots }).map((_, i) => {
          const u = ubicaciones.find(x => x.orden === i);
          
          if (!u) {
            return <div key={`empty-${i}`} className="opacity-0 pointer-events-none aspect-square sm:aspect-auto sm:min-h-[4rem]" />;
          }

          const lbl = String(u.label || '').toUpperCase();
          const pkgsInUbi = paquetes.filter(p => String(p.ubicacion_label || '').toUpperCase() === lbl);
          const count = pkgsInUbi.length;
          
          const isSelected = slotSeleccionado?.label === lbl;
          const isHovered = hoveredUbi === lbl; // <-- Comprobamos si está sobre esta caja
          
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
            <button
              key={u.id || `lbl-${u.label}`}
              type="button"
              data-drop-ubi={lbl}
              data-drop-id={u.id || ""}
              onClick={() => {
                if (isSelected) setSlotSeleccionado(null);
                else if (count > 0) setSlotSeleccionado({ ...u, label: lbl, pkgs: pkgsInUbi, count });
              }}
              className={`
                relative flex flex-col items-center justify-center py-3 sm:py-5 rounded-lg sm:rounded-xl transition-all border outline-none aspect-square sm:aspect-auto
                ${style.bgColor} ${fadeClass} ${count > 0 && !isHovered ? 'hover:scale-[1.02] hover:shadow-md cursor-pointer' : 'cursor-default'}
              `}
            >
              <span className={`text-sm sm:text-2xl font-black tracking-tight ${style.titleColor}`}>{lbl}</span>
              <span className={`text-[8px] sm:text-[10px] font-bold mt-0.5 uppercase tracking-wider ${style.countColor}`}>{count} paq.</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {slotSeleccionado && (
          <motion.div 
            id="inspector-panel"
            initial={{ opacity: 0, y: 50, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 50, scale: 0.95 }} 
            className="fixed bottom-[90px] left-4 right-4 md:left-auto md:right-8 md:top-32 md:bottom-8 md:w-[400px] z-50 flex flex-col max-h-[55vh] md:max-h-[calc(100vh-10rem)]"
          >
            <div className={`absolute inset-0 bg-white/95 backdrop-blur-3xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] border border-zinc-200 transition-opacity duration-300 pointer-events-none ${isDragging ? 'opacity-10' : 'opacity-100'}`} />

            <div className={`p-5 border-b border-zinc-200 flex items-center justify-between rounded-t-3xl shrink-0 relative z-10 transition-opacity duration-300 ${isDragging ? 'opacity-0 pointer-events-none' : 'opacity-100 bg-white/50'}`}>
              <div>
                <h3 className="text-xl font-black text-zinc-950 tracking-tight flex items-center gap-2">
                   Ubicación <span className="bg-[#14B07E]/10 text-[#14B07E] border border-[#14B07E]/20 px-2 py-0.5 rounded shadow-sm">{slotSeleccionado.label}</span>
                </h3>
                <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase tracking-widest">{slotSeleccionado.count} paquetes • Arrastra para mover</p>
              </div>
              <button onClick={() => setSlotSeleccionado(null)} className="w-10 h-10 flex items-center justify-center bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 rounded-xl transition-colors shadow-sm active:scale-95"><IconTimes /></button>
            </div>
            
            <div className={`p-4 sm:p-5 flex-1 space-y-3 rounded-b-3xl relative z-10 min-h-0 ${isDragging ? 'overflow-visible' : 'overflow-y-auto'}`}>
              {slotSeleccionado.pkgs.map(p => {
                const revealed = revealedPkgs[p.id];
                const isThisDragging = draggedPkgId === p.id;
                
                return (
                  <motion.div 
                    key={p.id} 
                    id={`pkg-drag-${p.id}`}
                    layout
                    drag
                    dragSnapToOrigin
                    dragElastic={0.2}
                    onDragStart={() => { setIsDragging(true); setDraggedPkgId(p.id); }}
                    onDrag={(e, info) => handleDrag(e, info, p)} // <--- NUEVO EVENTO TRACKEANDO EL DRAG
                    onDragEnd={(e, info) => handleDragEnd(e, info, p)}
                    whileDrag={{ 
                      scale: 1.05, 
                      zIndex: 9999, 
                      cursor: 'grabbing',
                      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)"
                    }}
                    className={`group relative bg-white border border-zinc-200 rounded-xl p-4 shadow-sm hover:border-[#14B07E] transition-colors cursor-grab active:cursor-grabbing ${isDragging && !isThisDragging ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                  >
                    <div className="absolute top-3 right-3 text-zinc-300 group-hover:text-zinc-400 pointer-events-none">
                      <IconGrip />
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-500 font-black text-sm flex items-center justify-center shrink-0 pointer-events-none">
                        {(p.nombre_cliente || '').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0 pr-12 pointer-events-none">
                        <p className="text-base font-bold text-zinc-900 truncate">
                          {revealed || mostrarNombres ? p.nombre_cliente : '••••••••••••'}
                        </p>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest truncate mt-0.5">
                          {p.empresa_transporte || 'Otros'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="absolute bottom-3 right-3 flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-white pl-2">
                      <button onClick={(e) => { e.stopPropagation(); toggleRevealOne(p.id); }} onPointerDown={e => e.stopPropagation()} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 border border-transparent hover:border-zinc-200 rounded-lg transition-colors" title="Mostrar/Ocultar">
                        {revealed || mostrarNombres ? <IconEyeSlash /> : <IconEye />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDeletePkg(p.id); }} onPointerDown={e => e.stopPropagation()} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg transition-colors" title="Eliminar">
                        <IconTrash />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
            
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}