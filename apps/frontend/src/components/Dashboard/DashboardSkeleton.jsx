import React from 'react';
import { motion } from 'framer-motion';

export default function DashboardSkeleton() {
  return (
    <div className="space-y-10 font-sans pb-24 animate-pulse">
      
      {/* HEADER SKELETON */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-200/60 pb-6">
        <div className="space-y-3 w-full max-w-md">
          <div className="h-4 bg-zinc-200 rounded-md w-32" />
          <div className="h-8 md:h-10 bg-zinc-200 rounded-lg w-3/4" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 bg-zinc-200 rounded-xl w-10 shrink-0" />
          <div className="h-10 bg-zinc-200 rounded-xl w-32" />
        </div>
      </div>

      {/* TRES KIPS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex items-center justify-between">
            <div className="space-y-3">
              <div className="h-4 bg-zinc-100 rounded-md w-24" />
              <div className="h-10 bg-zinc-200 rounded-lg w-20" />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-zinc-100" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:h-[450px]">
        {/* CHART SKELETON */}
        <div className="lg:col-span-8 bg-white p-6 lg:p-8 rounded-[2rem] border border-zinc-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-10">
            <div className="space-y-2">
              <div className="h-6 bg-zinc-200 rounded-md w-40" />
              <div className="h-4 bg-zinc-100 rounded-md w-24" />
            </div>
          </div>
          <div className="flex-1 w-full border-b border-zinc-100 relative">
            {/* Simular barras de gráfica */}
            <div className="absolute bottom-0 w-full flex justify-between items-end px-4 gap-2">
              {[40, 70, 30, 90, 50, 80, 20, 60, 45, 85, 30, 65, 50, 75].map((h, idx) => (
                <div key={idx} className="w-full bg-zinc-100 rounded-t-sm" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>

        {/* OCUPACION SKELETON */}
        <div className="lg:col-span-4 bg-zinc-950 p-6 lg:p-8 rounded-[2rem] shadow-xl text-white flex flex-col">
          <div className="space-y-2 mb-8">
            <div className="h-6 bg-zinc-800 rounded-md w-48" />
            <div className="h-4 bg-zinc-900 rounded-md w-32" />
          </div>
          <div className="space-y-6 flex-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 bg-zinc-800 rounded-md w-24" />
                  <div className="h-4 bg-zinc-800 rounded-md w-8" />
                </div>
                <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-800 rounded-full" style={{ width: `${80 - i * 15}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}