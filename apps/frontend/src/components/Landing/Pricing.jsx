import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const IconCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>;
const IconLock = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IconSparkles = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>;
const IconUsers = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;

export default function Pricing() {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="pricing" className="relative bg-white pt-24 pb-40 px-4 overflow-hidden border-t border-zinc-200 font-sans">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-[radial-gradient(circle,rgba(16,185,129,0.03)_0%,transparent_70%)] pointer-events-none" />
      
      <div className="relative max-w-5xl mx-auto z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-zinc-950 tracking-tighter leading-[1.1] mb-8">
            Gestión logística.<br/>
            <span className="text-emerald-600">Escala sin fricción.</span>
          </h2>
          
          <div className="flex bg-zinc-100 p-1.5 rounded-2xl border border-zinc-200 w-fit mx-auto shadow-inner">
            <button onClick={() => setIsAnnual(false)} className={`px-6 py-2.5 md:px-8 md:py-3 rounded-xl text-sm font-bold transition-all ${!isAnnual ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-800'}`}>Mensual</button>
            <button onClick={() => setIsAnnual(true)} className={`px-6 py-2.5 md:px-8 md:py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${isAnnual ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-800'}`}>
              Anual <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-widest font-black">-16%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch mb-20">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white p-8 md:p-10 rounded-[2rem] border border-zinc-200 flex flex-col justify-between hover:border-zinc-300 transition-colors shadow-sm">
            <div>
              <h3 className="text-xl font-black text-zinc-900 mb-2 tracking-tight">Freemium</h3>
              <p className="text-zinc-500 font-medium mb-8 text-sm">Integra la herramienta en tu operativa diaria sin riesgo.</p>
              <div className="mb-10 h-16 flex items-end gap-1"><span className="text-5xl font-black text-zinc-950 tracking-tighter">0€</span></div>
              <div className="space-y-4">
                <div className="flex items-start gap-3"><div className="mt-1 shrink-0"><IconCheck /></div><p className="font-bold text-zinc-700 text-sm">14 días de paquetes ILIMITADOS</p></div>
                <div className="flex items-start gap-3"><div className="mt-1 shrink-0"><IconCheck /></div><p className="font-bold text-zinc-700 text-sm">Después, 250 paquetes / mes</p></div>
                <div className="flex items-start gap-3"><div className="mt-1 shrink-0"><IconCheck /></div><p className="font-bold text-zinc-700 text-sm">Registro manual de entradas</p></div>
                <div className="flex items-start gap-3"><div className="mt-1 shrink-0"><IconCheck /></div><p className="font-bold text-zinc-700 text-sm">Mapeo visual de estanterías</p></div>
                
                <div className="pt-4 mt-4 border-t border-zinc-100 space-y-4">
                  <div className="flex items-start gap-3"><div className="mt-1 shrink-0 text-zinc-300"><IconLock /></div><p className="font-bold text-zinc-400 text-sm line-through">Escáner de etiquetas por IA</p></div>
                  <div className="flex items-start gap-3"><div className="mt-1 shrink-0 text-zinc-300"><IconLock /></div><p className="font-bold text-zinc-400 text-sm line-through">Avisos automáticos a clientes</p></div>
                  <div className="flex items-start gap-3"><div className="mt-1 shrink-0 text-zinc-300"><IconLock /></div><p className="font-bold text-zinc-400 text-sm line-through">Analítica y Auditoría de personal</p></div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="bg-zinc-950 p-8 md:p-10 rounded-[2rem] border border-zinc-800 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-black text-white tracking-tight">PRO</h3>
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  7 días gratis
                </div>
              </div>
              <p className="text-zinc-400 font-medium mb-8 text-sm">Automatización total. Cero cuellos de botella.</p>
              <div className="mb-8 h-16 flex items-end gap-1">
                <span className="text-5xl font-black text-white tracking-tighter leading-none">{isAnnual ? '299€' : '29,90€'}</span>
                <span className="text-zinc-500 font-bold mb-1 pb-0.5">/ {isAnnual ? 'año' : 'mes'}</span>
              </div>
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0"><IconSparkles /></div>
                  <div>
                    <p className="font-black text-white text-sm">Escáner IA Anti-errores</p>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">Apunta con la cámara y autocompleta los datos diarios. Cero teclear a mano en mostrador.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0"><IconCheck /></div>
                  <div>
                    <p className="font-black text-white text-sm">Paquetes y Avisos ilimitados</p>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">Sin límites de registro y con notificaciones automáticas vía WhatsApp a tus clientes.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0"><IconUsers /></div>
                  <div>
                    <p className="font-black text-white text-sm">Auditoría y Analítica Avanzada</p>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">Métricas de facturación en tiempo real.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0"><IconCheck /></div>
                  <div>
                    <p className="font-black text-white text-sm">Soporte Directo B2B</p>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">Asistencia técnica prioritaria y directa para que la operativa de tu negocio nunca pare.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto text-center bg-zinc-50 border border-zinc-200 rounded-[2rem] p-10 md:p-12 shadow-sm">
          <h3 className="text-2xl md:text-3xl font-black text-zinc-950 tracking-tight mb-4">Empieza con 14 días sin límites.</h3>
          <p className="text-zinc-500 font-medium mb-8 text-lg leading-relaxed">Crea tu cuenta gratis y prueba la herramienta a máximo rendimiento durante dos semanas. Pasado ese tiempo, decides si mantienes el volumen con Pro o te quedas en el plan Freemium con 250 paquetes mensuales.</p>
          <button onClick={() => navigate('/registro')} className="w-full md:w-auto px-10 py-4 bg-zinc-950 text-white font-black rounded-xl hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-950/20 active:scale-95 text-lg">
            Crear cuenta gratis
          </button>
        </motion.div>
      </div>
    </section>
  );
}