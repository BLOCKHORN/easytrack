import { motion } from 'framer-motion';

export default function ROI() {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  return (
    <section className="relative bg-zinc-950 text-white pb-24 pt-20 lg:pb-32 overflow-hidden z-10">
      
      {/* Fondo optimizado estático - radial-gradient nativo sin blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(79,70,229,0.05)_0%,transparent_60%)] pointer-events-none" />

      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-start">
          
          <div className="lg:w-5/12 lg:sticky lg:top-32 shrink-0">
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="will-change-transform"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] font-black tracking-widest uppercase mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
                Retorno de Inversión
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-[1.1] mb-6 text-white">
                No es un gasto.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-400">
                  Es un multiplicador.
                </span>
              </h2>
              <p className="text-lg text-zinc-400 font-medium leading-relaxed max-w-lg">
                El caos logístico te impide crecer. EasyTrack transforma tu local en una máquina de alta rentabilidad sin necesidad de contratar más personal ni ampliar tu espacio físico.
              </p>
            </motion.div>
          </div>

          <div className="lg:w-7/12 flex flex-col gap-6">
            <motion.div variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-10 shadow-xl will-change-transform">
              <div className="flex flex-col sm:flex-row items-start gap-6 relative z-10">
                <div className="shrink-0 w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center border border-brand-500/20 text-brand-400 font-black text-2xl">
                  5s
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Entregas supersónicas</h3>
                  <p className="text-zinc-400 font-medium leading-relaxed">
                    Pasa de buscar paquetes durante minutos a encontrarlos en menos de 5 segundos. Elimina las colas al instante, evita que tus clientes se desesperen y libera tu tiempo para vender.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-10 shadow-xl will-change-transform">
              <div className="flex flex-col sm:flex-row items-start gap-6 relative z-10">
                <div className="shrink-0 w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 text-emerald-400 font-black text-3xl">
                  ∞
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Capacidad ilimitada</h3>
                  <p className="text-zinc-400 font-medium leading-relaxed">
                    ¿Rechazas trabajar con nuevas operadoras por falta de organización? Al tener un control milimétrico, podrás integrar simultáneamente cualquier agencia logística multiplicando comisiones.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-10 shadow-xl will-change-transform">
              <div className="flex flex-col sm:flex-row items-start gap-6 relative z-10">
                <div className="shrink-0 w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 text-indigo-400 font-black text-2xl">
                  0€
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Fin de las pérdidas</h3>
                  <p className="text-zinc-400 font-medium leading-relaxed">
                    Se acabaron los paquetes extraviados que tienes que pagar de tu bolsillo. Nuestro sistema de mapeo vincula cada paquete a un hueco físico exacto. Control absoluto.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Ola Inferior - Simplificada para iOS */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none pointer-events-none">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-12 md:h-24 lg:h-32 block">
          <path fill="#f8fafc" d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,122.7C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>
    </section>
  );
}