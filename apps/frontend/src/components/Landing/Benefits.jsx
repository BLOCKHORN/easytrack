import { motion } from 'framer-motion';
import { FaUserCircle } from 'react-icons/fa';

function ShelvingVisual() {
  return (
    <div className="relative w-full h-40 mb-10 flex items-center justify-center overflow-hidden">
      {/* OPTIMIZACIÓN iOS: radial-gradient en vez de blur */}
      <div className="absolute w-40 h-40 bg-[radial-gradient(circle,rgba(20,184,166,0.15)_0%,transparent_70%)] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-48 h-28 bg-white/95 border border-slate-200 rounded-3xl p-4 shadow-xl flex gap-2 origin-bottom will-change-transform"
      >
        <div className="flex-grow space-y-2">
           <div className="h-1.5 w-full bg-slate-200 rounded-full" />
           <div className="h-1.5 w-2/3 bg-slate-200 rounded-full" />
           <motion.div initial={{ width: 0 }} whileInView={{ width: '80%' }} viewport={{ once: true }} transition={{ delay: 0.3, duration: 0.5 }} className="h-4 bg-brand-100 rounded-lg" />
        </div>
        <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs shadow-lg">B-4</div>
      </motion.div>
    </div>
  );
}

function ScanningVisual() {
  return (
    <div className="relative w-full h-40 mb-10 flex items-center justify-center overflow-hidden">
      <div className="absolute w-40 h-40 bg-[radial-gradient(circle,rgba(148,163,184,0.3)_0%,transparent_70%)] rounded-full" />
      
      <motion.div 
        initial={{ y: 15, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-24 h-40 bg-slate-950 rounded-[2.5rem] border-4 border-slate-950 shadow-2xl p-2.5 overflow-hidden will-change-transform"
      >
        <div className="w-full h-full bg-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2">
          <FaUserCircle className="text-4xl text-slate-700" />
          <div className="w-12 h-1.5 bg-slate-600 rounded-full" />
          {/* OPTIMIZACIÓN iOS: Animación simple sin sombras dinámicas (box-shadow) */}
          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-16 h-3 bg-brand-500 rounded mt-1" />
        </div>
      </motion.div>
    </div>
  );
}

function StockVisual() {
  return (
    <div className="relative w-full h-40 mb-10 flex items-center justify-center overflow-hidden">
      <div className="absolute w-40 h-40 bg-[radial-gradient(circle,rgba(16,185,129,0.15)_0%,transparent_70%)] rounded-full" />
      
      <div className="relative z-10 grid grid-cols-5 gap-2 w-3/4">
        {[...Array(15)].map((_, i) => {
          const occupancy = i % 4 === 0 ? 'saturado' : (i % 3 === 0 ? 'medio' : 'libre');
          const bgColor = occupancy === 'saturado' ? 'bg-red-200' : (occupancy === 'medio' ? 'bg-amber-100' : 'bg-emerald-100');
          
          return (
            <motion.div 
              key={i} 
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              className={`rounded-md aspect-square border ${bgColor} ${occupancy === 'libre' ? 'border-emerald-200' : 'border-slate-200'} will-change-transform`}
            />
          )
        })}
      </div>
    </div>
  );
}

export default function Benefits() {
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  return (
    <section id="features" className="relative pt-12 pb-32 bg-slate-50 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto mt-20">
        <div className="text-center max-w-3xl mx-auto mb-20 relative z-10">
          <motion.h2 
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight will-change-transform"
          >
            Digitalizamos la lógica física <br /> de tu local
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="text-xl text-slate-600 leading-relaxed font-medium will-change-transform"
          >
            No necesitas cambiar tus estanterías. Solo necesitas orden.
          </motion.p>
        </div>

        {/* OPTIMIZACIÓN iOS: Margen de viewport más pequeño para que no anime todo a la vez al hacer scroll rápido */}
        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          transition={{ staggerChildren: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-10"
        >
          <motion.div variants={item} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col h-full group will-change-transform">
            <ShelvingVisual />
            <h3 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight group-hover:text-brand-600 transition-colors">Ubicaciones Reales</h3>
            <p className="text-slate-600 leading-relaxed flex-grow font-medium text-sm md:text-base">
              Replica tus estanterías (Ej: A1, B4). El sistema te dice el hueco óptimo al recibir un paquete nuevo.
            </p>
          </motion.div>

          <motion.div variants={item} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col h-full group will-change-transform">
            <ScanningVisual />
            <h3 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight group-hover:text-brand-600 transition-colors">Búsqueda Ultrasónica</h3>
            <p className="text-slate-600 leading-relaxed flex-grow font-medium text-sm md:text-base">
              Teclea el nombre del cliente o escanea. La pantalla te dice el estante exacto donde mirar en 3s.
            </p>
          </motion.div>

          <motion.div variants={item} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col h-full group will-change-transform">
            <StockVisual />
            <h3 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight group-hover:text-brand-600 transition-colors">Control de Stock</h3>
            <p className="text-slate-600 leading-relaxed flex-grow font-medium text-sm md:text-base">
              Mapa visual de ocupación. Evita estantes saturados y optimiza la carga de tu local sin esfuerzo.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}