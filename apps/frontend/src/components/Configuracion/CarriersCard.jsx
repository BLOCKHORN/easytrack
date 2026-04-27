'use strict';

import { useMemo } from "react";

const IconTruck = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
const IconTrash = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconPlus = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("");
}

function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${checked ? 'bg-[#14B07E]' : 'bg-zinc-200'}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

const FALLBACK_COMPANIAS = [
  { nombre: 'Amazon Logistics' }, { nombre: 'Boyacá' }, { nombre: 'Celeritas' }, 
  { nombre: 'Correos' }, { nombre: 'Correos Express' }, { nombre: 'DHL' }, 
  { nombre: 'DPD' }, { nombre: 'GLS' }, { nombre: 'InPost' }, { nombre: 'MRW' }, 
  { nombre: 'Nacex' }, { nombre: 'Paack' }, { nombre: 'SEUR' }, { nombre: 'UPS' }, 
  { nombre: 'Vinted Go' }, { nombre: 'Zeleris' }
];

export default function CarriersCard({
  empresas = [],
  empresasDisponibles = FALLBACK_COMPANIAS,
  setEmpresas
}) {
  
  const doAdd = () => {
    const paleta = ["#14b8a6", "#6366f1", "#f59e0b", "#ec4899", "#8b5cf6", "#0ea5e9", "#10b981", "#f43f5e"];
    const nuevoColor = paleta[empresas.length % paleta.length];
    setEmpresas([...empresas, { nombre: "", ingreso_por_entrega: 0.30, color: nuevoColor, activo: true }]);
  };
  
  const doUpdate = (index, field, val) => {
    setEmpresas(prev => prev.map((emp, i) => i === index ? { ...emp, [field]: val } : emp));
  };
  
  const doRemove = (index) => {
    if(window.confirm("¿Seguro que deseas eliminar esta empresa?")) {
      setEmpresas(empresas.filter((_, i) => i !== index));
    }
  };

  const usados = useMemo(() => new Set(empresas.map((e) => e?.nombre).filter(Boolean)), [empresas]);

  return (
    <section className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm overflow-hidden" aria-labelledby="carriers-title">
      <header className="p-6 md:p-8 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-zinc-950 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0">
            <IconTruck />
          </div>
          <div>
            <h3 id="carriers-title" className="text-xl font-black text-zinc-950 tracking-tight">Empresas de transporte</h3>
            <p className="text-zinc-500 font-medium text-sm mt-1 max-w-md">Define con qué compañías trabajas y el ingreso acordado por paquete.</p>
          </div>
        </div>

        {empresas.length > 0 && (
          <button className="px-6 py-3 bg-[#14B07E] hover:bg-[#129A6E] text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 active:scale-95" onClick={doAdd}>
            <IconPlus /> Añadir empresa
          </button>
        )}
      </header>

      <div className="p-6 md:p-8 bg-zinc-50/30">
        {empresas.length === 0 && (
          <div className="text-center py-12 px-6 bg-white border border-zinc-200 border-dashed rounded-2xl">
            <div className="w-16 h-16 bg-zinc-50 border border-zinc-100 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconTruck />
            </div>
            <h4 className="text-lg font-black text-zinc-900 mb-2">Sin empresas configuradas</h4>
            <button className="px-6 py-3 bg-[#14B07E] hover:bg-[#129A6E] text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mx-auto active:scale-95" onClick={doAdd}>
              <IconPlus /> Configurar primera empresa
            </button>
          </div>
        )}

        <div className="space-y-4">
          {empresas.map((e, i) => {
            const color = e?.color || "#14B07E";
            const initials = getInitials(e?.nombre) || "—";

            return (
              <article key={i} className="flex flex-col lg:flex-row lg:items-center gap-4 p-5 bg-white border border-zinc-200 rounded-xl shadow-sm hover:border-zinc-300 transition-colors">
                
                <div className="flex w-full lg:w-auto items-center gap-4 flex-1">
                  <div className="hidden sm:flex w-12 h-12 rounded-xl border border-zinc-200 bg-zinc-50 items-center justify-center font-black text-zinc-900 shrink-0 relative">
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: color }} />
                    {initials}
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 block">Compañía Logística</label>
                    <select
                      value={e.nombre || ""}
                      onChange={(ev) => doUpdate(i, "nombre", ev.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:border-[#14B07E] outline-none font-bold text-zinc-900 cursor-pointer transition-colors"
                    >
                      <option value="" disabled>Seleccionar…</option>
                      {empresasDisponibles.map((emp) => {
                        const disabled = usados.has(emp.nombre) && emp.nombre !== e.nombre;
                        return (
                          <option key={emp.id ?? emp.nombre} value={emp.nombre} disabled={disabled}>
                            {emp.nombre} {disabled ? " (ya en uso)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 w-full lg:w-auto">
                  
                  {/* NUEVO: Input numérico en lugar de Select gigante */}
                  <div className="flex-1 sm:w-36 sm:flex-none">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 block">
                      Tarifa <span className="text-zinc-400 normal-case tracking-normal">(Sin IVA)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={e.ingreso_por_entrega === null || e.ingreso_por_entrega === undefined ? "" : e.ingreso_por_entrega}
                        onChange={(ev) => doUpdate(i, "ingreso_por_entrega", ev.target.value === "" ? 0 : parseFloat(ev.target.value))}
                        onFocus={(ev) => ev.target.select()}
                        className="w-full pl-3 pr-8 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:border-[#14B07E] outline-none font-black text-[#14B07E] transition-colors appearance-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold pointer-events-none">€</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 block text-center">Color</label>
                    <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-zinc-200 cursor-pointer shrink-0 transition-transform hover:scale-105" title="Cambiar color">
                      <input type="color" value={color} onChange={(ev) => doUpdate(i, "color", ev.target.value)} className="absolute inset-0 w-[200%] h-[200%] -top-4 -left-4 cursor-pointer" />
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block text-center">Estado</label>
                    <Switch checked={e?.activo ?? true} onChange={(val) => doUpdate(i, "activo", val)} />
                  </div>

                  <div className="flex flex-col items-center sm:ml-2">
                    <label className="text-[10px] font-bold text-transparent uppercase tracking-widest mb-1.5 block select-none">X</label>
                    <button type="button" onClick={() => doRemove(i)} className="w-11 h-11 flex items-center justify-center bg-white border border-zinc-200 text-zinc-400 hover:text-white hover:bg-red-600 hover:border-red-600 rounded-lg transition-colors shadow-sm">
                      <IconTrash />
                    </button>
                  </div>

                </div>
              </article>
            );
          })}
        </div>

        {empresas.length > 0 && (
          <div className="mt-6 sm:hidden">
            <button className="w-full px-6 py-3.5 bg-[#14B07E] hover:bg-[#129A6E] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-colors" onClick={doAdd}>
              <IconPlus /> Añadir otra empresa
            </button>
          </div>
        )}
      </div>
    </section>
  );
}