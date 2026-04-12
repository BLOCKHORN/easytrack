import { useLocation } from 'react-router-dom';
import Hero from './Hero';
import Benefits from './Benefits';
import HowItWorks from './HowItWorks';
import ROI from './ROI';
import Testimonials from './Testimonials';
import Pricing from './Pricing';
import WhatsAppFab from './WhatsAppFab';

export default function LandingPage() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-brand-100 selection:text-brand-900 flex flex-col">
      <Hero />
      <Benefits />
      <HowItWorks />
      <ROI />
      <Testimonials />
      <Pricing />
      <WhatsAppFab />
    </div>
  );
}