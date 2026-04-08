import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const IconCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>;
const IconLock = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;

export default function Pricing() {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(true);
  
  const startAction = (plan) => {
    const period = isAnnual ? 'annual' : 'monthly';
    navigate(`/registro?plan=${plan}_${period}`);
  };

  return (
    <section id="pricing" className="relative bg-white pt-32 pb-48 px-4 overflow-hidden border-t border-zinc-100">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-brand-500/5 blur-[120px] pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-black text-zinc-950 tracking-tighter leading-none mb-8">
            Gestión logística.<br/>
            <span className="text-brand-600">Escala sin fricción.</span>
          </h2>
          
          <div className="flex bg-zinc-100/80 p-1.5 rounded-2xl border border-zinc-200/60 w-fit mx-auto">
            <button onClick={() => setIsAnnual(false)} className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${!isAnnual ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}>Mensual</button>
            <button onClick={() => setIsAnnual(true)} className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${isAnnual ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}>Anual <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-widest font-black">2 meses gratis</span></button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-zinc-200 flex flex-col justify-between hover:border-zinc-300 transition-colors">
            <div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">Freemium</h3>
              <p className="text-zinc-500 font-medium mb-10 text-sm">Control básico del local.</p>
              <div className="mb-10 h-16"><span className="text-5xl font-black text-zinc-950 tracking-tighter">0€</span></div>
              <div className="space-y-6 mb-12">
                <div className="flex items-start gap-3"><div className="mt-1 shrink-0"><IconCheck /></div><p className="font-bold text-zinc-800 text-sm">Hasta 250 paquetes / mes</p></div>
                <div className="flex items-start gap-3"><div className="mt-1 shrink-0"><IconCheck /></div><p className="font-bold text-zinc-800 text-sm">Notificaciones por Email</p></div>
                <div className="flex items-start gap-3"><div className="mt-1 shrink-0 text-zinc-300"><IconCheck /></div><p className="font-bold text-zinc-400 text-sm line-through">Estadísticas (Requiere Plus)</p></div>
              </div>
            </div>
            <button onClick={() => startAction('free')} className="w-full py-4 border-2 border-zinc-900 text-zinc-900 font-black rounded-2xl hover:bg-zinc-50 transition-all">Crear cuenta gratis</button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="bg-white p-8 md:p-10 rounded-[2.5rem] border-2 border-brand-500 flex flex-col justify-between relative shadow-xl shadow-brand-500/10">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-500 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">Recomendado</div>
            <div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">Plus</h3>
              <p className="text-zinc-500 font-medium mb-10 text-sm">Para locales consolidados.</p>
              <div className="mb-2 h-16 flex items-end gap-1"><span className="text-5xl font-black text-zinc-950 tracking-tighter leading-none">{isAnnual ? '199€' : '19,90€'}</span><span className="text-zinc-500 font-bold mb-1">/ {isAnnual ? 'año' : 'mes'}</span></div>
              <div className="space-y-6 mb-12">
                <div className="flex items-start gap-3"><div className="mt-1 shrink-0"><IconCheck /></div><p className="font-bold text-zinc-800 text-sm">Paquetes ilimitados</p></div>
                <div className="flex items-start gap-3"><div className="mt-1 shrink-0"><IconCheck /></div><p className="font-bold text-zinc-800 text-sm">Panel de estadísticas desbloqueado</p></div>
                <div className="flex items-start gap-3"><div className="mt-1 shrink-0"><IconCheck /></div><p className="font-bold text-zinc-800 text-sm">Aviso rápido por WhatsApp</p></div>
                <div className="flex items-start gap-3"><div className="mt-1 shrink-0"><IconCheck /></div><p className="font-bold text-zinc-800 text-sm">Soporte por Ticket</p></div>
                <div className="mt-4 p-3 bg-brand-50 rounded-xl border border-brand-100"><p className="text-[11px] font-black text-brand-600 uppercase tracking-tight">Regalo: 7 días prueba Pistoleo IA</p></div>
              </div>
            </div>
            <button onClick={() => startAction('plus')} className="w-full py-4 bg-brand-500 text-white font-black rounded-2xl hover:bg-brand-600 transition-all">Empezar con Plus</button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="bg-zinc-950 p-8 md:p-10 rounded-[2.5rem] border border-zinc-800 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 blur-[60px] rounded-full pointer-events-none" />
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-white mb-2">PRO</h3>
              <p className="text-zinc-400 font-medium mb-10 text-sm">Velocidad y automatización pura.</p>
              <div className="mb-2 h-16 flex items-end gap-1"><span className="text-5xl font-black text-white tracking-tighter leading-none">{isAnnual ? '399€' : '39,90€'}</span><span className="text-zinc-500 font-bold mb-1">/ {isAnnual ? 'año' : 'mes'}</span></div>
              <div className="space-y-6 mb-12">
                <div className="flex items-start gap-3"><div className="mt-1 shrink-0"><IconCheck /></div><p className="font-bold text-white text-sm">Pistoleo ilimitado por IA</p></div>
                <div className="flex items-start gap-3"><div className="mt-1 shrink-0"><IconCheck /></div><p className="font-bold text-white text-sm">Aviso rápido por WhatsApp</p></div>
                <div className="flex items-start gap-3"><div className="mt-1 shrink-0"><IconCheck /></div><p className="font-bold text-white text-sm">Estadísticas completas</p></div>
                <div className="flex items-start gap-3"><div className="mt-1 shrink-0"><IconCheck /></div><p className="font-bold text-white text-sm">Soporte Chat Directo</p></div>
              </div>
            </div>
            <button onClick={() => startAction('pro')} className="w-full py-4 bg-white text-zinc-950 font-black rounded-2xl hover:bg-zinc-100 transition-all relative z-10">Activar PRO</button>
          </motion.div>

        </div>
      </div>
    </section>
  );
}