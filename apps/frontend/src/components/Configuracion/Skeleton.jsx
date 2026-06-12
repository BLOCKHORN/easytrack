export default function Skeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-28 pt-8 px-4 font-sans animate-pulse">
      
      {/* CABECERA AJUSTES SKELETON */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-6 border-b border-zinc-200 mb-10">
        <div className="h-10 bg-zinc-200 rounded-lg w-48"></div>
        <div className="flex gap-3">
          <div className="h-12 bg-zinc-200 rounded-xl w-32"></div>
          <div className="h-12 bg-zinc-200 rounded-xl w-32"></div>
        </div>
      </header>

      {/* GRID DE SECCIONES SKELETON */}
      <div className="space-y-12">
        
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-5">
              <div className="w-14 h-14 bg-zinc-200 rounded-2xl shrink-0"></div>
              <div className="space-y-2 w-full">
                <div className="h-6 bg-zinc-200 rounded-md w-48"></div>
                <div className="h-4 bg-zinc-100 rounded-md w-72 max-w-full"></div>
              </div>
            </div>
            <div className="p-6 md:p-8 space-y-4">
              <div className="h-4 bg-zinc-100 rounded-md w-32"></div>
              <div className="h-12 bg-zinc-100 rounded-xl w-full max-w-md"></div>
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}