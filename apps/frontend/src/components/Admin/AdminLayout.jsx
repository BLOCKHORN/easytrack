import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';

const IconDashboard = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>;
const IconTerminal = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>;
const IconExit = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  // Dejamos un solo punto de entrada para no confundir rutas
  const menu = [
    { name: 'Command Center', path: '/admin/dashboard', icon: <IconDashboard /> },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] flex font-sans text-zinc-300 selection:bg-brand-500/30">
      <aside className="w-64 bg-zinc-950 border-r border-zinc-800/80 flex-col hidden md:flex relative z-10 shadow-2xl shadow-black">
        <div className="h-16 flex items-center px-6 border-b border-zinc-800/80 bg-zinc-950">
          <div className="flex items-center gap-3 text-white">
            <div className="text-brand-500"><IconTerminal /></div>
            <span className="font-black tracking-widest uppercase text-xs">Root Access</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5">
          <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4 pl-3 mt-2">Sistema</div>
          {menu.map((item) => {
            // Comprobamos si estamos en la ruta base de admin
            const isActive = location.pathname === '/admin' || location.pathname.includes(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' : 'text-zinc-500 hover:bg-zinc-900 hover:text-white border border-transparent'
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
            <IconExit /> Exit Root
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[300px] bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.05)_0%,transparent_70%)] pointer-events-none" />
        <div className="flex-1 overflow-auto p-4 md:p-8 z-10 relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}