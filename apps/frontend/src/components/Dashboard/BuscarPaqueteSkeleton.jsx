import React from 'react';

export default function BuscarPaqueteSkeleton() {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden animate-pulse">
      
      {/* HEADER TABLA SKELETON (Solo Desktop) */}
      <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-4 bg-zinc-50 border-b border-zinc-200 items-center">
        <div className="col-span-1"><div className="h-4 bg-zinc-200 rounded w-8"></div></div>
        <div className="col-span-3"><div className="h-4 bg-zinc-200 rounded w-24"></div></div>
        <div className="col-span-2"><div className="h-4 bg-zinc-200 rounded w-20"></div></div>
        <div className="col-span-3"><div className="h-4 bg-zinc-200 rounded w-32"></div></div>
        <div className="col-span-1"><div className="h-4 bg-zinc-200 rounded w-16"></div></div>
        <div className="col-span-2"><div className="h-4 bg-zinc-200 rounded w-16 ml-auto"></div></div>
      </div>

      {/* FILAS SKELETON */}
      <div className="divide-y divide-zinc-100">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex flex-col lg:grid lg:grid-cols-12 gap-4 px-5 sm:px-6 py-4 sm:py-5 items-center">
            {/* Mobile / Desktop fusionado para el skeleton */}
            
            {/* Lado izquierdo (ID/Nombre/Tracking) */}
            <div className="flex items-center gap-4 w-full lg:col-span-4">
              <div className="w-10 h-10 bg-zinc-100 rounded-xl shrink-0" />
              <div className="space-y-2 w-full">
                <div className="h-4 bg-zinc-200 rounded-md w-32" />
                <div className="h-3 bg-zinc-100 rounded-md w-48" />
              </div>
            </div>

            {/* Centro (Ubicacion / Estado) */}
            <div className="flex items-center justify-between w-full lg:col-span-6 mt-3 lg:mt-0">
               <div className="h-6 bg-zinc-100 rounded-lg w-20" />
               <div className="h-4 bg-zinc-100 rounded-md w-24" />
            </div>

            {/* Acciones */}
            <div className="hidden lg:flex items-center justify-end w-full lg:col-span-2 gap-2">
               <div className="w-8 h-8 bg-zinc-100 rounded-lg" />
               <div className="w-8 h-8 bg-zinc-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}