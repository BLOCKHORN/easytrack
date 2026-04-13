import { Link } from 'react-router-dom';
import { FaTwitter, FaLinkedin, FaGithub, FaArrowUp } from 'react-icons/fa';

// --- LOGO ESTÁTICO Y LIMPIO ---
const StaticLogo = () => (
  <div className="flex items-center text-2xl font-black tracking-tighter text-white select-none">
    easytrack<span className="text-brand-500">.</span>
  </div>
);

const FOOTER_LINKS = {
  producto: [
    { to: '/#features', label: 'Características' },
    { to: '/#como-funciona', label: 'Cómo funciona' },
    { to: '/#pricing', label: 'Precios' },
  ],
  ayuda: [
    { to: '/soporte#faq', label: 'Centro de ayuda (FAQ)' },
    { to: '/soporte', label: 'Soporte 24/7' },
    { to: '/sobre-nosotros', label: 'Sobre nosotros' },
    { to: '/contacto', label: 'Contacto' },
  ],
  legal: [
    { to: '/legal/privacidad', label: 'Privacidad' },
    { to: '/legal/terminos', label: 'Términos' },
    { to: '/legal/cookies', label: 'Cookies' },
  ]
};

export default function Footer() {
  const year = new Date().getFullYear();
  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="relative bg-zinc-950 border-t border-zinc-900 pt-24 pb-12 overflow-hidden font-sans">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[300px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.05)_0%,transparent_60%)] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-20">
          
          <div className="lg:col-span-5 flex flex-col gap-6">
            <Link to="/" className="inline-flex items-center group outline-none">
              <StaticLogo />
            </Link>
            
            <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-sm">
              La infraestructura logística definitiva para transformar el caos de tu punto de recogida en ingresos escalables y controlados.
            </p>
            
            {/* STATUS & BETA INFO (Sin píldoras, estilo técnico) */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-[0.2em]">
                  Status Operacional: 99.9% <span className="text-zinc-800 mx-2">|</span> Latencia: 24ms
                </span>
              </div>

              <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.25em] flex items-center gap-2">
                <span className="text-zinc-400 font-black">Release v1.2.4-BETA</span>
                <span className="text-zinc-800">/</span>
                <span className="text-zinc-500">Continuous Deployment Cycle</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <h4 className="text-white text-xs font-black uppercase tracking-widest mb-6">Producto</h4>
              <ul className="space-y-4">
                {FOOTER_LINKS.producto.map(l => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm font-bold text-zinc-500 hover:text-white transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-white text-xs font-black uppercase tracking-widest mb-6">Soporte</h4>
              <ul className="space-y-4">
                {FOOTER_LINKS.ayuda.map(l => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm font-bold text-zinc-500 hover:text-white transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white text-xs font-black uppercase tracking-widest mb-6">Legal</h4>
              <ul className="space-y-4">
                {FOOTER_LINKS.legal.map(l => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm font-bold text-zinc-500 hover:text-white transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800/80 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <p className="text-sm font-bold text-zinc-600">
              &copy; {year} EasyTrack. Todos los derechos reservados.
            </p>
            
            <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg opacity-80">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Desarrollado por</span>
              <div className="flex items-center gap-1.5 cursor-default">
                <img src="/blockhorn.png" alt="Blockhorn" className="h-4 w-4 rounded-sm" loading="lazy" />
                <span className="text-xs font-black text-white tracking-wide">Blockhorn</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-800 hover:text-white transition-all">
              <FaTwitter size={16} />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-800 hover:text-white transition-all">
              <FaLinkedin size={16} />
            </a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-800 hover:text-white transition-all">
              <FaGithub size={16} />
            </a>
            <button
              type="button"
              onClick={scrollTop}
              title="Volver arriba"
              className="ml-4 w-10 h-10 bg-white text-zinc-950 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-white/10"
            >
              <FaArrowUp size={14} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}