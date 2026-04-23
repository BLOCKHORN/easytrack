'use strict';

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { supabase } from "../../utils/supabaseClient";

const IconStar = () => (
  <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const ROTATING_TEXTS = [
  "local más grande",
  "empleado extra",
  "máster en logística",
  "software complejo",
  "experto en sistemas"
];

const CLIENT_INITIALS = [
  { in: "EB", name: "Estanco Benidoleig" },
  { in: "PJ", name: "Papelería Jiménez" },
  { in: "KR", name: "Kiosco Rivas" },
  { in: "PL", name: "Punto Pack López" }
];

const AnimatedNumber = ({ value, initial }) => {
  const spring = useSpring(initial, { mass: 0.8, stiffness: 40, damping: 15 });
  const display = useTransform(spring, (current) => new Intl.NumberFormat('es-ES').format(Math.floor(current)));
  useEffect(() => { spring.set(value); }, [value, spring]);
  return <motion.span>{display}</motion.span>;
};

export default function Hero() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [rawTenants, setRawTenants] = useState(70);
  const [rawPkgs, setRawPkgs] = useState(150000);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % ROTATING_TEXTS.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/metrics/public`);
        if (res.ok) {
          const data = await res.json();
          if (data.tenants_count) setRawTenants(data.tenants_count);
          if (data.packages_delivered_total) setRawPkgs(data.packages_delivered_total);
        }
      } catch (e) {}
    };
    fetchMetrics();
    supabase.auth.getSession().then(({ data }) => { if (data?.session) setIsLoggedIn(true); });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Madrid', hour: 'numeric', hour12: false });
      const hour = parseInt(formatter.format(new Date()), 10);
      const day = new Date().getDay();
      if (hour >= 9 && hour < 20 && day !== 0) {
        const multiplier = day === 6 ? 0.3 : 1;
        const added = Math.floor((Math.random() * 3 + 1) * multiplier);
        if (added > 0) setRawPkgs(prev => prev + added);
      }
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const scrollToTestimonials = () => {
    const el = document.getElementById('testimonios');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative pt-20 pb-32 md:pt-24 md:pb-40 bg-[#09090b] overflow-hidden min-h-[90vh] flex items-center">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:6rem_6rem]" />
        <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none" 
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,0.08)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            {/* Texto Rotativo */}
            <div className="flex flex-col md:flex-row items-center gap-2 mb-4 text-lg md:text-xl font-medium text-zinc-500 tracking-tight">
              <span>No necesitas un</span>
              <div className="relative h-7 overflow-hidden min-w-[200px] text-zinc-300 inline-block text-center md:text-left font-black">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={ROTATING_TEXTS[index]}
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -15, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "circOut" }}
                    className="absolute inset-0"
                  >
                    {ROTATING_TEXTS[index]}.
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl lg:text-[90px] font-[900] tracking-[-0.05em] text-white mb-4 leading-[0.85] flex flex-col items-center md:items-start"
            >
              Busca menos.
              <span className="mt-2 flex flex-wrap items-center justify-center md:justify-start gap-x-4">
                Encuentra 
                <span className="relative inline-block px-3 py-1 z-10">
                  <span className="relative z-20 text-black">más.</span>
                  <motion.div 
                    initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ delay: 0.5, duration: 0.6 }}
                    className="absolute inset-0 bg-brand-400 -rotate-1 rounded-sm z-10"
                  />
                </span>
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-base md:text-lg text-zinc-500 mb-8 max-w-lg font-medium leading-snug"
            >
              Digitalizamos la lógica física de tu local para que dejes de buscar paquetes y empieces a facturar más.
            </motion.p>

            {/* Botones */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full mb-12">
              <motion.button 
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                onClick={() => navigate("/?audit=true")}
                className="group w-full sm:w-auto h-12 md:h-14 px-7 flex items-center justify-center gap-3 bg-white text-zinc-950 font-[900] rounded-xl text-sm uppercase tracking-widest shadow-2xl will-change-transform"
              >
                <div className="w-6 h-6 rounded-full bg-brand-400 text-zinc-950 flex items-center justify-center group-hover:rotate-12 transition-transform">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                </div>
                Diagnóstico
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                onClick={() => navigate(isLoggedIn ? "/dashboard" : "/registro")}
                className="group w-full sm:w-auto h-12 md:h-14 px-7 flex items-center justify-center gap-3 bg-zinc-900 text-white font-[900] rounded-xl text-sm uppercase tracking-widest border border-white/10 hover:bg-zinc-800 transition-colors will-change-transform"
              >
                {isLoggedIn ? "Mi panel" : "Empezar"}
              </motion.button>
            </div>

            {/* Social Proof Realista (Negocios de España) */}
            <button 
              onClick={scrollToTestimonials} 
              className="flex flex-col sm:flex-row items-center gap-4 group hover:bg-white/[0.03] p-3 -ml-3 rounded-2xl transition-all"
            >
              <div className="flex -space-x-3">
                {CLIENT_INITIALS.map((client, i) => (
                  <div key={i} title={client.name} className="w-9 h-9 rounded-full border-2 border-[#09090b] bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-400 group-hover:text-brand-400 group-hover:border-zinc-700 transition-all">
                    {client.in}
                  </div>
                ))}
              </div>
              <div className="text-left leading-none">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => <IconStar key={i} />)}
                  </div>
                  <span className="px-1.5 py-0.5 bg-brand-500/10 text-brand-400 text-[8px] font-black uppercase rounded border border-brand-500/20">Verificado</span>
                </div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  Confianza de +{rawTenants} negocios <span className="w-1 h-1 rounded-full bg-zinc-700" /> España
                </p>
              </div>
            </button>
          </div>

          {/* Lado Derecho: Métricas */}
          <div className="relative flex flex-col gap-8 lg:items-end justify-center">
            <div className="lg:flex items-center gap-3 px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02] backdrop-blur-sm hidden">
               <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse shadow-[0_0_8px_rgba(20,184,166,1)]" />
               <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Red en tiempo real</span>
            </div>

            <div className="flex flex-col lg:items-end group">
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-1 group-hover:text-brand-400 transition-colors">Puntos Pickup</span>
              <div className="text-6xl md:text-8xl font-[900] text-white tracking-tighter tabular-nums leading-none">
                +<AnimatedNumber value={rawTenants} initial={70} />
              </div>
              <div className="w-full lg:w-40 h-[1px] bg-gradient-to-r lg:bg-gradient-to-l from-brand-500/50 to-transparent mt-2" />
            </div>

            <div className="flex flex-col lg:items-end group">
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-1 group-hover:text-brand-400 transition-colors">Paquetes Entregados</span>
              <div className="text-6xl md:text-8xl font-[900] text-white tracking-tighter tabular-nums leading-none">
                +<AnimatedNumber value={rawPkgs} initial={150000} />
              </div>
              <div className="w-full lg:w-56 h-[1px] bg-gradient-to-r lg:bg-gradient-to-l from-brand-500/50 to-transparent mt-2" />
            </div>
          </div>

        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full pointer-events-none z-20 leading-none translate-y-1">
        <svg viewBox="0 0 1440 100" preserveAspectRatio="none" className="w-full h-16 md:h-24 block">
          <path fill="#f8fafc" d="M0,0 Q720,130 1440,0 L1440,100 L0,100 Z" />
        </svg>
      </div>
    </section>
  );
}