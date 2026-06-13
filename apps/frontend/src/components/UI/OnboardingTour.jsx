import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const OnboardingTour = ({ active = false, steps = [], onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState(null);
  const location = useLocation();
  const lastScrolledStep = useRef(-1);

  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.();
    }
  };

  useEffect(() => {
    if (!active || !step) return;

    const updateCoords = () => {
      const el = document.querySelector(step.target);
      if (el) {
        document.querySelectorAll('.onboarding-focus').forEach(node => node.classList.remove('onboarding-focus'));
        el.classList.add('onboarding-focus');

        const rect = el.getBoundingClientRect();
        
        setCoords(prev => {
          const newCoords = {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          };
          if (
            prev &&
            Math.abs(prev.top - newCoords.top) < 1 && 
            Math.abs(prev.left - newCoords.left) < 1 && 
            prev.width === newCoords.width &&
            prev.height === newCoords.height
          ) {
            return prev;
          }
          return newCoords;
        });
        
        if (lastScrolledStep.current !== currentStep) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          lastScrolledStep.current = currentStep;
        }

        if (step.triggerNextOnClick) {
          const handleClick = () => {
            el.removeEventListener('click', handleClick);
            handleNext();
          };
          el.addEventListener('click', handleClick, { once: true });
        }
      } else {
        // Si no encontramos el elemento, limpiamos coordenadas para ocultar el popup
        setCoords(null);
      }
    };

    updateCoords();
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords);
    const interval = setInterval(updateCoords, 500);

    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords);
      document.querySelectorAll('.onboarding-focus').forEach(node => node.classList.remove('onboarding-focus'));
      clearInterval(interval);
    };
  }, [active, step, currentStep, location.pathname]);

  if (!active || !step || !coords) return null;

  // Render a minimal floating card near the target element
  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          scale: 1,
          top: coords.top + coords.height + 15,
          left: Math.min(window.innerWidth - 300, Math.max(10, coords.left + coords.width / 2 - 140)),
        }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        style={{ position: 'absolute', width: '280px' }}
        className="bg-zinc-950 text-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] p-5 pointer-events-auto border border-zinc-800"
      >
        <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">
              Paso {currentStep + 1} / {steps.length}
            </span>
            <button onClick={onComplete} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </div>
        
        <h4 className="text-sm font-bold mb-1.5">{step.title}</h4>
        <p className="text-zinc-400 text-xs font-medium leading-relaxed mb-4">
          {step.content}
        </p>
        
        {!step.triggerNextOnClick ? (
          <div className="flex justify-end">
            <button 
                onClick={handleNext}
                className="bg-brand-500 text-white hover:bg-brand-400 px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95"
            >
                {currentStep === steps.length - 1 ? 'Terminar' : 'Siguiente'}
            </button>
          </div>
        ) : (
          <div className="text-[10px] font-bold text-brand-400 animate-pulse mt-2">
            👆 Toca el elemento resaltado
          </div>
        )}

        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-950 border-t border-l border-zinc-800 rotate-45" />
      </motion.div>
    </div>
  );
};

export default OnboardingTour;