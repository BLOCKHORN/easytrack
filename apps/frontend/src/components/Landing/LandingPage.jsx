import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Hero from './Hero';
import Benefits from './Benefits';
import HowItWorks from './HowItWorks';
import ROI from './ROI';
import Testimonials from './Testimonials';
import Pricing from './Pricing';
import WhatsAppFab from './WhatsAppFab';
import ContrastSection from './ContrastSection';
import InteractiveAudit from './InteractiveAudit';

export default function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showAudit, setShowAudit] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const forceAudit = params.get('audit') === 'true';
    const hasSeenAudit = localStorage.getItem('et_audit_complete');

    if (forceAudit) {
      setShowAudit(true);
      navigate('/', { replace: true }); 
    } else if (!hasSeenAudit) {
      setShowAudit(true);
    }
  }, [location.search, navigate]);

  const handleAuditComplete = () => {
    localStorage.setItem('et_audit_complete', 'true');
    setShowAudit(false);
  };

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