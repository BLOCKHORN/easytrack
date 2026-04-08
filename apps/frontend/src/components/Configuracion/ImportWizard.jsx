import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../utils/supabaseClient';
import { getTenantIdOrThrow } from '../../utils/tenant';
import { importPreview, importCommit } from '../../services/importacionService';
import { cargarCarriers } from '../../services/configuracionService';

// ==========================================
// ICONOS CUSTOM
// ==========================================
const IconUploadCloud = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>;
const IconAlert = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconCheckCircle = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconArrowRight = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;

/* ---------- helpers ---------- */
const norm = (s='') => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

/* ---------- LinedTextarea (Premium Tailwind) ---------- */
function LinedTextarea({ value, onChange, placeholder = '', rows = 8 }) {
  const taRef = useRef(null);
  const gutterRef = useRef(null);
  const lineCount = (value?.split(/\r?\n/).length || 1);
  const linesArr = Array.from({ length: Math.max(lineCount, rows) }, (_, i) => i + 1);
  
  function syncScroll() {
    if (!taRef.current || !gutterRef.current) return;
    gutterRef.current.scrollTop = taRef.current.scrollTop;
  }

  return (
    <div className="flex border border-zinc-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 transition-all bg-white shadow-sm">
      <div ref={gutterRef} className="bg-zinc-50 border-r border-zinc-200 text-zinc-400 text-xs font-mono text-right py-4 px-3 select-none overflow-hidden min-w-[2.5rem]" aria-hidden>
        {linesArr.map(n => <div key={n} className="leading-6">{n}</div>)}
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={onChange}
        onScroll={syncScroll}
        rows={rows}
        placeholder={placeholder}
        className="flex-1 p-4 text-sm font-medium text-zinc-900 leading-6 outline-none resize-y min-h-[200px] whitespace-pre"
        spellCheck={false}
      />
    </div>
  );
}

/* ---------- Pills de confianza ---------- */
function ConfidencePill({ v = 0 }) {
  const n = Number.isFinite(v) ? v : 0;
  const tone = n >= 0.9 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
             : n >= 0.7 ? 'bg-amber-50 text-amber-700 border-amber-200' 
             : 'bg-red-50 text-red-700 border-red-200';
  return <span className={`px-2 py-0.5 rounded-md border text-[10px] font-black ${tone}`}>{(n * 100).toFixed(0)}%</span>;
}

export default function ImportWizard({ onDone, onToast }) {
  const [step, setStep] = useState(1);
  const [tenantId, setTenantId] = useState(null);
  const [token, setToken] = useState('');

  const [content, setContent] = useState('');
  const [rows, setRows] = useState([]);
  const [autoConfirm, setAutoConfirm] = useState(0.9);
  const [loading, setLoading] = useState(false);

  const [carriers, setCarriers] = useState([]);
  const [unknownCompanies, setUnknownCompanies] = useState([]);

  useEffect(() => {
    (async () => {
      const tId = await getTenantIdOrThrow();
      const { data: { session } } = await supabase.auth.getSession();
      const tk = session?.access_token || '';
      setTenantId(tId);
      setToken(tk);

      try {
        const list = await cargarCarriers({ tenantId: tId });
        setCarriers(list || []);
      } catch (e) {
        onToast?.('No se pudo cargar la lista de empresas.', 'error');
      }
    })().catch(() => {});
  }, []);

  const allowedCompanies = useMemo(() => {
    const set = new Set();
    carriers?.forEach(c => { if (c?.nombre) set.add(norm(c.nombre)); });
    return set;
  }, [carriers]);

  const validText = useMemo(() => content.trim().length > 0, [content]);

  function evaluateUnknowns(previewRows = []) {
    const missing = new Set();
    previewRows.forEach(r => {
      const emp = norm(r?.detected_empresa || '');
      if (emp && !allowedCompanies.has(emp)) missing.add(r.detected_empresa);
    });
    setUnknownCompanies(Array.from(missing).filter(Boolean).sort());
  }

  async function handlePreview() {
    if (!validText || !tenantId || !token) return;
    setLoading(true);
    try {
      const resp = await importPreview({ token, tenantId, content, source: 'txt' });
      const arr = resp?.rows || [];
      setRows(arr);
      evaluateUnknowns(arr);
      setStep(2);
      const count = resp?.count ?? arr.length;
      onToast?.(`Detectadas ${count} filas.`, 'success');
    } catch (err) {
      onToast?.('No se pudo analizar el texto.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (unknownCompanies.length > 0) {
      onToast?.(`Tienes empresas no configuradas: ${unknownCompanies.join(', ')}. Añádelas antes de importar.`, 'error');
      return;
    }
    if (!rows.length || !tenantId || !token) return;
    setLoading(true);
    try {
      const payload = rows.map((r, idx) => ({
        source: r.source,
        raw_text: r.raw_text,
        detected_nombre: r.detected_nombre,
        detected_empresa: r.detected_empresa,
        detected_ubicacion: r.detected_ubicacion,
        confidence: r.confidence,
        __line: r.__line ?? (idx + 1)
      }));
      const resp = await importCommit({ token, tenantId, rows: payload, autoConfirmIfGte: Number(autoConfirm) || 0.9 });
      onToast?.(`Creados: ${resp?.created || 0}. Pendientes: ${resp?.pending || 0}.`, 'success');
      setStep(3);
    } catch (err) {
      onToast?.(err?.message || 'Error al crear paquetes.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const rowHasUnknown = (r) => {
    const emp = norm(r?.detected_empresa || '');
    return !!emp && !allowedCompanies.has(emp);
  };

  // UI del Steps
  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-8 select-none">
      {[1, 2, 3].map((num, i) => (
        <div key={num} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-colors ${step >= num ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
            {num}
          </div>
          {i < 2 && <div className={`w-8 h-1 rounded-full transition-colors ${step > num ? 'bg-zinc-950' : 'bg-zinc-100'}`} />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-transparent">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h3 className="text-xl font-black text-zinc-950 flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-950 text-white rounded-xl flex items-center justify-center shadow-md"><IconUploadCloud /></div>
            Importación Masiva (IA)
          </h3>
          <p className="text-sm font-medium text-zinc-500 mt-2">Pega texto libre o CSV. El sistema detectará automáticamente nombres, empresas y huecos.</p>
        </div>
        <StepIndicator />
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Ejemplo de formato admitido (Una línea por paquete):</p>
              <div className="bg-zinc-900 text-emerald-400 font-mono text-sm p-4 rounded-xl leading-relaxed">
                Juan Perez - gls - B2<br/>
                Maria Garcia; seur; B1
              </div>
            </div>

            <LinedTextarea
              rows={8}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Pega tu listado aquí..."
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-50/50 p-4 rounded-2xl border border-zinc-200">
              <label className="flex items-center gap-3 text-sm font-bold text-zinc-700 w-full sm:w-auto">
                Autoconfirmar confianza ≥
                <input
                  type="number" step="0.05" min="0" max="1"
                  value={autoConfirm}
                  onChange={e => setAutoConfirm(e.target.value)}
                  className="w-20 px-3 py-2 bg-white border border-zinc-200 rounded-lg outline-none focus:border-brand-500 text-center"
                />
              </label>
              
              <button
                onClick={handlePreview}
                disabled={!validText || loading}
                className="w-full sm:w-auto px-8 py-3 bg-brand-500 hover:bg-brand-400 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-black rounded-xl transition-all shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2 active:scale-95"
              >
                {loading ? 'Analizando...' : 'Analizar Textos'} <IconArrowRight />
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
            
            {unknownCompanies.length > 0 && (
              <div className="bg-red-50 border border-red-200 p-5 rounded-2xl flex items-start gap-4">
                <div className="text-red-500 shrink-0"><IconAlert /></div>
                <div>
                  <h4 className="text-red-900 font-bold mb-1">Empresas no configuradas detectadas</h4>
                  <p className="text-red-700 text-sm font-medium mb-2">Para importar estas líneas debes configurar primero estas empresas en la sección inferior:</p>
                  <div className="flex flex-wrap gap-2">
                    {unknownCompanies.map(c => <span key={c} className="bg-white text-red-700 border border-red-200 px-2 py-1 rounded-md text-xs font-black uppercase tracking-wider">{c}</span>)}
                  </div>
                </div>
              </div>
            )}

            <p className="text-sm font-medium text-zinc-500">Revisa las filas detectadas. Las que superen el umbral se crearán directamente en el localizador.</p>

            <div className="bg-white border border-zinc-200 shadow-sm rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-zinc-50/80 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-100">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">Cliente / Nombre</th>
                      <th className="py-3 px-4">Empresa</th>
                      <th className="py-3 px-4">Ubicación</th>
                      <th className="py-3 px-4 text-right">Confianza</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {rows.map((r, i) => {
                      const idx = (r.__line ?? (i + 1));
                      const isUnknown = rowHasUnknown(r);
                      return (
                        <tr key={r.idTemp ?? `${idx}-${r.detected_nombre || ''}`} className={`hover:bg-zinc-50 transition-colors ${isUnknown ? 'bg-red-50/30' : ''}`}>
                          <td className="py-3 px-4 text-center text-xs font-bold text-zinc-400">{idx}</td>
                          <td className={`py-3 px-4 font-bold ${r.detected_nombre ? 'text-zinc-900' : 'text-zinc-300 italic'}`}>
                            {r.detected_nombre || 'Falta nombre'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${r.detected_empresa ? 'text-zinc-700' : 'text-zinc-300 italic'}`}>
                                {r.detected_empresa || 'Falta empresa'}
                              </span>
                              {isUnknown && <span className="bg-red-100 text-red-600 border border-red-200 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">No Configurada</span>}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-1 rounded-md text-xs font-black border ${r.detected_ubicacion ? 'bg-zinc-100 border-zinc-200 text-zinc-800' : 'bg-transparent border-transparent text-zinc-300 italic'}`}>
                              {r.detected_ubicacion || 'Sin hueco'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right"><ConfidencePill v={Number(r.confidence ?? 0)} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button onClick={() => setStep(1)} className="px-6 py-3 text-sm font-bold text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors">
                Volver y editar
              </button>
              <button
                onClick={handleCommit}
                disabled={!rows.length || loading || unknownCompanies.length > 0}
                className="px-8 py-3 bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-black rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2"
              >
                {loading ? 'Importando...' : 'Crear Paquetes'} <IconArrowRight />
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-12 bg-white border border-zinc-200 rounded-3xl shadow-sm text-center flex flex-col items-center justify-center">
            <div className="text-emerald-500 mb-6 drop-shadow-sm"><IconCheckCircle /></div>
            <h4 className="text-2xl font-black text-zinc-950 tracking-tight mb-2">¡Importación Completada!</h4>
            <p className="text-zinc-500 font-medium mb-8 max-w-sm">Los paquetes se han añadido correctamente a tu localizador y ya constan en tu inventario.</p>
            <div className="flex gap-4">
              <button onClick={() => { setContent(''); setRows([]); setStep(1); setUnknownCompanies([]); }} className="px-6 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold rounded-xl transition-colors">
                Importar más
              </button>
              <button onClick={() => onDone?.()} className="px-6 py-3 bg-zinc-950 hover:bg-zinc-800 text-white font-bold rounded-xl transition-colors shadow-md">
                Terminar y actualizar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}