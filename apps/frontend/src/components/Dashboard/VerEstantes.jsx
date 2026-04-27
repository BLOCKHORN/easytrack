import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../utils/supabaseClient";
import { getTenantIdOrThrow } from "../../utils/tenant";
import { eliminarPaqueteBackend } from "../../services/paquetesService";
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

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// --- LÓGICA DE MAPA DE CALOR (SOBRIA, TIPO B2B) ---
const getShelfStyle = (count) => {
  if (count === 0) return { bgColor: 'bg-white border-zinc-200', titleColor: 'text-zinc-400', countColor: 'text-zinc-400' };
  if (count <= 4)  return { bgColor: 'bg-[#E8F7F2] border-[#A7E2CE]', titleColor: 'text-zinc-900', countColor: 'text-[#0d7a56]' };
  if (count <= 9)  return { bgColor: 'bg-[#FFFBEB] border-[#FDE047]', titleColor: 'text-zinc-900', countColor: 'text-amber-800' };
  return { bgColor: 'bg-[#FEF2F2] border-[#FECACA]', titleColor: 'text-zinc-900', countColor: 'text-red-800' };
};

export default function VerEstantes() {
  const [loading, setLoading] = useState(!__SHELF_CACHE.loaded);
  const [ubicaciones, setUbicaciones] = useState(__SHELF_CACHE.ubicaciones);
  const [paquetes, setPaquetes] = useState(__SHELF_CACHE.paquetes);
  const [metaUbi, setMetaUbi] = useState(__SHELF_CACHE.metaUbi);

  const [search, setSearch] = useState("");
  const [ocultarVacias, setOcultarVacias] = useState(false);
  const [mostrarNombres, setMostrarNombres] = useState(false);
  
  // Estado para el modal
  const [slotSeleccionado, setSlotSeleccionado] = useState(null);
  const [revealedPkgs, setRevealedPkgs] = useState({});

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

        __SHELF_CACHE = {
          loaded: true,
          ubicaciones: newUbis,
          paquetes: newPkgs,
          metaUbi: newMeta
        };

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

      // Actualizar modal si está abierto
      setSlotSeleccionado(prev => {
        if (!prev) return null;
        const remaining = prev.pkgs.filter(p => p.id !== id);
        if (remaining.length === 0) return null; 
        return { ...prev, pkgs: remaining, count: remaining.length };
      });
    } catch (e) { 
      alert("Error eliminando el paquete."); 
    }
  };

  const toggleRevealOne = (id) => setRevealedPkgs(prev => ({ ...prev, [id]: !prev[id] }));
  
  const toggleRevealAll = () => {
    if (mostrarNombres) { 
      setMostrarNombres(false); 
      setRevealedPkgs({}); 
    } else { 
      setMostrarNombres(true); 
      const all = {}; 
      paquetes.forEach(p => all[p.id] = true); 
      setRevealedPkgs(all); 
    }
  };

  const cols = clamp(parseInt(metaUbi?.cols ?? 5, 10) || 5, 1, 12);
  const maxOrden = ubicaciones.reduce((max, u) => Math.max(max, u.orden ?? 0), -1);
  const totalSlots = cols * Math.max(1, Math.ceil((maxOrden + 1) / cols));

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-zinc-200 border-t-[#14B07E] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 font-sans pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-200">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-zinc-950 tracking-tight flex items-center gap-3 mb-1">
            <IconGrid /> Infraestructura
          </h1>
          <p className="text-sm sm:text-base font-bold text-zinc-600">Estado de carga real de tus ubicaciones.</p>
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

      {/* MAPA VISUAL ESTILO PLANO DE LA CONFIGURACIÓN */}
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
          
          // Lógica de Búsqueda y Atenuación
          const s = search.toLowerCase();
          let isMatch = true;
          
          if (s) {
            const matchUbi = lbl.toLowerCase().includes(s);
            const matchPkgs = pkgsInUbi.some(p => (p.nombre_cliente || '').toLowerCase().includes(s) || (p.empresa_transporte || '').toLowerCase().includes(s));
            isMatch = matchUbi || matchPkgs;
          }
          
          if (ocultarVacias && count === 0) {
            isMatch = false;
          }

          const style = getShelfStyle(count);
          // Si no hay match o está vacío (y el filtro lo pide), lo atenuamos sin romper el layout
          const fadeClass = isMatch ? '' : 'opacity-25 grayscale pointer-events-none';

          return (
            <button
              key={u.id || `lbl-${u.label}`}
              type="button"
              onClick={() => count > 0 && setSlotSeleccionado({ ...u, label: lbl, pkgs: pkgsInUbi, count })}
              className={`
                relative flex flex-col items-center justify-center py-3 sm:py-5 rounded-lg sm:rounded-xl transition-all border outline-none aspect-square sm:aspect-auto
                ${style.bgColor} ${fadeClass} ${count > 0 ? 'hover:scale-[1.02] hover:shadow-md hover:border-[#14B07E] cursor-pointer z-10' : 'cursor-default'}
              `}
            >
              <span className={`text-sm sm:text-2xl font-black tracking-tight ${style.titleColor}`}>{lbl}</span>
              <span className={`text-[8px] sm:text-[10px] font-bold mt-0.5 uppercase tracking-wider ${style.countColor}`}>{count} paq.</span>
            </button>
          );
        })}
      </div>

      {/* MODAL B2B DE GESTIÓN DEL ESTANTE */}
      <AnimatePresence>
        {slotSeleccionado && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setSlotSeleccionado(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white rounded-3xl shadow-xl w-full max-w-xl flex flex-col overflow-hidden border border-zinc-200 max-h-[85vh]">
              
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50 shrink-0">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight flex items-center gap-2">
                     Ubicación <span className="bg-zinc-200 px-2 py-0.5 rounded text-zinc-800">{slotSeleccionado.label}</span>
                  </h3>
                  <p className="text-[10px] sm:text-xs font-bold text-zinc-500 mt-1 uppercase tracking-widest">{slotSeleccionado.count} paquetes almacenados</p>
                </div>
                <button onClick={() => setSlotSeleccionado(null)} className="w-10 h-10 flex items-center justify-center bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 rounded-xl transition-colors shadow-sm"><IconTimes /></button>
              </div>
              
              <div className="p-4 sm:p-6 overflow-y-auto bg-zinc-50/30 space-y-3">
                {slotSeleccionado.pkgs.map(p => {
                  const revealed = revealedPkgs[p.id];
                  return (
                    <div key={p.id} className="group relative bg-white border border-zinc-200 rounded-xl p-4 shadow-sm hover:border-[#14B07E] transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-500 font-black text-sm flex items-center justify-center shrink-0">
                          {(p.nombre_cliente || '').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 pr-16">
                          <p className="text-base font-bold text-zinc-900 truncate">
                            {revealed || mostrarNombres ? p.nombre_cliente : '••••••••••••'}
                          </p>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest truncate mt-0.5">
                            {p.empresa_transporte || 'Otros'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="absolute top-1/2 -translate-y-1/2 right-3 flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-white pl-2">
                        <button onClick={(e) => { e.stopPropagation(); toggleRevealOne(p.id); }} className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 border border-transparent hover:border-zinc-200 rounded-lg transition-colors" title="Mostrar/Ocultar">
                          {revealed || mostrarNombres ? <IconEyeSlash /> : <IconEye />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDeletePkg(p.id); }} className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg transition-colors" title="Eliminar">
                          <IconTrash />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}