import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaPlay, FaBuilding, FaBoxOpen } from "react-icons/fa";

export default function Hero({ onOpenDemo }) {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({ tenants: '13+', pkgs: '12k+' });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/metrics/public`);
        if (res.ok) {
          const data = await res.json();
          setMetrics({
            tenants: data.tenants_count ? `${data.tenants_count}+` : '13+',
            pkgs: data.packages_delivered_total ? `${(data.packages_delivered_total / 1000).toFixed(1)}k+` : '12k+'
          });
        }
      } catch (e) {}
    };
    fetchMetrics();
  }, []);

  return (
    <section className="relative pt-28 pb-32 md:pt-36 md:pb-40 bg-slate-50 overflow-hidden">
      
      {/* Fondo Grid Técnico */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60" />
      
      {/* Destello de color de fondo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-400/10 blur-[120px] rounded-full pointer-events-none z-0" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          
          <motion.div 
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-bold mb-8 shadow-sm"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
            </span>
            Infraestructura para Puntos de Recogida
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
            className="text-5xl md:text-7xl lg:text-[80px] font-black tracking-tighter text-slate-950 mb-8 leading-[1.05]"
          >
            Encuentra cualquier paquete en <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400">
              menos de 3 segundos.
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
            className="text-lg md:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto font-medium leading-relaxed"
          >
            Sustituye el caos y las libretas por un sistema visual de estanterías. Organiza entregas de GLS, Seur, Vinted y Amazon sin margen de error.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
          >
            <button 
              onClick={() => navigate("/registro")}
              className="w-full sm:w-auto px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white font-black rounded-2xl shadow-xl shadow-brand-500/20 transition-all text-lg"
            >
              Probar gratis
            </button>
            <button 
              onClick={onOpenDemo}
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 transition-all text-lg flex items-center justify-center gap-3"
            >
              <FaPlay className="text-brand-600 text-sm" /> Ver demo
            </button>
          </motion.div>

          {/* Tarjeta de Métricas (ahora respira bien) */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="relative z-20 flex flex-col sm:flex-row items-center justify-center gap-8 md:gap-16 border border-slate-200 bg-white/80 backdrop-blur-md p-6 rounded-[2rem] max-w-2xl mx-auto shadow-xl shadow-slate-200/40"
          >
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600">
                 <FaBuilding size={20}/>
               </div>
               <div className="text-left">
                 <div className="text-2xl font-black text-slate-900">{metrics.tenants}</div>
                 <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Negocios Activos</div>
               </div>
             </div>

             <div className="hidden sm:block w-px h-12 bg-slate-200"></div>

             <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600">
                 <FaBoxOpen size={20}/>
               </div>
               <div className="text-left">
                 <div className="text-2xl font-black text-slate-900">{metrics.pkgs}</div>
                 <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Entregas Gestionadas</div>
               </div>
             </div>
          </motion.div>
        </div>
      </div>

      {/* Separador Curvo Absoluto (al fondo, sin romper layout) */}
      <div className="absolute bottom-0 left-0 w-full pointer-events-none z-10 leading-none">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-16 md:h-32 lg:h-40 block">
          <path fill="#ffffff" d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,122.7C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>
    </section>
  );
}