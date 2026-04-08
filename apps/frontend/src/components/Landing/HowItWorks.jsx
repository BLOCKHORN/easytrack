import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaBarcode, FaObjectGroup, FaUserCircle } from 'react-icons/fa';

function StepOneIllustration() {
  return (
    <div className="relative w-full h-64 mb-10 flex items-center justify-center overflow-hidden">
      <div className="absolute w-32 h-32 bg-brand-500/20 blur-3xl rounded-full" />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} className="relative z-10 w-48 h-32 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col justify-between">
        <div className="flex items-center gap-2">
          <FaUserCircle className="text-brand-400 text-lg" />
          <div className="h-1.5 w-16 bg-white/20 rounded-full" />
        </div>
        <div className="space-y-2">
          <motion.div initial={{ width: 0 }} whileInView={{ width: '100%' }} transition={{ delay: 0.5, duration: 1.5 }} className="h-1 bg-brand-500/40 rounded-full" />
          <div className="h-1 w-2/3 bg-white/10 rounded-full" />
        </div>
      </motion.div>
    </div>
  );
}

function StepTwoIllustration() {
  return (
    <div className="relative w-full h-64 mb-10 flex items-center justify-center overflow-hidden">
      <div className="absolute w-40 h-40 bg-brand-600/10 blur-3xl rounded-full" />
      <div className="relative z-10 grid grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className={`w-12 h-16 rounded-xl border border-white/10 flex items-end p-2 ${i === 3 ? 'bg-brand-500/20' : 'bg-white/5'}`}>
            <div className={`w-full h-1 rounded-full ${i === 3 ? 'bg-brand-400' : 'bg-white/10'}`} />
          </motion.div>
        ))}
      </div>
      <FaObjectGroup className="absolute text-brand-500/5 text-9xl" />
    </div>
  );
}

function StepThreeIllustration() {
  return (
    <div className="relative w-full h-64 mb-10 flex items-center justify-center overflow-hidden">
      <div className="absolute w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full" />
      <div className="relative z-10 flex flex-col items-center">
        <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }} className="px-6 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
          <FaBarcode className="text-5xl text-white/40 mb-2" />
          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }} className="h-0.5 w-full bg-brand-500 shadow-[0_0_15px_#4f46e5]" />
        </motion.div>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  const steps = [
    { title: "Crea tu cuenta", desc: "Regístrate en minutos. Tu primer mes es gratuito para que valides el sistema sin riesgo.", render: <StepOneIllustration /> },
    { title: "Mapea tu local", desc: "Define baldas y estantes una sola vez. EasyTrack crea un mapa visual idéntico a tu tienda.", render: <StepTwoIllustration /> },
    { title: "Escanea y guarda", desc: "El sistema asigna el hueco óptimo al instante. Solo sigue la indicación visual en pantalla.", render: <StepThreeIllustration /> }
  ];

  return (
    <section id="como-funciona" className="relative bg-zinc-950 text-white pb-12 overflow-hidden">
      <div className="absolute top-0 w-full h-32 md:h-64 -translate-y-[99%] pointer-events-none">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-full rotate-180">
          <path fill="#09090b" d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,122.7C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 relative">
        <div className="text-center max-w-3xl mx-auto mb-28">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-4xl md:text-7xl font-extrabold mb-8 tracking-tighter">Integración <span className="text-zinc-500">sin fricción</span></motion.h2>
          <p className="text-lg text-zinc-400 font-medium">Implementación en una tarde, no en un mes.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {steps.map((step, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.2 }}>
              {step.render}
              <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
              <p className="text-zinc-400">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}