import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaPlay } from "react-icons/fa";

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
    <section className="relative pt-32 pb-40 md:pt-48 md:pb-48 bg-slate-50 overflow-hidden">
      
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_60%,transparent_100%)] opacity-40" />
        
        <div className="w-full max-w-[1400px] relative h-full">
          <motion.div
            animate={{ x: ["-5%", "5%", "-5%"], y: ["-5%", "5%", "-5%"], scale: [1, 1.05, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[10%] -right-[20%] w-[1000px] h-[600px] rounded-full bg-gradient-to-tr from-brand-300 to-emerald-200 blur-[120px] opacity-50 mix-blend-multiply rotate-[-15deg]"
          />
          
          <motion.div
            animate={{ x: ["5%", "-5%", "5%"], y: ["5%", "-5%", "5%"], scale: [1, 1.1, 1] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[30%] -left-[20%] w-[900px] h-[700px] rounded-full bg-gradient-to-bl from-cyan-200 to-brand-400 blur-[120px] opacity-40 mix-blend-multiply rotate-[15deg]"
          />

          <motion.div
            animate={{ rotate: [-10, -14, -10], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[15%] left-[10%] w-[150%] h-[250px] bg-gradient-to-r from-transparent via-brand-200 to-emerald-100 blur-[90px] rotate-[-12deg]"
          />
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-5xl md:text-7xl lg:text-[80px] font-black tracking-tighter text-slate-900 mb-8 leading-[1.05]"
          >
            La infraestructura logística para encontrar cualquier paquete en <br className="hidden lg:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-teal-500 to-brand-400">
              menos de 5 segundos.
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
            className="text-lg md:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto font-medium leading-relaxed"
          >
            Recepciona paquetes, ofrece entregas inmediatas e implementa un control visual de tu almacén, desde el primer escaneo.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 w-full"
          >
            <button 
              onClick={() => navigate("/registro")}
              className="w-full sm:w-auto px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white font-black rounded-xl transition-all text-lg flex items-center justify-center shadow-xl shadow-brand-600/20 active:scale-95"
            >
              Empezar gratis
            </button>
            <button 
              onClick={onOpenDemo}
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl border border-slate-200 transition-all text-lg flex items-center justify-center gap-3 shadow-sm active:scale-95"
            >
              <FaPlay className="text-brand-600 text-sm" /> Ver cómo funciona
            </button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.8 }}
            className="w-full pt-10 border-t border-slate-200/60"
          >
             <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8 text-center">
               El volumen procesado por nuestra red
             </p>
             <div className="flex flex-wrap items-center justify-center gap-12 md:gap-24">
               <div className="text-center">
                 <div className="text-5xl font-black text-slate-900 tracking-tight">{metrics.tenants}</div>
                 <div className="text-sm font-bold text-slate-500 mt-1">Negocios Activos</div>
               </div>
               <div className="text-center">
                 <div className="text-5xl font-black text-slate-900 tracking-tight">{metrics.pkgs}</div>
                 <div className="text-sm font-bold text-slate-500 mt-1">Entregas Gestionadas</div>
               </div>
             </div>
          </motion.div>

        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full pointer-events-none z-10 leading-none">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-16 md:h-32 lg:h-40 block">
          <path fill="#ffffff" d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,122.7C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>
    </section>
  );
}