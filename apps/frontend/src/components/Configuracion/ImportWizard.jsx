import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../utils/supabaseClient';
import { getTenantIdOrThrow } from '../../utils/tenant';
import { importPreview, importCommit } from '../../services/importacionService';
import { cargarCarriers } from '../../services/configuracionService';

// ==========================================
// ICONOS CUSTOM (MINIMALISTAS)
// ==========================================
const IconSparkles = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>;
const IconAlert = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IconCheck = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconArrow = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;

/* ---------- helpers ---------- */
const norm = (s='') => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

export default function ImportWizard({ onDone, onToast }) {
  const [step, setStep] = useState(1);
  const [tenantId, setTenantId] = useState(null);
  const [token, setToken] = useState('');

  const [content, setContent] = useState('');
  const [rows, setRows] = useState([]);
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
      onToast?.(`Hemos detectado ${count} paquetes listos para revisar.`, 'success');
    } catch (err) {
      onToast?.('No hemos podido entender el texto. Intenta revisar el formato.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (unknownCompanies.length > 0) {
      onToast?.(`Tienes empresas de reparto sin configurar: ${unknownCompanies.join(', ')}.`, 'error');
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
      const resp = await importCommit({ token, tenantId, rows: payload, autoConfirmIfGte: 0.8 });
      onToast?.(`Se han guardado ${resp?.created || 0} paquetes nuevos en el almacén.`, 'success');
      setStep(3);
    } catch (err) {
      onToast?.('Hubo un error al guardar los paquetes.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const rowHasUnknown = (r) => {
    const emp = norm(r?.detected_empresa || '');
    return !!emp && !allowedCompanies.has(emp);
  };

  const StepIndicator = () => (
    <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest select-none">
      <span className={step >= 1 ? 'text-zinc-900' : 'text-zinc-300'}>1. Pega</span>
      <span className="text-zinc-200">/</span>
      <span className={step >= 2 ? 'text-zinc-900' : 'text-zinc-300'}>2. Revisa</span>
      <span className="text-zinc-200">/</span>
      <span className={step >= 3 ? 'text-zinc-900' : 'text-zinc-300'}>3. Listo</span>
    </div>
  );

  return (
    <section className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm overflow-hidden font-sans">
      <header className="p-6 md:p-8 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-lg font-black text-zinc-950 flex items-center gap-2">
            <span className="text-brand-500"><IconSparkles /></span> Añadir Múltiples Paquetes
          </h3>
          <p className="text-zinc-500 font-medium text-sm mt-1">Pega tu listado y el sistema extraerá los datos automáticamente.</p>
        </div>
        <StepIndicator />
      </header>

      <div className="p-6 md:p-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
              
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                  <label className="text-sm font-bold text-zinc-900">Listado de paquetes</label>
                  <span className="text-xs text-zinc-500 font-medium">Asegúrate de incluir en este orden: <strong className="text-zinc-700 font-bold">Nombre - Agencia - Ubicación</strong></span>
                </div>
                
                <div className="bg-zinc-50 border border-zinc-200 focus-within:border-zinc-400 rounded-xl transition-colors overflow-hidden">
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Ejemplo:&#10;Juan Perez - Correos - B3&#10;Maria Lopez - Seur - C12"
                    className="w-full min-h-[160px] p-5 bg-transparent text-zinc-700 leading-relaxed outline-none resize-y text-sm font-mono placeholder:text-zinc-400"
                    spellCheck={false}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handlePreview}
                  disabled={!validText || loading}
                  className="px-6 py-2.5 bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400 text-white font-black rounded-xl transition-all flex items-center gap-2 uppercase tracking-widest text-[11px]"
                >
                  {loading ? 'Leyendo...' : 'Siguiente Paso'} <IconArrow />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
              
              <div className="mb-2">
                <h4 className="text-sm font-black text-zinc-950">Comprueba que todo esté correcto</h4>
                <p className="text-xs font-medium text-zinc-500 mt-1">El sistema ha extraído estos datos. Échales un vistazo antes de guardarlos.</p>
              </div>

              {unknownCompanies.length > 0 && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3">
                  <div className="text-red-500 shrink-0"><IconAlert /></div>
                  <div>
                    <h4 className="text-red-900 font-bold text-sm">Faltan algunas agencias</h4>
                    <p className="text-red-700/80 text-xs font-medium mt-1 mb-2">Añade estas agencias en la sección inferior antes de continuar:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {unknownCompanies.map(c => <span key={c} className="bg-white text-red-700 border border-red-200 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest">{c}</span>)}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead className="sticky top-0 bg-zinc-50">
                      <tr className="border-b border-zinc-200 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        <th className="py-3 px-4">Cliente</th>
                        <th className="py-3 px-4">Agencia</th>
                        <th className="py-3 px-4 text-right">Ubicación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {rows.map((r, i) => {
                        const idx = (r.__line ?? (i + 1));
                        const isUnknown = rowHasUnknown(r);
                        return (
                          <tr key={r.idTemp ?? `${idx}-${r.detected_nombre || ''}`} className={`hover:bg-zinc-50 transition-colors ${isUnknown ? 'bg-red-50/30' : ''}`}>
                            <td className="py-3 px-4 flex items-center gap-2">
                               <span className="text-[10px] font-bold text-zinc-300 w-4">{i+1}.</span>
                               <span className={`text-sm font-bold ${r.detected_nombre ? 'text-zinc-900' : 'text-zinc-400 italic'}`}>
                                 {r.detected_nombre || 'Sin nombre'}
                               </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${r.detected_empresa ? 'text-zinc-600' : 'text-zinc-400 italic'}`}>
                                  {r.detected_empresa || 'Falta empresa'}
                                </span>
                                {isUnknown && <span className="text-red-500"><IconAlert /></span>}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded text-xs font-bold border ${r.detected_ubicacion ? 'bg-zinc-100 border-zinc-200 text-zinc-900' : 'bg-transparent border-dashed border-zinc-300 text-zinc-400'}`}>
                                {r.detected_ubicacion || '?'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                <button onClick={() => setStep(1)} className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors">
                  Atrás
                </button>
                <button
                  onClick={handleCommit}
                  disabled={!rows.length || loading || unknownCompanies.length > 0}
                  className="px-6 py-2.5 bg-brand-500 hover:bg-brand-400 disabled:bg-zinc-100 disabled:text-zinc-400 text-white font-black rounded-xl transition-all flex items-center gap-2 uppercase tracking-widest text-[11px]"
                >
                  {loading ? 'Guardando...' : 'Confirmar y Guardar'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center flex flex-col items-center justify-center">
              <div className="text-brand-500 mb-4"><IconCheck /></div>
              <h4 className="text-xl font-black text-zinc-950 mb-2">¡Importación Completada!</h4>
              <p className="text-zinc-500 text-sm font-medium mb-8 max-w-sm">Los paquetes se han añadido correctamente al almacén.</p>
              <div className="flex gap-3">
                <button onClick={() => { setContent(''); setRows([]); setStep(1); setUnknownCompanies([]); }} className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-xl transition-colors">
                  Añadir más
                </button>
                <button onClick={() => onDone?.()} className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors">
                  Cerrar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
