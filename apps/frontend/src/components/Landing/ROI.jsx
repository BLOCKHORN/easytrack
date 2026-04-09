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
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <section ref={containerRef} className="relative bg-zinc-950 text-white pb-32 pt-16 lg:pb-40 overflow-hidden z-10">
      <motion.div 
        style={{ top: glowY }}
        className="absolute left-[-20%] right-[-20%] h-[600px] rounded-[100%] bg-brand-500/10 blur-[120px] pointer-events-none"
      />

      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-start">
          
          <div className="lg:w-5/12 lg:sticky lg:top-40 shrink-0">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] font-black tracking-widest uppercase mb-8">
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
                El caos logístico te impide crecer. EasyTrack transforma tu local en una máquina de alta rentabilidad sin necesidad de contratar más personal ni ampliar tu espacio físico.
              </p>
            </motion.div>
          </div>

          <div className="lg:w-7/12 flex flex-col gap-6 md:gap-8">
            
            <motion.div 
              variants={cardVariants} 
              initial="hidden" 
              whileInView="visible" 
              viewport={{ once: true, margin: "-50px" }} 
              whileHover={{ scale: 1.02 }}
              className="group relative bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 hover:border-brand-500/50 rounded-3xl p-8 md:p-10 overflow-hidden transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="flex items-start gap-6 relative z-10">
                <div className="shrink-0 w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center border border-brand-500/20 text-brand-400 font-black text-2xl group-hover:scale-110 transition-transform duration-500">
                  5s
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    Entregas supersónicas
                  </h3>
                  <p className="text-zinc-400 font-medium leading-relaxed">
                    Pasa de buscar paquetes durante minutos a encontrarlos en menos de 5 segundos. Elimina las colas al instante, evita que tus clientes se desesperen y libera tu tiempo para atender las ventas que realmente te dan margen.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              variants={cardVariants} 
              initial="hidden" 
              whileInView="visible" 
              viewport={{ once: true, margin: "-50px" }} 
              whileHover={{ scale: 1.02 }}
              className="group relative bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 hover:border-emerald-500/50 rounded-3xl p-8 md:p-10 overflow-hidden transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="flex items-start gap-6 relative z-10">
                <div className="shrink-0 w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 text-emerald-400 font-black text-3xl group-hover:scale-110 transition-transform duration-500">
                  ∞
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    Capacidad ilimitada de agencias
                  </h3>
                  <p className="text-zinc-400 font-medium leading-relaxed">
                    ¿Rechazas trabajar con nuevas operadoras por falta de organización? Al tener un control milimétrico del espacio, podrás integrar simultáneamente cualquier agencia logística del mercado, multiplicando tus comisiones mensuales sin saturar el local.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              variants={cardVariants} 
              initial="hidden" 
              whileInView="visible" 
              viewport={{ once: true, margin: "-50px" }} 
              whileHover={{ scale: 1.02 }}
              className="group relative bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 hover:border-indigo-500/50 rounded-3xl p-8 md:p-10 overflow-hidden transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="flex items-start gap-6 relative z-10">
                <div className="shrink-0 w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 text-indigo-400 font-black text-2xl group-hover:scale-110 transition-transform duration-500">
                  0€
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    Fin de las pérdidas
                  </h3>
                  <p className="text-zinc-400 font-medium leading-relaxed">
                    Se acabaron los paquetes extraviados que tienes que pagar de tu bolsillo. Nuestro sistema de mapeo vincula cada paquete a un hueco físico exacto. Si entra por la puerta, está bajo control absoluto.
                  </p>
                </div>
              </div>
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