'use strict';

import { motion } from 'framer-motion';
import { FaBarcode, FaUserCircle } from 'react-icons/fa';

function StepOneIllustration() {
  return (
    <div className="relative w-full h-56 mb-8 flex items-center justify-center bg-zinc-900/30 rounded-[2rem] border border-white/5 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.4 }} 
        className="relative z-10 w-48 h-32 bg-[#131316] border border-white/10 rounded-2xl p-5 flex flex-col justify-between shadow-2xl will-change-transform"
      >
        <div className="flex items-center gap-3">
          <FaUserCircle className="text-zinc-600 text-xl" />
          <div className="h-1.5 w-16 bg-zinc-800 rounded-full" />
        </div>
        <div className="space-y-3">
          <div className="w-full bg-zinc-800/50 rounded-full h-1.5 overflow-hidden">
            <motion.div initial={{ width: 0 }} whileInView={{ width: '100%' }} viewport={{ once: true }} transition={{ delay: 0.3, duration: 0.8, ease: "circOut" }} className="h-full bg-brand-500 rounded-full" />
          </div>
          <div className="h-1.5 w-1/2 bg-zinc-800 rounded-full" />
        </div>
      </motion.div>
    </div>
  );
}

function StepTwoIllustration() {
  return (
    <div className="relative w-full h-56 mb-8 flex items-center justify-center bg-zinc-900/30 rounded-[2rem] border border-white/5 overflow-hidden">
      <div className="relative z-10 grid grid-cols-3 gap-2 w-36">
        {[...Array(6)].map((_, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-50px" }} transition={{ delay: i * 0.05 }} 
            className={`h-14 rounded-xl border flex items-end p-2 will-change-transform ${i === 3 ? 'bg-white text-zinc-950 border-white shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'bg-[#131316] border-white/5'}`}
          >
            <div className={`w-full h-1 rounded-full ${i === 3 ? 'bg-zinc-950' : 'bg-zinc-800'}`} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function StepThreeIllustration() {
  return (
    <div className="relative w-full h-56 mb-8 flex items-center justify-center bg-zinc-900/30 rounded-[2rem] border border-white/5 overflow-hidden">
      <div className="relative z-10 flex flex-col items-center">
        <motion.div 
          animate={{ y: [-2, 2, -2] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} 
          className="px-6 py-5 bg-[#131316] border border-white/10 rounded-2xl shadow-2xl flex flex-col items-center gap-3 will-change-transform"
        >
          <FaBarcode className="text-4xl text-zinc-500" />
          <div className="relative w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="absolute inset-y-0 w-1/2 bg-brand-500 rounded-full shadow-[0_0_10px_rgba(20,184,166,0.8)]" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  const steps = [
    { title: "Crea tu cuenta", desc: "Regístrate en minutos. Tu primer mes es gratuito para que valides el sistema sin riesgo.", render: <StepOneIllustration /> },
    { title: "Mapea tu local", desc: "Define tus ubicaciones una sola vez. EasyTrack crea un mapa visual idéntico a tu tienda.", render: <StepTwoIllustration /> },
    { title: "Escanea y guarda", desc: "El sistema asigna el hueco óptimo al instante. Solo sigue la indicación en la pantalla.", render: <StepThreeIllustration /> }
  ];

  return (
    <section id="como-funciona" className="relative bg-[#09090b] text-white pt-32 pb-32 overflow-hidden border-b border-white/5">
      
      {/* ONDA SUPERIOR: Transición suave desde Benefits (Light) */}
      <div className="absolute top-0 left-0 w-full pointer-events-none z-20 leading-none rotate-180 -translate-y-[1px]">
        <svg viewBox="0 0 1440 100" preserveAspectRatio="none" className="w-full h-12 md:h-24 block">
          <path fill="#f8fafc" d="M0,0 Q720,130 1440,0 L1440,100 L0,100 Z" />
        </svg>
      </div>

      {/* Grid B2B Templifica de fondo */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:6rem_6rem] pointer-events-none" />
      <div className="absolute left-1/4 top-0 bottom-0 w-[1px] bg-white/[0.02] hidden lg:block" />
      <div className="absolute right-1/4 top-0 bottom-0 w-[1px] bg-white/[0.02] hidden lg:block" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20 md:mb-28">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} 
            className="text-5xl md:text-7xl font-[900] tracking-[-0.04em] mb-6 text-white leading-tight py-2 will-change-transform"
          >
            Integración <span className="text-zinc-500">sin fricción.</span>
          </motion.h2>
          <p className="text-lg md:text-xl text-zinc-400 font-medium leading-relaxed">Implementación en una tarde, no en un mes.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ delay: i * 0.1, duration: 0.4 }} 
              className="flex flex-col group will-change-transform"
            >
              {step.render}
              <div className="px-2">
                <h3 className="text-2xl font-[900] mb-3 text-white tracking-tight leading-tight py-1">{step.title}</h3>
                <p className="text-zinc-400 leading-relaxed font-medium text-sm md:text-base">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}