'use strict';

import { motion } from 'framer-motion';

function ShelvingVisual() {
  return (
    <div className="relative w-full h-40 mb-10 flex items-center justify-center bg-zinc-50/50 rounded-[1.5rem] border border-zinc-100 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-52 h-24 bg-white border border-zinc-200 rounded-xl p-3 shadow-sm flex flex-col justify-between will-change-transform"
      >
        <div className="space-y-2 w-full">
           <div className="h-1.5 w-full bg-zinc-100 rounded-full" />
           <div className="h-1.5 w-3/4 bg-zinc-100 rounded-full" />
        </div>
        <div className="flex justify-between items-end">
          <div className="h-1.5 w-1/4 bg-zinc-100 rounded-full" />
          <div className="px-3 py-1.5 bg-zinc-950 text-white rounded-md font-[900] text-[10px] tracking-widest leading-none">
            B-4
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ScanningVisual() {
  return (
    <div className="relative w-full h-40 mb-10 flex items-center justify-center bg-zinc-50/50 rounded-[1.5rem] border border-zinc-100 overflow-hidden">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-28 h-28 bg-white border border-zinc-200 rounded-xl shadow-sm flex flex-col items-center justify-center gap-2 overflow-hidden will-change-transform"
      >
        {/* Representación minimalista de un código de barras */}
        <div className="flex items-end gap-[3px] h-10 w-16 opacity-80">
          <div className="w-[3px] h-full bg-zinc-900 rounded-sm" />
          <div className="w-[2px] h-3/4 bg-zinc-300 rounded-sm" />
          <div className="w-[4px] h-full bg-zinc-900 rounded-sm" />
          <div className="w-[2px] h-5/6 bg-zinc-300 rounded-sm" />
          <div className="w-[3px] h-full bg-zinc-900 rounded-sm" />
          <div className="w-[2px] h-1/2 bg-zinc-300 rounded-sm" />
          <div className="w-[4px] h-full bg-zinc-900 rounded-sm" />
        </div>
        {/* Línea láser sólida sin sombra neón */}
        <motion.div 
          animate={{ y: [-15, 15, -15] }} 
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }} 
          className="absolute w-full h-0.5 bg-brand-500" 
        />
      </motion.div>
    </div>
  );
}

function StockVisual() {
  return (
    <div className="relative w-full h-40 mb-10 flex items-center justify-center bg-zinc-50/50 rounded-[1.5rem] border border-zinc-100 overflow-hidden">
      <div className="relative z-10 grid grid-cols-5 gap-[5px] w-3/4">
        {[...Array(15)].map((_, i) => {
          // Lógica estricta de contraste: Blanco, Negro o Acento. Sin degradados ni pasteles.
          const status = i % 6 === 0 ? 'accent' : (i % 3 === 0 ? 'dark' : 'light');
          const bgColor = status === 'accent' ? 'bg-brand-400' : (status === 'dark' ? 'bg-zinc-800' : 'bg-white');
          const borderColor = status === 'light' ? 'border-zinc-200' : 'border-transparent';
          
          return (
            <motion.div 
              key={i} 
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.02, duration: 0.3 }}
              className={`rounded-md aspect-square border ${bgColor} ${borderColor} will-change-transform shadow-sm`}
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
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <section id="features" className="relative pt-12 md:pt-16 pb-32 bg-slate-50 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Líneas de acento verticales muy sutiles para look Templifica */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]">
        <div className="absolute left-1/4 top-0 bottom-0 w-[1px] bg-black" />
        <div className="absolute right-1/4 top-0 bottom-0 w-[1px] bg-black" />
      </div>

      <div className="max-w-7xl mx-auto mt-10 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-20 relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="inline-block px-5 py-2 bg-white text-zinc-950 text-[10px] font-[900] uppercase tracking-[0.2em] rounded-full mb-6 border border-zinc-200 shadow-sm"
          >
            Orden Quirúrgico
          </motion.div>
          {/* Añadido pt-2 y pb-2 con leading-[1.1] para evitar recortes en la fuente gruesa */}
          <motion.h2 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-5xl md:text-7xl font-[900] text-zinc-950 mb-6 tracking-[-0.04em] leading-[1.1] py-2"
          >
            Digitalizamos la lógica física <br className="hidden md:block" /> de tu local
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="text-xl text-zinc-500 leading-relaxed font-medium max-w-2xl mx-auto"
          >
            No necesitas cambiar tus estanterías. Solo necesitas orden quirúrgico.
          </motion.p>
        </div>

        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          transition={{ staggerChildren: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {/* Tarjetas limpias: sombras sutiles y bordes nítidos */}
          <motion.div variants={item} className="bg-white rounded-[2rem] p-8 lg:p-10 border border-zinc-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-full group hover:border-zinc-300 hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] transition-all">
            <ShelvingVisual />
            <h3 className="text-2xl font-[900] text-zinc-950 mb-3 tracking-tight">Ubicaciones Reales</h3>
            <p className="text-zinc-500 leading-relaxed font-medium text-sm md:text-base">
              Replica tus estanterías físicas exactamente como son (Ej: B1, B4). El sistema calcula el hueco óptimo por ti.
            </p>
          </motion.div>

          <motion.div variants={item} className="bg-white rounded-[2rem] p-8 lg:p-10 border border-zinc-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-full group hover:border-zinc-300 hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] transition-all">
            <ScanningVisual />
            <h3 className="text-2xl font-[900] text-zinc-950 mb-3 tracking-tight">Búsqueda Ultrasónica</h3>
            <p className="text-zinc-500 leading-relaxed font-medium text-sm md:text-base">
              Teclea el nombre del cliente o escanea la etiqueta. La pantalla te dice el estante exacto donde mirar en 3s.
            </p>
          </motion.div>

          <motion.div variants={item} className="bg-white rounded-[2rem] p-8 lg:p-10 border border-zinc-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-full group hover:border-zinc-300 hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] transition-all">
            <StockVisual />
            <h3 className="text-2xl font-[900] text-zinc-950 mb-3 tracking-tight">Control de Ocupación</h3>
            <p className="text-zinc-500 leading-relaxed font-medium text-sm md:text-base">
              Mapa visual de stock en tiempo real. Evita estantes saturados y distribuye el peso de tu local sin esfuerzo.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}