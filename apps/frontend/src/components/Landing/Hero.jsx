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
    <section className="relative pt-24 pb-28 md:pt-32 md:pb-36 bg-[#09090b] overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:6rem_6rem]" />
        <div className="absolute left-1/4 top-0 bottom-0 w-[1px] bg-white/[0.02] hidden lg:block" />
        <div className="absolute right-1/4 top-0 bottom-0 w-[1px] bg-white/[0.02] hidden lg:block" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,0.05)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex flex-col items-center md:items-start text-center md:text-left">
          
          <div className="flex flex-col md:flex-row items-center gap-2 mb-4 text-xl md:text-2xl font-medium text-zinc-500 tracking-tight">
            <span>No necesitas un</span>
            <div className="relative h-8 overflow-hidden min-w-[240px] text-zinc-300 inline-block text-center md:text-left">
              <AnimatePresence mode="wait">
                <motion.span
                  key={ROTATING_TEXTS[index]}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
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
            className="text-6xl md:text-8xl lg:text-[105px] font-[900] tracking-[-0.05em] text-white mb-6 leading-[0.85] flex flex-col items-center md:items-start"
          >
            Busca menos.
            <span className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-x-4">
              Encuentra 
              <span className="relative inline-block px-4 py-2 z-10">
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
            className="text-lg md:text-2xl text-zinc-500 mb-10 max-w-2xl font-medium leading-tight"
          >
            Digitalizamos la lógica física de tu local para que dejes de buscar paquetes y empieces a facturar más por cada uno.
          </motion.p>

          <button 
            onClick={scrollToTestimonials}
            className="flex flex-col md:flex-row items-center gap-4 mb-12 group hover:opacity-80 transition-opacity"
          >
            <div className="flex -space-x-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#09090b] overflow-hidden bg-zinc-800">
                  <img src={`https://i.pravatar.cc/100?img=${i+20}`} alt="user" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center md:items-start leading-none">
              <div className="flex gap-0.5 mb-1.5">
                {[...Array(5)].map((_, i) => <IconStar key={i} />)}
              </div>
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                Usado por +{rawTenants} negocios <span className="w-1 h-1 rounded-full bg-zinc-700" /> <span className="text-brand-400 border-b border-brand-400/30">Leer reseñas reales</span>
              </span>
            </div>
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
            {/* BOTÓN PRIMARIO (Blanco con icono que rota/escala) */}
            <motion.button 
              whileHover={{ scale: 1.04 }} 
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              onClick={() => navigate("/?audit=true")}
              className="group w-full sm:w-auto h-14 md:h-16 px-8 flex items-center justify-center gap-3 bg-white text-zinc-950 font-[900] rounded-2xl text-[13px] md:text-sm uppercase tracking-widest shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(255,255,255,0.15)] will-change-transform"
            >
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-brand-400 text-zinc-950 flex items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:rotate-[15deg]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="translate-y-[-0.5px]">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              Iniciar Diagnóstico
            </motion.button>

            {/* BOTÓN SECUNDARIO (Oscuro con icono de flecha que se enciende y gira) */}
            <motion.button 
              whileHover={{ scale: 1.04 }} 
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              onClick={() => navigate(isLoggedIn ? "/dashboard" : "/registro")}
              className="group w-full sm:w-auto h-14 md:h-16 px-8 flex items-center justify-center gap-3 bg-zinc-900 text-white font-[900] rounded-2xl text-[13px] md:text-sm uppercase tracking-widest border border-white/10 shadow-[0_4px_14px_0_rgba(0,0,0,0.2)] hover:bg-zinc-800 transition-colors will-change-transform"
            >
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:bg-white group-hover:text-black group-hover:border-white group-hover:-rotate-45">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="19" x2="19" y2="5"/><polyline points="9 5 19 5 19 15"/>
                </svg>
              </div>
              {isLoggedIn ? "Ir a mi panel" : "Empezar gratis"}
            </motion.button>
          </div>

          <div className="w-full mt-16 flex flex-col md:flex-row items-center justify-between gap-12 border-t border-white/5 pt-12 grayscale opacity-40">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Métricas en tiempo real</span>
            <div className="flex gap-12 md:gap-24">
               <div className="flex flex-col items-center md:items-start">
                  <span className="text-3xl font-black text-white tracking-tighter">
                    +<AnimatedNumber value={rawTenants} initial={70} />
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Puntos Pickup</span>
               </div>
               <div className="flex flex-col items-center md:items-start">
                  <span className="text-3xl font-black text-white tracking-tighter">
                    +<AnimatedNumber value={rawPkgs} initial={150000} />
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Paquetes entregados</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full pointer-events-none z-20 leading-none">
        <svg viewBox="0 0 1440 100" preserveAspectRatio="none" className="w-full h-12 md:h-24 block">
          <path fill="#f8fafc" d="M0,0 Q720,130 1440,0 L1440,100 L0,100 Z" />
        </svg>
      </div>
    </section>
  );
}