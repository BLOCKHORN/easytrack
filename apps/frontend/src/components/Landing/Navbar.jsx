import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useModal } from "../../context/ModalContext";
import { useTenant } from "../../context/TenantContext";
import useNavbarAuth from './useNavbarAuth';

const IconMenu = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const IconClose = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconChevronDown = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
const IconDashboard = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>;
const IconSettings = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconLogout = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const IconAdminRoot = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/><circle cx="12" cy="12" r="3"/></svg>;

function Avatar({ email, url }) {
  const letter = (email?.[0] || 'U').toUpperCase();
  if (url) return <img src={url} alt="Avatar" className="w-8 h-8 rounded-lg object-cover border border-zinc-700/50" />;
  return <div className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-400 text-[10px] font-black bg-zinc-950 border border-zinc-700 shadow-inner">{letter}</div>;
}

const TypewriterNavLogo = () => {
  const text = "easytrack";
  return (
    <Link to="/" className="flex items-center text-2xl font-black tracking-tighter text-white select-none outline-none">
      {text.split("").map((char, index) => (
        <motion.span key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.08, duration: 0.1 }}>
          {char}
        </motion.span>
      ))}
      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: text.length * 0.08, duration: 0.1 }} className="text-brand-500">.</motion.span>
      <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1.5 h-6 bg-brand-500 ml-1 inline-block" />
    </Link>
  );
};

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openLogin } = useModal();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountMenuRef = useRef(null);

  const { checking, isLoggedIn, userEmail, avatarUrl, isAdmin, handleLogout } = useNavbarAuth(navigate);
  const { tenant, loading: tenantLoading } = useTenant();
  const slug = tenant?.slug;
  const [isAuditComplete, setIsAuditComplete] = useState(false);

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

  useEffect(() => {
    const hasSeenAudit = localStorage.getItem('et_audit_complete');
    setIsAuditComplete(!!hasSeenAudit);
  }, [location]);

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
    navigate(slug ? `/${slug}/dashboard/configuracion` : '/dashboard/configuracion');
  };

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#09090b]/80 backdrop-blur-xl border-b border-zinc-800/50 py-3' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-10">
            <TypewriterNavLogo />
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <a key={link.name} href={link.path} className="px-4 py-2 text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-800/30 rounded-lg transition-all">{link.name}</a>
              ))}
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            {checking ? (
              <div className="w-24 h-10 bg-zinc-800/50 animate-pulse rounded-xl"></div>
            ) : isLoggedIn ? (
                tenantLoading ? (
                  <div className="w-24 h-10 bg-zinc-800/50 animate-pulse rounded-xl"></div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button onClick={goDashboard} className="px-5 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-black rounded-xl shadow-lg shadow-brand-500/20 transition-all active:scale-95">
                      Ir al panel
                    </button>
                    
                    <div className="relative" ref={accountMenuRef}>
                      <button 
                        onClick={() => setAccountOpen(!accountOpen)} 
                        className={`group flex items-center gap-3 px-3 py-1.5 rounded-xl border transition-all shadow-sm ${accountOpen ? 'bg-zinc-900 border-zinc-600 ring-2 ring-brand-500/20' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}
                      >
                        <Avatar email={userEmail} url={avatarUrl} />
                        <div className="text-left hidden lg:block">
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Sesión</p>
                          <p className="text-xs font-bold text-zinc-200 leading-none truncate max-w-[100px]">{userEmail?.split('@')[0]}</p>
                        </div>
                        <motion.div animate={{ rotate: accountOpen ? 180 : 0 }} className="text-zinc-500">
                          <IconChevronDown />
                        </motion.div>
                      </button>

                      <AnimatePresence>
                        {accountOpen && (
                          <motion.div 
                            initial={{ opacity: 0, y: 8, scale: 0.96 }} 
                            animate={{ opacity: 1, y: 0, scale: 1 }} 
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="absolute right-0 mt-3 w-64 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 origin-top-right"
                          >
                            <div className="px-5 py-4 border-b border-zinc-900 bg-zinc-900/20">
                              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Usuario</p>
                              <p className="text-sm font-bold text-white truncate">{userEmail}</p>
                            </div>
                            
                            <div className="p-2 space-y-1">
                              <button onClick={goConfig} className="w-full text-left px-3 py-3 text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-all flex items-center gap-3">
                                <IconSettings /> Configuración
                              </button>
                            </div>
                            
                            <div className="p-2 mt-1 border-t border-zinc-900">
                              <button onClick={() => { setAccountOpen(false); handleLogout(); }} className="w-full text-left px-3 py-3 text-sm font-bold text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all flex items-center gap-3">
                                <IconLogout /> Cerrar sesión
                              </button>
                            </div>

                            {isAdmin && (
                              <div className="p-2 mt-1 border-t border-zinc-900 bg-zinc-950">
                                <button onClick={() => { setAccountOpen(false); navigate('/admin/dashboard'); }} className="w-full text-left px-3 py-2 text-xs font-bold text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-2">
                                  <IconAdminRoot /> Administración
                                </button>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-4">
                  <button onClick={openLogin} className="text-sm font-bold text-zinc-400 hover:text-white transition-colors">Iniciar Sesión</button>
                  <button onClick={() => navigate('/registro')} className="px-5 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-black rounded-xl transition-all shadow-lg shadow-brand-500/20 active:scale-95">
                    Empezar gratis
                  </button>
                </div>
              )}
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-zinc-400 hover:text-white transition-colors">
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
            className="md:hidden bg-zinc-950 border-b border-zinc-800 overflow-hidden"
          >
            <div className="px-4 pt-4 pb-6">
              {checking || tenantLoading ? (
                <div className="w-full h-32 bg-zinc-900 animate-pulse rounded-xl"></div>
              ) : isLoggedIn ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-4 px-4 py-3 mb-2 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                    <Avatar email={userEmail} url={avatarUrl} />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest leading-none mb-1">Sesión Activa</span>
                      <span className="text-sm font-bold text-white truncate">{userEmail}</span>
                    </div>
                  </div>
                  
                  <button onClick={goDashboard} className="w-full text-left px-4 py-3.5 text-base font-bold text-white hover:bg-zinc-900 rounded-xl transition-colors flex items-center gap-3">
                    <IconDashboard /> Ir al Panel
                  </button>
                  
                  <button onClick={goConfig} className="w-full text-left px-4 py-3.5 text-base font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-colors flex items-center gap-3">
                    <IconSettings /> Configuración
                  </button>

                  <div className="h-px bg-zinc-800/50 my-2" />

                  {navLinks.map((link) => (
                    <a key={link.name} href={link.path} onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm font-bold text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-xl transition-colors">
                      {link.name}
                    </a>
                  ))}

                  <div className="h-px bg-zinc-800/50 my-2" />
                  
                  <button onClick={() => { setMobileOpen(false); handleLogout(); }} className="w-full text-left px-4 py-3.5 text-base font-bold text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors flex items-center gap-3">
                    <IconLogout /> Cerrar sesión
                  </button>

                  {isAdmin && (
                    <div className="mt-2 pt-2 border-t border-zinc-900">
                      <button onClick={() => { setMobileOpen(false); navigate('/admin/dashboard'); }} className="w-full text-left px-4 py-2 text-xs font-bold text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-2">
                        <IconAdminRoot /> Administración del sistema
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {navLinks.map((link) => (
                    <a key={link.name} href={link.path} onClick={() => setMobileOpen(false)} className="block px-4 py-3 text-base font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-colors">
                      {link.name}
                    </a>
                  ))}
                  
                  <div className="h-px bg-zinc-800/50 my-4" />
                  
                  <div className="flex flex-col gap-3">
                    <button onClick={() => { setMobileOpen(false); openLogin(); }} className="w-full py-4 text-white font-bold bg-zinc-900 hover:bg-zinc-800 rounded-xl flex justify-center items-center transition-colors">
                      Iniciar Sesión
                    </button>
                    {!isAuditComplete && (
                      <button onClick={() => { setMobileOpen(false); navigate('/?audit=true'); }} className="w-full py-4 text-brand-400 font-bold bg-transparent border border-brand-500/30 hover:border-brand-500/50 rounded-xl flex justify-center items-center gap-2 transition-colors">
                        Auditar Beneficios
                      </button>
                    )}
                    <button onClick={() => { setMobileOpen(false); navigate('/registro'); }} className="w-full py-4 bg-brand-500 text-white font-black rounded-xl flex justify-center items-center transition-colors active:scale-95">
                      Empezar gratis
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}