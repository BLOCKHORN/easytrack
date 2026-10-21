import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const CustomIconArrowLeft = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
const CustomIconChart = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="4" y="14" width="4" height="6" rx="1" fill="currentColor" opacity="0.3"/><rect x="10" y="10" width="4" height="10" rx="1" fill="currentColor" opacity="0.6"/><rect x="16" y="4" width="4" height="16" rx="1" fill="currentColor"/><path d="M3 22H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const CustomIconLeak = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 21A9 9 0 1012 3a9 9 0 000 18z" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" opacity="0.4"/><path d="M12 7v6l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="4 8" transform="rotate(45 12 12)"/></svg>;
const CustomIconClock = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.4"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const CustomIconAI = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3v3M12 18v3M4 12H7M17 12h3M6.5 6.5l2 2M15.5 15.5l2 2M6.5 17.5l2-2M15.5 6.5l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3"/><circle cx="12" cy="12" r="4" fill="currentColor"/><circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="2 4"/></svg>;
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
    <div className="flex items-center justify-center text-5xl md:text-6xl font-black tracking-tighter text-white mb-10 py-2">
      {text.split("").map((char, index) => (
        <motion.span key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.08, duration: 0.1 }}>
          {char}
        </motion.span>
      ))}
      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: text.length * 0.08, duration: 0.1 }} className="text-brand-500">.</motion.span>
      <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1.5 h-10 bg-brand-500 ml-2 inline-block" />
    </div>
  );
};

export default function InteractiveAudit({ onComplete }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [agencias, setAgencias] = useState([]);
  const [volumen, setVolumen] = useState(65); 
  const [tarifaActual, setTarifaActual] = useState(0.30);
  
  const [tarifaObjetivo, setTarifaObjetivo] = useState(0);
  const [horasAhorradas, setHorasAhorradas] = useState(0);
  
  const [dineroPerdido, setDineroPerdido] = useState(0);
  const [horasAnimadas, setHorasAnimadas] = useState(0);

  const handleFinish = () => {
    onComplete();
    navigate('/registro');
  };

  const goBack = () => {
    if (step === 5) setStep(3);
    else if (step > 0 && step !== 4) setStep(step - 1);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onComplete();
      } else if (e.key === 'Enter') {
        if (step === 0) setStep(1);
        if (step === 1 && agencias.length > 0) setStep(2);
        if (step === 2) setStep(3);
        if (step === 3) setStep(4);
        if (step === 5) handleFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, agencias, onComplete]);

  useEffect(() => {
    if (step === 4) {
      const hasPremium = agencias.some(a => ['DHL', 'UPS', 'FedEx', 'TNT'].includes(a));
      const hasVolume = agencias.some(a => ['Amazon', 'InPost', 'Mondial Relay', 'Celeritas', 'Seur', 'Correos Express', 'GLS', 'MRW', 'Nacex'].includes(a));
      
      const monthlyVol = volumen * 30;
      let maxTarget = 0.20;

      if (hasPremium) {
          if (monthlyVol >= 3000) maxTarget = 0.80;
          else if (monthlyVol >= 1500) maxTarget = 0.65;
          else if (monthlyVol >= 500) maxTarget = 0.50;
          else maxTarget = 0.40;
      } else if (hasVolume) {
          if (monthlyVol >= 6000) maxTarget = 0.45;
          else if (monthlyVol >= 3000) maxTarget = 0.35;
          else if (monthlyVol >= 1500) maxTarget = 0.30;
          else maxTarget = 0.25;
      } else {
          if (monthlyVol >= 3000) maxTarget = 0.50;
          else if (monthlyVol >= 1500) maxTarget = 0.40;
          else maxTarget = 0.30;
      }

      const target = Math.max(tarifaActual, maxTarget);
      setTarifaObjetivo(target);

      const timeSaved = Math.round((volumen * 115 * 300) / 3600);
      setHorasAhorradas(timeSaved);

      const timer = setTimeout(() => setStep(5), 3200);
      return () => clearTimeout(timer);
    }
  }, [step, agencias, volumen, tarifaActual]);

  const hayFuga = tarifaObjetivo > tarifaActual;
  const pctIncremento = tarifaActual > 0 ? ((tarifaObjetivo - tarifaActual) / tarifaActual) * 100 : 0;
  
  const ingresoMensualActual = volumen * 30 * tarifaActual;
  const ingresoAnualActual = ingresoMensualActual * 12;
  const ingresoMensualOpt = volumen * 30 * tarifaObjetivo;
  const ingresoAnualOpt = ingresoMensualOpt * 12;
  const perdidaAcumuladaAnual = ingresoAnualOpt - ingresoAnualActual;

  useEffect(() => {
    if (step === 5) {
      if (hayFuga) {
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
      } else {
        let start = 0;
        const duration = 1200;
        const increment = horasAhorradas / (duration / 16);
        const counter = setInterval(() => {
          start += increment;
          if (start >= horasAhorradas) {
            setHorasAnimadas(horasAhorradas);
            clearInterval(counter);
          } else {
            setHorasAnimadas(start);
          }
        }, 16);
        return () => clearInterval(counter);
      }
    }
  }, [step, hayFuga, perdidaAcumuladaAnual, horasAhorradas]);

  const toggleAgencia = (nombre) => {
    if (agencias.includes(nombre)) {
      setAgencias(agencias.filter(a => a !== nombre));
    } else {
      if (agencias.length < 3) setAgencias([...agencias, nombre]);
    }
  };

  const formatEUR = (n, fractionDigits = 0) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: fractionDigits }).format(n);

  const styles = `
    .hide-scrollbar::-webkit-scrollbar { width: 6px; }
    .hide-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .hide-scrollbar::-webkit-scrollbar-thumb { background-color: #27272a; border-radius: 10px; }
    
    .custom-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 24px; height: 24px; border-radius: 50%; background: #ffffff; cursor: ew-resize; border: 4px solid #09090b; transition: transform 0.1s; }
    .custom-range::-webkit-slider-thumb:active { transform: scale(1.1); }
    
    @keyframes spin-fast { 100% { transform: rotate(360deg); } }
    .animate-spin-fast { animation: spin-fast 1s linear infinite; transform-origin: 12px 12px; }

    @keyframes levitate {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    .logo-levitate { transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
    .group:hover .logo-levitate { animation: levitate 2.5s ease-in-out infinite; }
  `;

  const NextButton = ({ text, onClick, disabled }) => (
    <motion.button 
      whileHover={disabled ? {} : { scale: 1.04 }} 
      whileTap={disabled ? {} : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={onClick}
      disabled={disabled}
      className={`group w-full md:w-auto h-14 md:h-16 px-10 flex items-center justify-center gap-3 font-[900] rounded-2xl text-[13px] md:text-sm uppercase tracking-widest transition-all will-change-transform outline-none ${disabled ? 'bg-[#131316] text-zinc-600 border border-white/5 cursor-not-allowed' : 'bg-white text-zinc-950 shadow-[0_4px_20px_rgba(255,255,255,0.1)] hover:shadow-[0_6px_25px_rgba(255,255,255,0.2)]'}`}
    >
      <div className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${disabled ? 'bg-zinc-800 text-zinc-600' : 'bg-brand-400 text-zinc-950 group-hover:scale-110 group-hover:rotate-[15deg]'}`}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="translate-y-[-0.5px]">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </div>
      {text}
    </motion.button>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-[#09090b] text-white flex flex-col overflow-hidden font-sans selection:bg-brand-500 selection:text-white">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:6rem_6rem] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,0.05)_0%,transparent_70%)] pointer-events-none" />
      
      <div className="flex justify-between items-center p-6 relative z-20 shrink-0">
        <div className="flex items-center gap-6 w-1/3">
          <button onClick={onComplete} className="text-xl font-black tracking-tighter text-white flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity outline-none">
            easytrack<span className="text-brand-500">.</span>
          </button>
        </div>

        <div className="flex justify-center w-1/3">
          <AnimatePresence mode="wait">
            {(step > 0 && step !== 4) && (
              <motion.button 
                key="back-btn"
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                onClick={goBack} 
                className="group flex items-center gap-2 text-[10px] font-bold text-zinc-400 hover:text-white uppercase tracking-widest transition-colors bg-[#131316] px-4 py-2 rounded-xl border border-white/5 outline-none"
              >
                <span className="group-hover:-translate-x-1 transition-transform"><CustomIconArrowLeft /></span>
                {step === 5 ? 'Recalcular' : 'Volver'}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-end w-1/3">
          <button onClick={onComplete} className="group flex items-center gap-3 text-[10px] font-bold text-zinc-400 hover:text-white uppercase tracking-widest transition-all bg-[#131316] px-4 py-2 border border-white/5 rounded-xl outline-none">
            Cerrar 
            <span className="bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded text-[8px] group-hover:bg-zinc-700 group-hover:text-white transition-colors">ESC</span>
          </button>
        </div>
      </div>

      <div className="flex-1 w-full overflow-y-auto hide-scrollbar relative z-10 px-4">
        <div className="grid min-h-full place-items-center py-10 md:py-12">
          <div className="w-full max-w-5xl mx-auto flex flex-col justify-center">
            
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div key="step0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} className="w-full text-center max-w-3xl mx-auto flex flex-col items-center">
                  <TypewriterLogo />
                  <h1 className="text-5xl md:text-7xl font-[900] tracking-[-0.04em] mb-6 leading-[1.1] py-2 text-white">
                    El fin del caos. <br />
                    <span className="text-zinc-500 italic font-medium">Y de regalar tu trabajo.</span>
                  </h1>
                  <p className="text-lg md:text-xl text-zinc-400 font-medium mb-12 max-w-2xl mx-auto leading-tight">
                    Localiza cualquier paquete en 3 segundos, elimina los dolores de cabeza organizativos y descubre si las agencias te están pagando lo que mereces.
                  </p>
                  <NextButton text="Iniciar Diagnóstico" onClick={() => setStep(1)} />
                  <p className="mt-4 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Pulsa ENTER para avanzar</p>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="w-full flex flex-col items-center">
                  <div className="text-center mb-12">
                    <h2 className="text-4xl md:text-5xl font-[900] tracking-[-0.04em] text-white leading-[1.1] py-2">Agencias Principales</h2>
                    <p className="text-zinc-500 mt-2 font-bold text-[11px] uppercase tracking-[0.2em]">Selecciona las 3 agencias con más volumen en tu local</p>
                  </div>
                  <div className="w-full max-w-4xl mx-auto">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-12">
                      {AGENCIAS.map(ag => {
                        const isSelected = agencias.includes(ag.nombre);
                        const isDisabled = !isSelected && agencias.length >= 3;
                        
                        return (
                          <button 
                            key={ag.id} 
                            onClick={() => toggleAgencia(ag.nombre)}
                            disabled={isDisabled}
                            className={`group flex flex-col items-center justify-center transition-all outline-none cursor-pointer relative ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                          >
                            <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center mb-4 relative bg-[#131316] rounded-2xl border border-white/5 group-hover:border-white/20 transition-colors">
                              <div className={`w-10 h-10 md:w-12 md:h-12 relative z-10 logo-levitate transition-all duration-500 ${isSelected ? 'opacity-100 saturate-100' : 'opacity-40 saturate-0 group-hover:opacity-100 group-hover:saturate-100'}`}>
                                {ag.domain ? (
                                  <img 
                                    src={`https://logo.uplead.com/${ag.domain}`} 
                                    alt={ag.nombre} 
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      if (e.target.src.includes('uplead')) { e.target.src = `https://www.google.com/s2/favicons?domain=${ag.domain}&sz=128`; } 
                                      else { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(ag.nombre)}&background=18181b&color=a1a1aa&bold=true`; }
                                    }}
                                  />
                                ) : (
                                  <div className="text-zinc-600 group-hover:text-white transition-colors w-full h-full flex items-center justify-center"><CustomIconChart /></div>
                                )}
                              </div>
                              {isSelected && (
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-400 text-zinc-950 rounded-full flex items-center justify-center border-4 border-[#09090b]">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                </div>
                              )}
                            </div>
                            <span className={`text-[11px] font-[900] text-center w-full truncate uppercase tracking-[0.2em] transition-colors ${isSelected ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-300'}`}>
                              {ag.nombre}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="mt-16 pt-8 border-t border-white/5 w-full flex flex-col items-center justify-center">
                    <NextButton text="Confirmar Selección" onClick={() => setStep(2)} disabled={agencias.length === 0} />
                    {agencias.length > 0 && <p className="mt-4 text-[10px] text-zinc-600 font-bold uppercase tracking-widest hidden md:block">Pulsa ENTER</p>}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="w-full text-center max-w-xl mx-auto flex flex-col items-center">
                  <div className="mb-10">
                    <h2 className="text-4xl md:text-5xl font-[900] tracking-[-0.04em] text-white leading-[1.1] py-2">Volumen Operativo</h2>
                    <p className="text-zinc-500 mt-2 font-bold text-[11px] uppercase tracking-[0.2em]">Suma la entrada diaria de {agencias.join(', ')}</p>
                  </div>
                  
                  <div className="w-full mb-12 bg-[#131316] border border-white/5 rounded-3xl p-10 relative overflow-hidden">
                    <div className="text-8xl font-[900] text-white mb-2 tracking-tighter tabular-nums leading-tight py-2">{volumen}</div>
                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-10">Paquetes al día</div>
                    <input 
                      type="range" min="10" max="500" step="1" value={volumen} 
                      onChange={(e) => setVolumen(parseInt(e.target.value))}
                      className="custom-range w-full h-1 bg-zinc-800 rounded-full outline-none"
                    />
                    <div className="flex justify-between mt-6 text-zinc-600 font-black text-[10px] uppercase tracking-widest">
                      <span>10 min</span>
                      <span>500+ max</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <NextButton text="Siguiente Paso" onClick={() => setStep(3)} />
                    <p className="mt-4 text-[10px] text-zinc-600 font-bold uppercase tracking-widest hidden md:block">Pulsa ENTER</p>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full text-center max-w-xl mx-auto flex flex-col items-center">
                  <div className="mb-10">
                    <h2 className="text-4xl md:text-5xl font-[900] tracking-[-0.04em] text-white leading-[1.1] py-2">Tu Realidad Actual</h2>
                    <p className="text-zinc-500 mt-2 font-bold text-[11px] uppercase tracking-[0.2em]">¿Cuál es el ticket medio que te pagan por paquete?</p>
                  </div>
                  
                  <div className="w-full mb-12 bg-[#131316] border border-white/5 rounded-3xl p-10 relative overflow-hidden">
                    <div className="text-8xl font-[900] text-white mb-2 tracking-tighter tabular-nums leading-tight py-2">
                      {formatEUR(tarifaActual, 2)}
                    </div>
                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-10">Ingreso por entrega</div>
                    
                    <input 
                      type="range" min="0.10" max="0.80" step="0.01" value={tarifaActual} 
                      onChange={(e) => setTarifaActual(parseFloat(e.target.value))}
                      className="custom-range w-full h-1 bg-zinc-800 rounded-full outline-none"
                    />
                    <div className="flex justify-between mt-6 text-zinc-600 font-black text-[10px] uppercase tracking-widest">
                      <span>0,10 €</span>
                      <span>0,80 €</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <NextButton text="Analizar Impacto" onClick={() => setStep(4)} />
                    <p className="mt-4 text-[10px] text-zinc-600 font-bold uppercase tracking-widest hidden md:block">Pulsa ENTER</p>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="w-full text-center flex flex-col items-center justify-center h-64">
                  <div className="text-zinc-500 mb-8">
                    <CustomIconRadar />
                  </div>
                  <h2 className="text-3xl font-[900] tracking-[-0.04em] text-white mb-4 leading-[1.1] py-2">Auditoría en proceso</h2>
                  <div className="h-6 overflow-hidden">
                    <motion.div 
                      animate={{ y: [0, -24, -48] }} 
                      transition={{ duration: 3.2, times: [0, 0.5, 1], ease: "steps(3)" }}
                      className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.2em] flex flex-col"
                    >
                      <span className="h-6 flex items-center justify-center">Analizando tarifa actual de {formatEUR(tarifaActual, 2)}...</span>
                      <span className="h-6 flex items-center justify-center">Cruzando volumen logístico para {agencias.join(', ')}...</span>
                      <span className="h-6 flex items-center justify-center">Calculando ratio de optimización operativa...</span>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div key="step5" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-5xl mx-auto py-2">
                  
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 border-b border-white/5 pb-6">
                    <div>
                      <h2 className="text-4xl md:text-5xl font-[900] tracking-[-0.04em] text-white leading-[1.1] py-2">
                        {hayFuga ? "Impacto Financiero." : "Operativa Optimizada."}
                      </h2>
                      <p className="text-zinc-500 font-bold text-[11px] uppercase tracking-[0.2em] mt-2">
                        {hayFuga ? "Comparativa de Ticket Medio Actual vs Optimizado" : `Tu tarifa de ${formatEUR(tarifaActual, 2)} es top en el mercado.`}
                      </p>
                    </div>
                    <div className="md:text-right flex flex-col items-start md:items-end gap-1 pt-2">
                      <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Agencias Analizadas</div>
                      <div className="text-white font-[900] text-sm uppercase tracking-widest">{agencias.join(' • ')}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-7 flex flex-col gap-8">
                      {hayFuga ? (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-[#131316] border border-white/5 rounded-3xl p-8 relative flex flex-col justify-between">
                              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-8">Escenario Actual</h3>
                              <div className="space-y-5">
                                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                  <span className="text-zinc-400 text-xs font-bold">Ticket Medio</span>
                                  <span className="text-white font-[900] text-lg">{formatEUR(tarifaActual, 2)}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                  <span className="text-zinc-400 text-xs font-bold">Ingreso Mensual</span>
                                  <span className="text-white font-[900] text-lg">{formatEUR(ingresoMensualActual)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-zinc-400 text-xs font-bold">Proyección Anual</span>
                                  <span className="text-white font-[900] text-xl">{formatEUR(ingresoAnualActual)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-white rounded-3xl p-8 relative flex flex-col justify-between">
                              <div className="flex justify-between items-start mb-8">
                                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Escenario Optimizado</h3>
                                {pctIncremento > 0 && (
                                  <span className="bg-zinc-100 text-zinc-950 text-[10px] font-black px-2.5 py-1 rounded-md tracking-wider">
                                    +{pctIncremento.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                              
                              <div className="space-y-5">
                                <div className="flex justify-between items-center border-b border-zinc-200 pb-4">
                                  <span className="text-zinc-600 text-xs font-bold">Nuevo Ticket Base</span>
                                  <span className="text-zinc-950 font-[900] text-lg">{formatEUR(tarifaObjetivo, 2)}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-zinc-200 pb-4">
                                  <span className="text-zinc-600 text-xs font-bold">Ingreso Mensual</span>
                                  <span className="text-zinc-950 font-[900] text-lg">{formatEUR(ingresoMensualOpt)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-zinc-600 text-xs font-bold">Proyección Anual</span>
                                  <span className="text-brand-500 font-[900] text-2xl">{formatEUR(ingresoAnualOpt)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-[#131316] border border-white/5 rounded-3xl p-8 relative flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2 text-zinc-500">
                                <CustomIconLeak />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Fuga de Capital (Anual)</span>
                              </div>
                              <div className="text-6xl md:text-7xl font-[900] text-white tracking-tighter tabular-nums leading-tight py-2">
                                -{formatEUR(dineroPerdido)}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="bg-white rounded-3xl p-8 relative flex flex-col justify-between">
                            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-8">Rentabilidad Óptima Confirmada</h3>
                            <div className="space-y-5">
                              <div className="flex justify-between items-center border-b border-zinc-200 pb-4">
                                <span className="text-zinc-600 text-xs font-bold">Ticket Medio Excelente</span>
                                <span className="text-zinc-950 font-[900] text-lg">{formatEUR(tarifaActual, 2)}</span>
                              </div>
                              <div className="flex justify-between items-center border-b border-zinc-200 pb-4">
                                <span className="text-zinc-600 text-xs font-bold">Ingreso Mensual Sólido</span>
                                <span className="text-zinc-950 font-[900] text-lg">{formatEUR(ingresoMensualActual)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-zinc-600 text-xs font-bold">Proyección Anual</span>
                                <span className="text-brand-500 font-[900] text-2xl">{formatEUR(ingresoAnualActual)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-[#131316] border border-white/5 rounded-3xl p-8 relative flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2 text-zinc-500">
                                <CustomIconClock />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Tiempo Físico Recuperado (Anual)</span>
                              </div>
                              <div className="text-6xl md:text-7xl font-[900] text-white tracking-tighter tabular-nums leading-tight py-2 flex items-baseline gap-2">
                                {Math.floor(horasAnimadas)} <span className="text-2xl font-bold text-zinc-600">Horas</span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="lg:col-span-5 bg-[#131316] border border-white/5 rounded-3xl p-8 md:p-10 flex flex-col justify-between">
                      <div>
                        <h3 className="text-3xl font-[900] tracking-[-0.04em] text-white mb-4 leading-[1.1] py-2">
                          {hayFuga ? "Recupera lo tuyo." : "Rompe el cuello de botella."}
                        </h3>
                        <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                          {hayFuga 
                            ? `Tu volumen de ${volumen} paquetes/día justifica un aumento a ${formatEUR(tarifaObjetivo, 2)}. EasyTrack te da la infraestructura para demostrarlo y negociar al alza sin que te rechacen.` 
                            : `Ya tienes una tarifa inmejorable para ${volumen} paquetes/día. Tu siguiente paso para crecer no es negociar, es eliminar el tiempo que pierdes buscando cajas en tu almacén.`}
                        </p>
                        <ul className="space-y-6 mb-10">
                          <li className="flex items-start gap-4">
                            <div className="text-zinc-500 mt-1"><CustomIconChart /></div>
                            <div>
                              <h4 className="text-white font-[900] text-sm">Auditoría Real</h4>
                              <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">Genera informes de rendimiento blindados para exigir mejor ticket medio a las agencias.</p>
                            </div>
                          </li>
                          <li className="flex items-start gap-4">
                            <div className="text-zinc-500 mt-1"><CustomIconAI /></div>
                            <div>
                              <h4 className="text-white font-[900] text-sm">Ahorro Masivo</h4>
                              <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">Automatiza el escaneo y encuentra cualquier paquete en 5s. Recupera horas de tu vida cada semana.</p>
                            </div>
                          </li>
                        </ul>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <NextButton text="Crear Cuenta Gratis" onClick={handleFinish} />
                        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mt-5">
                          Setup en 1 min • Sin Tarjeta
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="h-1.5 w-full bg-transparent shrink-0 relative z-20">
        <div className="h-full bg-brand-500 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ width: `${((step + 1) / 6) * 100}%` }} />
      </div>
    </div>
  );
}