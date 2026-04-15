import { motion } from 'framer-motion';
import { FaBarcode, FaObjectGroup, FaUserCircle } from 'react-icons/fa';

function StepOneIllustration() {
  return (
    <div className="relative w-full h-64 mb-10 flex items-center justify-center overflow-hidden">
      <div className="absolute w-64 h-64 bg-[radial-gradient(circle,rgba(99,102,241,0.15)_0%,transparent_70%)]" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="relative z-10 w-48 h-32 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl flex flex-col justify-between will-change-transform">
        <div className="flex items-center gap-2">
          <FaUserCircle className="text-brand-400 text-lg" />
          <div className="h-1.5 w-16 bg-zinc-700 rounded-full" />
        </div>
        <div className="space-y-2">
          <motion.div initial={{ width: 0 }} whileInView={{ width: '100%' }} viewport={{ once: true }} transition={{ delay: 0.3, duration: 1 }} className="h-1 bg-brand-500 rounded-full" />
          <div className="h-1 w-2/3 bg-zinc-700 rounded-full" />
        </div>
      </motion.div>
    </div>
  );
}

function StepTwoIllustration() {
  return (
    <div className="relative w-full h-64 mb-10 flex items-center justify-center overflow-hidden">
      <div className="absolute w-64 h-64 bg-[radial-gradient(circle,rgba(79,70,229,0.15)_0%,transparent_70%)]" />
      <div className="relative z-10 grid grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className={`w-12 h-16 rounded-xl border border-zinc-800 flex items-end p-2 will-change-transform ${i === 3 ? 'bg-brand-500/20 border-brand-500/30' : 'bg-zinc-900'}`}>
            <div className={`w-full h-1 rounded-full ${i === 3 ? 'bg-brand-400' : 'bg-zinc-700'}`} />
          </motion.div>
        ))}
      </div>
      <FaObjectGroup className="absolute text-brand-500/5 text-9xl pointer-events-none" />
    </div>
  );
}

function StepThreeIllustration() {
  return (
    <div className="relative w-full h-64 mb-10 flex items-center justify-center overflow-hidden">
      <div className="absolute w-64 h-64 bg-[radial-gradient(circle,rgba(16,185,129,0.1)_0%,transparent_70%)]" />
      <div className="relative z-10 flex flex-col items-center">
        {/* OPTIMIZACIÓN iOS: Animaciones de traslación simples, sin sombras dinámicas */}
        <motion.div animate={{ y: [-4, 4, -4] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="px-6 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl will-change-transform">
          <FaBarcode className="text-5xl text-zinc-600 mb-2" />
          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="h-0.5 w-full bg-brand-500" />
        </motion.div>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  const steps = [
    { title: "Crea tu cuenta", desc: "Regístrate en minutos. Tu primer mes es gratuito para que valides el sistema sin riesgo.", render: <StepOneIllustration /> },
    { title: "Mapea tu local", desc: "Define tu ubicaciones una sola vez. EasyTrack crea un mapa visual idéntico a tu tienda.", render: <StepTwoIllustration /> },
    { title: "Escanea y guarda", desc: "El sistema asigna el hueco óptimo al instante. Solo sigue la indicación visual en pantalla.", render: <StepThreeIllustration /> }
  ];

  return (
    <section id="como-funciona" className="relative bg-zinc-950 text-white pb-12 pt-32 overflow-hidden">
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none rotate-180">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-16 md:h-32 lg:h-48 block">
          <path fill="#f8fafc" d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,122.7C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_20%,transparent_100%)] opacity-20 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20 md:mb-28">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-4xl md:text-6xl font-black tracking-tighter mb-6 text-white will-change-transform">
            Integración <span className="text-zinc-500">sin fricción</span>
          </motion.h2>
          <p className="text-lg md:text-xl text-zinc-400 font-medium">Implementación en una tarde, no en un mes.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {steps.map((step, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ delay: i * 0.1, duration: 0.4 }} className="will-change-transform">
              {step.render}
              <h3 className="text-2xl font-bold mb-3 text-white tracking-tight">{step.title}</h3>
              <p className="text-zinc-400 leading-relaxed font-medium">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}