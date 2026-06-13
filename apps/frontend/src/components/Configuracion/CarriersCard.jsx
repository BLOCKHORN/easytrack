import { useMemo, useState, useRef, useEffect } from "react";

const IconTruck = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
const IconTrash = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconPlus = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("");
}

const FALLBACK_COMPANIAS = [
  { nombre: 'Amazon Logistics', domain: 'amazon.com' },
  { nombre: 'ASM', domain: 'gls-spain.es' },
  { nombre: 'Boyacá', domain: 'boyaca.es' },
  { nombre: 'Celeritas', domain: 'celeritas.es' },
  { nombre: 'Chronopost', domain: 'chronopost.fr' },
  { nombre: 'Correos', domain: 'correos.es' },
  { nombre: 'Correos Express', domain: 'correosexpress.com' },
  { nombre: 'CTT Express', domain: 'cttexpress.com' },
  { nombre: 'Deliveroo', domain: 'deliveroo.es' },
  { nombre: 'Deliveroo Logistics', domain: 'deliveroologistics.es' },
  { nombre: 'DHL', domain: 'dhl.com' },
  { nombre: 'DPD', domain: 'dpd.com' },
  { nombre: 'EcoScooting', domain: 'ecoscooting.com' },
  { nombre: 'Envialia', domain: 'envialia.com' },
  { nombre: 'FedEx', domain: 'fedex.com' },
  { nombre: 'Genei', domain: 'genei.es' },
  { nombre: 'GLS', domain: 'gls-spain.es' },
  { nombre: 'Halcourier', domain: 'gls-spain.es' },
  { nombre: 'InPost', domain: 'inpost.es' },
  { nombre: 'Mondial Relay', domain: 'mondialrelay.es' },
  { nombre: 'MRW', domain: 'mrw.es' },
  { nombre: 'Nacex', domain: 'nacex.es' },
  { nombre: 'Paack', domain: 'paack.co' },
  { nombre: 'Packlink', domain: 'packlink.es' },
  { nombre: 'Paq24', domain: 'correosexpress.com' },
  { nombre: 'Paq25', domain: 'paq25.com' },
  { nombre: 'Punto Pack', domain: 'puntopack.es' },
  { nombre: 'Redyser', domain: 'redyser.com' },
  { nombre: 'Relais Colis', domain: 'relaiscolis.com' },
  { nombre: 'Sending', domain: 'sending.es' },
  { nombre: 'Servientrega', domain: 'servientrega.com' },
  { nombre: 'Servienvia', domain: 'servienvia.com' },
  { nombre: 'SEUR', domain: 'seur.com' },
  { nombre: 'Shipius', domain: 'shipius.com' },
  { nombre: 'Shipus', domain: 'shipus.com' },
  { nombre: 'Stuart', domain: 'stuart.com' },
  { nombre: 'Tipsa', domain: 'tipsa-entregas.com' },
  { nombre: 'TNT', domain: 'tnt.com' },
  { nombre: 'Tourline Express', domain: 'cttexpress.com' },
  { nombre: 'Uber Direct', domain: 'uber.com' },
  { nombre: 'UPS', domain: 'ups.com' },
  { nombre: 'Vinted Go', domain: 'vinted.com' },
  { nombre: 'Zeleris', domain: 'zeleris.com' }
];

function getCarrierLogo(name) {
  if (!name) return null;
  const normalizedName = String(name).trim().toLowerCase();
  const found = FALLBACK_COMPANIAS.find(o => String(o.nombre).trim().toLowerCase() === normalizedName);
  if (!found || !found.domain) return null;
  return `/carriers/${found.domain}.png`;
}

function ImageFallback({ src, fallbackText, containerClassName, imgClassName, fallbackClassName }) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  if (error || !src) {
    return (
      <div className={`${containerClassName} ${fallbackClassName} flex items-center justify-center`}>
        {fallbackText}
      </div>
    );
  }

  return (
    <div className={`${containerClassName} flex items-center justify-center`}>
      <img
        key={src}
        src={src}
        alt=""
        className={imgClassName}
        onError={() => setError(true)}
      />
    </div>
  );
}

function CustomCarrierSelect({ value, options, onChange, usados }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLogoUrl = getCarrierLogo(value);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        className="w-full px-4 h-11 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-between cursor-pointer focus:border-[#14B07E] hover:bg-zinc-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <ImageFallback 
            src={selectedLogoUrl}
            fallbackText={getInitials(value)}
            containerClassName="w-5 h-5 shrink-0"
            imgClassName="max-w-full max-h-full object-contain"
            fallbackClassName="bg-zinc-200 rounded-full text-[8px] font-bold text-zinc-500"
          />
          <span className="font-bold text-zinc-900">{value || "Seleccionar…"}</span>
        </div>
        <span className="text-zinc-400 text-[10px]">▼</span>
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-2 w-full max-h-60 overflow-y-auto bg-white border border-zinc-200 rounded-xl shadow-2xl py-2">
          {options.map((emp) => {
             const disabled = usados.has(emp.nombre) && emp.nombre !== value;
             const logoUrl = getCarrierLogo(emp.nombre);
             return (
                <div 
                  key={emp.id ?? emp.nombre}
                  className={`px-4 py-2.5 flex items-center gap-3 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed bg-zinc-50' : 'cursor-pointer hover:bg-zinc-50'}`}
                  onClick={() => {
                     if (!disabled) {
                       onChange(emp.nombre);
                       setIsOpen(false);
                     }
                  }}
                >
                  <ImageFallback 
                    src={logoUrl}
                    fallbackText={getInitials(emp.nombre)}
                    containerClassName="w-6 h-6 shrink-0"
                    imgClassName="max-w-full max-h-full object-contain"
                    fallbackClassName="bg-zinc-100 rounded-full text-[10px] font-bold text-zinc-400"
                  />
                  <span className="font-bold text-sm text-zinc-900">{emp.nombre}</span>
                  {disabled && <span className="text-xs font-bold text-zinc-400 ml-auto">(En uso)</span>}
                </div>
             )
          })}
        </div>
      )}
    </div>
  );
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
    <section className="bg-white md:rounded-[2rem] border-y md:border border-zinc-200 shadow-sm" aria-labelledby="carriers-title">
      <header className="p-6 md:p-8 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-zinc-950 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0">
            <IconTruck />
          </div>
          <div>
            <h3 id="carriers-title" className="text-lg md:text-xl font-black text-zinc-950 tracking-tight">Agencias de Transporte</h3>
            <p className="text-zinc-500 font-medium text-xs md:text-sm mt-1 max-w-md">Gestiona las empresas de paquetería y tus márgenes por entrega.</p>
          </div>
        </div>

        {empresas.length > 0 && (
          <button className="px-6 py-3 bg-brand-500 hover:bg-brand-400 text-white font-bold text-xs md:text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 active:scale-95" onClick={doAdd}>
            <IconPlus /> Añadir empresa
          </button>
        )}
      </header>

      <div className="p-4 md:p-8">
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
            const logoUrl = getCarrierLogo(e?.nombre);

            return (
              <article key={i} className="flex flex-col lg:flex-row lg:items-center gap-4 p-5 bg-white border border-zinc-200 rounded-xl shadow-sm hover:border-zinc-300 transition-colors">
                
                <div className="flex w-full lg:w-auto items-center gap-4 flex-1">
                  <div className="hidden sm:flex w-12 h-12 rounded-xl border border-zinc-200 bg-zinc-50 items-center justify-center font-black text-zinc-900 shrink-0 relative overflow-hidden">
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10" style={{ backgroundColor: color }} />
                    <ImageFallback 
                      src={logoUrl}
                      fallbackText={initials}
                      containerClassName="w-8 h-8"
                      imgClassName="max-w-full max-h-full object-contain"
                      fallbackClassName=""
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 block">Compañía Logística</label>
                    <CustomCarrierSelect
                      value={e.nombre}
                      options={empresasDisponibles}
                      usados={usados}
                      onChange={(val) => doUpdate(i, "nombre", val)}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 w-full lg:w-auto">
                  
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