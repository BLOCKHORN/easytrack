import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../utils/supabaseClient";
import { getTenantIdOrThrow } from "../../utils/tenant";
import { obtenerPaquetesBackend, eliminarPaqueteBackend } from "../../services/paquetesService";
import { cargarUbicaciones } from "../../services/ubicacionesService";

// ==========================================
// ICONOS CUSTOM (SVGs Premium)
// ==========================================
const IconGrid = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>;
const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const IconTimes = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconChevron = ({ open }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}><path d="m6 9 6 6 6-6"/></svg>;
const IconEye = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconEyeSlash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20"/></svg>;
const IconTrash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconArrowsExpand = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>;
const IconArrowsCollapse = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6"/><path d="M20 10h-6V4"/><path d="M14 10l7-7"/><path d="M3 21l7-7"/></svg>;

// ==========================================
// HELPERS ALGORÍTMICOS (Restaurados 100%)
// ==========================================
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clamp = (v,min,max) => Math.max(min, Math.min(max, v));
const isPending = (p) => p?.entregado === false || p?.entregado == null;

const hexToRgba = (hex = "#6b7280", a = 0.1) => {
  const h = String(hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return `rgba(0,0,0,${a})`;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const normHex = (hex, fb = "#2563eb") => {
  const v = String(hex || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^[0-9a-fA-F]{6}$/.test(v)) return `#${v}`;
  return fb;
};

const highlight = (str = "", q = "") => {
  const t = q.trim().toLowerCase();
  const s = String(str ?? "");
  if (!t) return s;
  const i = s.toLowerCase().indexOf(t);
  if (i === -1) return s;
  return (<>{s.slice(0, i)}<mark className="bg-brand-200 text-brand-900 rounded px-0.5">{s.slice(i, i + t.length)}</mark>{s.slice(i + t.length)}</>);
};

const buildPosToIdx = (count, cols, orientation) => {
  const n = Math.max(0, count|0), c = Math.max(1, cols|0);
  if (orientation === 'horizontal') return Array.from({length:n}, (_,p)=>p);
  const rows = Math.ceil(n/c), orderPos = [];
  for (let col=0; col<c; col++) for (let row=0; row<rows; row++) {
    const pos = row*c + col; if (pos<n) orderPos.push(pos);
  }
  const posToIdx = Array(n).fill(0);
  orderPos.forEach((pos,idx)=>{ posToIdx[pos]=idx; });
  return posToIdx;
};

const idxFromLabel = (label) => {
  const m = /^B\s*(\d+)$/i.exec(String(label||'').trim());
  return m ? (parseInt(m[1],10)-1) : null;
};

function makeVisualUbicaciones(rawUbis, meta) {
  const cols = clamp(parseInt(meta?.cols ?? 5,10) || 5, 1, 12);
  const order = (meta?.order || meta?.orden) === 'vertical' ? 'vertical' : 'horizontal';
  const sorted = (rawUbis || []).map((u,i)=>({
    id: u.id || u.ubicacion_id || u.uuid || `temp-${i}`,
    label: String(u.label || u.codigo || `B${i+1}`).toUpperCase(),
    orden: num(u.orden, i),
    activo: u.activo ?? true
  }));
  const count = sorted.length;
  const byIdx = Array(count).fill(null);
  for (const u of sorted) {
    const k = idxFromLabel(u.label);
    if (k != null && k>=0 && k<count) byIdx[k] = u;
  }
  for (let k=0;k<count;k++) if(!byIdx[k]) byIdx[k] = { id:`ghost-${k}`, label:`B${k+1}`, orden:k, activo:true };
  const posToIdx = buildPosToIdx(count, cols, order);
  const visual = Array.from({length:count}, (_,pos)=>byIdx[posToIdx[pos]]);
  return { visual, cols, order };
}

const getOccStyles = (n) => {
  if (n === 0) return { bg: "bg-zinc-50 hover:bg-zinc-100", border: "border-zinc-200", text: "text-zinc-500", badge: "bg-zinc-100 text-zinc-500 border-zinc-200" };
  if (n <= 4) return { bg: "bg-emerald-50 hover:bg-emerald-100/60", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  if (n <= 9) return { bg: "bg-amber-50 hover:bg-amber-100/60", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-700 border-amber-200" };
  return { bg: "bg-red-50 hover:bg-red-100/60", border: "border-red-200", text: "text-red-700", badge: "bg-red-100 text-red-700 border-red-200" };
};


export default function VerEstantes() {
  const [rawUbicaciones, setRawUbicaciones] = useState([]);
  const [metaUbi, setMetaUbi] = useState({ cols: 5, order: 'horizontal' });

  const { visual: ubicaciones, cols: gridCols } = useMemo(
    () => makeVisualUbicaciones(rawUbicaciones, metaUbi),
    [rawUbicaciones, metaUbi]
  );

  const [pkgsByUbiId, setPkgsByUbiId] = useState({});
  const [coloresCompania, setColoresCompania] = useState(() => new Map());
  const getCompColor = (name) => normHex(coloresCompania.get(name), "#2dd4bf"); // Default a Teal/Brand en vez de azul genérico

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [soloConPkgs, setSoloConPkgs] = useState(false);
  const [openSet, setOpenSet] = useState(() => new Set());
  const [revealAll, setRevealAll] = useState(false);
  const [revealedSet, setRevealedSet] = useState(() => new Set());
  const [authToken, setAuthToken] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      setCargando(true); setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("No hay sesión activa.");
        setAuthToken(token);
        const tenantId = await getTenantIdOrThrow();

        const { ubicaciones: ubis = [], meta = {} } = await cargarUbicaciones(token, tenantId);
        if (cancel) return;
        setRawUbicaciones(ubis || []);
        setMetaUbi({ cols: meta?.cols ?? 5, order: meta?.order ?? meta?.orden ?? 'horizontal' });

        const paquetes = await obtenerPaquetesBackend(token).catch(() => []);
        if (cancel) return;

        const { data: empresasRows } = await supabase.from("empresas_transporte_tenant").select("nombre,color").eq("tenant_id", tenantId);
        const colMap = new Map();
        (empresasRows || []).forEach(e => colMap.set(e?.nombre, normHex(e?.color || "#2dd4bf")));
        setColoresCompania(colMap);

        const ubisVisual = makeVisualUbicaciones(ubis || [], meta || {}).visual;
        const byId = new Map(ubisVisual.map(u => [String(u.id), u]));
        const byLabel = new Map(ubisVisual.map(u => [String(u.label).toUpperCase(), u]));
        const buckets = {};
        for (const p of (paquetes || [])) {
          if (!isPending(p)) continue;
          const idRaw = p?.ubicacion_id ?? p?.balda_id ?? null;
          const labelRaw = (p?.ubicacion_label ?? p?.compartimento ?? p?.baldas?.codigo ?? "").toUpperCase();
          let u = null;
          if (idRaw != null && byId.has(String(idRaw))) u = byId.get(String(idRaw));
          else if (labelRaw && byLabel.has(labelRaw)) u = byLabel.get(labelRaw);
          if (!u) continue;
          (buckets[u.id] ||= []).push({
            id: p.id,
            nombre_cliente: p.nombre_cliente ?? "",
            empresa_transporte: p.empresa_transporte ?? p.compania ?? "",
            fecha_llegada: p.fecha_llegada ?? p.created_at ?? null,
          });
        }
        if (cancel) return;
        setPkgsByUbiId(buckets);
      } catch (e) {
        if (!cancel) setError(e?.message || "No se pudo cargar la vista de ubicaciones");
      } finally {
        if (!cancel) setCargando(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  const qLower = q.trim().toLowerCase();
  const visibleUbicaciones = useMemo(() => {
    return ubicaciones.filter(u => {
      const arr = pkgsByUbiId[u.id] || [];
      if (soloConPkgs && arr.length === 0 && !u.id.startsWith('ghost-')) return false; 
      if (u.id.startsWith('ghost-') && soloConPkgs) return false; // Fantasmas se ocultan si "solo con paquetes"
      if (!qLower) return true;
      if (u.id.startsWith('ghost-')) return false; // No mostrar fantasmas en búsqueda activa
      const hitLabel = (u.label || "").toLowerCase().includes(qLower);
      const hitCli = arr.some(p => (p?.nombre_cliente || "").toLowerCase().includes(qLower));
      const hitComp = arr.some(p => (p?.empresa_transporte || "").toLowerCase().includes(qLower));
      return hitLabel || hitCli || hitComp;
    });
  }, [ubicaciones, pkgsByUbiId, qLower, soloConPkgs]);

  const toggleRevealAll = () => { setRevealAll(prev => !prev); setRevealedSet(new Set()); };
  const toggleRevealOne = (id) => {
    if (revealAll) return;
    setRevealedSet(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const expandAll = () => { const set = new Set(); visibleUbicaciones.forEach(u => {if(!u.id.startsWith('ghost-')) set.add(u.id);}); setOpenSet(set); };
  const collapseAll = () => setOpenSet(new Set());

  const onDeletePkg = async (pkgId) => {
    if (!window.confirm("¿Eliminar este paquete? Esta acción no se puede deshacer.")) return;
    try {
      await eliminarPaqueteBackend(pkgId, authToken);
      setPkgsByUbiId(prev => {
        const next = { ...prev };
        for (const k of Object.keys(next)) next[k] = (next[k] || []).filter(p => p.id !== pkgId);
        return next;
      });
    } catch (e) {
      alert("No se pudo eliminar el paquete.");
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* HEADER & KPIS */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-6 border-b border-zinc-200/80">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-950 tracking-tight flex items-center gap-3">
             <div className="text-zinc-950"><IconGrid /></div> Infraestructura Física
          </h1>
          <p className="text-sm font-medium text-zinc-500 mt-1">El mapa de tu local respeta la configuración real de estantes.</p>
        </div>
        
        <div className="flex items-center gap-4 text-xs font-bold text-zinc-500 uppercase tracking-widest bg-white px-5 py-3 rounded-2xl border border-zinc-200/80 shadow-sm">
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-zinc-200"/> Vacía</div>
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400"/> Baja</div>
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-amber-400"/> Media</div>
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"/> Alta</div>
        </div>
      </div>

      {/* TOOLBAR AVANZADA */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-center">
        <div className="relative w-full xl:w-96 flex-shrink-0">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-400"><IconSearch /></div>
          <input 
            type="text" placeholder="Buscar ubicación, cliente o empresa..." value={q} onChange={(e) => setQ(e.target.value)} 
            className="w-full pl-12 pr-10 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-bold text-zinc-900 transition-all" 
          />
          {q && <button onClick={() => setQ("")} className="absolute inset-y-0 right-3 flex items-center justify-center text-zinc-400 hover:text-zinc-600"><IconTimes /></button>}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <label className="flex items-center justify-center gap-2 w-full sm:w-auto bg-zinc-50 px-4 py-3 rounded-xl border border-zinc-200 cursor-pointer select-none hover:bg-zinc-100 transition-colors">
            <input type="checkbox" checked={soloConPkgs} onChange={(e) => setSoloConPkgs(e.target.checked)} className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4" />
            <span className="text-sm font-bold text-zinc-700 whitespace-nowrap">Ocultar vacías</span>
          </label>

          <button onClick={toggleRevealAll} className={`w-full sm:w-auto px-4 py-3 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 ${revealAll ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'}`}>
            {revealAll ? <IconEyeSlash /> : <IconEye />} {revealAll ? 'Ocultar nombres' : 'Mostrar nombres'}
          </button>

          <div className="flex w-full sm:w-auto gap-2">
            <button onClick={expandAll} className="flex-1 sm:flex-none px-4 py-3 bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2" title="Expandir todas">
              <IconArrowsExpand />
            </button>
            <button onClick={collapseAll} className="flex-1 sm:flex-none px-4 py-3 bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2" title="Contraer todas">
              <IconArrowsCollapse />
            </button>
          </div>
        </div>
      </div>

      {/* MATRIX RENDER (Fiel a la configuración física) */}
      {cargando ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${gridCols || 5}, minmax(0, 1fr))` }}>
          {[...Array((gridCols||5)*2)].map((_, i) => <div key={i} className="h-24 bg-zinc-100 rounded-2xl border border-zinc-200 animate-pulse"></div>)}
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-2xl font-bold">{error}</div>
      ) : visibleUbicaciones.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 font-medium bg-white rounded-2xl border border-zinc-200/80 border-dashed">No se encontraron ubicaciones que coincidan con la búsqueda.</div>
      ) : (
        <div className="w-full overflow-x-auto pb-4">
          <div className="grid gap-3 min-w-[800px]" style={{ gridTemplateColumns: `repeat(${gridCols || 5}, minmax(0, 1fr))` }}>
            {visibleUbicaciones.map(u => {
              // HUECO FANTASMA (Para mantener el layout físico)
              if (u.id.startsWith('ghost-')) {
                return (
                  <div key={u.id} className="rounded-2xl border-2 border-dashed border-zinc-200/60 bg-zinc-50/30 flex items-center justify-center min-h-[90px] opacity-60">
                    <span className="text-zinc-300 font-black text-xl tracking-tight select-none">{u.label}</span>
                  </div>
                );
              }

              // HUECO REAL
              const arr = pkgsByUbiId[u.id] || [];
              const n = arr.length;
              const open = openSet.has(u.id);
              const styles = getOccStyles(n);

              return (
                <div key={u.id} className={`rounded-2xl border ${styles.border} ${open ? 'shadow-md ring-4 ring-zinc-950/5 z-10' : 'shadow-sm z-0'} bg-white overflow-hidden flex flex-col transition-all duration-300 h-fit`}>
                  
                  <button 
                    onClick={() => setOpenSet(prev => { const nset = new Set(prev); nset.has(u.id) ? nset.delete(u.id) : nset.add(u.id); return nset; })} 
                    className={`p-4 w-full cursor-pointer flex flex-col items-start justify-between transition-colors outline-none ${styles.bg}`}
                  >
                    <div className="flex w-full justify-between items-center mb-2">
                      <span className={`text-2xl font-black tracking-tight ${styles.text}`}>{highlight(u.label, q)}</span>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${open ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-400 shadow-sm border border-zinc-200'}`}>
                        <IconChevron open={open} />
                      </div>
                    </div>
                    
                    <div className={`px-2.5 py-1 rounded-md border text-[10px] font-black uppercase tracking-widest ${styles.badge}`}>
                      {n} Paquete{n !== 1 ? 's' : ''}
                    </div>
                  </button>

                  {/* LISTA DESPLEGABLE DE PAQUETES */}
                  <AnimatePresence>
                    {open && n > 0 && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-zinc-100 bg-white">
                        <div className="p-2 space-y-2">
                          {arr.map(p => {
                            const revealed = revealAll || revealedSet.has(p.id);
                            const hex = getCompColor(p.empresa_transporte);
                            const rgba = hexToRgba(hex, 0.15);

                            return (
                              <div key={p.id} className="group relative bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 p-3 rounded-xl transition-colors">
                                <div className="pr-16">
                                  <div className={`text-sm font-bold text-zinc-950 truncate transition-all duration-300 ${revealed ? '' : 'blur-[5px] select-none opacity-60'}`}>
                                    {highlight(p.nombre_cliente || "—", q)}
                                  </div>
                                  
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border truncate max-w-[120px]" style={{ backgroundColor: rgba, borderColor: hexToRgba(hex, 0.3), color: hex }}>
                                      <div className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: hex }} />
                                      {p.empresa_transporte || "—"}
                                    </span>
                                    <span className="text-[10px] font-semibold text-zinc-400">
                                      {p.fecha_llegada ? new Date(p.fecha_llegada).toLocaleDateString() : ""}
                                    </span>
                                  </div>
                                </div>

                                {/* Acciones (Ocultas por defecto, visibles en hover) */}
                                <div className="absolute top-1/2 -translate-y-1/2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => toggleRevealOne(p.id)} className="w-7 h-7 flex items-center justify-center bg-white border border-zinc-200 text-zinc-400 hover:text-zinc-900 hover:border-zinc-400 rounded-md transition-all shadow-sm">
                                    {revealed ? <IconEyeSlash /> : <IconEye />}
                                  </button>
                                  <button onClick={() => onDeletePkg(p.id)} className="w-7 h-7 flex items-center justify-center bg-white border border-zinc-200 text-zinc-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-md transition-all shadow-sm">
                                    <IconTrash />
                                  </button>
                                </div>
                              </div>
                            )
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
      )}
    </div>
  );
}