const IconStore = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;

export default function IdentityCard({ nombre, setNombre }) {
  return (
    <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-4">
        <div className="w-10 h-10 bg-white border border-zinc-200 rounded-xl flex items-center justify-center text-zinc-900 shadow-sm">
          <IconStore />
        </div>
        <div>
          <h3 className="text-lg font-bold text-zinc-950">Identidad del Negocio</h3>
          <p className="text-zinc-500 text-sm">Nombre visible en el dashboard e informes.</p>
        </div>
      </div>
      
      <div className="p-8">
        <div className="max-w-md space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Nombre de la Empresa</label>
          <input 
            type="text" 
            value={nombre} 
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Papeleria El Buen Papel S.A."
            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-bold text-zinc-900 transition-all"
          />
          <p className="text-xs text-zinc-400 mt-2">Este nombre se usará para todas las comunicaciones automáticas con clientes.</p>
        </div>
      </div>
    </div>
  );
}