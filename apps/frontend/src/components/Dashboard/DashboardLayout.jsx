import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../utils/supabaseClient';

const TypewriterLogo = ({ size = "text-2xl", cursorHeight = "h-6" }) => {
  const text = "easytrack";
  return (
    <div className={`flex items-center ${size} font-black tracking-tighter text-white select-none`}>
      {text.split("").map((char, index) => (
        <motion.span key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.06, duration: 0.1 }}>
          {char}
        </motion.span>
      ))}
      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: text.length * 0.06, duration: 0.1 }} className="text-brand-500">.</motion.span>
      <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className={`w-1.5 ${cursorHeight} bg-brand-500 ml-1 inline-block`} />
    </div>
  );
};

const IconChart = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>;
const IconPlus = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const IconSearch = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const IconGrid = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>;
const IconUser = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const IconSettings = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconGlobe = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const IconLogout = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const IconCreditCard = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
const IconMenu = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const IconX = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconScan = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/><path d="m16 16-1.5-1.5"/></svg>;

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { label: 'Inicio', path: '.', icon: <IconChart />, end: true },
    { label: 'Entrada', path: 'anadir', icon: <IconPlus /> },
    { label: 'Localizador', path: 'buscar', icon: <IconSearch /> },
    { label: 'Infraestructura', path: 'almacen', icon: <IconGrid /> },
  ];

  const bottomItems = [
    { label: 'Área financiera', path: 'personal', icon: <IconUser /> },
    { label: 'Facturación', path: 'facturacion', icon: <IconCreditCard /> },
    { label: 'Configuración', path: 'configuracion', icon: <IconSettings /> },
  ];

  const mobileNavLeft = [
    { label: 'Manual', path: 'anadir', icon: <IconPlus /> },
    { label: 'Buscar', path: 'buscar', icon: <IconSearch /> }
  ];

  const mobileNavRight = [
    { label: 'Almacén', path: 'almacen', icon: <IconGrid /> },
    { label: 'Finanzas', path: 'personal', icon: <IconUser /> }
  ];

  const mobileMenu = [
    { label: 'Facturación', path: 'facturacion', icon: <IconCreditCard /> },
    { label: 'Configuración', path: 'configuracion', icon: <IconSettings /> },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col md:flex-row font-sans">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes subtleGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(20, 184, 166, 0.4), inset 0 0 0px rgba(255,255,255,0.2); }
          50% { box-shadow: 0 0 25px rgba(20, 184, 166, 0.7), inset 0 0 4px rgba(255,255,255,0.5); }
        }
        .pro-fab { animation: subtleGlow 3s ease-in-out infinite; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
      `}} />

      <aside className="hidden md:flex flex-col w-[260px] bg-zinc-950 border-r border-zinc-900 sticky top-0 h-screen overflow-y-auto">
        <div className="p-8 cursor-pointer" onClick={() => navigate('.')}>
          <TypewriterLogo size="text-2xl" cursorHeight="h-6" />
        </div>

        <nav className="flex-1 px-4 space-y-1.5">
          <div className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-3 pl-3 mt-3">Core</div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
          
          <div className="mt-8 mb-5 border-t border-zinc-800/50 mx-3" />
          <div className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-3 pl-3">Sistema</div>
          
          {bottomItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto p-4 border-t border-zinc-900">
          <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm text-zinc-500 hover:bg-zinc-900 hover:text-white transition-all">
            <IconGlobe />
            Volver a la Web
          </a>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl font-bold text-sm text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-all">
            <IconLogout />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <header className="md:hidden sticky top-0 z-40 bg-zinc-950 flex items-center justify-between p-4 px-5 shadow-lg border-b border-zinc-800/50">
        <div className="cursor-pointer" onClick={() => navigate('.')}>
          <TypewriterLogo size="text-xl" cursorHeight="h-5" />
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="relative w-10 h-10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
        >
          {isMobileMenuOpen ? <IconX /> : <IconMenu />}
        </button>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed top-[72px] left-0 right-0 z-30 bg-zinc-950 border-b border-zinc-800/50 shadow-2xl p-5 px-6 pb-8"
          >
            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-2 pl-2">Gestión</div>
              {mobileMenu.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => `relative flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
              
              <div className="w-full h-px bg-zinc-800/50 my-4" />
              
              <a href="/" className="flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all">
                <IconGlobe /> Volver a la Web
              </a>
              <button onClick={handleLogout} className="flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-sm text-red-400 hover:bg-red-500/10 transition-all text-left">
                <IconLogout /> Cerrar Sesión
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden relative pb-[88px] md:pb-0">
        {isMobileMenuOpen && (
          <div 
            className="md:hidden fixed inset-0 z-20 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 p-5 md:p-8 max-w-[1440px] w-full mx-auto"
        >
          <Outlet />
        </motion.div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/80 pb-safe">
        <div className="flex items-end justify-between px-6 py-2">
          
          <div className="flex flex-1 justify-between pr-4">
            {mobileNavLeft.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => `flex flex-col items-center justify-center w-14 transition-colors ${isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <div className="mb-1.5">{item.icon}</div>
                <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="relative shrink-0 flex justify-center -mt-8">
            <NavLink 
              to="anadir"
              state={{ openScanner: true }}
              className={({ isActive }) => `relative flex flex-col items-center justify-center transition-transform active:scale-95 ${isActive ? '' : 'hover:-translate-y-1'}`}
            >
              <div className="w-[60px] h-[60px] bg-gradient-to-tr from-brand-500 to-brand-400 rounded-full flex items-center justify-center text-white pro-fab shadow-xl">
                <IconScan />
              </div>
            </NavLink>
          </div>

          <div className="flex flex-1 justify-between pl-4">
            {mobileNavRight.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `flex flex-col items-center justify-center w-14 transition-colors ${isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <div className="mb-1.5">{item.icon}</div>
                <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
              </NavLink>
            ))}
          </div>

        </div>
      </nav>
    </div>
  );
}