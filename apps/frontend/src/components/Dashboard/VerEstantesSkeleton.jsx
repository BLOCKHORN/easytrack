import React from 'react';

export default function VerEstantesSkeleton() {
  return (
    <div className="space-y-8 font-sans pb-20 relative min-h-screen animate-pulse">
      
      {/* HEADER SKELETON */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-zinc-200 rounded-2xl shrink-0" />
          <div className="h-8 bg-zinc-200 rounded-lg w-48" />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="h-10 bg-zinc-200 rounded-xl w-32" />
        <div className="h-10 bg-zinc-200 rounded-xl w-32" />
      </div>

      {/* PLANO DE PLANTA SKELETON (LANES) */}
      <div className="bg-zinc-100 rounded-3xl p-4 sm:p-8 flex flex-col items-center overflow-hidden">
        <div className="w-full max-w-full overflow-hidden">
          <div 
            className="grid gap-2 sm:gap-3 relative w-full" 
            style={{ 
              gridTemplateColumns: 'repeat(5, 1fr)',
            }}
          >
            {[...Array(25)].map((_, i) => (
              <div key={i} className="aspect-square bg-zinc-200/50 rounded-xl" />
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}