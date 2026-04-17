'use strict';

import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { getTenantData } from '../../utils/tenant';
import { motion, AnimatePresence } from 'framer-motion';

const IconStar = ({ filled, onClick, onHover }) => (
  <svg 
    onClick={onClick} onMouseEnter={onHover}
    className={`w-6 h-6 cursor-pointer transition-all ${filled ? 'text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.6)]' : 'text-zinc-500 hover:text-amber-200'}`} 
    viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const IconAward = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
    <circle cx="12" cy="8" r="6"/>
    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
  </svg>
);

export default function ReviewBanner() {
  const [visible, setVisible] = useState(false);
  const [tenantId, setTenantId] = useState(null);
  const [step, setStep] = useState('stars'); 
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const checkEligibility = async () => {
      try {
        const { tenant } = await getTenantData();
        setTenantId(tenant.id);

        const { data: existingReview } = await supabase
          .from('reviews')
          .select('id')
          .eq('tenant_id', tenant.id)
          .maybeSingle();

        if (existingReview) return; 

        // LÓGICA NUEVA: 250 Paquetes ENTREGADOS
        const { count } = await supabase
          .from('packages')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .eq('entregado', true); // Solo los completados

        if (count >= 250) setVisible(true);

      } catch (err) {
        console.error(err);
      }
    };
    checkEligibility();
  }, []);

  const handleRating = (val) => {
    setRating(val);
    setTimeout(() => setStep('feedback'), 300);
  };

  const handleSubmit = async () => {
    if (!comment.trim() || rating === 0) return;
    setSubmitting(true);
    
    const { error } = await supabase.from('reviews').insert([{
      tenant_id: tenantId,
      rating: rating,
      comentario: comment.trim(),
      status: 'pending' 
    }]);

    if (!error) {
      setStep('thanks');
      setTimeout(() => setVisible(false), 4000);
    } else {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
        className="bg-zinc-950 rounded-xl p-4 md:px-6 shadow-sm border border-brand-500/30 text-white mb-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-[50px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 w-full">
          {step === 'stars' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-center md:text-left">
                <IconAward />
                <div>
                  <h3 className="text-sm font-black text-white">¡Has entregado más de 250 paquetes!</h3>
                  <p className="text-zinc-400 text-xs">Ayúdanos a mejorar. ¿Cómo valorarías tu experiencia en EasyTrack?</p>
                </div>
              </div>
              <div className="flex justify-center gap-1.5" onMouseLeave={() => setHoverRating(0)}>
                {[1, 2, 3, 4, 5].map(star => (
                  <IconStar key={star} filled={star <= (hoverRating || rating)} onHover={() => setHoverRating(star)} onClick={() => handleRating(star)} />
                ))}
              </div>
            </motion.div>
          )}

          {step === 'feedback' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex-1 w-full">
                <p className="text-xs font-bold text-brand-400 mb-1">¡Gracias por las {rating} estrellas!</p>
                <input 
                  autoFocus
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="¿Qué es lo que más te gusta o qué mejorarías?"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-500 outline-none"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0 pt-4 md:pt-0">
                <button onClick={handleSubmit} disabled={submitting || !comment.trim()} className="flex-1 md:flex-none px-4 py-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all">
                  {submitting ? '...' : 'Enviar'}
                </button>
                <button onClick={() => setVisible(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition-all">
                  Cerrar
                </button>
              </div>
            </motion.div>
          )}

          {step === 'thanks' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2 py-2">
              <h3 className="text-sm font-black text-brand-400">¡Reseña enviada! Muchísimas gracias por confiar en nosotros.</h3>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}