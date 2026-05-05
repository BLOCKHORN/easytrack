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

// Nuevos iconos sólidos
const IconShieldSolid = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-800">
    <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22ZM11 15H13V17H11V15ZM11 7H13V13H11V7Z"/>
  </svg>
);

const IconServerSolid = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-800">
    <path d="M4 3C2.89543 3 2 3.89543 2 5V9C2 10.1046 2.89543 11 4 11H20C21.1046 11 22 10.1046 22 9V5C22 3.89543 21.1046 3 20 3H4ZM6 7C5.44772 7 5 6.55228 5 6C5 5.44772 5.44772 5 6 5C6.55228 5 7 5.44772 7 6C7 6.55228 6.55228 7 6 7ZM4 13C2.89543 13 2 13.8954 2 15V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V15C22 13.8954 21.1046 13 20 13H4ZM6 17C5.44772 17 5 16.5523 5 16C5 15.4477 5.44772 15 6 15C6.55228 15 7 15.4477 7 16C7 16.5523 6.55228 17 6 17Z"/>
  </svg>
);

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
        console.error(err);
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
    <section id="testimonios" className="relative bg-slate-50 pt-32 md:pt-40 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto relative">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-4xl md:text-6xl font-black text-zinc-950 tracking-tighter mb-4"
          >
            Resultados reales en <br/><span className="text-brand-500">negocios reales.</span>
          </motion.h2>
          <p className="text-lg text-zinc-500 font-medium">Dejaron de buscar paquetes y empezaron a rentabilizar su tiempo.</p>
        </div>
        
        <div className="relative mb-24 group">
          <button 
            onClick={() => scroll('left')}
            className="absolute -left-4 md:-left-12 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white border border-zinc-200 rounded-full items-center justify-center text-zinc-400 hover:text-brand-500 hover:border-brand-500 shadow-xl transition-all hidden md:flex"
          >
            <IconChevronLeft />
          </button>

          <div 
            ref={scrollRef}
            className="flex gap-6 md:gap-8 overflow-x-auto snap-x snap-mandatory pb-12 pt-4 px-4 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {reviews.map((rev, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="snap-center shrink-0 w-[85vw] sm:w-[400px] bg-white p-8 md:p-10 rounded-[2rem] border border-zinc-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex gap-1 mb-6">
                    {[...Array(rev.rating)].map((_, idx) => <IconStar key={idx} />)}
                  </div>
                  <p className="text-lg text-zinc-700 font-medium leading-relaxed mb-8 italic">"{rev.comentario}"</p>
                </div>
                <div className="flex items-center gap-4 border-t border-zinc-100 pt-6">
                  <div className="w-12 h-12 bg-zinc-950 text-brand-500 rounded-full flex items-center justify-center font-black text-sm shadow-lg shrink-0">
                    {rev.tenants?.nombre_empresa?.charAt(0) || 'E'}
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900 text-sm">{rev.tenants?.nombre_empresa}</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-500">Cliente Verificado</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <button 
            onClick={() => scroll('right')}
            className="absolute -right-4 md:-right-12 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white border border-zinc-200 rounded-full items-center justify-center text-zinc-400 hover:text-brand-500 hover:border-brand-500 shadow-xl transition-all hidden md:flex"
          >
            <IconChevronRight />
          </button>
        </div>

        <div className="pt-12 border-t border-zinc-200/60">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="flex items-center gap-2 mb-1 h-[24px]">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Powered by</span>
                <img 
                  src="https://i.ibb.co/YBRCc8NB/companylogo-bf4b0be5.png" 
                  alt="Stripe" 
                  className="h-full w-auto object-contain opacity-80 grayscale hover:grayscale-0 transition-all"
                />
              </div>
              <h5 className="font-bold text-zinc-900 text-sm">Pagos Encriptados</h5>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-[240px]">Toda la infraestructura financiera está procesada de forma segura por Stripe.</p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-[24px] flex items-center justify-center"><IconShieldSolid /></div>
              <h5 className="font-bold text-zinc-900 text-sm">Privacidad B2B</h5>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-[240px]">Tus datos logísticos y de facturación son privados y nunca se comparten.</p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-[24px] flex items-center justify-center"><IconServerSolid /></div>
              <h5 className="font-bold text-zinc-900 text-sm">Alta Disponibilidad</h5>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-[240px]">Sistemas replicados para garantizar que tu almacén nunca se detenga.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}