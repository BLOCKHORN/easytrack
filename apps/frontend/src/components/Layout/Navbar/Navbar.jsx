import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useModal } from "../../../context/ModalContext";
import useNavbarAuth from './useNavbarAuth';

// --- LOGO ABSTRATO PREMIUM (Código Morse: E = Punto, T = Raya) ---
const LogoAbstract = () => (
  <div className="flex items-center gap-1.5 mr-1" title="E.T. (EasyTrack)">
    {/* La 'E' (Punto / El Paquete) */}
    <div className="w-3.5 h-3.5 md:w-4 md:h-4 bg-zinc-950 rounded-full transition-transform duration-500 ease-out group-hover:scale-110"></div>
    {/* La 'T' (Raya / El Trayecto) */}
    <div className="w-6 h-3.5 md:w-8 md:h-4 bg-brand-500 rounded-full transition-all duration-500 ease-out group-hover:w-8 md:group-hover:w-10"></div>
  </div>
);

const IconMenu = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const IconClose = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconChevronDown = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
const IconDashboard = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 group-hover:text-brand-600 transition-colors"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>;
const IconSettings = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 group-hover:text-zinc-900 transition-colors"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const IconLogout = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 group-hover:text-red-600 transition-colors"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;

function Avatar({ email, url }) {
  const letter = (email?.[0] || 'U').toUpperCase();
  if (url) {
    return <img src={url} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-zinc-200" />;
  }
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-brand-400 to-brand-600 shadow-sm border border-brand-200">
      {letter}
    </div>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openLogin } = useModal();
  
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountMenuRef = useRef(null);

  const { checking, isLoggedIn, userEmail, avatarUrl, displayName, slug, handleLogout } = useNavbarAuth(navigate);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  const goDashboard = () => navigate(slug ? `/${slug}/dashboard` : '/registro');
  const goConfig = () => navigate(slug ? `/${slug}/dashboard/configuracion` : '/registro');

  const navLinks = [
    { name: 'Características', path: '/#como-funciona' },
    { name: 'Precios', path: '/#pricing' },
    { name: 'Soporte', path: '/soporte' }
  ];

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md border-b border-zinc-200/80 shadow-sm py-3' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          <div className="flex items-center gap-10">
            {/* EL NUEVO LOGO INTEGRADO */}
            <Link to="/" className="flex items-center gap-2 group outline-none">
              <LogoAbstract />
              <span className="text-2xl md:text-[1.65rem] font-black tracking-tighter lowercase select-none">
                <span className="text-zinc-950">easy</span>
                <span className="text-brand-500">track</span>
              </span>
            </Link>
            
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <a key={link.name} href={link.path} className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100/50 rounded-lg transition-all">
                  {link.name}
                </a>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {!checking && (
              isLoggedIn ? (
                <div className="relative" ref={accountMenuRef}>
                  <button 
                    onClick={() => setAccountOpen(!accountOpen)} 
                    className="flex items-center gap-3 pl-3 pr-4 py-1.5 rounded-full border border-zinc-200 hover:border-zinc-300 hover:shadow-sm bg-white transition-all"
                  >
                    <Avatar email={userEmail} url={avatarUrl} />
                    <span className="text-sm font-bold text-zinc-900 max-w-[120px] truncate">{displayName}</span>
                    <IconChevronDown />
                  </button>

                  <AnimatePresence>
                    {accountOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 mt-2 w-60 bg-white border border-zinc-200/80 rounded-2xl shadow-xl overflow-hidden origin-top-right"
                      >
                        <div className="px-4 py-3 bg-zinc-50/50 border-b border-zinc-100">
                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Cuenta actual</p>
                          <p className="text-sm font-bold text-zinc-950 truncate">{userEmail}</p>
                        </div>
                        <div className="p-2 space-y-1">
                          <button onClick={goDashboard} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-50 text-sm font-bold text-zinc-700 flex items-center gap-3 transition-colors group">
                            <IconDashboard /> Ir al Dashboard
                          </button>
                          <button onClick={goConfig} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-50 text-sm font-bold text-zinc-700 flex items-center gap-3 transition-colors group">
                            <IconSettings /> Configuración
                          </button>
                        </div>
                        <div className="p-2 border-t border-zinc-100">
                          <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-red-50 text-sm font-bold text-zinc-700 hover:text-red-700 flex items-center gap-3 transition-colors group">
                            <IconLogout /> Cerrar sesión
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button onClick={openLogin} className="px-5 py-2.5 text-sm font-bold text-zinc-700 hover:text-zinc-950 transition-colors">
                    Iniciar Sesión
                  </button>
                  <button onClick={() => navigate('/registro')} className="px-6 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-zinc-900/10">
                    Empezar gratis
                  </button>
                </div>
              )
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-zinc-900 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors">
              {mobileOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-zinc-200 overflow-hidden"
          >
            <div className="px-4 pt-4 pb-6 space-y-6">
              <div className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <a key={link.name} href={link.path} onClick={() => setMobileOpen(false)} className="px-4 py-3 text-lg font-bold text-zinc-900 rounded-xl hover:bg-zinc-50">
                    {link.name}
                  </a>
                ))}
              </div>
              
              <div className="pt-6 border-t border-zinc-100">
                {!checking && (
                  isLoggedIn ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 px-4 mb-4">
                        <Avatar email={userEmail} url={avatarUrl} />
                        <div>
                          <p className="font-bold text-zinc-950">{displayName}</p>
                          <p className="text-xs font-medium text-zinc-500">{userEmail}</p>
                        </div>
                      </div>
                      <button onClick={goDashboard} className="w-full py-4 bg-brand-50 text-brand-700 font-bold rounded-xl flex justify-center items-center gap-2">
                        <IconDashboard /> Ir al Dashboard
                      </button>
                      <button onClick={goConfig} className="w-full py-4 text-zinc-700 font-bold border border-zinc-200 rounded-xl flex justify-center items-center gap-2">
                        <IconSettings /> Configuración
                      </button>
                      <button onClick={handleLogout} className="w-full py-4 text-red-600 font-bold border border-red-100 rounded-xl flex justify-center items-center gap-2">
                        <IconLogout /> Cerrar sesión
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <button onClick={() => { setMobileOpen(false); openLogin(); }} className="w-full py-4 text-zinc-900 font-bold border border-zinc-200 rounded-xl flex justify-center items-center">
                        Iniciar Sesión
                      </button>
                      <button onClick={() => { setMobileOpen(false); navigate('/registro'); }} className="w-full py-4 bg-zinc-950 text-white font-bold rounded-xl shadow-md flex justify-center items-center">
                        Empezar gratis
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}