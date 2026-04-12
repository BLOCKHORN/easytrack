import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Hero() {
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
    <section className="relative pt-32 pb-40 md:pt-48 md:pb-48 bg-white overflow-hidden">
      {/* OPTIMIZACIÓN iOS: Eliminados los blur-[100px] y sustituidos por radial-gradients nativos */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f4f4f5_1px,transparent_1px),linear-gradient(to_bottom,#f4f4f5_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-80" />
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.15)_0%,transparent_70%)] rounded-full" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,0.15)_0%,transparent_70%)] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-black text-zinc-600 uppercase tracking-widest mb-8 will-change-transform"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Infraestructura Logística para puntos Pickup
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-5xl md:text-7xl lg:text-[80px] font-black tracking-tighter text-zinc-950 mb-8 leading-[1.05] will-change-transform"
          >
            Encuentra cualquier paquete en <br className="hidden lg:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-emerald-400">
              menos de 5 segundos.
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
            className="text-lg md:text-2xl text-zinc-500 mb-12 max-w-3xl mx-auto font-medium leading-relaxed will-change-transform"
          >
            Recepciona paquetes, ofrece entregas inmediatas e implementa un control visual de tu almacén, desde el primer escaneo.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 w-full max-w-md will-change-transform"
          >
            <button 
              onClick={() => navigate("/registro")}
              className="w-full px-8 py-4 bg-zinc-950 hover:bg-zinc-800 text-white font-black rounded-xl transition-all text-lg flex items-center justify-center shadow-xl shadow-zinc-950/20 active:scale-95"
            >
              Empezar gratis
            </button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.8 }}
            className="w-full pt-10 border-t border-zinc-100 will-change-transform"
          >
             <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-8 text-center">
               El volumen procesado por nuestra red
             </p>
             <div className="flex flex-wrap items-center justify-center gap-12 md:gap-24">
               <div className="text-center">
                 <div className="text-5xl font-black text-zinc-950 tracking-tight">{metrics.tenants}</div>
                 <div className="text-sm font-bold text-zinc-500 mt-1">Negocios Activos</div>
               </div>
               <div className="text-center">
                 <div className="text-5xl font-black text-zinc-950 tracking-tight">{metrics.pkgs}</div>
                 <div className="text-sm font-bold text-zinc-500 mt-1">Entregas Gestionadas</div>
               </div>
             </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full pointer-events-none z-10 leading-none">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-16 md:h-32 lg:h-40 block">
          <path fill="#f8fafc" d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,122.7C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>
    </section>
  );
}