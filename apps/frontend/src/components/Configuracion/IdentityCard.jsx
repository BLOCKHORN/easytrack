const IconStore = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;

export default function IdentityCard({ nombre, setNombre }) {
  return (
    <section className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm overflow-hidden">
      <header className="p-6 md:p-8 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-zinc-950 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0">
            <IconStore />
          </div>
          <div>
            <h3 className="text-xl font-black text-zinc-950 tracking-tight">Identidad del Negocio</h3>
            <p className="text-zinc-500 font-medium text-sm mt-1 max-w-md">Nombre visible en el dashboard e informes para tus clientes.</p>
          </div>
        </div>
      </header>
      
      <div className="p-6 md:p-8">
        <div className="max-w-md space-y-3">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Nombre de la Empresa</label>
          <input 
            type="text" 
            value={nombre} 
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Papeleria El Buen Papel S.A."
            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:border-[#14B07E] outline-none font-bold text-zinc-900 transition-all shadow-sm"
          />
          <p className="text-xs text-zinc-400 font-medium">Este nombre se usará para todas las comunicaciones automáticas con clientes.</p>
        </div>
      </div>
    </section>
  );
}