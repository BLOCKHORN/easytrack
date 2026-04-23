import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../utils/supabaseClient';

const HARDCODED_REVIEWS = [
  {
    rating: 5,
    comentario: "El caos desapareció el primer día. Mis clientes alucinan cuando entro a la trastienda y salgo a los 5 segundos con su paquete exacto.",
    tenants: { nombre_empresa: "Papelería Jiménez" }
  },
  {
    rating: 5,
    comentario: "Antes rechazaba trabajar con agencias nuevas porque no tenía espacio. Ahora gestiono 4 agencias distintas en los mismos metros cuadrados.",
    tenants: { nombre_empresa: "Kiosco Rivas" }
  },
  {
    rating: 5,
    comentario: "Todo en mi tienda era caotico, desde que estos chicos vinieron a ofrecerme usar Easytrack y probarlo sin ningun compromiso, no solo he hecho mas eficiente toda la logistica, si no que encima gracias a las estadisticas he logrado subir el precio por paquete de 0,3 a 0,5 centimos en UPS!",
    tenants: { nombre_empresa: "Punto Pack López" }
  }
];

const IconStar = () => (
  <svg className="text-amber-400 w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const IconShield = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IconServer = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>;
const IconChevronLeft = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const IconChevronRight = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;

export default function Testimonials() {
  const [reviews, setReviews] = useState(HARDCODED_REVIEWS);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    async function loadReviews() {
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select(`rating, comentario, tenants ( nombre_empresa )`)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(6);

        if (!error && data && data.length > 0) {
          const combined = [...data];
          if (combined.length < 6) {
            const needed = 6 - combined.length;
            combined.push(...HARDCODED_REVIEWS.slice(0, needed));
          }
          setReviews(combined);
        }
      } catch (err) {
        console.error("Error cargando testimonios dinámicos:", err);
      } finally {
        setLoading(false);
      }
    }
    loadReviews();
  }, []);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const cardWidth = scrollRef.current.firstElementChild?.clientWidth || 400;
      const gap = 32; 
      const scrollAmount = cardWidth + gap;
      scrollRef.current.scrollBy({ 
        left: direction === 'left' ? -scrollAmount : scrollAmount, 
        behavior: 'smooth' 
      });
    }
  };

  return (
    <section id="testimonios" className="relative bg-white pt-24 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto relative">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-4xl md:text-6xl font-black text-zinc-950 tracking-tighter mb-4"
          >
            Resultados reales en <br/><span className="text-brand-600">negocios reales.</span>
          </motion.h2>
          <p className="text-lg text-zinc-500 font-medium">Dejaron de buscar paquetes y empezaron a rentabilizar su tiempo.</p>
        </div>
        
        <div className="relative mb-24 group">
          <button 
            onClick={() => scroll('left')}
            className="absolute -left-4 md:-left-12 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white border border-zinc-200 rounded-full items-center justify-center text-zinc-400 hover:text-brand-600 hover:border-brand-600 shadow-xl transition-all hidden md:flex"
          >
            <IconChevronLeft />
          </button>

          <div 
            ref={scrollRef}
            className="flex gap-6 md:gap-8 overflow-x-auto snap-x snap-mandatory pb-8 pt-4 px-4 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {reviews.map((rev, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="snap-center shrink-0 w-[85vw] sm:w-[400px] bg-[#fafafa] p-8 rounded-[2rem] border border-zinc-100 flex flex-col justify-between hover:border-brand-500/30 transition-colors"
              >
                <div>
                  <div className="flex gap-1 mb-6">
                    {[...Array(rev.rating)].map((_, idx) => <IconStar key={idx} />)}
                  </div>
                  <p className="text-lg text-zinc-700 font-medium leading-relaxed mb-8 italic">"{rev.comentario}"</p>
                </div>
                <div className="flex items-center gap-4 border-t border-zinc-200/60 pt-6">
                  <div className="w-11 h-11 bg-zinc-950 text-brand-400 rounded-full flex items-center justify-center font-black text-sm shadow-xl shrink-0">
                    {rev.tenants?.nombre_empresa?.charAt(0) || 'E'}
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900 text-sm">{rev.tenants?.nombre_empresa}</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-600">Cliente Verificado</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <button 
            onClick={() => scroll('right')}
            className="absolute -right-4 md:-right-12 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white border border-zinc-200 rounded-full items-center justify-center text-zinc-400 hover:text-brand-600 hover:border-brand-600 shadow-xl transition-all hidden md:flex"
          >
            <IconChevronRight />
          </button>
        </div>

        <div className="pt-12 border-t border-zinc-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="flex items-center gap-2 mb-1 h-[25px]">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Powered by</span>
                <img 
                  src="https://i.ibb.co/YBRCc8NB/companylogo-bf4b0be5.png" 
                  alt="Stripe" 
                  className="h-full w-auto object-contain"
                />
              </div>
              <h5 className="font-bold text-zinc-900 text-sm">Pagos Encriptados</h5>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-[240px]">Toda la infraestructura financiera está procesada de forma segura por Stripe.</p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-[25px] flex items-center justify-center"><IconShield /></div>
              <h5 className="font-bold text-zinc-900 text-sm">Privacidad B2B</h5>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-[240px]">Tus datos logísticos y de facturación son privados y nunca se comparten.</p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-[25px] flex items-center justify-center"><IconServer /></div>
              <h5 className="font-bold text-zinc-900 text-sm">Alta Disponibilidad</h5>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-[240px]">Sistemas replicados para garantizar que tu almacén nunca se detenga.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}