import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useModal } from "../../../context/ModalContext";
import { useTenant } from "../../../context/TenantContext";
import useNavbarAuth from './useNavbarAuth';

const IconMenu = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const IconClose = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconChevronDown = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
const IconDashboard = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>;
const IconSettings = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconLogout = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;

function Avatar({ email, url }) {
  const letter = (email?.[0] || 'U').toUpperCase();
  if (url) return <img src={url} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-slate-200" />;
  return <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-slate-900 border border-slate-800">{letter}</div>;
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openLogin } = useModal();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountMenuRef = useRef(null);

  const { checking, isLoggedIn, userEmail, avatarUrl, displayName, handleLogout } = useNavbarAuth(navigate);
  const { tenant, loading: tenantLoading } = useTenant();
  const slug = tenant?.slug;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { name: 'Características', path: '/#features' },
    { name: 'Precios', path: '/#pricing' },
    { name: 'Soporte', path: '/soporte' }
  ];

  const goDashboard = () => {
    setAccountOpen(false);
    setMobileOpen(false);
    navigate(slug ? `/${slug}/dashboard` : '/dashboard');
  };

  const goConfig = () => {
    setAccountOpen(false);
    setMobileOpen(false);
    navigate(slug ? `/${slug}/configuracion` : '/configuracion');
  };

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md border-b border-slate-200/80 py-3 shadow-sm' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center group outline-none">
              <span className="text-2xl font-black tracking-tighter select-none flex items-center">
                <span className="text-slate-800 font-medium">easy</span>
                <span className="text-slate-950">track</span>
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <a key={link.name} href={link.path} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 rounded-lg transition-all">{link.name}</a>
              ))}
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            {(!checking && !tenantLoading) && (
              isLoggedIn ? (
                <div className="relative" ref={accountMenuRef}>
                  <button onClick={() => setAccountOpen(!accountOpen)} className="flex items-center gap-3 pl-3 pr-4 py-1.5 rounded-full border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-sm">
                    <Avatar email={userEmail} url={avatarUrl} />
                    <span className="text-sm font-bold text-slate-900 truncate max-w-[120px]">{displayName}</span>
                    <motion.div animate={{ rotate: accountOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <IconChevronDown />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {accountOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-3 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden py-2 z-50"
                      >
                        <div className="px-4 py-3 border-b border-slate-100 mb-2">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Conectado como</p>
                          <p className="text-sm font-bold text-slate-900 truncate">{userEmail}</p>
                        </div>
                        <div className="px-2 space-y-1">
                          <button onClick={goDashboard} className="w-full text-left px-3 py-2.5 text-sm font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2">
                            <IconDashboard /> Dashboard
                          </button>
                          <button onClick={goConfig} className="w-full text-left px-3 py-2.5 text-sm font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2">
                            <IconSettings /> Configuración
                          </button>
                        </div>
                        <div className="px-2 mt-2 pt-2 border-t border-slate-100">
                          <button onClick={() => { setAccountOpen(false); handleLogout(); }} className="w-full text-left px-3 py-2.5 text-sm font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2">
                            <IconLogout /> Cerrar sesión
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button onClick={openLogin} className="px-5 py-2.5 text-sm font-bold text-slate-700 hover:text-slate-900">Iniciar Sesión</button>
                  <button onClick={() => navigate('/registro')} className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-md shadow-slate-900/10">Empezar gratis</button>
                </div>
              )
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-slate-600">
              {mobileOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden bg-white border-b border-slate-200 overflow-hidden">
            <div className="px-4 pt-2 pb-6 space-y-2">
              {navLinks.map((link) => (
                <a key={link.name} href={link.path} onClick={() => setMobileOpen(false)} className="block px-4 py-3 text-base font-bold text-slate-700 hover:bg-slate-50 rounded-xl">
                  {link.name}
                </a>
              ))}
              <div className="pt-4 mt-2 border-t border-slate-100">
                {(!checking && !tenantLoading) && (
                  isLoggedIn ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-slate-50 rounded-xl">
                        <Avatar email={userEmail} url={avatarUrl} />
                        <span className="text-sm font-bold text-slate-900 truncate">{displayName}</span>
                      </div>
                      <button onClick={goDashboard} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-md flex justify-center items-center gap-2">
                        <IconDashboard /> Ir al Panel
                      </button>
                      <button onClick={goConfig} className="w-full py-4 text-slate-700 font-bold border border-slate-200 rounded-xl flex justify-center items-center gap-2">
                        <IconSettings /> Configuración
                      </button>
                      <button onClick={() => { setMobileOpen(false); handleLogout(); }} className="w-full py-4 text-red-600 font-bold border border-red-100 rounded-xl flex justify-center items-center gap-2">
                        <IconLogout /> Cerrar sesión
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <button onClick={() => { setMobileOpen(false); openLogin(); }} className="w-full py-4 text-slate-900 font-bold border border-slate-200 rounded-xl flex justify-center items-center">
                        Iniciar Sesión
                      </button>
                      <button onClick={() => { setMobileOpen(false); navigate('/registro'); }} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-md flex justify-center items-center">
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