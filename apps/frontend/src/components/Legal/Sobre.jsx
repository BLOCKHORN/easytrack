import { FiTarget, FiShield, FiTrendingUp, FiZap, FiDatabase, FiUsers, FiCheckCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';

export default function Sobre() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'EasyTrack',
    url: 'https://easytrack.pro',
    parentOrganization: { '@type': 'Organization', name: 'Blockhorn Studios OÜ' }
  };

  return (
    <main className="bg-white min-h-screen pt-32 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-xs font-bold tracking-widest uppercase mb-6">
          Nuestra Misión
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-5xl md:text-7xl font-black text-zinc-950 tracking-tighter leading-tight mb-8">
          Devolverle el control a los <span className="text-brand-600">puntos de recogida.</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl text-zinc-500 font-medium leading-relaxed max-w-2xl mx-auto">
          EasyTrack es una infraestructura digital creada por <strong>Blockhorn Studios OÜ</strong> para acabar con el caos físico, las pérdidas de dinero y el estrés en la gestión de paquetería local.
        </motion.p>
      </div>

      {/* Grid Valores */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {[
            { icon: <FiTarget />, title: "Precisión Absoluta", desc: "Sustituimos la memoria humana por un mapeo exacto de coordenadas. Cero paquetes perdidos." },
            { icon: <FiZap />, title: "Velocidad Operativa", desc: "Búsquedas indexadas al milisegundo. Optimizamos el proceso para que entregues en menos de 5 segundos." },
            { icon: <FiShield />, title: "Seguridad por defecto", desc: "Arquitectura multi-tenant. Tus datos y los de tus clientes están completamente aislados y cifrados." },
            { icon: <FiTrendingUp />, title: "Escalabilidad", desc: "Diseñado tanto para la papelería de barrio como para redes de franquicias con múltiples sedes." },
            { icon: <FiDatabase />, title: "Datos Útiles", desc: "Sin métricas vanidosas. Solo datos reales de facturación, saturación y tiempos para que tomes decisiones." },
            { icon: <FiUsers />, title: "Soporte Cercano", desc: "Detrás de la pantalla hay ingenieros reales. Atendemos problemas técnicos de forma directa y sin bots." }
          ].map((item, i) => (
            <div key={i} className="bg-zinc-50 p-8 rounded-3xl border border-zinc-100 hover:border-brand-200 transition-colors">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand-600 text-xl shadow-sm border border-zinc-100 mb-6">{item.icon}</div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">{item.title}</h3>
              <p className="text-zinc-500 font-medium leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Roadmap / Trust */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-3xl font-black text-zinc-950 mb-6">Hacia dónde vamos</h2>
          <p className="text-zinc-500 mb-10 font-medium leading-relaxed">No construimos features por capricho. Escuchamos a los locales que manejan cientos de paquetes al día para desarrollar herramientas que ahorren tiempo físico.</p>
          
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-brand-500 before:to-zinc-200">
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 border-white bg-brand-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                <span className="font-bold text-brand-600 text-sm">Fase 1 (Actual)</span>
                <h4 className="font-bold text-zinc-900 text-lg mt-1 mb-2">Infraestructura Core</h4>
                <p className="text-sm text-zinc-500">Mapeo visual, facturación y gestión multi-agencia.</p>
              </div>
            </div>
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 border-white bg-zinc-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-zinc-50 p-5 rounded-2xl border border-zinc-100">
                <span className="font-bold text-zinc-500 text-sm">Fase 2 (Próximamente)</span>
                <h4 className="font-bold text-zinc-900 text-lg mt-1 mb-2">Automatización Hardware</h4>
                <p className="text-sm text-zinc-500">Integración nativa con impresoras térmicas e inventariado masivo.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-950 p-10 md:p-12 rounded-[3rem] text-white">
          <h3 className="text-2xl font-bold mb-8">Nuestros Principios</h3>
          <ul className="space-y-6">
            {['Privacidad y aislamiento de datos por diseño.', 'Interfaces que no requieren manual de instrucciones.', 'Mantenimientos programados fuera de horario comercial.', 'Cero ventas de bases de datos a terceros.', 'Transparencia absoluta en precios y facturación.'].map((text, i) => (
              <li key={i} className="flex gap-4 items-start">
                <FiCheckCircle className="text-emerald-400 text-xl shrink-0 mt-0.5" />
                <span className="font-medium text-zinc-300">{text}</span>
              </li>
            ))}
          </ul>
          <div className="mt-12 pt-8 border-t border-zinc-800">
            <p className="text-sm text-zinc-500 mb-4">Requerimientos técnicos / DPA:</p>
            <a href="mailto:info@easytrack.pro" className="inline-flex items-center justify-center bg-white text-zinc-950 px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-colors">
              Contactar con ingeniería
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}