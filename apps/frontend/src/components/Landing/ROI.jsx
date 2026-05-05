import { motion } from 'framer-motion';

export default function ROI() {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  return (
    <section className="relative bg-[#09090b] text-white pb-24 pt-20 lg:pb-32 overflow-hidden z-10">
      
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
              <div className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-6">
                Impacto Financiero
              </div>
              
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-[1.1] mb-6 text-white">
                No es un gasto.<br />
                <span className="text-brand-500">
                  Es un multiplicador.
                </span>
              </h2>
              <p className="text-lg text-zinc-400 font-medium leading-relaxed max-w-lg">
                El caos logístico te impide crecer. EasyTrack transforma tu local en una máquina de alta rentabilidad sin necesidad de contratar más personal ni ampliar tu espacio físico.
              </p>
            </motion.div>
          </div>

          <div className="lg:w-7/12 flex flex-col gap-6">
            <motion.div variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="group bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 transition-colors rounded-3xl p-8 md:p-10 will-change-transform">
              <div className="flex flex-col sm:flex-row items-start gap-8">
                <div className="shrink-0 text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">
                  5<span className="text-3xl md:text-4xl text-brand-500">s</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Entregas supersónicas</h3>
                  <p className="text-zinc-400 font-medium leading-relaxed">
                    Pasa de buscar paquetes durante minutos a encontrarlos en menos de 5 segundos. Elimina las colas al instante, evita que tus clientes se desesperen y libera tu tiempo para vender.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="group bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 transition-colors rounded-3xl p-8 md:p-10 will-change-transform">
              <div className="flex flex-col sm:flex-row items-start gap-8">
                {/* Se ha ajustado el tamaño del infinito para que compense su menor altura natural */}
                <div className="shrink-0 text-6xl md:text-7xl font-black text-brand-500 tracking-tighter leading-none translate-y-1">
                  ∞
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Capacidad ilimitada</h3>
                  <p className="text-zinc-400 font-medium leading-relaxed">
                    ¿Rechazas trabajar con nuevas operadoras por falta de organización? Al tener un control milimétrico, podrás integrar simultáneamente múltiples agencias logísticas multiplicando comisiones.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="group bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 transition-colors rounded-3xl p-8 md:p-10 will-change-transform">
              <div className="flex flex-col sm:flex-row items-start gap-8">
                <div className="shrink-0 text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">
                  0<span className="text-3xl md:text-4xl text-brand-500">€</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Fin de las pérdidas</h3>
                  <p className="text-zinc-400 font-medium leading-relaxed">
                    Se acabaron los paquetes extraviados que tienes que pagar de tu bolsillo. Nuestro sistema de mapeo vincula cada paquete a un hueco físico exacto. Control absoluto.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none pointer-events-none">
        <svg viewBox="0 0 1440 100" preserveAspectRatio="none" className="w-full h-12 md:h-24 block translate-y-[1px]">
          <path fill="#f8fafc" d="M0 30 Q 360 -10, 720 30 T 1440 30 V 100 H 0 Z" />
        </svg>
      </div>
    </section>
  );
}