import { useEffect, useState, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePasswordFirstGuard } from '../../hooks/usePasswordFirstGuard';
import { hasNotice, subscribeNotice, setNotice, clearNotice } from '../../utils/supportNotice';
import { listTickets } from '../../services/ticketsService';
import { supabase } from '../../utils/supabaseClient';

const IconLogo = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>;
const IconChart = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>;
const IconPlus = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const IconSearch = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const IconGrid = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>;
const IconUser = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const IconSupport = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg>;
const IconSettings = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconGlobe = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const IconLogout = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;

export default function DashboardLayout() {
  usePasswordFirstGuard();
  const location = useLocation();
  const navigate = useNavigate();
  const [supportNotice, setSupportNotice] = useState(hasNotice());
  const pollingRef = useRef(null);

  useEffect(() => {
    const unsub = subscribeNotice(setSupportNotice);
    return unsub;
  }, []);

  useEffect(() => {
    const inSupport = location.pathname.includes('/dashboard/soporte');
    if (inSupport && supportNotice) clearNotice();
  }, [location.pathname, supportNotice]);

  useEffect(() => {
    let unmounted = false;
    async function checkSupportNotice() {
      try {
        const r = await listTickets({ page: 1, pageSize: 1, estado: 'esperando_cliente' });
        const total = Number(r?.total ?? 0);
        if (!location.pathname.includes('/dashboard/soporte') && !unmounted) setNotice(total > 0);
        else if (!unmounted) clearNotice();
      } catch {}
    }
    checkSupportNotice();
    pollingRef.current = setInterval(checkSupportNotice, 15000);
    return () => { unmounted = true; if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { label: 'Overview', path: '.', icon: <IconChart />, end: true },
    { label: 'Entrada', path: 'anadir', icon: <IconPlus /> },
    { label: 'Localizador', path: 'buscar', icon: <IconSearch /> },
    { label: 'Infraestructura', path: 'almacen', icon: <IconGrid /> },
  ];

  const bottomItems = [
    { label: 'Área financiera', path: 'personal', icon: <IconUser /> },
    { label: 'Configuración', path: 'configuracion', icon: <IconSettings /> },
    { label: 'Asistencia', path: 'soporte', icon: <IconSupport />, isSupport: true },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex flex-col w-[260px] bg-zinc-950 border-r border-zinc-900 sticky top-0 h-screen overflow-y-auto">
        <div className="p-8 flex items-center gap-3 cursor-pointer" onClick={() => navigate('.')}>
          <div className="text-white">
            <IconLogo />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            EasyTrack
          </span>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 pl-3 mt-4">Core</div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
          
          <div className="mt-10 mb-6 border-t border-zinc-800/50 mx-3" />
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 pl-3">Sistema</div>
          
          {bottomItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => item.isSupport && clearNotice()}
              className={({ isActive }) => `relative flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
            >
              {item.icon}
              {item.label}
              {item.isSupport && supportNotice && (
                <span className="absolute right-3 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </NavLink>
          ))}
        </nav>

        {/* ACCIONES GLOBALES FOOTER */}
        <div className="mt-auto p-4 border-t border-zinc-900">
          <a href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm text-zinc-500 hover:bg-zinc-900 hover:text-white transition-all">
            <IconGlobe />
            Volver a la Web
          </a>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-lg font-medium text-sm text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-all">
            <IconLogout />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* HEADER MOBILE */}
      <header className="md:hidden sticky top-0 z-40 bg-zinc-950 flex items-center justify-between p-4 shadow-md">
        <div className="flex items-center gap-2">
          <div className="text-white"><IconLogo /></div>
          <span className="text-lg font-bold tracking-tight text-white">EasyTrack</span>
        </div>
        <div className="flex items-center gap-1">
          <a href="/" className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white rounded-lg transition-colors">
            <IconGlobe />
          </a>
          <button onClick={handleLogout} className="w-9 h-9 flex items-center justify-center text-zinc-500 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors">
            <IconLogout />
          </button>
        </div>
      </header>

      {/* MAIN VIEW */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden relative pb-24 md:pb-0">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 p-4 md:p-10 max-w-7xl w-full mx-auto"
        >
          <Outlet />
        </motion.div>
      </main>

      {/* BOTTOM NAV MOBILE */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-50">
        <div className="bg-zinc-950 rounded-2xl p-2 flex justify-between items-center shadow-2xl">
          {[...navItems.slice(0,3), ...bottomItems].map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => item.isSupport && clearNotice()}
              className={({ isActive }) => `relative flex flex-col items-center justify-center w-10 sm:w-12 h-10 sm:h-12 rounded-xl transition-colors ${isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              title={item.label}
            >
              {item.icon}
              {item.isSupport && supportNotice && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}