import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const CustomIconArrow = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 12H20M20 12L13 5M20 12L13 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 12H20M20 12L13 5M20 12L13 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" transform="translate(2, 0)"/></svg>;
const CustomIconArrowLeft = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
const CustomIconChart = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="4" y="14" width="4" height="6" rx="1" fill="currentColor" opacity="0.3"/><rect x="10" y="10" width="4" height="10" rx="1" fill="currentColor" opacity="0.6"/><rect x="16" y="4" width="4" height="16" rx="1" fill="currentColor"/><path d="M3 22H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const CustomIconLeak = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 21A9 9 0 1012 3a9 9 0 000 18z" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" opacity="0.4"/><path d="M12 7v6l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="4 8" transform="rotate(45 12 12)"/></svg>;
const CustomIconAI = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3v3M12 18v3M4 12H7M17 12h3M6.5 6.5l2 2M15.5 15.5l2 2M6.5 17.5l2-2M15.5 6.5l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3"/><circle cx="12" cy="12" r="4" fill="currentColor"/><circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="2 4"/></svg>;
const CustomIconWhatsApp = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" fill="currentColor" opacity="0.1"/></svg>;
const CustomIconRadar = () => <svg width="64" height="64" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1" opacity="0.2"/><circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1" opacity="0.2"/><circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.5"/><path d="M12 12l8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin-fast origin-center" /><path d="M12 12l8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin-fast origin-center" opacity="0.5" style={{animationDelay: '-0.1s'}}/></svg>;

const AGENCIAS = [
  { id: 28, nombre: 'Celeritas', domain: 'celeritastransporte.com' },
  { id: 23, nombre: 'Amazon', domain: 'amazon.es' },
  { id: 24, nombre: 'InPost', domain: 'inpost.es' },
  { id: 3, nombre: 'Seur', domain: 'seur.com' },
  { id: 2, nombre: 'Correos Express', domain: 'correosexpress.com' },
  { id: 20, nombre: 'GLS', domain: 'gls-spain.es' },
  { id: 4, nombre: 'MRW', domain: 'mrw.es' },
  { id: 5, nombre: 'Nacex', domain: 'nacex.es' },
  { id: 16, nombre: 'DHL', domain: 'dhl.com' },
  { id: 17, nombre: 'UPS', domain: 'ups.com' },
  { id: 34, nombre: 'Otras', domain: null }
];

const TypewriterLogo = () => {
  const text = "easytrack";
  return (
    <div className="flex items-center justify-center text-5xl md:text-6xl font-black tracking-tighter text-white mb-10">
      {text.split("").map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.08, duration: 0.1 }}
        >
          {char}
        </motion.span>
      ))}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: text.length * 0.08, duration: 0.1 }}
        className="text-brand-500"
      >
        .
      </motion.span>
      <motion.span 
        animate={{ opacity: [1, 0] }} 
        transition={{ repeat: Infinity, duration: 0.8 }} 
        className="w-1.5 h-10 bg-brand-500 ml-2 inline-block"
      />
    </div>
  );
};

export default function InteractiveAudit({ onComplete }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [agencia, setAgencia] = useState(null);
  const [volumen, setVolumen] = useState(65); 
  const [tarifaActual, setTarifaActual] = useState(0.30);
  const [dineroPerdido, setDineroPerdido] = useState(0);

  const tarifaObjetivo = Math.max(0.55, tarifaActual + 0.20);
  const margenPerdido = tarifaObjetivo - tarifaActual;
  const perdidaAcumuladaAnual = volumen * 30 * 12 * margenPerdido;

  useEffect(() => {
    if (step === 4) {
      const timer = setTimeout(() => setStep(5), 3200);
      return () => clearTimeout(timer);
    }
  }, [step]);

  useEffect(() => {
    if (step === 5) {
      let start = 0;
      const duration = 1200;
      const increment = perdidaAcumuladaAnual / (duration / 16);
      const counter = setInterval(() => {
        start += increment;
        if (start >= perdidaAcumuladaAnual) {
          setDineroPerdido(perdidaAcumuladaAnual);
          clearInterval(counter);
        } else {
          setDineroPerdido(start);
        }
      }, 16);
      return () => clearInterval(counter);
    }
  }, [step, perdidaAcumuladaAnual]);

  const handleFinish = () => {
    onComplete();
    navigate('/registro');
  };

  const goBack = () => {
    if (step > 0 && step !== 4) setStep(step - 1);
  };

  const formatEUR = (n, fractionDigits = 0) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: fractionDigits }).format(n);

  const styles = `
    .hide-scrollbar::-webkit-scrollbar { width: 6px; }
    .hide-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .hide-scrollbar::-webkit-scrollbar-thumb { background-color: #27272a; border-radius: 10px; }
    
    .custom-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 24px; height: 24px; border-radius: 0%; background: #14b8a6; cursor: ew-resize; border: 4px solid #18181b; box-shadow: 0 0 15px rgba(20,184,166,0.5); transition: transform 0.1s; transform: rotate(45deg); }
    .custom-range::-webkit-slider-thumb:active { transform: scale(1.2) rotate(45deg); }
    
    @keyframes border-spin { 100% { transform: rotate(360deg); } }
    .animate-border-spin { animation: border-spin 4s linear infinite; }
    
    @keyframes spin-fast { 100% { transform: rotate(360deg); } }
    .animate-spin-fast { animation: spin-fast 1s linear infinite; transform-origin: 12px 12px; }

    @keyframes levitate {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    .group:hover .logo-levitate {
      animation: levitate 2s ease-in-out infinite;
    }
  `;

  return (
    <div className="fixed inset-0 z-[100] bg-[#09090b] text-white flex flex-col overflow-hidden font-sans selection:bg-brand-500 selection:text-white">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.08)_0%,transparent_70%)] pointer-events-none" />
      
      <div className="flex justify-between items-center p-6 relative z-10 shrink-0">
        <div className="flex items-center gap-6 w-1/3">
          <div className="text-xl font-black tracking-tighter text-white flex items-center gap-2 opacity-30">
            easytrack<span className="text-brand-500">.</span>
          </div>
        </div>

        <div className="flex justify-center w-1/3">
          <AnimatePresence>
            {(step > 0 && step < 4) && (
              <motion.button 
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                onClick={goBack} 
                className="group flex items-center gap-2 text-[10px] font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition-colors bg-zinc-900/50 px-4 py-2 rounded-md border border-zinc-800"
              >
                <span className="group-hover:-translate-x-1 transition-transform"><CustomIconArrowLeft /></span>
                Volver
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-end w-1/3">
          <button onClick={onComplete} className="group flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-brand-400 uppercase tracking-widest transition-all">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-500 translate-x-[-10px] group-hover:translate-x-0">&gt;</span>
            [ Esc / Saltar ]
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 w-full max-w-5xl mx-auto relative z-10 overflow-y-auto hide-scrollbar">
        <AnimatePresence mode="wait">
          
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} className="w-full text-center max-w-3xl my-auto py-10">
              
              <TypewriterLogo />

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-[1.1] text-zinc-100">
                El fin del caos en tu almacén.<br className="hidden md:block"/> Y deja de regalar tu trabajo.
              </h1>
              <p className="text-base md:text-lg text-zinc-400 font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
                Localiza cualquier paquete en menos de 5 segundos, elimina los dolores de cabeza de organización y descubre tu fuga de capital real para exigir a las agencias la tarifa que mereces.
              </p>
              
              <button onClick={() => setStep(1)} className="relative inline-flex h-14 w-full md:w-auto items-center justify-center overflow-hidden rounded-xl p-[1.5px] focus:outline-none transition-transform active:scale-95 group">
                <span className="absolute inset-[-1000%] animate-border-spin bg-[conic-gradient(from_90deg_at_50%_50%,#18181b_0%,#14b8a6_50%,#18181b_100%)] opacity-70 group-hover:opacity-100 transition-opacity" />
                <span className="inline-flex h-full w-full items-center justify-center rounded-xl bg-zinc-950 px-10 py-1 text-sm font-black text-white backdrop-blur-3xl gap-3 uppercase tracking-widest group-hover:bg-zinc-900 transition-colors">
                  INICIAR DIAGNÓSTICO <CustomIconArrow />
                </span>
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="w-full flex flex-col items-center h-full max-h-[80vh] py-6">
              <div className="text-center mb-12 shrink-0">
                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-100">Proveedor Principal</h2>
                <p className="text-zinc-500 mt-2 font-mono text-[10px] uppercase tracking-widest">Selecciona tu agencia de mayor rotación.</p>
              </div>
              <div className="w-full max-w-4xl mx-auto flex-1 overflow-y-auto hide-scrollbar pb-6 px-2 pt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8 md:gap-10">
                  {AGENCIAS.map(ag => (
                    <button 
                      key={ag.id} 
                      onClick={() => { setAgencia(ag.nombre); setStep(2); }}
                      className="group flex flex-col items-center justify-center transition-all outline-none cursor-pointer"
                    >
                      <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center mb-4 relative">
                        <div className="absolute inset-0 bg-brand-500/0 group-hover:bg-brand-500/10 blur-2xl rounded-full transition-all duration-500" />
                        
                        <div className="w-full h-full relative z-10 logo-levitate opacity-40 grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-500">
                          {ag.domain ? (
                            <img 
                              src={`https://logo.uplead.com/${ag.domain}`} 
                              alt={ag.nombre} 
                              className="w-full h-full object-contain drop-shadow-sm group-hover:drop-shadow-xl"
                              onError={(e) => {
                                if (e.target.src.includes('uplead')) { e.target.src = `https://www.google.com/s2/favicons?domain=${ag.domain}&sz=128`; } 
                                else { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(ag.nombre)}&background=18181b&color=a1a1aa&bold=true`; }
                              }}
                            />
                          ) : (
                            <div className="text-zinc-600 group-hover:text-white transition-colors w-full h-full flex items-center justify-center"><CustomIconChart /></div>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] md:text-xs font-bold text-zinc-600 group-hover:text-zinc-200 transition-colors text-center w-full truncate font-mono uppercase tracking-widest">
                        {ag.nombre}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="w-full text-center max-w-xl mx-auto flex flex-col items-center my-auto py-10">
              <div className="mb-8">
                <h2 className="text-3xl font-black tracking-tight text-zinc-100">Volumen Operativo</h2>
                <p className="text-zinc-500 mt-1 font-mono text-[10px] uppercase tracking-widest">Indica la entrada diaria de {agencia}.</p>
              </div>
              
              <div className="w-full mb-8 bg-zinc-950 border border-zinc-800/80 rounded-2xl p-8 relative overflow-hidden shadow-2xl">
                <div className="text-7xl font-black text-white mb-1 font-mono tracking-tighter tabular-nums drop-shadow-md">{volumen}</div>
                <div className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-8">Paquetes / Día</div>
                <input 
                  type="range" min="10" max="500" step="1" value={volumen} 
                  onChange={(e) => setVolumen(parseInt(e.target.value))}
                  className="custom-range w-full h-1 bg-zinc-800 rounded-full outline-none"
                />
                <div className="flex justify-between mt-4 text-zinc-600 font-bold text-[10px] uppercase tracking-widest">
                  <span>10</span>
                  <span>500+</span>
                </div>
              </div>

              <button onClick={() => setStep(3)} className="px-10 py-4 bg-zinc-100 text-zinc-950 hover:bg-white text-sm font-black rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 flex items-center justify-center gap-3">
                Siguiente Paso <CustomIconArrow />
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full text-center max-w-xl mx-auto flex flex-col items-center my-auto py-10">
              <div className="mb-8">
                <h2 className="text-3xl font-black tracking-tight text-zinc-100">Tu Realidad Actual</h2>
                <p className="text-zinc-500 mt-1 font-mono text-[10px] uppercase tracking-widest">¿Cuánto te paga {agencia} por paquete?</p>
              </div>
              
              <div className="w-full mb-8 bg-zinc-950 border border-zinc-800/80 rounded-2xl p-8 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />
                
                <div className="text-7xl font-black text-white mb-1 font-mono tracking-tighter tabular-nums drop-shadow-md">
                  {formatEUR(tarifaActual, 2)}
                </div>
                <div className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-8">Comisión por envío</div>
                
                <input 
                  type="range" min="0.10" max="0.80" step="0.01" value={tarifaActual} 
                  onChange={(e) => setTarifaActual(parseFloat(e.target.value))}
                  className="custom-range w-full h-1 bg-zinc-800 rounded-full outline-none"
                />
                <div className="flex justify-between mt-4 text-zinc-600 font-bold text-[10px] uppercase tracking-widest">
                  <span>0,10 €</span>
                  <span>0,80 €</span>
                </div>
              </div>

              <button onClick={() => setStep(4)} className="relative inline-flex h-14 w-full md:w-auto items-center justify-center overflow-hidden rounded-xl p-[1.5px] focus:outline-none transition-transform active:scale-95 group">
                <span className="absolute inset-[-1000%] animate-border-spin bg-[conic-gradient(from_90deg_at_50%_50%,#18181b_0%,#14b8a6_50%,#18181b_100%)] opacity-70 group-hover:opacity-100 transition-opacity" />
                <span className="inline-flex h-full w-full items-center justify-center rounded-xl bg-zinc-950 px-10 py-1 text-sm font-black text-white backdrop-blur-3xl gap-3 uppercase tracking-widest group-hover:bg-zinc-900 transition-colors">
                  ANALIZAR IMPACTO <CustomIconArrow />
                </span>
              </button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="w-full text-center flex flex-col items-center justify-center h-64">
              <div className="text-brand-500 mb-8 drop-shadow-[0_0_15px_rgba(20,184,166,0.6)]">
                <CustomIconRadar />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight mb-2">Auditoría en proceso...</h2>
              <div className="h-6 overflow-hidden">
                <motion.div 
                  animate={{ y: [0, -24, -48] }} 
                  transition={{ duration: 3.2, times: [0, 0.5, 1], ease: "steps(3)" }}
                  className="text-zinc-500 font-mono text-xs uppercase tracking-widest flex flex-col"
                >
                  <span className="h-6 flex items-center justify-center">Analizando margen actual de {formatEUR(tarifaActual, 2)}...</span>
                  <span className="h-6 flex items-center justify-center">Cruzando volumen ({volumen}/día) con red EasyTrack...</span>
                  <span className="h-6 flex items-center justify-center">Calculando tarifa objetivo y fuga de capital...</span>
                </motion.div>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="step5" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-4xl mx-auto my-auto py-6">
              
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 border-b border-zinc-800/80 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Impacto Financiero.</h2>
                  <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest mt-1">Auditoría de tarifa base vs optimizada</p>
                </div>
                <div className="md:text-right flex items-center md:block gap-2">
                  <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Agencia Analizada</div>
                  <div className="text-brand-400 font-black text-lg leading-none">{agencia}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Columna Izquierda */}
                <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-6 flex flex-col overflow-hidden">
                  
                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-400 font-medium">Volumen Anual</span>
                      <span className="text-zinc-100 font-mono font-bold">{(volumen * 30 * 12).toLocaleString()} paq.</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-400 font-medium">Tu Tarifa Actual</span>
                      <span className="text-zinc-500 font-mono font-bold">{formatEUR(tarifaActual, 2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-400 font-medium">Tarifa Objetivo (Media)</span>
                      <span className="text-brand-400 font-mono font-bold">{formatEUR(tarifaObjetivo, 2)}</span>
                    </div>
                  </div>
                  
                  <div className="pt-5 border-t border-zinc-800 border-dashed">
                    <div className="flex items-center gap-2 mb-1 text-red-500">
                      <CustomIconLeak />
                      <span className="text-[10px] font-black font-mono uppercase tracking-widest">Fuga de Capital Anual</span>
                    </div>
                    <div className="text-5xl font-black text-red-500 font-mono tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(239,68,68,0.15)] leading-none mb-3">
                      {formatEUR(dineroPerdido)}
                    </div>
                    <p className="text-[10px] text-zinc-500 font-medium leading-snug">
                      <strong className="text-zinc-300">Nota:</strong> Cifra calculada solo para {agencia}. El impacto real en tu negocio es mayor al sumar el resto de operativas.
                    </p>
                  </div>
                </div>

                {/* Columna Derecha */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-6 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500/50 to-transparent" />
                  
                  <div>
                    <h3 className="text-lg font-black text-white mb-2 tracking-tight">Detén el caos y la pérdida hoy.</h3>
                    <p className="text-zinc-400 text-xs leading-relaxed mb-5">
                      EasyTrack es el software operativo diseñado para darte el control. Regístrate gratis y obtén:
                    </p>
                    <ul className="space-y-4 mb-6">
                      <li className="flex items-start gap-3">
                        <div className="text-zinc-500 mt-0.5"><CustomIconChart /></div>
                        <div>
                          <h4 className="text-zinc-200 font-bold text-xs">Auditoría Irrefutable</h4>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Informes de rendimiento reales para sentarte a negociar el {formatEUR(tarifaObjetivo, 2)}.</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="text-zinc-500 mt-0.5"><CustomIconAI /></div>
                        <div>
                          <h4 className="text-zinc-200 font-bold text-xs">Escáner IA y Búsqueda en 5s</h4>
                          <p className="text-[10px] text-zinc-500 mt-0.5">La cámara lee la etiqueta y ubica el paquete. Encuentra todo en 5 segundos sin estrés.</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <button onClick={handleFinish} className="relative inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-lg p-[1.5px] focus:outline-none transition-transform active:scale-95 group">
                      <span className="absolute inset-[-1000%] animate-border-spin bg-[conic-gradient(from_90deg_at_50%_50%,#18181b_0%,#14b8a6_50%,#18181b_100%)] opacity-70 group-hover:opacity-100 transition-opacity" />
                      <span className="inline-flex h-full w-full items-center justify-center rounded-lg bg-zinc-950 px-6 py-1 text-xs font-black text-white backdrop-blur-3xl gap-2 uppercase tracking-widest group-hover:bg-zinc-900 transition-colors">
                        CREAR CUENTA GRATIS <CustomIconArrow />
                      </span>
                    </button>
                    <p className="text-center text-[9px] font-bold text-zinc-600 uppercase tracking-widest font-mono mt-3">
                      Setup en 1 min • Sin Tarjeta
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Progress Bar Fina */}
      <div className="h-1 w-full bg-zinc-900 shrink-0">
        <div className="h-full bg-brand-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(20,184,166,0.8)]" style={{ width: `${((step + 1) / 6) * 100}%` }} />
      </div>
    </div>
  );
}