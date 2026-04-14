import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../utils/supabaseClient";
import { getTenantIdOrThrow } from "../../utils/tenant";
import { eliminarPaqueteBackend } from "../../services/paquetesService";
import { cargarUbicaciones } from "../../services/ubicacionesService";

// --- ICONOS ---
const IconGrid = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>;
const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const IconEye = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconEyeSlash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>;
const IconTrash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconExpand = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>;
const IconCollapse = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>;
const IconChevron = ({ expanded }) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${expanded ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>;

// --- LÓGICA DE MAPA DE CALOR (CALIBRADA CON AÑADIR PAQUETES) ---
const getShelfStyle = (count) => {
  if (count === 0) return { bgColor: 'bg-white border-zinc-200', tagColor: 'bg-zinc-100 text-zinc-500', titleColor: 'text-zinc-400' };
  if (count <= 4)  return { bgColor: 'bg-emerald-50/50 border-emerald-200', tagColor: 'bg-emerald-100 text-emerald-700', titleColor: 'text-zinc-900' };
  if (count <= 9)  return { bgColor: 'bg-amber-50/50 border-amber-200', tagColor: 'bg-amber-100 text-amber-700', titleColor: 'text-zinc-900' };
  if (count <= 14) return { bgColor: 'bg-orange-50/50 border-orange-200', tagColor: 'bg-orange-100 text-orange-700', titleColor: 'text-zinc-900' };
  return { bgColor: 'bg-red-50/50 border-red-200', tagColor: 'bg-red-100 text-red-700', titleColor: 'text-zinc-900' };
};

export default function VerEstantes() {
  const [loading, setLoading] = useState(true);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [paquetes, setPaquetes] = useState([]);

  const [search, setSearch] = useState("");
  const [ocultarVacias, setOcultarVacias] = useState(false);
  const [mostrarNombres, setMostrarNombres] = useState(false);
  const [expandedUbis, setExpandedUbis] = useState({});
  const [revealedPkgs, setRevealedPkgs] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const tId = await getTenantIdOrThrow();
      const { data: { session } } = await supabase.auth.getSession();
      const ubiRes = await cargarUbicaciones(session.access_token, tId);
      setUbicaciones(ubiRes.ubicaciones || []);

      // Descargamos todo el inventario vivo (bypass pagination)
      const { data: pkgs, error } = await supabase
        .from('packages')
        .select('*')
        .eq('tenant_id', tId)
        .eq('entregado', false);
      
      if (!error && pkgs) setPaquetes(pkgs);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const onDeletePkg = async (id) => {
    if (!window.confirm("¿Eliminar paquete?")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await eliminarPaqueteBackend(id, session.access_token);
      setPaquetes(prev => prev.filter(p => p.id !== id));
    } catch (e) { alert("Error"); }
  };

  const toggleExpand = (label) => setExpandedUbis(prev => ({ ...prev, [label]: !prev[label] }));
  const expandAll = () => { const all = {}; ubicaciones.forEach(u => all[u.label] = true); setExpandedUbis(all); };
  const collapseAll = () => setExpandedUbis({});
  const toggleRevealOne = (id) => setRevealedPkgs(prev => ({ ...prev, [id]: !prev[id] }));
  
  const toggleRevealAll = () => {
    if (mostrarNombres) { setMostrarNombres(false); setRevealedPkgs({}); } 
    else { setMostrarNombres(true); const all = {}; paquetes.forEach(p => all[p.id] = true); setRevealedPkgs(all); }
  };

  const processedUbis = useMemo(() => {
    const s = search.toLowerCase();
    return ubicaciones.map(ubi => {
      const lbl = String(ubi.label || '').toUpperCase();
      const pkgsInUbi = paquetes.filter(p => String(p.ubicacion_label || '').toUpperCase() === lbl);
      const matchUbi = lbl.toLowerCase().includes(s);
      const matchPkgs = pkgsInUbi.filter(p => (p.nombre_cliente || '').toLowerCase().includes(s) || (p.empresa_transporte || '').toLowerCase().includes(s));
      const isVisible = (matchUbi || matchPkgs.length > 0) && (!ocultarVacias || pkgsInUbi.length > 0);
      return { ...ubi, label: lbl, pkgs: s ? (matchUbi ? pkgsInUbi : matchPkgs) : pkgsInUbi, count: pkgsInUbi.length, isVisible };
    }).filter(u => u.isVisible).sort((a, b) => a.orden - b.orden);
  }, [ubicaciones, paquetes, search, ocultarVacias]);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-zinc-200 border-t-brand-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-8 font-sans pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-200/80">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-950 tracking-tight flex items-center gap-3 mb-1"><IconGrid /> Infraestructura</h1>
          <p className="text-sm font-medium text-zinc-500">Estado de carga real de tus estanterías.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:max-w-xs">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"><IconSearch /></div>
          <input type="text" placeholder="Buscar estante o cliente..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-medium text-sm text-zinc-900 transition-all"/>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <label className="flex items-center gap-2 cursor-pointer bg-zinc-50 px-4 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 transition-colors shrink-0">
            <input type="checkbox" checked={ocultarVacias} onChange={e => setOcultarVacias(e.target.checked)} className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500"/>
            <span className="text-xs font-bold text-zinc-700">Ocultar vacías</span>
          </label>
          <button onClick={toggleRevealAll} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-colors shrink-0 ${mostrarNombres ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'}`}>
            {mostrarNombres ? <IconEyeSlash /> : <IconEye />} {mostrarNombres ? 'Ocultar nombres' : 'Mostrar nombres'}
          </button>
          <div className="flex bg-zinc-50 border border-zinc-200 rounded-xl p-1 shrink-0">
            <button onClick={expandAll} className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-200 transition-colors" title="Expandir todo"><IconExpand /></button>
            <button onClick={collapseAll} className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-200 transition-colors" title="Contraer todo"><IconCollapse /></button>
          </div>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(220px, 1fr))` }}>
        {processedUbis.map(ubi => {
          const style = getShelfStyle(ubi.count);
          const isExpanded = expandedUbis[ubi.label];

          return (
            <div key={ubi.label} className={`rounded-2xl border transition-all shadow-sm overflow-hidden flex flex-col ${style.bgColor}`}>
              <div className="p-4 cursor-pointer flex flex-col justify-between h-full" onClick={() => ubi.count > 0 && toggleExpand(ubi.label)}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className={`text-xl font-black ${style.titleColor}`}>{ubi.label}</h4>
                  <button className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${ubi.count > 0 ? 'bg-white text-zinc-500 hover:bg-zinc-100 border border-zinc-200 shadow-sm' : 'opacity-0'}`}>
                    <IconChevron expanded={isExpanded} />
                  </button>
                </div>
                <div className="mt-auto">
                  <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${style.tagColor}`}>
                    {ubi.count} {ubi.count === 1 ? 'Paquete' : 'Paquetes'}
                  </span>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && ubi.count > 0 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-black/5 bg-white/50">
                    <div className="p-2 space-y-2">
                      {ubi.pkgs.map(p => {
                        const revealed = revealedPkgs[p.id];
                        return (
                          <div key={p.id} className="group relative bg-white border border-zinc-200 rounded-xl p-3 shadow-sm hover:border-brand-300 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-600 font-black text-xs flex items-center justify-center shrink-0">{(p.nombre_cliente || '').slice(0, 2).toUpperCase()}</div>
                              <div className="flex-1 min-w-0 pr-12">
                                <p className="text-xs font-bold text-zinc-900 truncate">{revealed ? p.nombre_cliente : '••••••••••••'}</p>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest truncate mt-0.5">{p.empresa_transporte || 'Otros'}</p>
                              </div>
                            </div>
                            <div className="absolute top-1/2 -translate-y-1/2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); toggleRevealOne(p.id); }} className="w-7 h-7 flex items-center justify-center bg-white border border-zinc-200 text-zinc-400 hover:text-zinc-900 rounded-lg shadow-sm">{revealed ? <IconEyeSlash /> : <IconEye />}</button>
                              <button onClick={(e) => { e.stopPropagation(); onDeletePkg(p.id); }} className="w-7 h-7 flex items-center justify-center bg-white border border-zinc-200 text-zinc-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-lg shadow-sm"><IconTrash /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}