import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Hero from './Hero';
import Benefits from './Benefits';
import HowItWorks from './HowItWorks';
import ROI from './ROI';
import Testimonials from './Testimonials';
import Pricing from './Pricing';
import DemoModal from './DemoModal';
import WhatsAppFab from './WhatsAppFab';

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [demoOpen, setDemoOpen] = useState(false);

  const openDemo = () => setDemoOpen(true);
  const closeDemo = () => {
    setDemoOpen(false);
    const params = new URLSearchParams(location.search);
    if (params.get('demo') === '1') {
      params.delete('demo');
      navigate({ search: params.toString() ? `?${params.toString()}` : '' }, { replace: true });
    }
  };

  useEffect(() => {
    window.__ET_OPEN_DEMO = openDemo;
    const onEvt = () => openDemo();
    window.addEventListener('et:open-demo', onEvt);
    return () => window.removeEventListener('et:open-demo', onEvt);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-brand-100 selection:text-brand-900 flex flex-col">
      <Hero onOpenDemo={openDemo} />
      <Benefits />
      <HowItWorks />
      <ROI />
      <Testimonials />
      <Pricing />
      <WhatsAppFab />
      <DemoModal open={demoOpen} onClose={closeDemo} />
    </div>
  );
}