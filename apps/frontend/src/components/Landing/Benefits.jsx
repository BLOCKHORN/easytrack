import { motion } from 'framer-motion';
import { FaChevronRight, FaBarcode, FaObjectGroup, FaUserCircle } from 'react-icons/fa';

// --- MICRO-ILUSTRACIONES ANIMADAS (Estilo Custom, World-Class) ---

function ShelvingVisual() {
  return (
    <div className="relative w-full h-40 mb-10 flex items-center justify-center overflow-hidden">
      {/* Fondo difuminado de marca */}
      <div className="absolute w-32 h-32 bg-brand-500/10 blur-3xl rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="relative z-10 w-48 h-28 bg-white backdrop-blur-md border border-slate-200 rounded-3xl p-4 shadow-xl flex gap-2 origin-bottom"
      >
        <div className="flex-grow space-y-2">
           <div className="h-1.5 w-full bg-slate-200 rounded-full" />
           <div className="h-1.5 w-2/3 bg-slate-200 rounded-full" />
           <motion.div initial={{ width: 0 }} whileInView={{ width: '80%' }} transition={{ delay: 0.6 }} className="h-4 bg-brand-100 rounded-lg" />
        </div>
        <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs shadow-lg">B-4</div>
      </motion.div>
    </div>
  );
}

function ScanningVisual() {
  return (
    <div className="relative w-full h-40 mb-10 flex items-center justify-center overflow-hidden">
      <div className="absolute w-32 h-32 bg-slate-300 blur-3xl rounded-full" />
      
      <motion.div 
        initial={{ y: 20 }}
        whileInView={{ y: 0 }}
        className="relative z-10 w-24 h-40 bg-slate-950 rounded-[2.5rem] border-4 border-slate-950 shadow-2xl p-2.5 overflow-hidden"
      >
        <div className="w-full h-full bg-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2">
          <FaUserCircle className="text-4xl text-slate-700" />
          <div className="w-12 h-1.5 bg-slate-600 rounded-full" />
          <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-16 h-3 bg-brand-500 rounded mt-1 shadow-[0_0_15px_#4f46e5]" />
        </div>
      </motion.div>
    </div>
  );
}

function StockVisual() {
  return (
    <div className="relative w-full h-40 mb-10 flex items-center justify-center overflow-hidden">
      <div className="absolute w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full" />
      
      <div className="relative z-10 grid grid-cols-5 gap-2 w-3/4">
        {[...Array(15)].map((_, i) => {
          const occupancy = i % 4 === 0 ? 'saturado' : (i % 3 === 0 ? 'medio' : 'libre');
          const bgColor = occupancy === 'saturado' ? 'bg-red-200' : (occupancy === 'medio' ? 'bg-amber-100' : 'bg-emerald-100');
          
          return (
            <motion.div 
              key={i} 
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + i * 0.02, type: "spring" }}
              className={`rounded-md aspect-square border ${bgColor} ${occupancy === 'libre' ? 'border-emerald-200' : 'border-slate-200'}`}
            />
          )
        })}
      </div>
    </div>
  );
}


export default function Benefits() {
  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } }
  };

  return (
    <section id="features" className="relative pt-12 pb-32 bg-white px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto mt-20">
        <div className="text-center max-w-3xl mx-auto mb-20 relative z-10">
          <motion.h2 
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight"
          >
            Digitalizamos la lógica física <br /> de tu local
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="text-xl text-slate-600 leading-relaxed font-medium"
          >
            No necesitas cambiar tus estanterías. Solo necesitas orden.
          </motion.p>
        </div>

        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          transition={{ staggerChildren: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-10"
        >
          {/* Feature 1 - Ubicaciones */}
          <motion.div variants={item} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col h-full group transition-all duration-300 hover:shadow-brand-300/30">
            <ShelvingVisual />
            <h3 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight group-hover:text-brand-600">Ubicaciones Reales</h3>
            <p className="text-slate-600 leading-relaxed flex-grow font-medium text-sm md:text-base">
              Replica tus estanterías (Ej: A1, B4). El sistema te dice el hueco óptimo al recibir un paquete nuevo.
            </p>
          </motion.div>

          {/* Feature 2 - Búsqueda */}
          <motion.div variants={item} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col h-full group transition-all duration-300 hover:shadow-brand-300/30">
            <ScanningVisual />
            <h3 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight group-hover:text-brand-600">Búsqueda Ultrasónica</h3>
            <p className="text-slate-600 leading-relaxed flex-grow font-medium text-sm md:text-base">
              Teclea el nombre del cliente o escanea. La pantalla te dice el estante exacto donde mirar en 3s.
            </p>
          </motion.div>

          {/* Feature 3 - Stock */}
          <motion.div variants={item} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col h-full group transition-all duration-300 hover:shadow-brand-300/30">
            <StockVisual />
            <h3 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight group-hover:text-brand-600">Control de Stock</h3>
            <p className="text-slate-600 leading-relaxed flex-grow font-medium text-sm md:text-base">
              Mapa visual de ocupación. Evita estantes saturados y optimiza la carga de tu local sin esfuerzo.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}