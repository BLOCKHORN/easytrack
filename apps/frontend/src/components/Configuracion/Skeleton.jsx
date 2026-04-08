export default function Skeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-28 pt-8 px-4 sm:px-6 lg:px-8 animate-pulse">
      
      {/* CABECERA SKELETON */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-200/80">
        <div className="space-y-3">
          <div className="h-8 bg-zinc-200/80 rounded-lg w-64"></div>
          <div className="h-4 bg-zinc-100 rounded-md w-96 max-w-full"></div>
        </div>
        <div className="h-12 bg-zinc-200/80 rounded-xl w-full md:w-40"></div>
      </header>

      {/* GRID DE TARJETAS SKELETON */}
      <div className="grid grid-cols-1 gap-8">
        
        {/* Tarjeta 1 */}
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-4">
            <div className="w-10 h-10 bg-zinc-200/80 rounded-xl shrink-0"></div>
            <div className="space-y-2 w-full">
              <div className="h-5 bg-zinc-200/80 rounded-md w-48"></div>
              <div className="h-3 bg-zinc-100 rounded-md w-72 max-w-full"></div>
            </div>
          </div>
          <div className="p-8 space-y-4">
            <div className="h-3 bg-zinc-100 rounded-md w-32"></div>
            <div className="h-12 bg-zinc-100 rounded-xl w-full max-w-md"></div>
          </div>
        </div>

        {/* Tarjeta 2 (Más grande, simulando ubicaciones) */}
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-4">
            <div className="w-10 h-10 bg-zinc-200/80 rounded-xl shrink-0"></div>
            <div className="space-y-2 w-full">
              <div className="h-5 bg-zinc-200/80 rounded-md w-56"></div>
              <div className="h-3 bg-zinc-100 rounded-md w-80 max-w-full"></div>
            </div>
          </div>
          <div className="p-8">
            <div className="h-32 bg-zinc-100 rounded-2xl w-full"></div>
          </div>
        </div>
        
        {/* Tarjeta 3 */}
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-4">
            <div className="w-10 h-10 bg-zinc-200/80 rounded-xl shrink-0"></div>
            <div className="space-y-2 w-full">
              <div className="h-5 bg-zinc-200/80 rounded-md w-40"></div>
              <div className="h-3 bg-zinc-100 rounded-md w-60 max-w-full"></div>
            </div>
          </div>
          <div className="p-8">
            <div className="h-24 bg-zinc-100 rounded-2xl w-full max-w-lg"></div>
          </div>
        </div>

      </div>
    </div>
  );
}