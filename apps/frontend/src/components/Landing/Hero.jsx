import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../../utils/supabaseClient";

const CustomIconArrow = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 12H20M20 12L13 5M20 12L13 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 12H20M20 12L13 5M20 12L13 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" transform="translate(2, 0)"/></svg>;

export default function Hero() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({ tenants: '13+', pkgs: '12k+' });
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        setIsLoggedIn(true);
      }
    });
  }, []);

  return (
    <section className="relative pt-32 pb-40 md:pt-48 md:pb-48 bg-[#09090b] overflow-hidden">
      
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-80" />
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.08)_0%,transparent_70%)] rounded-full" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,0.08)_0%,transparent_70%)] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="flex items-center justify-center gap-3 mb-10 will-change-transform"
          >
            <span className="text-brand-500/50 font-mono text-sm hidden sm:inline">[</span>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.8)]" />
              <span className="text-[10px] sm:text-xs font-mono font-bold text-zinc-400 uppercase tracking-[0.2em]">
                Infraestructura Logística <span className="text-zinc-700 mx-1 hidden sm:inline">|</span> Puntos Pickup
              </span>
            </div>
            <span className="text-brand-500/50 font-mono text-sm hidden sm:inline">]</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-5xl md:text-7xl lg:text-[80px] font-black tracking-tighter text-white mb-8 leading-[1.05] will-change-transform"
          >
            Encuentra cualquier paquete en <br className="hidden lg:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-300">
              menos de 5 segundos.
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
            className="text-lg md:text-2xl text-zinc-400 mb-12 max-w-3xl mx-auto font-medium leading-relaxed will-change-transform"
          >
            Recepciona envíos, ofrece entregas inmediatas y elimina el caos de tu almacén. Además, descubre tu fuga de capital real para exigir la tarifa justa a las agencias.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 w-full max-w-2xl will-change-transform"
          >
            <button 
              onClick={() => navigate("/?audit=true")}
              className="relative inline-flex h-14 w-full sm:w-auto items-center justify-center overflow-hidden rounded-xl p-[1.5px] focus:outline-none transition-transform active:scale-95 group"
            >
              <span className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#18181b_0%,#14b8a6_50%,#18181b_100%)] opacity-80" />
              <span className="inline-flex h-full w-full items-center justify-center rounded-xl bg-zinc-950 px-8 py-1 text-sm font-black text-white backdrop-blur-3xl gap-2 uppercase tracking-widest group-hover:bg-zinc-900 transition-colors">
                <span className="text-brand-500">▶</span> INICIAR DIAGNÓSTICO <CustomIconArrow />
              </span>
            </button>

            {isLoggedIn ? (
              <button 
                onClick={() => navigate("/dashboard")}
                className="w-full sm:w-auto px-10 py-4 bg-brand-600 hover:bg-brand-500 text-white font-black rounded-xl transition-all text-sm uppercase tracking-widest flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.2)] active:scale-95"
              >
                Ir a mi panel
              </button>
            ) : (
              <button 
                onClick={() => navigate("/registro")}
                className="w-full sm:w-auto px-10 py-4 bg-brand-600 hover:bg-brand-500 text-white font-black rounded-xl transition-all text-sm uppercase tracking-widest flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.2)] active:scale-95"
              >
                Empezar gratis
              </button>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.8 }}
            className="w-full pt-10 border-t border-zinc-800 will-change-transform"
          >
             <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-8 text-center">
               El volumen procesado por nuestra red
             </p>
             <div className="flex flex-wrap items-center justify-center gap-12 md:gap-24">
               <div className="text-center">
                 <div className="text-5xl font-black text-white tracking-tight">{metrics.tenants}</div>
                 <div className="text-sm font-bold text-zinc-500 mt-1">Negocios Activos</div>
               </div>
               <div className="text-center">
                 <div className="text-5xl font-black text-white tracking-tight">{metrics.pkgs}</div>
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