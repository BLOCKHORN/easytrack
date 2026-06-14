import React from 'react';

export default function AnadirPaqueteSkeleton({ modoRapido }) {
  return (
    <div className={`bg-white relative animate-pulse ${modoRapido ? '' : 'p-4 sm:p-8 rounded-[2rem] border border-zinc-200/80 shadow-sm max-w-5xl mx-auto'}`}>
      
      {!modoRapido && (
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex w-12 h-12 bg-zinc-200 rounded-2xl shrink-0" />
            <div className="h-8 bg-zinc-200 rounded-lg w-48" />
          </div>
          <div className="h-10 bg-zinc-200 rounded-xl w-32" />
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Lado izquierdo (Formulario) */}
        <div className="flex-1 space-y-6">
          <div className="space-y-3">
            <div className="h-4 bg-zinc-100 rounded-md w-24" />
            <div className="h-12 bg-zinc-100 rounded-xl w-full" />
            <div className="h-3 bg-zinc-50 rounded-md w-40" />
          </div>

          <div className="space-y-3">
            <div className="h-4 bg-zinc-100 rounded-md w-32" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-12 bg-zinc-50 rounded-xl w-full" />
              ))}
            </div>
          </div>
        </div>

        {/* Separador vertical */}
        <div className="hidden lg:block w-px bg-zinc-100" />

        {/* Lado derecho (Ubicaciones) */}
        <div className="lg:w-[45%] flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-4 bg-zinc-100 rounded-md w-32" />
            <div className="h-6 bg-zinc-100 rounded-full w-16" />
          </div>

          <div className="flex-1 bg-zinc-50/50 rounded-2xl border border-zinc-100 p-4">
            <div className="grid grid-cols-5 gap-2">
               {[...Array(25)].map((_, i) => (
                 <div key={i} className="aspect-square bg-zinc-100 rounded-lg" />
               ))}
            </div>
          </div>
          
          <div className="h-14 bg-zinc-200 rounded-xl w-full mt-4" />
        </div>
      </div>
    </div>
  );
}