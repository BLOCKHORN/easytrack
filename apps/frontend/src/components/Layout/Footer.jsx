import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { FaTwitter, FaLinkedin, FaGithub, FaArrowUp } from 'react-icons/fa';

const IconPulse = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;

export default function Footer() {
  const year = new Date().getFullYear();

  const links = useMemo(() => ({
    producto: [
      { to: '/caracteristicas', label: 'Características' },
      { to: '/como-funciona', label: 'Cómo funciona' },
      { to: '/precios', label: 'Precios' },
    ],
    ayuda: [
      { to: '/soporte#faq', label: 'Centro de ayuda (FAQ)' },
      { to: '/soporte#contacto', label: 'Soporte 24/7' },
      { to: '/sobre-nosotros', label: 'Sobre nosotros' },
      { to: '/contacto', label: 'Contacto' },
    ],
    legal: [
      { to: '/legal/privacidad', label: 'Privacidad' },
      { to: '/legal/terminos', label: 'Términos' },
      { to: '/legal/cookies', label: 'Cookies' },
    ]
  }), []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="relative bg-zinc-950 border-t border-zinc-900 pt-24 pb-12 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[300px] bg-brand-500/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-20">
          
          <div className="lg:col-span-5 flex flex-col gap-6">
            <Link to="/" className="inline-flex items-center gap-2">
              <IconPulse />
              <span className="text-2xl font-black text-white tracking-tight">EasyTrack</span>
            </Link>
            
            <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-sm">
              La infraestructura logística definitiva para transformar el caos de tu punto de recogida en ingresos escalables y controlados.
            </p>
            
            <div className="inline-flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-full px-4 py-2 w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-zinc-300 tracking-wide">Sistemas operacionales al 99.9%</span>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <h4 className="text-white text-xs font-black uppercase tracking-widest mb-6">Producto</h4>
              <ul className="space-y-4">
                {links.producto.map(l => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm font-medium text-zinc-400 hover:text-brand-400 transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-white text-xs font-black uppercase tracking-widest mb-6">Soporte</h4>
              <ul className="space-y-4">
                {links.ayuda.map(l => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm font-medium text-zinc-400 hover:text-brand-400 transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white text-xs font-black uppercase tracking-widest mb-6">Legal</h4>
              <ul className="space-y-4">
                {links.legal.map(l => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm font-medium text-zinc-400 hover:text-brand-400 transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800/80 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <p className="text-sm font-medium text-zinc-500">
              &copy; {year} EasyTrack. Todos los derechos reservados.
            </p>
            
            <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
              <span className="text-xs font-medium text-zinc-500">Una solución de</span>
              <div className="flex items-center gap-1.5">
                <img src="/blockhorn.png" alt="Blockhorn" className="h-4 w-4 rounded-sm" loading="lazy" />
                <span className="text-xs font-bold text-white tracking-wide">Blockhorn</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-brand-400 hover:border-brand-500/50 transition-all">
              <FaTwitter size={16} />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-brand-400 hover:border-brand-500/50 transition-all">
              <FaLinkedin size={16} />
            </a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-brand-400 hover:border-brand-500/50 transition-all">
              <FaGithub size={16} />
            </a>
            <button
              type="button"
              onClick={scrollTop}
              className="ml-2 w-10 h-10 bg-brand-500 text-zinc-950 rounded-full flex items-center justify-center hover:bg-brand-400 transition-all shadow-lg shadow-brand-500/20"
            >
              <FaArrowUp size={14} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}