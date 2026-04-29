import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';

const IconDashboard = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>;
const IconSettings = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconExit = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const IconRadar = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const IconUsers = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconMenu = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const IconClose = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menu = [
    { name: 'Panel General', path: '/admin/dashboard', icon: <IconDashboard /> },
    { name: 'Red de Comerciales', path: '/admin/partners', icon: <IconUsers /> },
    { name: 'Radar de Puntos', path: '/admin/radar', icon: <IconRadar /> },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col md:flex-row font-sans text-zinc-300 selection:bg-brand-500/30">
      
      <div className="md:hidden flex items-center justify-between h-16 px-4 border-b border-zinc-800/80 bg-zinc-950 relative z-50">
        <div className="flex items-center gap-3 text-white">
          <div className="text-brand-500"><IconSettings /></div>
          <span className="font-black tracking-widest uppercase text-xs">Administración</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-zinc-400 hover:text-white transition-colors"
        >
          {mobileMenuOpen ? <IconClose /> : <IconMenu />}
        </button>
      </div>

      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col shadow-2xl shadow-black transform transition-transform duration-300 ease-in-out md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0 mt-16 md:mt-0' : '-translate-x-full mt-16 md:mt-0'}`}>
        
        <div className="h-16 hidden md:flex items-center px-6 border-b border-zinc-800/80 bg-zinc-950">
          <div className="flex items-center gap-3 text-white">
            <div className="text-brand-500"><IconSettings /></div>
            <span className="font-black tracking-widest uppercase text-xs">Administración</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4 pl-3 mt-2">Menú Principal</div>
          {menu.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-900 hover:text-white border border-transparent'
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
          >
            <IconExit /> Salir de Admin
          </button>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm top-16"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col h-[calc(100vh-4rem)] md:h-screen overflow-hidden bg-[#fafafa]">
        <div className="flex-1 overflow-auto p-4 md:p-8 z-10 relative">
          <Outlet />
        </div>
      </main>

    </div>
  );
}