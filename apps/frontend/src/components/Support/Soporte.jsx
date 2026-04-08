import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiLifeBuoy, FiMessageCircle } from 'react-icons/fi';

const FAQS = [
  {
    q: "¿Cómo funciona el límite de los 250 paquetes?",
    a: "El plan gratuito te permite procesar hasta 250 paquetes en total. No caduca por tiempo. Una vez alcances el límite, el sistema te pedirá actualizar al plan Premium para seguir registrando nuevas entradas."
  },
  {
    q: "¿Qué ocurre con los paquetes si cancelo mi suscripción?",
    a: "Tus datos son tuyos. Si cancelas, podrás seguir accediendo al sistema en modo lectura para buscar y entregar los paquetes que ya tuvieras almacenados. Simplemente no podrás registrar nuevos."
  },
  {
    q: "¿Puedo tener a varios empleados usando el sistema a la vez?",
    a: "Sí. El plan Premium permite conexiones simultáneas. Tus empleados pueden estar registrando paquetes desde el móvil mientras tú los entregas desde el ordenador del mostrador."
  },
  {
    q: "¿Necesito comprar hardware especial?",
    a: "No. EasyTrack funciona en cualquier navegador web. Si ya tienes una pistola lectora de códigos de barras configurada en modo teclado, funcionará automáticamente con nuestro buscador."
  }
];

export default function Soporte() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <main className="bg-white min-h-screen pt-32 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-8 shadow-sm border border-brand-100">
            <FiLifeBuoy />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-zinc-950 tracking-tighter leading-tight mb-6">
            Centro de Soporte
          </h1>
          <p className="text-lg text-zinc-500 font-medium">
            Respuestas rápidas a las dudas más comunes y contacto directo con ingeniería.
          </p>
        </div>

        <div id="faq" className="mb-24">
          <h2 className="text-2xl font-bold text-zinc-900 mb-8">Preguntas Frecuentes</h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-zinc-50 border border-zinc-100 rounded-2xl overflow-hidden transition-colors hover:border-zinc-200">
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full px-6 py-5 flex items-center justify-between bg-transparent text-left"
                >
                  <span className="font-bold text-zinc-900">{faq.q}</span>
                  <FiChevronDown className={`text-zinc-400 transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-2 text-zinc-500 font-medium leading-relaxed">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        <div id="contacto" className="bg-zinc-950 p-10 md:p-12 rounded-[3rem] text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-64 bg-brand-500/20 blur-[80px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-white tracking-tight mb-4">¿No encuentras lo que buscas?</h2>
            <p className="text-zinc-400 font-medium mb-8 max-w-lg mx-auto">
              Nuestro equipo de soporte técnico está disponible para ayudarte a configurar tu local o resolver cualquier incidencia en tiempo real.
            </p>
            <a href="mailto:info@easytrack.pro" className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 text-zinc-950 px-8 py-4 rounded-xl font-bold transition-colors">
              <FiMessageCircle /> Hablar con Soporte
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}