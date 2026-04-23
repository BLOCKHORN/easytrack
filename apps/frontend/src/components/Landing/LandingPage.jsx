'use strict';

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Hero from './Hero';
import Benefits from './Benefits';
import HowItWorks from './HowItWorks';
import ROI from './ROI';
import Testimonials from './Testimonials';
import Pricing from './Pricing';
import ContrastSection from './ContrastSection';
import InteractiveAudit from './InteractiveAudit';

export default function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showAudit, setShowAudit] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Dejamos que React Router y la URL controlen todo para que funcionen los botones Atrás/Adelante
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('audit') === 'true') {
      setShowAudit(true);
    } else {
      setShowAudit(false);
    }
    setIsChecking(false);
  }, [location.search]);

  const handleAuditComplete = () => {
    // Al cerrar, navegamos a la raíz. Esto se registra en el historial.
    navigate('/', { replace: true });
  };

  if (isChecking) return null;

  if (showAudit) {
    return <InteractiveAudit onComplete={handleAuditComplete} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-brand-100 selection:text-brand-900 flex flex-col">
      <Hero />
      <Benefits />
      <HowItWorks />
      <ContrastSection />
      <ROI />
      <Testimonials />
      <Pricing />
    </div>
  );
}