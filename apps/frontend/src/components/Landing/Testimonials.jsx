import { motion } from 'framer-motion';
import { FaStar } from 'react-icons/fa';

const REVIEWS = [
  { name: "Carlos Jiménez", role: "Dueño de Papelería", text: "El caos desapareció el primer día. Mis clientes alucinan cuando entro a la trastienda y salgo a los 5 segundos con su paquete exacto en la mano.", rating: 5 },
  { name: "Marta Rivas", role: "Gestora Logística", text: "Antes rechazaba trabajar con agencias nuevas porque no tenía espacio físico ni control. Ahora gestiono 4 agencias distintas en los mismos metros cuadrados.", rating: 5 },
  { name: "Jorge López", role: "Punto de Recogida", text: "Lo que más me gusta es el mapa visual. Sé exactamente qué estanterías están saturadas antes de que llegue el camión de reparto. Es una tranquilidad absoluta.", rating: 5 }
];

export default function Testimonials() {
  return (
    <section id="testimonios" className="relative bg-slate-50 pt-40 pb-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-4xl md:text-6xl font-black text-zinc-950 tracking-tighter leading-tight mb-6">
            Resultados reales en <br/><span className="text-brand-600">negocios reales.</span>
          </motion.h2>
          <p className="text-lg text-zinc-500 font-medium">Dejaron de buscar paquetes y empezaron a rentabilizar su tiempo.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {REVIEWS.map((rev, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 30 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.15, duration: 0.6, ease: "easeOut" }} 
              className="bg-white p-8 md:p-10 rounded-[2rem] shadow-xl shadow-zinc-200/40 border border-zinc-100 flex flex-col justify-between hover:-translate-y-2 transition-transform duration-500"
            >
              <div>
                <div className="flex gap-1 mb-6">
                  {[...Array(rev.rating)].map((_, i) => <FaStar key={i} className="text-amber-400 text-lg" />)}
                </div>
                <p className="text-xl text-zinc-800 font-medium leading-relaxed mb-10">"{rev.text}"</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-brand-100 to-brand-200 rounded-full flex items-center justify-center font-black text-brand-700 text-lg border border-brand-300/50">
                  {rev.name[0]}
                </div>
                <div>
                  <h4 className="font-bold text-zinc-950">{rev.name}</h4>
                  <p className="text-sm font-medium text-zinc-500">{rev.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}