import { motion } from 'framer-motion';
import { FiLifeBuoy, FiBookOpen, FiMessageSquare, FiActivity } from 'react-icons/fi';

export default function SupportRouter() {
  return (
    <div className="space-y-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-200/80">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-950 tracking-tight flex items-center gap-3">
            <div className="text-zinc-950"><FiLifeBuoy /></div> Asistencia Técnica
          </h1>
          <p className="text-sm font-medium text-zinc-500 mt-1">Recursos, guías y contacto directo con ingeniería.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-3xl border border-zinc-200/80 shadow-sm flex flex-col justify-between h-full">
          <div>
            <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center text-xl mb-6">
              <FiMessageSquare />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Abrir un Ticket</h3>
            <p className="text-zinc-500 text-sm font-medium leading-relaxed mb-8">
              ¿Tienes un problema técnico o necesitas ayuda configurando tus estanterías? Abre un ticket y nuestro equipo lo revisará inmediatamente.
            </p>
          </div>
          <button className="w-full py-4 bg-zinc-950 hover:bg-zinc-800 text-white font-bold rounded-xl transition-colors">
            Crear nueva solicitud
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-8 rounded-3xl border border-zinc-200/80 shadow-sm flex flex-col justify-between h-full">
          <div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl mb-6">
              <FiBookOpen />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Guías Rápidas</h3>
            <p className="text-zinc-500 text-sm font-medium leading-relaxed mb-8">
              Aprende a mapear tu local, configurar múltiples agencias y entender la analítica financiera de tu panel.
            </p>
          </div>
          <button className="w-full py-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold rounded-xl transition-colors">
            Leer documentación
          </button>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-zinc-50 p-6 md:p-8 rounded-3xl border border-zinc-200/80 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xl shrink-0">
            <FiActivity />
          </div>
          <div>
            <h4 className="font-bold text-zinc-900 text-lg">Estado del Sistema</h4>
            <p className="text-zinc-500 text-sm font-medium">Todos los servicios operando con normalidad.</p>
          </div>
        </div>
        <div className="hidden sm:flex px-4 py-2 bg-emerald-500/10 text-emerald-700 font-bold text-xs uppercase tracking-widest rounded-full">
          100% Operativo
        </div>
      </motion.div>
    </div>
  );
}