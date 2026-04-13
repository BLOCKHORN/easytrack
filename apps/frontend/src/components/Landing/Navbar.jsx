import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useModal } from "../../context/ModalContext";
import { useTenant } from "../../context/TenantContext";
import useNavbarAuth from './useNavbarAuth';

const IconMenu = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const IconClose = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconChevronDown = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
const IconDashboard = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>;
const IconSettings = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconLogout = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const IconShield = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;

function Avatar({ email, url }) {
  const letter = (email?.[0] || 'U').toUpperCase();
  if (url) return <img src={url} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-zinc-200" />;
  return <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black bg-zinc-950 border border-zinc-800 shadow-sm">{letter}</div>;
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openLogin } = useModal();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountMenuRef = useRef(null);

  const { checking, isLoggedIn, userEmail, avatarUrl, displayName, isAdmin, handleLogout } = useNavbarAuth(navigate);
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
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md border-b border-zinc-200/80 py-3 shadow-sm' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center group outline-none">
              <span className="text-2xl font-black tracking-tighter select-none flex items-center">
                <span className="text-zinc-800 font-medium">easy</span>
                <span className="text-zinc-950">track.</span>
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <a key={link.name} href={link.path} className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all">{link.name}</a>
              ))}
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            {(!checking && !tenantLoading) && (
              isLoggedIn ? (
                <div className="flex items-center gap-3">
                  <button onClick={goDashboard} className="px-5 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-black rounded-xl shadow-lg shadow-brand-500/20 transition-all active:scale-95">
                    Ir al panel
                  </button>
                  
                  <div className="relative" ref={accountMenuRef}>
                    <button onClick={() => setAccountOpen(!accountOpen)} className="flex items-center gap-2 px-2 py-1.5 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 transition-all shadow-sm">
                      <Avatar email={userEmail} url={avatarUrl} />
                      <motion.div animate={{ rotate: accountOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-zinc-400 mr-1">
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
                          className="absolute right-0 mt-3 w-56 bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden py-2 z-50"
                        >
                          <div className="px-4 py-3 border-b border-zinc-100 mb-2">
                            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">Conectado como</p>
                            <p className="text-sm font-bold text-zinc-950 truncate">{userEmail}</p>
                          </div>
                          
                          <div className="px-2 space-y-1">
                            {isAdmin && (
                              <button onClick={() => { setAccountOpen(false); navigate('/admin/dashboard'); }} className="w-full text-left px-3 py-2.5 text-sm font-bold text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-xl transition-colors flex items-center gap-3">
                                <IconShield /> Administración
                              </button>
                            )}
                            <button onClick={goConfig} className="w-full text-left px-3 py-2.5 text-sm font-bold text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 rounded-xl transition-colors flex items-center gap-3">
                              <IconSettings /> Configuración
                            </button>
                          </div>
                          
                          <div className="px-2 mt-2 pt-2 border-t border-zinc-100">
                            <button onClick={() => { setAccountOpen(false); handleLogout(); }} className="w-full text-left px-3 py-2.5 text-sm font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-3">
                              <IconLogout /> Cerrar sesión
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button onClick={openLogin} className="px-5 py-2.5 text-sm font-bold text-zinc-600 hover:text-zinc-950">Iniciar Sesión</button>
                  <button onClick={() => navigate('/registro')} className="px-6 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white text-sm font-bold rounded-xl shadow-md shadow-zinc-950/10 transition-all active:scale-95">Empezar gratis</button>
                </div>
              )
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-zinc-950">
              {mobileOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden bg-white border-b border-zinc-200 overflow-hidden">
            <div className="px-4 pt-2 pb-6 space-y-2">
              {navLinks.map((link) => (
                <a key={link.name} href={link.path} onClick={() => setMobileOpen(false)} className="block px-4 py-3 text-base font-bold text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors">
                  {link.name}
                </a>
              ))}
              <div className="pt-4 mt-2 border-t border-zinc-100">
                {(!checking && !tenantLoading) && (
                  isLoggedIn ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-zinc-50 rounded-xl border border-zinc-100">
                        <Avatar email={userEmail} url={avatarUrl} />
                        <span className="text-sm font-bold text-zinc-950 truncate">{displayName}</span>
                      </div>
                      
                      {isAdmin && (
                        <button onClick={() => { setMobileOpen(false); navigate('/admin/dashboard'); }} className="w-full py-4 text-brand-700 font-bold bg-brand-50 hover:bg-brand-100 rounded-xl flex justify-center items-center gap-2 transition-colors mb-2">
                          <IconShield /> Administración
                        </button>
                      )}

                      <button onClick={goDashboard} className="w-full py-4 bg-brand-500 hover:bg-brand-400 text-white font-black rounded-xl shadow-md flex justify-center items-center gap-2 transition-colors active:scale-95">
                        <IconDashboard /> Ir al Panel
                      </button>
                      <button onClick={goConfig} className="w-full py-4 text-zinc-700 font-bold bg-zinc-100 hover:bg-zinc-200 rounded-xl flex justify-center items-center gap-2 transition-colors mt-2">
                        <IconSettings /> Configuración
                      </button>
                      <button onClick={() => { setMobileOpen(false); handleLogout(); }} className="w-full py-4 text-red-600 font-bold bg-red-50 hover:bg-red-100 rounded-xl flex justify-center items-center gap-2 transition-colors mt-4">
                        <IconLogout /> Cerrar sesión
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <button onClick={() => { setMobileOpen(false); openLogin(); }} className="w-full py-4 text-zinc-950 font-bold bg-zinc-100 hover:bg-zinc-200 rounded-xl flex justify-center items-center transition-colors">
                        Iniciar Sesión
                      </button>
                      <button onClick={() => { setMobileOpen(false); navigate('/registro'); }} className="w-full py-4 bg-zinc-950 text-white font-black rounded-xl shadow-xl flex justify-center items-center transition-colors active:scale-95">
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