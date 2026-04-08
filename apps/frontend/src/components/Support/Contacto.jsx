import { motion } from 'framer-motion';
import { FiMail, FiMapPin, FiSend } from 'react-icons/fi';

export default function Contacto() {
  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <main className="bg-white min-h-screen pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-xs font-bold tracking-widest uppercase mb-6">
            Contacto
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-black text-zinc-950 tracking-tighter leading-tight mb-6">
            Hablemos sobre tu <span className="text-brand-600">negocio.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg text-zinc-500 font-medium">
            Si gestionas un volumen alto de paquetería o tienes una red de franquicias, escríbenos. Diseñaremos un plan de despliegue a tu medida.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="space-y-10">
            <div className="bg-zinc-50 p-8 rounded-3xl border border-zinc-100">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand-600 shadow-sm border border-zinc-100 mb-6">
                <FiMail className="text-xl" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">Email directo</h3>
              <p className="text-zinc-500 font-medium mb-4">Respondemos en menos de 24 horas laborables.</p>
              <a href="mailto:info@easytrack.pro" className="text-brand-600 font-bold text-lg hover:underline">info@easytrack.pro</a>
            </div>

            <div className="bg-zinc-50 p-8 rounded-3xl border border-zinc-100">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand-600 shadow-sm border border-zinc-100 mb-6">
                <FiMapPin className="text-xl" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">Sede central</h3>
              <p className="text-zinc-500 font-medium">
                Blockhorn Studios OÜ<br />
                Tallin, Estonia
              </p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-zinc-100">
            <h3 className="text-2xl font-bold text-zinc-900 mb-8">Envíanos un mensaje</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-bold text-zinc-900 mb-2">Nombre completo</label>
                <input type="text" id="name" className="w-full px-5 py-4 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all font-medium" required />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-zinc-900 mb-2">Email de trabajo</label>
                <input type="email" id="email" className="w-full px-5 py-4 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all font-medium" required />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-bold text-zinc-900 mb-2">¿Cómo podemos ayudarte?</label>
                <textarea id="message" rows="4" className="w-full px-5 py-4 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all font-medium resize-none" required></textarea>
              </div>
              <button type="submit" className="w-full py-4 bg-zinc-950 hover:bg-zinc-800 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                Enviar mensaje <FiSend />
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </main>
  );
}