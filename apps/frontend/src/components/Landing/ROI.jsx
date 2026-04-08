import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function ROI() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const glowY = useTransform(scrollYProgress, [0, 1], ["-20%", "120%"]);

  const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <section ref={containerRef} className="relative bg-zinc-950 text-white pb-32 pt-12 lg:pb-40 overflow-hidden z-10">
      <motion.div 
        style={{ top: glowY }}
        className="absolute left-[-20%] right-[-20%] h-[500px] rounded-[100%] bg-brand-500/15 blur-[120px] pointer-events-none"
      />

      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-start">
          
          <div className="lg:w-5/12 lg:sticky lg:top-32 shrink-0">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] font-bold tracking-widest uppercase mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
                Retorno de Inversión
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-[1.1] mb-6">
                No es un gasto.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-400">
                  Es un multiplicador.
                </span>
              </h2>
              <p className="text-lg text-zinc-400 font-medium leading-relaxed mb-8 max-w-lg">
                El caos logístico te impide crecer. EasyTrack transforma tu local en una máquina de alta rentabilidad sin necesidad de contratar más personal ni ampliar tu espacio.
              </p>
            </motion.div>
          </div>

          <div className="lg:w-7/12 flex flex-col gap-6 md:gap-8">
            <motion.div variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="group relative bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-8 md:p-10 overflow-hidden hover:bg-zinc-900/60 transition-colors">
              <div className="absolute -right-6 -top-10 text-[160px] font-black text-white/[0.02] group-hover:text-brand-500/5 transition-colors select-none pointer-events-none">
                5s
              </div>
              <h3 className="text-2xl font-bold text-white mb-3 relative z-10 flex items-center gap-4">
                <span className="text-brand-400 font-black text-3xl">5s</span>
                Entregas supersónicas
              </h3>
              <p className="text-zinc-400 font-medium leading-relaxed relative z-10">
                Pasa de buscar paquetes durante minutos a encontrarlos en menos de 5 segundos. Elimina las colas al instante, evita que tus clientes se desesperen y libera tu tiempo para atender las ventas que realmente te dan margen.
              </p>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="group relative bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-8 md:p-10 overflow-hidden hover:bg-zinc-900/60 transition-colors">
              <div className="absolute -right-6 -top-10 text-[160px] font-black text-white/[0.02] group-hover:text-emerald-500/5 transition-colors select-none pointer-events-none">
                +4
              </div>
              <h3 className="text-2xl font-bold text-white mb-3 relative z-10 flex items-center gap-4">
                <span className="text-emerald-400 font-black text-3xl">+4</span>
                Más agencias, más dinero
              </h3>
              <p className="text-zinc-400 font-medium leading-relaxed relative z-10">
                ¿Rechazas trabajar con nuevas empresas por falta de organización? Al tener un control milimétrico del espacio, podrás integrar simultáneamente a Amazon, GLS, Seur, Vinted y más, multiplicando tus comisiones mensuales.
              </p>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="group relative bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-8 md:p-10 overflow-hidden hover:bg-zinc-900/60 transition-colors">
              <div className="absolute -right-6 -top-10 text-[160px] font-black text-white/[0.02] group-hover:text-indigo-500/5 transition-colors select-none pointer-events-none">
                0€
              </div>
              <h3 className="text-2xl font-bold text-white mb-3 relative z-10 flex items-center gap-4">
                <span className="text-indigo-400 font-black text-3xl">0€</span>
                Fin de las pérdidas
              </h3>
              <p className="text-zinc-400 font-medium leading-relaxed relative z-10">
                Se acabaron los paquetes extraviados que tienes que pagar de tu bolsillo. Nuestro sistema de mapeo vincula cada paquete a un hueco físico exacto. Si entra por la puerta, está bajo control.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 w-full h-24 md:h-48 translate-y-[99%] pointer-events-none z-20">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-full">
          <path fill="#09090b" d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,122.7C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
        </svg>
      </div>
    </section>
  );
}